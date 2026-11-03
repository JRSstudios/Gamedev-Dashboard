import type { TutorialLocale } from '../content'

export const it: TutorialLocale = {
  lessons: {
    start: {
      title: 'Inizio: il tuo progetto e Unity',
      intro: 'La dashboard è il centro tra Unity, Blender e Krita. Tutto appartiene a un progetto, di solito uno per gioco.',
      steps: [
        'Nella pagina di benvenuto scegli "Apri progetto Unity" e la cartella che contiene Assets e ProjectSettings.',
        'Se vuoi, l\'app collega le immagini, i suoni e i modelli già presenti in Assets.',
        'La pagina iniziale (Panoramica) mostra ora i riquadri di Unity, Blender e Krita, la tua casella in arrivo, i suggerimenti e i prossimi passi.',
        'Cambi progetto con il menu dei progetti in alto nella navigazione.',
      ],
      tip: 'Collegare i file non copia nulla: la dashboard ricorda solo dove si trovano.',
    },
    plugins: {
      title: 'Installare i plugin',
      intro: 'Piccoli plugin collegano Unity, Blender e Krita alla dashboard. Comunicano solo con questo computer ed eseguono solo comandi fissi.',
      steps: [
        'Apri la pagina Unity e clicca "Installa". Il pacchetto viene copiato in Packages del tuo progetto Unity.',
        'Apri la pagina Blender, installa l\'add-on e attiva "Gamedev Dashboard" in Blender sotto Preferenze > Add-on.',
        'Apri la pagina Krita, installa il plugin, attivalo in Krita sotto Impostazioni > Configura Krita > Gestore plugin Python e riavvia Krita.',
        'Quando un programma è aperto, il suo riquadro nella pagina iniziale mostra "collegato".',
      ],
      tip: 'Puoi disattivare il collegamento in qualsiasi momento in Impostazioni > Generale.',
    },
    assets: {
      title: 'Asset e casella in arrivo',
      intro: 'Concept art, ispirazione, modelli e audio hanno ognuno la propria sezione. I nuovi file arrivano prima nella casella in arrivo.',
      steps: [
        'Trascina i file da Esplora risorse in un punto qualsiasi della finestra. Vengono ordinati automaticamente per tipo e nome.',
        'Se la categoria è sbagliata, sposta la scheda in un\'altra colonna. L\'app impara e la volta dopo ordina meglio.',
        'Nella casella in arrivo della pagina iniziale aggiungi le nuove esportazioni al progetto con un clic o le mandi direttamente a Unity.',
        'I suggerimenti segnalano file mancanti, categorie sbagliate e altre cose da controllare.',
      ],
      tip: 'Con Claude attivo, "Ordina con Claude" propone categorie e tag per un\'intera vista.',
    },
    blender: {
      title: 'Blender: esportare automaticamente',
      intro: 'Con l\'add-on ogni salvataggio in Blender esporta un FBX o GLB pronto per Unity e controlla il modello.',
      steps: [
        'Collega una cartella di esportazione nella pagina Blender.',
        'Salva in Blender (Ctrl+S). L\'add-on esporta con gli assi e la scala giusti.',
        'Il controllo del modello segnala scala non applicata, UV mancanti, facce con più di quattro vertici e troppi triangoli.',
        'Attiva l\'importazione automatica e, se vuoi, "copia in Unity": a ogni esportazione lo stesso file viene aggiornato in Unity.',
      ],
      tip: 'In Modelli 3D puoi ruotare il modello, confrontarlo con la concept art e creare un prefab in Unity.',
    },
    krita: {
      title: 'Krita: dipingere e usarlo nel gioco',
      intro: 'Il plugin di Krita esporta un PNG a ogni salvataggio e può esportare ogni livello come sprite separato.',
      steps: [
        'Collega la cartella di Krita nella pagina Krita.',
        'Salva il file .kra. Il PNG appare nella casella in arrivo o, con l\'importazione automatica, direttamente in Concept art.',
        'Usa "Esporta livelli come sprite" per personaggi o tileset fatti di livelli.',
        'Per la pixel art attiva "Pixel art" nella pagina Unity: gli sprite vengono importati nitidi e senza compressione.',
      ],
      tip: 'I file .kra mostrano un\'anteprima nella dashboard anche senza Krita.',
    },
    planning: {
      title: 'Obiettivi e pianificazione del tempo',
      intro: 'Gli obiettivi hanno passi e una barra di avanzamento. Il pianificatore mostra quanto tempo hai davvero.',
      steps: [
        'Crea un obiettivo in Obiettivi, dividilo in passi e imposta una scadenza e una stima in ore.',
        'In Pianificatore > Settimana indica quando lavori o vai a scuola e quando hai tempo per il gamedev. I modelli aiutano a iniziare.',
        'Pianificatore > Mese mostra le ore libere per giorno. Clicca un giorno per segnarlo libero o occupato.',
        'Pianificatore > Tempo per sezione confronta le ore pianificate con il tempo registrato e avvisa se una scadenza non torna.',
        'Avvia il timer (Ctrl+T) e scegli un obiettivo o una sezione, così il tempo viene contato lì.',
      ],
      tip: 'Se una scadenza è a rischio, compare un suggerimento nella pagina iniziale.',
    },
    workspace: {
      title: 'Pagine, tabelle e nodi',
      intro: 'Tutto quello che scriveresti in Notion, OneNote o Obsidian sta qui, accanto al tuo gioco.',
      steps: [
        'Le pagine sono documenti fatti di blocchi: titoli, elenchi, checklist, immagini e tabelle. Scrivi **grassetto**, *corsivo* e `codice`.',
        'Crea sottopagine per un albero di pagine e collega le pagine con [[Titolo]]. I backlink mostrano chi collega una pagina.',
        'Le tabelle hanno colonne con tipi e si possono vedere come tabella, kanban, calendario o galleria.',
        'Nodi è una tela dove obiettivi, pagine, asset e note diventano schede da collegare.',
      ],
      tip: 'Usa "Oggi" in Pagine per una voce di devlog al giorno.',
    },
    knowledge: {
      title: 'Cheat sheet e brainstorm',
      intro: 'Il cheat sheet spiega Unity 6 passo dopo passo, con codice da copiare. Brainstorm trasforma un\'idea in un piano.',
      steps: [
        'Filtra il cheat sheet per 2D o 3D e per visuale, oppure cerca un messaggio di errore.',
        'Copia il codice con un clic o trasforma i passi di una voce in un obiettivo.',
        'In Brainstorm descrivi un\'idea. L\'app trova le voci adatte del cheat sheet; con Claude scrive un piano completo.',
        'Gli errori di Unity dal plugin hanno un pulsante "Trova aiuto" che apre la voce adatta.',
      ],
      tip: 'Le tue voci nel cheat sheet sono ricercabili come quelle integrate.',
    },
    claude: {
      title: 'Claude: chiave API o Claude Code',
      intro: 'Claude può fare ricerche, pianificare, ordinare e scrivere script. Nulla cambia senza la tua conferma.',
      steps: [
        'In Impostazioni > IA scegli il collegamento: una chiave API (a pagamento per uso) o il tuo Claude Code installato (usa il tuo abbonamento).',
        'La chiave API è salvata nell\'archivio credenziali di Windows, mai nel file dei dati.',
        'Apri l\'assistente con Ctrl+J. Conosce il tuo progetto e propone azioni da controllare una per una.',
        'La panoramica dei consumi mostra token e costi stimati; un limite mensile ti avvisa in tempo.',
      ],
      tip: 'Vengono inviati solo titoli, nomi e note, mai il contenuto dei tuoi file.',
    },
    templates: {
      title: 'Template',
      intro: 'I template ti danno un vantaggio: obiettivi, pagine, tabelle e budget di tempo per un tipo di gioco.',
      steps: [
        'Apri Template e filtra per 2D o 3D.',
        'Clicca un template per vedere tutto ciò che crea, compresi gli script C#.',
        'Installalo nel progetto attuale o come nuovo progetto. "Rimuovi" lo toglie di nuovo.',
        'Condividi il tuo progetto con "Esporta come template".',
      ],
      tip: 'Gli script vengono copiati in Unity solo quando, dopo averli letti, clicchi "Copia in Unity".',
    },
    backup: {
      title: 'Backup, annulla ed esporta',
      intro: 'I tuoi dati restano sul tuo computer. Diverse reti di sicurezza li proteggono.',
      steps: [
        'Ctrl+Z annulla l\'ultima modifica ovunque nell\'app, Ctrl+Y la ripristina.',
        'Ogni giorno viene conservata un\'istantanea dei dati (le ultime 14). Ripristinala in Impostazioni > Dati.',
        'Scegli una cartella di backup, per esempio nel cloud, per avere lì una copia di ogni istantanea.',
        'Esporta un progetto come JSON o Markdown, oppure importa note da Obsidian e Notion.',
      ],
      tip: 'Ctrl+Maiusc+Spazio apre una nota veloce anche quando la finestra è in secondo piano.',
    },
    firstgame: {
      title: 'Mini corso: il tuo primo gioco',
      intro: 'Quindici voci del cheat sheet in un buon ordine ti portano da un progetto Unity vuoto alla build di un platform 2D finito.',
      steps: [
        'Leggi le voci qui sotto una dopo l\'altra; ognuna ha passi e codice.',
        'Clicca "Crea come obiettivo" per avere un obiettivo con un passo per voce.',
        'Spunta un passo quando la voce funziona nel tuo progetto.',
        'Non saltare la build finale: un piccolo gioco finito insegna più di uno grande non finito.',
      ],
      tip: 'Bloccato? Cerca il messaggio di errore nel cheat sheet o chiedi all\'assistente.',
    },
  },
  tour: {
    nav: { title: 'Navigazione', text: 'Le sezioni sono raggruppate: Pianificare, Conoscenza, Asset e Strumenti. Clicca il nome di un gruppo per chiuderlo.' },
    hub: { title: 'Il tuo centro', text: 'Unity, Blender e Krita a colpo d\'occhio. Un clic apre la pagina del programma.' },
    suggest: { title: 'Suggerimenti', text: 'L\'app controlla il progetto e propone cosa fare. Applica o nascondi con un clic.' },
    palette: { title: 'Palette dei comandi', text: 'Ctrl+K trova tutto: sezioni, pagine, voci del cheat sheet e comandi di Claude.' },
    planner: { title: 'Pianificatore', text: 'Oggi, settimana, mese e tempo per sezione: pianifica con il tempo che hai davvero.' },
    assistant: { title: 'Assistente', text: 'Ctrl+J apre Claude con il tuo progetto come contesto. Ogni modifica richiede la tua conferma.' },
    settings: { title: 'Impostazioni', text: 'Lingua, tema, IA, dati e questo tour. Qui puoi riavviare il tour in qualsiasi momento.' },
  },
}
