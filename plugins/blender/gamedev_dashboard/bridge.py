"""Minimal client for the dashboard bridge (127.0.0.1, token from bridge.json). No bpy here."""

import json
import os
import sys
import urllib.error
import urllib.request

APP_ID = "io.github.jrsstudios.gamedev-dashboard"
APP = "blender"

status = "Dashboard not connected"
_info = None
_config = {}


def bridge_file():
    home = os.path.expanduser("~")
    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.join(home, "AppData", "Roaming"))
    elif sys.platform == "darwin":
        base = os.path.join(home, "Library", "Application Support")
    else:
        base = os.path.join(home, ".local", "share")
    return os.path.join(base, APP_ID, "bridge.json")


def _read_info():
    global _info
    try:
        with open(bridge_file(), "r", encoding="utf-8") as f:
            data = json.load(f)
        if int(data.get("port", 0)) > 0 and data.get("token"):
            _info = {"port": int(data["port"]), "token": str(data["token"])}
    except (OSError, ValueError):
        _info = None
    return _info


def _request(method, path, body=None):
    global status, _info
    info = _info or _read_info()
    if not info:
        status = "Dashboard not running"
        return None
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request("http://127.0.0.1:%d%s" % (info["port"], path), data=data, method=method)
    req.add_header("X-GD-Token", info["token"])
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            status = "Connected to the dashboard"
            return json.loads(resp.read().decode("utf-8") or "{}")
    except (urllib.error.URLError, OSError, ValueError):
        # Restarted dashboard means a new port and token: read the file again next time.
        _info = None
        status = "Dashboard not reachable"
        return None


def _remember(reply):
    global _config
    if reply and isinstance(reply.get("config"), dict):
        _config = reply["config"]


def config():
    return _config


def hello(version):
    _remember(_request("POST", "/v1/hello", {"app": APP, "version": ".".join(str(v) for v in version)}))


def send_event(kind, data):
    _request("POST", "/v1/event", {"app": APP, "type": kind, "data": data})


def pull():
    reply = _request("GET", "/v1/pull?app=" + APP)
    _remember(reply)
    jobs = (reply or {}).get("jobs") or []
    return [j for j in jobs if isinstance(j, dict)]
