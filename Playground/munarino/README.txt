MUNARINO — istruzioni rapide
=============================

1. Carica l'intera cartella "munarino" in una sottocartella del tuo sito
   (es. tuosito.it/munarino/).

2. Aggiungi nella stessa cartella le due immagini della card, con questi
   nomi esatti:
     - fronte.jpg   (o fronte.png — in tal caso aggiorna il percorso in script.js)
     - retro.jpg    (o retro.png)

   Consiglio: immagini con rapporto 85:55 (come un biglietto da visita),
   almeno 1000×650 px, per una resa nitida su schermi ad alta densità.

3. Apri index.html: la card apparirà sospesa al centro. Si può ruotare
   liberamente con il drag del mouse (desktop) o con il dito (touch).

4. Il bottone in basso "Accendi un'idea per il munarino" apre una modale
   con il video YouTube in modalità nocookie. Si chiude con la X,
   cliccando fuori dalla finestra, o con il tasto Esc.

File del progetto:
  index.html   — struttura della pagina e overlay UI
  style.css    — stile minimale (palette, tipografia, modale, responsive)
  script.js    — scena three.js: card 3D, luci, controlli, gestione modale

Nota tecnica: three.js e OrbitControls vengono caricati via CDN (unpkg)
come moduli ES tramite import map — non serve installare nulla, basta
una connessione internet quando la pagina viene visitata.
