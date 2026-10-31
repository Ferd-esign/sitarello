# Guida Operativa all'Uso delle Skill di Ingestione Portfolio
> **Ferdinando Virno — Design Sistemico & Portfolio Architecture**  
> *Cheat sheet per l'integrazione automatica di nuovi progetti, esperimenti e contenuti.*

---

## ⚡ Quick Start: Come Invocare le Skill

Quando hai pronto un nuovo progetto o materiale da inserire, basta aprire la chat dell'assistente AI e incollare **uno di questi comandi**, sostituendo il nome o il percorso della cartella:

```text
@skill-page-work Integra la cartella progetto "Percorso/Cartella" --prime=true
```
```text
@skill-page-playground Integra la cartella progetto "Percorso/Cartella"
```
```text
@skill-page-archive Integra la cartella progetto "Percorso/Cartella"
```
```text
@skill-page-manifesti Integra manifesto "Titolo" --data="Aprile 2026" --descrizione="Breve testo"
```
```text
@skill-page-about Aggiorna profilo con "Percorso/NuovoCV_2026.pdf"
```
```text
@skill-site-audit Controlla lo stato di salute, integrità dati e pesi dei media
```

L'assistente si occuperà in totale autonomia di:
1. Validare i file multimediali e i percorsi.
2. Copiare gli asset nella cartella genitore corretta (`Progetti/`, `Playground/` o `Personal Branding/`).
3. Aggiornare lo schema dati JSON (`progetti-data.json`, `playground-data.json`, `BIO-ABOUT-US.json`).
4. Eseguire gli script di mapping file e SEO (`generate-structure.js` e `generate-seo.js`).
5. Mostrare un riassunto sintetico con il diff delle modifiche.

---

## 📁 1. Come Preparare la Cartella del Progetto

Per ottenere il massimo risultato senza dover fare correzioni manuali, prepara la cartella seguendo queste semplici convenzioni:

### A. Progetti & Case Study (`skill-page-work` e `skill-page-archive`)
```text
NomeProgetto/
├── COPERTINA.mp4           <- (o copertina.webp / .jpg, rapporto 16:9)
├── 01_concept.webp         <- File ordinati con numerazione progressiva
├── 02_dettaglio.webp
├── 03_video-loop.mp4
└── note.txt                <- (Opzionale ma utile con Titolo, Cliente, Anno, Testo)
```

**Esempio di `note.txt` consigliato:**
```text
Titolo: Collezione Tratti
Titolo Evocativo: Segni archeologici di Pompei
Cliente: Ma.Vi. Ceramica
Settore: Ceramica / Design di Prodotto
Anno: 2024
Tipologia: Prodotto, Comunicazione
Descrizione: Ricerca tra le domus di Pompei tradotta in mattonelle ceramiche d'autore...
```

### B. Prototipi & Esperimenti di Codice (`skill-page-playground`)
```text
NomeEsperimento/
├── index.html              <- ENTRY POINT OBBLIGATORIO (autonomo)
├── style.css               <- Con percorsi relativi (es. ./style.css)
├── script.js
├── copertina.webp          <- Anteprima per la griglia (rapporto 4:3)
└── note.txt                <- Tag tecnici (Three.js, Creative Coding, Web Audio, ecc.)
```

### C. Manifesti & Grafiche (`skill-page-manifesti`)
```text
NomeManifesto/
├── 01_anteprima.mp4        <- PRIMO FILE = ANTEPRIMA (se video va in loop)
├── 02_versione-dark.jpg    <- Versioni alternative visibili nella modale
├── 03_versione-light.jpg
└── note.txt                <- (Opzionale: Titolo, Data es. "Aprile 2026", Descrizione)
```
*Oppure allega direttamente i file e il testo nella chat!*

---

## 🎯 2. Mappa di Scelta Rapida: Quale Skill Usare?

| Situazione / Contenuto | Skill da Invocare | Dove finisce il progetto? |
| :--- | :--- | :--- |
| **Nuovo case study principale** da mostrare in prima pagina | `@skill-page-work ... --prime=true` | **Home Page (`/`)**, pagina di dettaglio dedicata (`/${id}`) e **Archivio**. |
| **Case study secondario** o lavoro di commessa senza Home | `@skill-page-work ... --prime=false` | Pagina dedicata (`/${id}`) e **Archivio** (`/archivio`). |
| **Esperimento web, 3D, canvas, web tool interattivo** | `@skill-page-playground ...` | Griglia **Playground** (`/playground`) e visualizzatore iframe fullscreen. |
| **Progetto storico/passato** da inserire solo nella timeline | `@skill-page-archive ...` | Catalogo **Archivio** raggruppato sotto il rispettivo anno. |
| **Nuovo CV PDF, nuova foto bio o nuove esperienze** | `@skill-page-about ...` | Pagina **About** (`/about`) e cartella `Personal Branding/`. |
| **Controllo salute, pesi media e integrità JSON** | `@skill-site-audit ...` | Report diagnostico e verifica 100% dell'intero portfolio. |

---

## 📐 3. Regole d'Oro per i Media (Pesi & Formati)

1. **Formati Raccomandati:**
   - **Immagini:** `.webp` (ottimale per web), `.jpg`, `.png`, `.svg`.
   - **Video:** `.mp4` (codec standard H.264, audio compresso o assente) o `.webm`.
   - 🚫 *Evitare assolutamente formati non ottimizzati per il web:* `.psd`, `.ai`, `.raw`, `.tiff`, `.bmp`.
2. **Parola Chiave Copertina:**
   - Affinché il sistema assegni la copertina corretta in automatico, assicurati che il file contenga `copertina` nel nome (es. `COPERTINA.mp4`, `00_copertina.webp`).
3. **Rapporti d'Aspetto (Aspect Ratio):**
   - **Work (Home & Dettaglio):** `16:9` widescreen per la copertina e gallerie a larghezza piena.
   - **Playground & Archivio:** `4:3` per le card di anteprima nella griglia.

---

## 🛠️ 4. Gestione Manuale di Emergenza (CLI)

Se per qualsiasi motivo modifichi a mano un file all'interno delle cartelle senza passare dall'assistente, puoi sincronizzare o verificare il portfolio in qualsiasi momento aprendo il terminale nella root del progetto:

```bash
# 1. Rigenera le strutture JSON dei file e la Sitemap XML (Build completa)
npm run build

# 2. Valida l'integrità dei JSON e la presenza delle cartelle/copertine
npm run validate

# 3. Esegui l'audit di performance e salute dei media (>1MB, formati WebP)
npm run audit

# 4. Modalità continua durante il lavoro locale (watch automatico su cartelle)
npm run watch

# 5. Avvia server di sviluppo locale su http://localhost:3000
npm run dev
```

---

## 💡 5. Prompt Pronti per Casi Particolari

### Aggiornare un progetto già esistente con nuove foto o video:
```text
@skill-page-work Aggiorna il progetto esistente "sponzfest" aggiungendo i file presenti in "NuoviScattiFest/"
```

### Progetto con sottoprogetti (es. Tesi divisa in due capitoli):
```text
@skill-page-work Integra la cartella progetto "TesiSociale" creando due sottoprogetti: "Capitolo1" e "Capitolo2"
```

### Aggiungere un nuovo video YouTube a un progetto:
```text
@skill-page-work Aggiungi il video YouTube "ID_VIDEO_YOUTUBE" con titolo "Titolo Video" al progetto "tratti"
```
