"""Krita side of the Gamedev Dashboard: PNG export on save, layers as single sprites, and the
connection to the dashboard app (127.0.0.1 only, fixed jobs, no code from outside)."""

import os
import traceback

from krita import Extension, InfoObject, Krita

try:
    from PyQt6.QtCore import QTimer
except ImportError:  # Krita 5 ships PyQt5
    from PyQt5.QtCore import QTimer

from . import bridge

SETTINGS = "gamedev_dashboard"
POLL_MS = 2000


LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gamedev_dashboard.log")


def log_error(what):
    """Krita swallows exceptions from timers; keep them in a small log file for bug reports."""
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write("%s\n%s\n" % (what, traceback.format_exc()))
    except OSError:
        pass


def log_line(text):
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(text + "\n")
    except OSError:
        pass


def current_document():
    """The active document; Krita reports none while its window is in the background, so fall
    back to the most recently opened one."""
    k = Krita.instance()
    doc = k.activeDocument()
    if doc:
        return doc
    docs = [d for d in k.documents() if d.fileName()]
    if not docs:
        log_line("no document open (%d documents, %d windows)" % (len(k.documents()), len(k.windows())))
    return docs[-1] if docs else None


def setting(name, default):
    return Krita.instance().readSetting(SETTINGS, name, default)


def safe_name(name):
    keep = "".join(c if c.isalnum() or c in "-_ " else "_" for c in name).strip()
    return keep or "layer"


class GamedevDashboardExtension(Extension):
    def __init__(self, parent):
        super().__init__(parent)
        self._exporting = False
        self._timer = None
        self._auto_action = None

    def setup(self):
        Krita.instance().notifier().imageSaved.connect(self.on_saved)
        self._timer = QTimer()
        self._timer.timeout.connect(self.poll)
        self._timer.start(POLL_MS)
        bridge.hello((0, 1, 0))

    def createActions(self, window):
        export = window.createAction("gdd_export_png", "Dashboard: export PNG now", "tools/scripts")
        export.triggered.connect(lambda: self.export_png())
        layers = window.createAction("gdd_export_layers", "Dashboard: export layers as sprites", "tools/scripts")
        layers.triggered.connect(lambda: self.export_layers())
        self._auto_action = window.createAction("gdd_auto_export", "Dashboard: export PNG on save", "tools/scripts")
        self._auto_action.setCheckable(True)
        self._auto_action.setChecked(setting("autoExport", "true") == "true")
        self._auto_action.toggled.connect(lambda on: Krita.instance().writeSetting(SETTINGS, "autoExport", "true" if on else "false"))

    # ---------- export ----------

    def target_dir(self, doc):
        folder = bridge.config().get("exportDir") or os.path.dirname(doc.fileName())
        os.makedirs(folder, exist_ok=True)
        return folder

    def export_png(self, doc=None):
        doc = doc or current_document()
        if not doc or not doc.fileName():
            return None
        stem = os.path.splitext(os.path.basename(doc.fileName()))[0]
        path = os.path.join(self.target_dir(doc), stem + ".png")
        self._exporting = True
        try:
            doc.setBatchmode(True)
            doc.exportImage(path, InfoObject())
        finally:
            doc.setBatchmode(False)
            self._exporting = False
        bridge.send_event("exported", {"path": path, "kra": doc.fileName(), "width": doc.width(), "height": doc.height()})
        return path

    def export_layers(self, doc=None):
        doc = doc or current_document()
        if not doc or not doc.fileName():
            return []
        stem = os.path.splitext(os.path.basename(doc.fileName()))[0]
        folder = os.path.join(self.target_dir(doc), stem + "_sprites")
        os.makedirs(folder, exist_ok=True)
        # Show one layer at a time and export the whole image: same size and position for every
        # sprite, and the same export path that the PNG export uses.
        layers = [n for n in doc.topLevelNodes() if n.visible() and n.type() in ("paintlayer", "grouplayer", "vectorlayer")]
        if not layers:
            log_error("no layers to export: %r" % [(n.name(), n.type(), n.visible()) for n in doc.topLevelNodes()])
            return []
        paths = []
        self._exporting = True
        doc.setBatchmode(True)
        try:
            for layer in layers:
                for other in layers:
                    other.setVisible(other is layer)
                doc.refreshProjection()
                path = os.path.join(folder, safe_name(layer.name()) + ".png")
                if doc.exportImage(path, InfoObject()):
                    paths.append(path)
                else:
                    log_error("export of layer %s returned false" % layer.name())
        finally:
            for layer in layers:
                layer.setVisible(True)
            doc.refreshProjection()
            doc.setBatchmode(False)
            self._exporting = False
        for path in paths:
            bridge.send_event("exported", {"path": path, "kra": doc.fileName(), "sprite": True})
        return paths

    # ---------- dashboard ----------

    def on_saved(self, filename):
        if self._exporting or setting("autoExport", "true") != "true":
            return
        if not str(filename).lower().endswith(".kra"):
            return
        for doc in Krita.instance().documents():
            if doc.fileName() == filename:
                try:
                    self.export_png(doc)
                except Exception:
                    log_error("export on save failed")
                return

    def poll(self):
        for job in bridge.pull():
            kind = job.get("type")
            try:
                if kind == "export_png":
                    self.export_png()
                elif kind == "export_layers":
                    self.export_layers()
            except Exception:
                log_error("job %s failed" % kind)
