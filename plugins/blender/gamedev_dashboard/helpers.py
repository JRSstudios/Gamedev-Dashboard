"""Small fixes before a model goes to Unity. Data API only (no operators), so they also work from
the dashboard's poll timer. Meshes used by several objects are skipped instead of changed twice."""

import os

import bpy
from mathutils import Matrix, Vector

from . import exporter


def _targets(selection_only):
    objs = bpy.context.selected_objects if selection_only else bpy.context.view_layer.objects
    return [o for o in objs if o.type == "MESH" and o.data and o.data.users == 1]


def apply_transforms(selection_only=False):
    """Bakes rotation and scale into the mesh (like Ctrl+A > Rotation & Scale)."""
    done = []
    for obj in _targets(selection_only):
        if obj.parent:
            continue  # children keep their relation to the parent
        loc = obj.matrix_basis.to_translation()
        basis = obj.matrix_basis.copy()
        basis.translation = Vector((0.0, 0.0, 0.0))
        obj.data.transform(basis)
        obj.matrix_basis = Matrix.Translation(loc)
        obj.data.update()
        done.append(obj.name)
    return done


def origin_to_bottom(selection_only=False):
    """Moves each object's origin to the centre of its lowest point, so it stands on the floor in Unity."""
    done = []
    for obj in _targets(selection_only):
        if not obj.data.vertices:
            continue
        local = [v.co for v in obj.data.vertices]
        min_z = min(c.z for c in local)
        xs = [c.x for c in local]
        ys = [c.y for c in local]
        pivot = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min_z))
        obj.data.transform(Matrix.Translation(-pivot))
        obj.matrix_world = obj.matrix_world @ Matrix.Translation(pivot)
        obj.data.update()
        done.append(obj.name)
    return done


def add_lods(selection_only=True, ratios=(0.5, 0.25)):
    """Copies each mesh as NAME_LOD1, NAME_LOD2 with a Decimate modifier (Unity groups *_LODn names)."""
    made = []
    for obj in _targets(selection_only):
        if "_LOD" in obj.name:
            continue
        for i, ratio in enumerate(ratios, start=1):
            name = "%s_LOD%d" % (obj.name, i)
            if name in bpy.data.objects:
                continue
            copy = obj.copy()
            copy.data = obj.data.copy()
            copy.name = name
            for col in obj.users_collection:
                col.objects.link(copy)
            mod = copy.modifiers.new("Dashboard LOD", "DECIMATE")
            mod.ratio = ratio
            made.append(name)
    return made


def batch_export(folder, fmt="FBX"):
    """One file per collection that has mesh objects, named after the collection."""
    paths = []
    view_layer = bpy.context.view_layer
    previous = {o.name: o.select_get() for o in view_layer.objects}
    try:
        for col in bpy.data.collections:
            objs = [o for o in col.all_objects if o.type in {"MESH", "ARMATURE", "EMPTY"} and o.name in view_layer.objects]
            if not any(o.type == "MESH" for o in objs):
                continue
            for o in view_layer.objects:
                o.select_set(o in objs)
            safe = "".join(c if c.isalnum() or c in "-_ " else "_" for c in col.name).strip() or "collection"
            paths.append(exporter.export(folder, fmt, True, os.path.join(folder, safe + (".glb" if fmt == "GLB" else ".fbx"))))
    finally:
        for o in view_layer.objects:
            o.select_set(previous.get(o.name, False))
    return paths
