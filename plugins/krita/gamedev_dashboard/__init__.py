from krita import Krita

from .extension import GamedevDashboardExtension

Krita.instance().addExtension(GamedevDashboardExtension(Krita.instance()))
