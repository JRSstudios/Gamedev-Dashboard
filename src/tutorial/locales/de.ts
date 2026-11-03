import type { TutorialLocale } from '../content'

export const de: TutorialLocale = {
  lessons: {
    start: {
      title: 'Start: dein Projekt und Unity',
      intro: 'Das Dashboard ist die Zentrale zwischen Unity, Blender und Krita. Alles gehört zu einem Projekt, meist eins pro Spiel.',
      steps: [
        'Wähle auf der Willkommensseite „Unity-Projekt öffnen“ und den Ordner, in dem Assets und ProjectSettings liegen.',
        'Auf Wunsch verknüpft die App die Bilder, Sounds und Modelle, die schon in Assets liegen.',
        'Die Startseite (Übersicht) zeigt jetzt Kacheln für Unity, Blender und Krita, deinen Eingang, Vorschläge und die nächsten Schritte.',
        'Projekte wechselst du über das Projektmenü oben in der Navigation.',
      ],
      tip: 'Beim Verknüpfen wird nichts kopiert: Das Dashboard merkt sich nur, wo die Dateien liegen.',
    },
    plugins: {
      title: 'Plugins installieren',
      intro: 'Kleine Plugins verbinden Unity, Blender und Krita mit dem Dashboard. Sie reden nur mit diesem Rechner und führen nur feste Befehle aus.',
      steps: [
        'Öffne die Unity-Seite und klicke „Installieren“. Das Paket wird in Packages deines Unity-Projekts kopiert.',
        'Öffne die Blender-Seite, installiere das Add-on und aktiviere „Gamedev Dashboard“ in Blender unter Einstellungen > Add-ons.',
        'Öffne die Krita-Seite, installiere das Plugin, aktiviere es in Krita unter Einstellungen > Krita einrichten > Python-Plugin-Manager und starte Krita neu.',
        'Läuft ein Programm, zeigt seine Kachel auf der Startseite „verbunden“.',
      ],
      tip: 'Die Verbindung kannst du jederzeit unter Einstellungen > Allgemein ausschalten.',
    },
    assets: {
      title: 'Assets und der Eingang',
      intro: 'Concept Art, Inspiration, Modelle und Audio haben je einen eigenen Abschnitt. Neue Dateien landen zuerst im Eingang.',
      steps: [
        'Zieh Dateien aus dem Explorer irgendwo ins Fenster. Sie werden automatisch nach Typ und Name einsortiert.',
        'Ist die Kategorie falsch, zieh die Karte in eine andere Spalte. Die App lernt daraus und sortiert beim nächsten Mal besser.',
        'Im Eingang auf der Startseite übernimmst du neue Exporte mit einem Klick ins Projekt oder schickst sie direkt nach Unity.',
        'Vorschläge weisen auf fehlende Dateien, falsche Kategorien und anderes hin, das einen Blick wert ist.',
      ],
      tip: 'Mit Claude schlägt „Mit Claude sortieren“ Kategorien und Tags für eine ganze Ansicht vor.',
    },
    blender: {
      title: 'Blender: automatisch exportieren',
      intro: 'Mit dem Add-on exportiert jedes Speichern in Blender ein Unity-taugliches FBX oder GLB und prüft das Modell.',
      steps: [
        'Verknüpfe auf der Blender-Seite einen Export-Ordner.',
        'Speichere in Blender (Strg+S). Das Add-on exportiert mit den richtigen Achsen und dem richtigen Maßstab.',
        'Die Modellprüfung meldet nicht angewendete Skalierung, fehlende UVs, Flächen mit mehr als vier Ecken und sehr viele Dreiecke.',
        'Schalte Auto-Import ein und auf Wunsch „nach Unity kopieren“: Dann wird bei jedem Export dieselbe Datei in Unity aktualisiert.',
      ],
      tip: 'Unter 3D-Modelle drehst du das Modell, vergleichst es mit Concept Art und legst ein Prefab in Unity an.',
    },
    krita: {
      title: 'Krita: malen und im Spiel nutzen',
      intro: 'Das Krita-Plugin exportiert bei jedem Speichern ein PNG und kann jede Ebene als eigenes Sprite exportieren.',
      steps: [
        'Verknüpfe auf der Krita-Seite den Krita-Ordner.',
        'Speichere deine .kra-Datei. Das PNG erscheint im Eingang oder mit Auto-Import direkt unter Concept Art.',
        'Nutze „Ebenen als Sprites exportieren“ für Figuren oder Tilesets aus mehreren Ebenen.',
        'Für Pixel-Art schalte auf der Unity-Seite „Pixel-Art“ ein: Sprites werden scharf und unkomprimiert importiert.',
      ],
      tip: '.kra-Dateien zeigen im Dashboard auch ohne Krita eine Vorschau.',
    },
    planning: {
      title: 'Ziele und Zeitplanung',
      intro: 'Ziele haben Schritte und einen Fortschrittsbalken. Der Planer zeigt, wie viel Zeit du wirklich hast.',
      steps: [
        'Lege unter Ziele ein Ziel an, teile es in Schritte und setze eine Deadline und eine Schätzung in Stunden.',
        'Trag unter Planer > Woche ein, wann du arbeitest oder Schule hast und wann du Zeit für Gamedev hast. Vorlagen helfen beim Start.',
        'Planer > Monat zeigt die freien Stunden pro Tag. Klick auf einen Tag, um ihn als frei oder belegt zu markieren.',
        'Planer > Zeit pro Abschnitt vergleicht geplante Stunden mit deiner erfassten Zeit und warnt, wenn eine Deadline nicht passt.',
        'Starte den Timer (Strg+T) und wähle ein Ziel oder einen Abschnitt, damit die Zeit dort zählt.',
      ],
      tip: 'Ist eine Deadline gefährdet, erscheint ein Vorschlag auf der Startseite.',
    },
    workspace: {
      title: 'Seiten, Tabellen und Nodes',
      intro: 'Alles, was du sonst in Notion, OneNote oder Obsidian schreiben würdest, liegt hier direkt neben deinem Spiel.',
      steps: [
        'Seiten sind Dokumente aus Blöcken: Überschriften, Listen, Checklisten, Bilder und Tabellen. Schreib **fett**, *kursiv* und `Code`.',
        'Leg Unterseiten für einen Seitenbaum an und verlinke Seiten mit [[Titel]]. Rückverweise zeigen, wer auf eine Seite verlinkt.',
        'Tabellen haben Spalten mit Typen und lassen sich als Tabelle, Kanban-Board, Kalender oder Galerie anzeigen.',
        'Nodes ist eine Leinwand, auf der Ziele, Seiten, Assets und Notizen zu Karten werden, die du verbindest.',
      ],
      tip: 'Mit „Heute“ unter Seiten bekommst du einen Devlog-Eintrag pro Tag.',
    },
    knowledge: {
      title: 'Cheat Sheet und Brainstorm',
      intro: 'Das Cheat Sheet erklärt Unity 6 Schritt für Schritt, mit Code zum Kopieren. Brainstorm macht aus einer Idee einen Plan.',
      steps: [
        'Filtere das Cheat Sheet nach 2D oder 3D und nach Ansicht, oder such nach einer Fehlermeldung.',
        'Kopiere Code mit einem Klick oder übernimm die Schritte eines Eintrags als Ziel.',
        'Beschreib in Brainstorm eine Idee. Die App findet passende Cheat-Sheet-Einträge; mit Claude schreibt sie einen ganzen Plan.',
        'Unity-Fehler aus dem Plugin haben einen Knopf „Hilfe finden“, der den passenden Eintrag öffnet.',
      ],
      tip: 'Eigene Einträge im Cheat Sheet sind genauso durchsuchbar wie die eingebauten.',
    },
    claude: {
      title: 'Claude: API-Key oder Claude Code',
      intro: 'Claude kann recherchieren, planen, sortieren und Skripte schreiben. Nichts wird ohne deine Bestätigung geändert.',
      steps: [
        'Wähle unter Einstellungen > KI die Verbindung: einen API-Key (Kosten pro Nutzung) oder dein installiertes Claude Code (nutzt dein Abo).',
        'Der API-Key liegt im Windows-Anmeldeinformationsspeicher, nie in der Datendatei.',
        'Öffne den Assistenten mit Strg+J. Er kennt dein Projekt und schlägt Aktionen vor, die du einzeln prüfst.',
        'Die Verbrauchsübersicht zeigt Tokens und geschätzte Kosten; ein Monatslimit warnt rechtzeitig.',
      ],
      tip: 'Gesendet werden nur Titel, Namen und Notizen, nie der Inhalt deiner Dateien.',
    },
    templates: {
      title: 'Templates',
      intro: 'Templates verschaffen dir einen Vorsprung: Ziele, Seiten, Tabellen und Zeitbudgets für eine Spielart.',
      steps: [
        'Öffne Templates und filtere nach 2D oder 3D.',
        'Klick auf ein Template, um alles zu sehen, was es anlegt, auch die C#-Skripte.',
        'Installiere es ins aktuelle Projekt oder als neues Projekt. „Entfernen“ nimmt es wieder heraus.',
        'Teile dein eigenes Projekt mit „Als Template exportieren“.',
      ],
      tip: 'Skripte kommen erst nach Unity, wenn du sie gelesen und „Nach Unity kopieren“ geklickt hast.',
    },
    backup: {
      title: 'Sicherung, Rückgängig und Export',
      intro: 'Deine Daten bleiben auf deinem Rechner. Mehrere Sicherheitsnetze schützen sie.',
      steps: [
        'Strg+Z macht die letzte Änderung überall in der App rückgängig, Strg+Y stellt sie wieder her.',
        'Jeden Tag wird ein Schnappschuss deiner Daten aufbewahrt (die letzten 14). Wiederherstellen unter Einstellungen > Daten.',
        'Wähle einen Sicherungsordner, zum Beispiel in deiner Cloud, dann landet dort eine Kopie jedes Schnappschusses.',
        'Exportiere ein Projekt als JSON oder Markdown oder importiere Notizen aus Obsidian und Notion.',
      ],
      tip: 'Strg+Umschalt+Leertaste öffnet eine Schnellnotiz, auch wenn das Fenster im Hintergrund ist.',
    },
    firstgame: {
      title: 'Mini-Kurs: Dein erstes Spiel',
      intro: 'Fünfzehn Cheat-Sheet-Einträge in einer guten Reihenfolge führen dich vom leeren Unity-Projekt zum fertigen 2D-Platformer-Build.',
      steps: [
        'Lies die Einträge unten nacheinander; jeder hat Schritte und Code.',
        'Klick „Als Ziel anlegen“, dann bekommst du ein Ziel mit einem Schritt pro Eintrag.',
        'Hak einen Schritt ab, sobald der Eintrag in deinem Projekt funktioniert.',
        'Lass den Build am Ende nicht weg: Ein fertiges kleines Spiel lehrt mehr als ein großes unfertiges.',
      ],
      tip: 'Hängst du fest? Such die Fehlermeldung im Cheat Sheet oder frag den Assistenten.',
    },
  },
  tour: {
    nav: { title: 'Navigation', text: 'Die Abschnitte sind gruppiert: Planen, Wissen, Assets und Werkzeuge. Ein Klick auf den Gruppennamen klappt sie zu.' },
    hub: { title: 'Deine Zentrale', text: 'Unity, Blender und Krita auf einen Blick. Ein Klick öffnet die Seite des Programms.' },
    suggest: { title: 'Vorschläge', text: 'Die App prüft dein Projekt und schlägt vor, was zu tun ist. Übernehmen oder ausblenden mit einem Klick.' },
    palette: { title: 'Befehlspalette', text: 'Strg+K findet alles: Abschnitte, Seiten, Cheat-Sheet-Einträge und Claude-Befehle.' },
    planner: { title: 'Planer', text: 'Heute, Woche, Monat und Zeit pro Abschnitt: Plane mit der Zeit, die du wirklich hast.' },
    assistant: { title: 'Assistent', text: 'Strg+J öffnet Claude mit deinem Projekt als Kontext. Jede Änderung braucht deine Bestätigung.' },
    settings: { title: 'Einstellungen', text: 'Sprache, Design, KI, Daten und diese Tour. Hier kannst du die Tour jederzeit neu starten.' },
  },
}
