"""Model checks before a model goes to Unity. Pure functions over simple values so they can be
tested without Blender; `check_scene` reads the current scene."""

HIGH_TRIANGLES = 100_000
EPS = 1e-4

MESSAGES = {
    "scale": "%s: scale not applied (Ctrl+A > Scale)",
    "negative_scale": "%s: negative scale flips normals",
    "rotation": "%s: rotation not applied (Ctrl+A > Rotation)",
    "no_uv": "%s: no UV map, textures will not show",
    "ngons": "%s: %d faces with more than 4 corners",
    "high_poly": "%s: %d triangles is a lot for a game asset",
}


def check_object(name, scale, rotation, has_uv, faces):
    """`faces` is a list of corner counts per face. Returns (triangles, issue dicts)."""
    issues = []
    if any(s < 0 for s in scale):
        issues.append({"code": "negative_scale", "object": name})
    elif any(abs(s - 1.0) > EPS for s in scale):
        issues.append({"code": "scale", "object": name})
    if any(abs(r) > EPS for r in rotation):
        issues.append({"code": "rotation", "object": name})
    if faces and not has_uv:
        issues.append({"code": "no_uv", "object": name})
    ngons = sum(1 for n in faces if n > 4)
    if ngons:
        issues.append({"code": "ngons", "object": name, "count": ngons})
    triangles = sum(max(n - 2, 0) for n in faces)
    if triangles > HIGH_TRIANGLES:
        issues.append({"code": "high_poly", "object": name, "count": triangles})
    return triangles, issues


def describe(issue):
    text = MESSAGES.get(issue.get("code"), "%s: problem")
    return text % ((issue.get("object", "?"), issue["count"]) if "count" in issue else issue.get("object", "?"))


def check_scene(selection_only=False):
    import bpy

    objects = bpy.context.selected_objects if selection_only else bpy.context.scene.objects
    total, found, count = 0, [], 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        count += 1
        mesh = obj.data
        triangles, issues = check_object(
            obj.name,
            tuple(obj.scale),
            tuple(obj.rotation_euler),
            len(mesh.uv_layers) > 0,
            [len(p.vertices) for p in mesh.polygons],
        )
        total += triangles
        found.extend(issues)
    return {
        "triangles": total,
        "objects": count,
        "issueCodes": found[:100],
        "issues": [describe(i) for i in found[:100]],
    }
