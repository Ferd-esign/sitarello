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
            const files = fs.readdirSync(folderPath, { withFileTypes: true });

            const mediaFiles = files
                .filter(f => f.isFile() && isMediaFile(f.name))
                .map(f => f.name)
                .sort(naturalSort);

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

function buildStructure() {
    console.log("⚡ Scansione in corso per la generazione automatica delle strutture media...");

    const progettiDir = path.join(__dirname, 'Progetti');
    const archivioDir = path.join(__dirname, 'Progetti', 'Archivio');

    const progettiOutputFile = path.join(progettiDir, 'portfolio-struttura.json');
    const archivioOutputFile = path.join(archivioDir, 'struttura-archivio.json');

    // 1. Scansione Progetti (escludendo 'Archivio')
    const progettiStructure = scanFolderStructure(progettiDir, ['Archivio']);
    fs.writeFileSync(progettiOutputFile, JSON.stringify(progettiStructure, null, 2), 'utf-8');
    console.log(`✅ [Progetti] Mappatura salvata in: Progetti/portfolio-struttura.json (${progettiStructure.length} cartelle)`);

    // 2. Scansione Archivio
    const archivioStructure = scanFolderStructure(archivioDir);
    fs.writeFileSync(archivioOutputFile, JSON.stringify(archivioStructure, null, 2), 'utf-8');
    console.log(`✅ [Archivio] Mappatura salvata in: Progetti/Archivio/struttura-archivio.json (${archivioStructure.length} cartelle)`);
}

function watchMode() {
    buildStructure();

    const watchDir = path.join(__dirname, 'Progetti');
    console.log(`\n👀 [WATCH MODE] In ascolto su modifiche in "${watchDir}"...`);

    let debounceTimer = null;
    fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Ignora modifiche ai file JSON generati per evitare loop infiniti
        if (filename.endsWith('.json')) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log(`\n🔄 Rilevata modifica (${eventType}) su: ${filename}`);
            buildStructure();
        }, 300);
    });
}

const args = process.argv.slice(2);
if (args.includes('--watch') || args.includes('-w')) {
    watchMode();
} else {
    buildStructure();
}
