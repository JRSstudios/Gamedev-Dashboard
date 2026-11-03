using System;
using UnityEditor;
using UnityEngine;

namespace GamedevDashboard.Bridge
{
    /// <summary>
    /// First-import settings for files in the folders the dashboard copies into. Only new assets
    /// are touched (importSettingsMissing), so changes you make in the Inspector are kept.
    /// </summary>
    public class DashboardImportPresets : AssetPostprocessor
    {
        static bool In(string assetPath, string folder) =>
            !string.IsNullOrEmpty(folder) && assetPath.StartsWith(folder.TrimEnd('/') + "/", StringComparison.OrdinalIgnoreCase);

        void OnPreprocessTexture()
        {
            if (!assetImporter.importSettingsMissing) return;
            var config = DashboardBridge.Current;
            var f = config.folders;
            if (!In(assetPath, f.concept) && !In(assetPath, f.inspiration) && !In(assetPath, f.reference)) return;
            var importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            if (config.pixelArt)
            {
                importer.filterMode = FilterMode.Point;
                importer.textureCompression = TextureImporterCompression.Uncompressed;
                importer.mipmapEnabled = false;
            }
            if (config.ppu > 0) importer.spritePixelsPerUnit = config.ppu;
        }

        void OnPreprocessAudio()
        {
            if (!assetImporter.importSettingsMissing) return;
            var f = DashboardBridge.Current.folders;
            bool music = In(assetPath, f.music);
            if (!music && !In(assetPath, f.sfx)) return;
            var importer = (AudioImporter)assetImporter;
            var settings = importer.defaultSampleSettings;
            // Long music streams from disk; short effects are decompressed once for instant playback.
            settings.loadType = music ? AudioClipLoadType.Streaming : AudioClipLoadType.DecompressOnLoad;
            settings.compressionFormat = AudioCompressionFormat.Vorbis;
            importer.defaultSampleSettings = settings;
            importer.forceToMono = !music;
        }

        void OnPreprocessModel()
        {
            if (!assetImporter.importSettingsMissing) return;
            if (!In(assetPath, DashboardBridge.Current.folders.model)) return;
            var importer = (ModelImporter)assetImporter;
            importer.useFileScale = true;
            importer.importCameras = false;
            importer.importLights = false;
        }
    }
}
