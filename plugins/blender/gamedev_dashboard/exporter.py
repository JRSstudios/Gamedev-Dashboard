"""Export for Unity: FBX with Unity axes and scale, or binary glTF."""

import os

import bpy


def file_name(fmt):
    stem = bpy.path.display_name_from_filepath(bpy.data.filepath) or "untitled"
    return stem + (".glb" if fmt == "GLB" else ".fbx")


def export(folder, fmt="FBX", selection_only=False, path=None):
    os.makedirs(folder, exist_ok=True)
    path = path or os.path.join(folder, file_name(fmt))
    if fmt == "GLB":
        bpy.ops.export_scene.gltf(
            filepath=path,
            export_format="GLB",
            use_selection=selection_only,
            export_yup=True,
            export_apply=True,
        )
    else:
        # Same settings as the cheat sheet entry "Import models from Blender".
        bpy.ops.export_scene.fbx(
            filepath=path,
            use_selection=selection_only,
            apply_scale_options="FBX_SCALE_ALL",
            axis_forward="-Z",
            axis_up="Y",
            bake_space_transform=True,
            use_mesh_modifiers=True,
            add_leaf_bones=False,
            mesh_smooth_type="FACE",
            object_types={"MESH", "ARMATURE", "EMPTY"},
        )
    return path
