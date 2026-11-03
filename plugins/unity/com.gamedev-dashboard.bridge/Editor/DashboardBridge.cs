using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Networking;

namespace GamedevDashboard.Bridge
{
    /// <summary>
    /// Talks to the Gamedev Dashboard app on this computer (127.0.0.1 only).
    /// Reports console errors, compile results and the scene list; runs a fixed set of jobs
    /// the user started in the dashboard (import, refresh, create prefab, open scene).
    /// </summary>
    [InitializeOnLoad]
    public static class DashboardBridge
    {
        public const string Version = "0.1.0";
        const double PollSeconds = 2.0;
        const int MaxLogsPerMinute = 30;

        [Serializable] class BridgeFile { public int port; public string token; }
        [Serializable] public class Job { public string type; public string path; public string scene; }
        [Serializable] public class Folders { public string concept; public string inspiration; public string reference; public string music; public string sfx; public string model; }
        [Serializable] public class Config { public bool pixelArt; public int ppu = 100; public Folders folders = new Folders(); }
        [Serializable] class PullReply { public Job[] jobs; public Config config; }

        static int port;
        static string token;
        static double nextPoll;
        static double nextInfoRead;
        static UnityWebRequest pending;
        static string pendingPath;
        static readonly Queue<KeyValuePair<string, string>> outbox = new Queue<KeyValuePair<string, string>>();
        static int logsInWindow;
        static DateTime logWindow = DateTime.UtcNow;
        static int compileErrors;

        public static string Status { get; private set; } = "Not connected";
        public static DateTime LastContact { get; private set; }
        public static readonly List<string> Recent = new List<string>();
        public static Config Current { get; private set; } = LoadConfig();

        static DashboardBridge()
        {
            // Batch builds stay untouched unless a test asks for the bridge explicitly.
            if (Application.isBatchMode && Environment.GetEnvironmentVariable("GD_BRIDGE_TEST") == null) return;
            EditorApplication.update += Tick;
            Application.logMessageReceived += OnLog;
            CompilationPipeline.assemblyCompilationFinished += (_, messages) =>
            {
                foreach (var m in messages) if (m.type == CompilerMessageType.Error) compileErrors++;
            };
            CompilationPipeline.compilationFinished += _ =>
            {
                Send("compiled", "{\"errors\":" + compileErrors + "}");
                compileErrors = 0;
            };
            Hello();
            SendScenes();
        }

        /// <summary>Where the dashboard writes its port and token; the same folder as its data.</summary>
        public static string BridgeFilePath()
        {
            const string id = "io.github.jrsstudios.gamedev-dashboard";
            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            switch (Application.platform)
            {
                case RuntimePlatform.OSXEditor: return Path.Combine(home, "Library/Application Support", id, "bridge.json");
                case RuntimePlatform.LinuxEditor: return Path.Combine(home, ".local/share", id, "bridge.json");
                default: return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), id, "bridge.json");
            }
        }

        static bool ReadBridgeFile()
        {
            try
            {
                var file = JsonUtility.FromJson<BridgeFile>(File.ReadAllText(BridgeFilePath()));
                if (file == null || file.port <= 0 || string.IsNullOrEmpty(file.token)) return false;
                port = file.port;
                token = file.token;
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public static void Hello() => Enqueue("/v1/hello", "{\"app\":\"unity\",\"version\":\"" + Version + "\"}");

        public static void SendScenes()
        {
            var parts = new List<string>();
            foreach (var s in EditorBuildSettings.scenes) parts.Add("{\"path\":" + Quote(s.path) + ",\"enabled\":" + (s.enabled ? "true" : "false") + "}");
            Send("scenes", "{\"buildScenes\":[" + string.Join(",", parts) + "],\"active\":" + Quote(EditorSceneManager.GetActiveScene().path) + "}");
        }

        static void Send(string type, string dataJson) =>
            Enqueue("/v1/event", "{\"app\":\"unity\",\"type\":" + Quote(type) + ",\"data\":" + dataJson + "}");

        static void Enqueue(string path, string body)
        {
            if (outbox.Count > 100) outbox.Dequeue();
            outbox.Enqueue(new KeyValuePair<string, string>(path, body));
        }

        static void OnLog(string message, string stack, LogType type)
        {
            if (type == LogType.Log) return;
            if ((DateTime.UtcNow - logWindow).TotalSeconds > 60) { logWindow = DateTime.UtcNow; logsInWindow = 0; }
            if (++logsInWindow > MaxLogsPerMinute) return;
            string level = type == LogType.Warning ? "warning" : "error";
            Send("log", "{\"level\":" + Quote(level) + ",\"message\":" + Quote(Trim(message, 2000)) + ",\"stack\":" + Quote(Trim(stack, 2000)) + "}");
        }

        static void Tick()
        {
            double now = EditorApplication.timeSinceStartup;
            if (pending != null)
            {
                if (!pending.isDone) return;
                Finish(pending, pendingPath);
                pending.Dispose();
                pending = null;
            }
            if (port == 0)
            {
                if (now < nextInfoRead) return;
                nextInfoRead = now + 10;
                if (!ReadBridgeFile()) { Status = "Dashboard not running"; return; }
            }
            if (outbox.Count > 0)
            {
                var next = outbox.Dequeue();
                Start(UnityWebRequest.Post(Url(next.Key), next.Value, "application/json"), next.Key);
            }
            else if (now >= nextPoll)
            {
                nextPoll = now + PollSeconds;
                Start(UnityWebRequest.Get(Url("/v1/pull?app=unity")), "/v1/pull");
            }
        }

        static string Url(string path) => "http://127.0.0.1:" + port + path;

        static void Start(UnityWebRequest request, string path)
        {
            request.SetRequestHeader("X-GD-Token", token);
            request.timeout = 3;
            pending = request;
            pendingPath = path;
            request.SendWebRequest();
        }

        static void Finish(UnityWebRequest request, string path)
        {
            if (request.result != UnityWebRequest.Result.Success)
            {
                // The dashboard was restarted (new port and token) or closed: read the file again later.
                Status = "Dashboard not reachable";
                port = 0;
                return;
            }
            Status = "Connected";
            LastContact = DateTime.Now;
            if (path != "/v1/pull") return;
            var reply = JsonUtility.FromJson<PullReply>(request.downloadHandler.text);
            if (reply == null) return;
            if (reply.config != null) SaveConfig(reply.config);
            if (reply.jobs == null) return;
            foreach (var job in reply.jobs) Run(job);
        }

        static void Run(Job job)
        {
            try
            {
                switch (job.type)
                {
                    case "import":
                        string rel = ToAssetPath(job.path);
                        if (rel != null) AssetDatabase.ImportAsset(rel, ImportAssetOptions.ForceUpdate);
                        else AssetDatabase.Refresh();
                        Send("imported", "{\"path\":" + Quote(rel ?? job.path) + "}");
                        Note("Imported " + (rel ?? job.path));
                        break;
                    case "refresh":
                        AssetDatabase.Refresh();
                        Note("Refreshed assets");
                        break;
                    case "create_prefab":
                        Note("Prefab: " + CreatePrefab(ToAssetPath(job.path)));
                        break;
                    case "open_scene":
                        if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) EditorSceneManager.OpenScene(job.scene);
                        SendScenes();
                        break;
                    case "presets":
                        break; // the config arrives with every pull
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning("[Gamedev Dashboard] " + job.type + " failed: " + e.Message);
            }
        }

        /// <summary>A model in the project becomes a prefab in Assets/Prefabs (never overwritten).</summary>
        public static string CreatePrefab(string modelPath)
        {
            if (modelPath == null) throw new ArgumentException("model is not inside this project");
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(modelPath);
            if (model == null) throw new ArgumentException("not a model: " + modelPath);
            if (!AssetDatabase.IsValidFolder("Assets/Prefabs")) AssetDatabase.CreateFolder("Assets", "Prefabs");
            string target = AssetDatabase.GenerateUniqueAssetPath("Assets/Prefabs/" + model.name + ".prefab");
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(model);
            try { PrefabUtility.SaveAsPrefabAsset(instance, target); }
            finally { UnityEngine.Object.DestroyImmediate(instance); }
            return target;
        }

        /// <summary>"C:/Game/Assets/Art/a.png" → "Assets/Art/a.png"; null when outside the project.</summary>
        public static string ToAssetPath(string path)
        {
            if (string.IsNullOrEmpty(path)) return null;
            string full = Path.GetFullPath(path).Replace('\\', '/');
            string root = Path.GetFullPath(Application.dataPath).Replace('\\', '/');
            if (!full.StartsWith(root + "/", StringComparison.OrdinalIgnoreCase)) return null;
            return "Assets" + full.Substring(root.Length);
        }

        static void Note(string text)
        {
            Recent.Insert(0, DateTime.Now.ToString("HH:mm") + "  " + text);
            if (Recent.Count > 20) Recent.RemoveAt(Recent.Count - 1);
        }

        const string ConfigKey = "GamedevDashboard.Config";

        static Config LoadConfig()
        {
            try { return JsonUtility.FromJson<Config>(EditorPrefs.GetString(ConfigKey, "")) ?? new Config(); }
            catch (Exception) { return new Config(); }
        }

        static void SaveConfig(Config config)
        {
            Current = config;
            EditorPrefs.SetString(ConfigKey, JsonUtility.ToJson(config));
        }

        static string Trim(string s, int max) => string.IsNullOrEmpty(s) ? "" : s.Length <= max ? s : s.Substring(0, max);

        public static string Quote(string s)
        {
            if (s == null) return "null";
            var b = new StringBuilder("\"");
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': b.Append("\\\""); break;
                    case '\\': b.Append("\\\\"); break;
                    case '\n': b.Append("\\n"); break;
                    case '\r': b.Append("\\r"); break;
                    case '\t': b.Append("\\t"); break;
                    default:
                        if (c < ' ') b.Append("\\u").Append(((int)c).ToString("x4"));
                        else b.Append(c);
                        break;
                }
            }
            return b.Append('"').ToString();
        }
    }
}
