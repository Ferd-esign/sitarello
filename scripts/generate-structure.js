const fs = require('fs');
const path = require('path');

const MEDIA_EXTENSIONS = new Set([
    '.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg',
    '.mp4', '.webm', '.mov', '.avi', '.m4v'
]);

function isMediaFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return MEDIA_EXTENSIONS.has(ext);
}

function naturalSort(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function scanFolderStructure(dirPath, excludeDirs = []) {
    if (!fs.existsSync(dirPath)) {
        console.warn(`[WARN] La cartella "${dirPath}" non esiste.`);
        return [];
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const structure = [];

    items.forEach(item => {
        if (item.isDirectory() && !excludeDirs.includes(item.name)) {
            const folderPath = path.join(dirPath, item.name);
            const mediaFiles = [];

            function collectMedia(currentPath, relPrefix = '') {
                const subItems = fs.readdirSync(currentPath, { withFileTypes: true });
                subItems.forEach(sub => {
                    const subRelPath = relPrefix ? `${relPrefix}/${sub.name}` : sub.name;
                    if (sub.isDirectory()) {
                        collectMedia(path.join(currentPath, sub.name), subRelPath);
                    } else if (sub.isFile() && isMediaFile(sub.name)) {
                        mediaFiles.push(subRelPath);
                    }
                });
            }

            collectMedia(folderPath);
            mediaFiles.sort(naturalSort);

            structure.push({
                Cartella: item.name,
                File: mediaFiles
            });
        }
    });

    // Ordina anche le cartelle alfabeticamente per coerenza nei JSON
    structure.sort((a, b) => a.Cartella.localeCompare(b.Cartella, 'it', { sensitivity: 'base' }));
    return structure;
}

function syncPlaygroundData(playgroundStructure, playgroundDataFile) {
    let existingData = [];
    if (fs.existsSync(playgroundDataFile)) {
        try {
            existingData = JSON.parse(fs.readFileSync(playgroundDataFile, 'utf-8'));
        } catch (e) {
            existingData = [];
        }
    }

    let updated = false;
    playgroundStructure.forEach(item => {
        const folderName = item.Cartella;
        const exists = existingData.some(p => p.cartella.toLowerCase() === folderName.toLowerCase() || p.id.toLowerCase() === folderName.toLowerCase());
        if (!exists) {
            const titleFormatted = folderName.charAt(0).toUpperCase() + folderName.slice(1).replace(/[-_]/g, ' ');
            existingData.push({
                id: folderName.toLowerCase(),
                cartella: folderName,
                titolo: titleFormatted,
                titoloEvocativo: "Esperimento visivo e di codice",
                descrizione: `Progetto sperimentale programmato della sezione Playground: ${titleFormatted}.`,
                url: `Playground/${folderName}/index.html`,
                metadati: {
                    progetto: ["Interactive", "Creative Coding"],
                    anno: new Date().getFullYear()
                }
            });
            updated = true;
        }
    });

    if (updated || !fs.existsSync(playgroundDataFile)) {
        fs.writeFileSync(playgroundDataFile, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log(`✨ [Playground] Sincronizzato dati progetti in: Playground/playground-data.json`);
    }
}

function buildStructure() {
    console.log("⚡ Scansione in corso per la generazione automatica delle strutture media...");

    const progettiDir = path.join(__dirname, '..', 'Progetti');
    const archivioDir = path.join(__dirname, '..', 'Progetti', 'Archivio');
    const playgroundDir = path.join(__dirname, '..', 'Playground');

    const progettiOutputFile = path.join(progettiDir, 'portfolio-struttura.json');
    const archivioOutputFile = path.join(archivioDir, 'struttura-archivio.json');
    const playgroundOutputFile = path.join(playgroundDir, 'struttura-playground.json');
    const playgroundDataFile = path.join(playgroundDir, 'playground-data.json');

    // 1. Scansione Progetti (escludendo 'Archivio')
    const progettiStructure = scanFolderStructure(progettiDir, ['Archivio']);
    fs.writeFileSync(progettiOutputFile, JSON.stringify(progettiStructure, null, 2), 'utf-8');
    console.log(`✅ [Progetti] Mappatura salvata in: Progetti/portfolio-struttura.json (${progettiStructure.length} cartelle)`);

    // 2. Scansione Archivio
    const archivioStructure = scanFolderStructure(archivioDir);
    fs.writeFileSync(archivioOutputFile, JSON.stringify(archivioStructure, null, 2), 'utf-8');
    console.log(`✅ [Archivio] Mappatura salvata in: Progetti/Archivio/struttura-archivio.json (${archivioStructure.length} cartelle)`);

    // 3. Scansione Playground
    const playgroundStructure = scanFolderStructure(playgroundDir);
    fs.writeFileSync(playgroundOutputFile, JSON.stringify(playgroundStructure, null, 2), 'utf-8');
    console.log(`✅ [Playground] Mappatura salvata in: Playground/struttura-playground.json (${playgroundStructure.length} cartelle)`);

    // Sincronizza i progetti del playground
    syncPlaygroundData(playgroundStructure, playgroundDataFile);
}

function watchMode() {
    buildStructure();

    const watchDirs = [path.join(__dirname, '..', 'Progetti'), path.join(__dirname, '..', 'Playground')];
    console.log(`\n👀 [WATCH MODE] In ascolto su modifiche nelle cartelle dei progetti...`);

    let debounceTimer = null;
    watchDirs.forEach(wDir => {
        if (!fs.existsSync(wDir)) return;
        fs.watch(wDir, { recursive: true }, (eventType, filename) => {
            if (!filename) return;

            // Ignora modifiche ai file JSON generati per evitare loop infiniti
            if (filename.endsWith('.json')) return;

            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log(`\n🔄 Rilevata modifica (${eventType}) su: ${filename}`);
                buildStructure();
            }, 300);
        });
    });
}

const args = process.argv.slice(2);
if (args.includes('--watch') || args.includes('-w')) {
    watchMode();
} else {
    buildStructure();
}
