import type { TutorialLocale } from '../content'

export const en: TutorialLocale = {
  lessons: {
    start: {
      title: 'Start: your project and Unity',
      intro: 'The dashboard is the hub between Unity, Blender and Krita. Everything belongs to a project, usually one per game.',
      steps: [
        'On the welcome page, choose "Open Unity project" and pick the folder that contains Assets and ProjectSettings.',
        'Optionally let the app link the images, sounds and models that are already in Assets.',
        'The start page (Overview) now shows tiles for Unity, Blender and Krita, your inbox, suggestions and next steps.',
        'Switch projects with the project menu at the top of the navigation.',
      ],
      tip: 'Nothing is copied when you link files: the dashboard only remembers where they are.',
    },
    plugins: {
      title: 'Install the plugins',
      intro: 'Small plugins connect Unity, Blender and Krita with the dashboard. They talk only to this computer and only run fixed commands.',
      steps: [
        'Open the Unity page and click "Install". The package is copied into Packages of your Unity project.',
        'Open the Blender page and install the add-on, then enable "Gamedev Dashboard" in Blender under Preferences > Add-ons.',
        'Open the Krita page and install the plugin, then enable it in Krita under Settings > Configure Krita > Python Plugin Manager and restart Krita.',
        'When a program is running, its tile on the start page shows "connected".',
      ],
      tip: 'You can switch the connection off at any time in Settings > General.',
    },
    assets: {
      title: 'Assets and the inbox',
      intro: 'Concept art, inspiration, models and audio each have their own section. New files land in the inbox first.',
      steps: [
        'Drag files from Explorer anywhere into the window. They are sorted automatically by type and name.',
        'Move a card to another column if the category is wrong. The app learns from it and sorts better next time.',
        'In the inbox on the start page, take new exports into the project with one click or send them straight to Unity.',
        'Suggestions point out missing files, wrong categories and other things worth a look.',
      ],
      tip: 'With Claude switched on, "Sort with Claude" suggests categories and tags for a whole board.',
    },
    blender: {
      title: 'Blender: export automatically',
      intro: 'With the add-on, every save in Blender exports a Unity-ready FBX or GLB and checks the model.',
      steps: [
        'Link an export folder on the Blender page.',
        'Save in Blender (Ctrl+S). The add-on exports with the right axes and scale.',
        'The model check reports unapplied scale, missing UVs, faces with more than four corners and very high triangle counts.',
        'Turn on auto import, and if you like, "copy into Unity" too: the same file is then updated in Unity on every export.',
      ],
      tip: 'In 3D models you can rotate the model, compare it with concept art and create a prefab in Unity.',
    },
    krita: {
      title: 'Krita: paint and use it in the game',
      intro: 'The Krita plugin exports a PNG on every save and can export each layer as its own sprite.',
      steps: [
        'Link the Krita folder on the Krita page.',
        'Save your .kra file. The PNG appears in the inbox or, with auto import, directly in Concept Art.',
        'Use "Export layers as sprites" for characters or tilesets made of layers.',
        'For pixel art, turn on "Pixel art" on the Unity page: sprites are imported sharp and uncompressed.',
      ],
      tip: '.kra files show a preview in the dashboard even without Krita.',
    },
    planning: {
      title: 'Goals and time planning',
      intro: 'Goals have steps and a progress bar. The planner shows how much time you really have.',
      steps: [
        'Create a goal under Goals, split it into steps and set a deadline and an estimate in hours.',
        'In Planner > Week, enter when you work or have school and when you have time for gamedev. Templates help you start.',
        'Planner > Month shows free hours per day. Click a day to mark it free or busy.',
        'Planner > Time per section compares planned hours with the time you logged and warns when a deadline does not fit.',
        'Start the timer (Ctrl+T) and pick a goal or section, so the time is counted there.',
      ],
      tip: 'If a deadline is at risk, a suggestion appears on the start page.',
    },
    workspace: {
      title: 'Pages, tables and nodes',
      intro: 'Everything you would otherwise write in Notion, OneNote or Obsidian lives here, next to your game.',
      steps: [
        'Pages are documents made of blocks: headings, lists, checklists, images and tables. Write **bold**, *italic* and `code`.',
        'Create sub-pages for a page tree, and link pages with [[Title]]. Backlinks show who links to a page.',
        'Tables have typed columns and can be shown as a table, kanban board, calendar or gallery.',
        'Nodes is a canvas where goals, pages, assets and notes become cards that you connect.',
      ],
      tip: 'Use "Today" in Pages for a devlog entry per day.',
    },
    knowledge: {
      title: 'Cheat sheet and brainstorm',
      intro: 'The cheat sheet explains Unity 6 step by step, with code you can copy. Brainstorm turns an idea into a plan.',
      steps: [
        'Filter the cheat sheet by 2D or 3D and by view, or search for an error message.',
        'Copy code with one click, or take the steps of an entry over as a goal.',
        'In Brainstorm, describe an idea. The app finds matching cheat sheet entries; with Claude it writes a complete plan.',
        'Unity errors from the plugin have a "Find help" button that opens the matching entry.',
      ],
      tip: 'Your own entries in the cheat sheet are searchable like the built-in ones.',
    },
    claude: {
      title: 'Claude: API key or Claude Code',
      intro: 'Claude can research, plan, sort and write scripts. Nothing is changed without your confirmation.',
      steps: [
        'In Settings > AI, choose how to connect: an API key (paid per use) or your installed Claude Code (uses your subscription).',
        'The API key is stored in the Windows credential store, never in the data file.',
        'Open the assistant with Ctrl+J. It knows your project and suggests actions you can check one by one.',
        'The usage overview shows tokens and estimated costs; a monthly limit warns you in time.',
      ],
      tip: 'Only titles, names and notes are sent, never the content of your files.',
    },
    templates: {
      title: 'Templates',
      intro: 'Templates give you a head start: goals, pages, tables and time budgets for a type of game.',
      steps: [
        'Open Templates and filter by 2D or 3D.',
        'Click a template to see everything it creates, including the C# scripts.',
        'Install it into the current project or as a new project. "Remove" takes it out again.',
        'Share your own project as a template with "Export as template".',
      ],
      tip: 'Scripts are only copied into Unity when you click "Copy to Unity" after reading them.',
    },
    backup: {
      title: 'Backup, undo and export',
      intro: 'Your data stays on your computer. Several safety nets protect it.',
      steps: [
        'Ctrl+Z undoes the last change everywhere in the app, Ctrl+Y redoes it.',
        'Every day a snapshot of your data is kept (the last 14). Restore one in Settings > Data.',
        'Choose a backup folder, for example in your cloud drive, to get a copy of every snapshot there.',
        'Export a project as JSON or Markdown, or import notes from Obsidian and Notion.',
      ],
      tip: 'Ctrl+Shift+Space opens a quick note even when the window is in the background.',
    },
    firstgame: {
      title: 'Mini course: your first game',
      intro: 'Fifteen cheat sheet entries in a good order take you from an empty Unity project to a finished 2D platformer build.',
      steps: [
        'Read the entries below one after the other; each one has steps and code.',
        'Click "Create as goal" to get a goal with one step per entry.',
        'Tick a step when the entry works in your project.',
        'Do not skip the build at the end: a finished small game teaches more than a big unfinished one.',
      ],
      tip: 'Stuck? Search the error message in the cheat sheet or ask the assistant.',
    },
  },
  tour: {
    nav: { title: 'Navigation', text: 'Sections are grouped: Plan, Knowledge, Assets and Tools. Click a group name to fold it.' },
    hub: { title: 'Your hub', text: 'Unity, Blender and Krita at a glance. A click opens the page of the program.' },
    suggest: { title: 'Suggestions', text: 'The app checks your project and suggests what to do. Apply or dismiss with one click.' },
    palette: { title: 'Command palette', text: 'Ctrl+K finds everything: sections, pages, cheat sheet entries and Claude commands.' },
    planner: { title: 'Planner', text: 'Today, week, month and time per section: plan with the time you really have.' },
    assistant: { title: 'Assistant', text: 'Ctrl+J opens Claude with your project as context. Every change needs your confirmation.' },
    settings: { title: 'Settings', text: 'Language, theme, AI, data and this tour. You can restart the tour here at any time.' },
  },
}
