"""Gamedev Dashboard bridge for Blender.

Exports the scene (or the selection) for Unity whenever you save, checks the model for common
problems and tells the Gamedev Dashboard app on this computer about it. Talks only to 127.0.0.1;
the dashboard can only ask for a fixed set of jobs (export, check), never run code here.
"""

bl_info = {
    "name": "Gamedev Dashboard",
    "author": "Gamedev Dashboard contributors",
    "version": (0, 1, 0),
    "blender": (3, 6, 0),
    "location": "3D View > Sidebar > Dashboard",
    "description": "Auto export for Unity on save, model checks, connection to the Gamedev Dashboard app",
    "category": "Import-Export",
}

import bpy
from bpy.app.handlers import persistent

from . import bridge, checks, exporter

POLL_SECONDS = 2.0


def prefs(context=None):
    context = context or bpy.context
    addon = context.preferences.addons.get(__name__)
    return addon.preferences if addon else None


class GDD_Preferences(bpy.types.AddonPreferences):
    bl_idname = __name__

    auto_export: bpy.props.BoolProperty(name="Export on save", default=True, description="Export for Unity every time the .blend file is saved")
    export_format: bpy.props.EnumProperty(
        name="Format",
        items=[("GLB", "glTF binary (.glb)", ""), ("FBX", "FBX (.fbx)", "")],
        default="FBX",
    )
    selection_only: bpy.props.BoolProperty(name="Selected objects only", default=False)
    export_dir: bpy.props.StringProperty(
        name="Export folder",
        subtype="DIR_PATH",
        description="Empty: use the Blender export folder linked in the dashboard",
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "auto_export")
        layout.prop(self, "export_format")
        layout.prop(self, "selection_only")
        layout.prop(self, "export_dir")


def target_dir():
    p = prefs()
    if p and p.export_dir:
        return bpy.path.abspath(p.export_dir)
    return bridge.config().get("exportDir") or ""


def export_and_report(fmt=None, selection_only=None):
    p = prefs()
    fmt = fmt or (p.export_format if p else "FBX")
    selection_only = p.selection_only if selection_only is None and p else bool(selection_only)
    folder = target_dir()
    if not folder:
        bridge.status = "No export folder: link one in the dashboard or the add-on preferences"
        return None
    path = exporter.export(folder, fmt, selection_only)
    report = checks.check_scene(selection_only)
    bridge.send_event("exported", {"path": path, "format": fmt, "blend": bpy.data.filepath, **report})
    return path


@persistent
def on_save(_dummy):
    p = prefs()
    if not p or not p.auto_export or not bpy.data.filepath:
        return
    try:
        export_and_report()
    except Exception as e:  # never break saving because of the export
        bridge.status = "Export failed: %s" % e


def run_job(job):
    kind = job.get("type")
    if kind == "export":
        export_and_report(job.get("format"), job.get("selectionOnly"))
    elif kind == "check":
        bridge.send_event("check", {"blend": bpy.data.filepath, **checks.check_scene(False)})


def poll():
    try:
        for job in bridge.pull():
            run_job(job)
    except Exception as e:
        bridge.status = "Job failed: %s" % e
    return POLL_SECONDS


class GDD_OT_export(bpy.types.Operator):
    bl_idname = "gamedev_dashboard.export"
    bl_label = "Export for Unity now"
    bl_description = "Export with the add-on settings and send the result to the dashboard"

    def execute(self, context):
        path = export_and_report()
        if path:
            self.report({"INFO"}, "Exported %s" % path)
            return {"FINISHED"}
        self.report({"WARNING"}, bridge.status)
        return {"CANCELLED"}


class GDD_OT_check(bpy.types.Operator):
    bl_idname = "gamedev_dashboard.check"
    bl_label = "Check model"
    bl_description = "Look for unapplied transforms, missing UVs, n-gons and high polygon counts"

    def execute(self, context):
        report = checks.check_scene(False)
        bridge.send_event("check", {"blend": bpy.data.filepath, **report})
        for issue in report["issues"][:10]:
            self.report({"WARNING"}, issue)
        if not report["issues"]:
            self.report({"INFO"}, "No problems found (%d triangles)" % report["triangles"])
        return {"FINISHED"}


class GDD_PT_panel(bpy.types.Panel):
    bl_label = "Gamedev Dashboard"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Dashboard"

    def draw(self, context):
        layout = self.layout
        layout.label(text=bridge.status)
        p = prefs(context)
        if p:
            layout.prop(p, "auto_export")
            layout.prop(p, "export_format", text="")
        layout.label(text="Export to: %s" % (target_dir() or "-"))
        layout.operator(GDD_OT_export.bl_idname, icon="EXPORT")
        layout.operator(GDD_OT_check.bl_idname, icon="CHECKMARK")


CLASSES = (GDD_Preferences, GDD_OT_export, GDD_OT_check, GDD_PT_panel)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.app.handlers.save_post.append(on_save)
    bpy.app.timers.register(poll, first_interval=1.0, persistent=True)
    bridge.hello(bl_info["version"])


def unregister():
    if bpy.app.timers.is_registered(poll):
        bpy.app.timers.unregister(poll)
    if on_save in bpy.app.handlers.save_post:
        bpy.app.handlers.save_post.remove(on_save)
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
