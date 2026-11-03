using UnityEditor;
using UnityEngine;

namespace GamedevDashboard.Bridge
{
    /// <summary>Window → Gamedev Dashboard: connection state and what the dashboard did recently.</summary>
    public class DashboardWindow : EditorWindow
    {
        [MenuItem("Window/Gamedev Dashboard")]
        static void Open() => GetWindow<DashboardWindow>("Gamedev Dashboard");

        void OnInspectorUpdate() => Repaint();

        void OnGUI()
        {
            EditorGUILayout.LabelField("Status", DashboardBridge.Status, EditorStyles.boldLabel);
            if (DashboardBridge.LastContact != default)
                EditorGUILayout.LabelField("Last contact", DashboardBridge.LastContact.ToString("HH:mm:ss"));
            var config = DashboardBridge.Current;
            EditorGUILayout.LabelField("Pixel art presets", config.pixelArt ? "on (PPU " + config.ppu + ")" : "off");
            EditorGUILayout.Space();
            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("Reconnect")) DashboardBridge.Hello();
                if (GUILayout.Button("Send scene list")) DashboardBridge.SendScenes();
            }
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Recent", EditorStyles.boldLabel);
            if (DashboardBridge.Recent.Count == 0) EditorGUILayout.HelpBox("Jobs you start in the dashboard (import, prefab, open scene) show up here.", MessageType.None);
            foreach (var line in DashboardBridge.Recent) EditorGUILayout.LabelField(line);
        }
    }
}
