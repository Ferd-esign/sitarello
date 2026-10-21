#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PROGETTI_DATA_PATH = path.join(ROOT_DIR, 'Progetti', 'progetti-data.json');
const PLAYGROUND_DATA_PATH = path.join(ROOT_DIR, 'Playground', 'playground-data.json');
const BIO_DATA_PATH = path.join(ROOT_DIR, 'Personal Branding', 'BIO-ABOUT-US.json');
const PROGETTI_DIR = path.join(ROOT_DIR, 'Progetti');
const PLAYGROUND_DIR = path.join(ROOT_DIR, 'Playground');
const BRANDING_DIR = path.join(ROOT_DIR, 'Personal Branding');

let errorCount = 0;
let warnCount = 0;
let passCount = 0;

function logPass(msg) {
    console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
    passCount++;
}

function logWarn(msg) {
    console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
    warnCount++;
}

function logError(msg) {
    console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
    errorCount++;
}

function readJSON(filePath, label) {
    if (!fs.existsSync(filePath)) {
        logError(`${label}: file non trovato in ${path.relative(ROOT_DIR, filePath)}`);
        return null;
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        logError(`${label}: errore di sintassi JSON (${e.message})`);
        return null;
    }
}

function validateProgetti() {
    console.log('\n\x1b[1m🔍 [1/3] Validazione Progetti (progetti-data.json)\x1b[0m');
    const data = readJSON(PROGETTI_DATA_PATH, 'Progetti');
    if (!data) return;

    if (!Array.isArray(data)) {
        logError('progetti-data.json deve contenere un array di oggetti.');
        return;
    }

    logPass(`Array JSON valido (${data.length} progetti registrati).`);

    const ids = new Set();

    data.forEach((p, idx) => {
        const pLabel = p.titolo ? `"${p.titolo}" (ID: ${p.id || 'mancante'})` : `Progetto #${idx + 1}`;

        // ID univoco
        if (!p.id || typeof p.id !== 'string') {
            logError(`${pLabel}: campo "id" mancante o non valido.`);
        } else if (ids.has(p.id.toLowerCase())) {
            logError(`${pLabel}: ID duplicato "${p.id}". Gli ID devono essere univoci.`);
        } else {
            ids.add(p.id.toLowerCase());
        }

        // Cartella fisica
        if (!p.cartella) {
            logError(`${pLabel}: campo "cartella" mancante.`);
        } else {
            // Risolvi se cartella fisica speciale (es. NLM -> Tesi)
            const standardDir = path.join(PROGETTI_DIR, p.cartella);
            const tesiSpecial = (p.cartella.toLowerCase() === 'nlm') ? path.join(PROGETTI_DIR, 'Tesi') : null;
            const targetDir = (tesiSpecial && fs.existsSync(tesiSpecial)) ? tesiSpecial : standardDir;

            if (!fs.existsSync(targetDir)) {
                logError(`${pLabel}: cartella fisica non trovata sul disco: ${path.relative(ROOT_DIR, standardDir)}`);
            } else {
                // Controllo file copertina
                const files = fs.readdirSync(targetDir);
                const hasCover = files.some(f => f.toLowerCase().includes('copertina'));
                if (hasCover) {
                    logPass(`${pLabel}: cartella presente con file copertina.`);
                } else {
                    logWarn(`${pLabel}: nessun file contiene 'copertina' nel nome. Verrà usato il primo file disponibile come fallback.`);
                }
            }
        }

        // Campi descrittivi
        if (!p.descrizione || p.descrizione.trim().length < 20) {
            logWarn(`${pLabel}: descrizione breve o mancante.`);
        }
        if (!p.metadati || typeof p.metadati !== 'object') {
            logError(`${pLabel}: oggetto "metadati" mancante.`);
        } else {
            if (!p.metadati.anno) logWarn(`${pLabel}: anno mancante nei metadati.`);
            if (!p.metadati.settore) logWarn(`${pLabel}: settore mancante nei metadati.`);
        }

        // Sottoprogetti
        if (p.sottoprogetti && Array.isArray(p.sottoprogetti)) {
            p.sottoprogetti.forEach((sub, sIdx) => {
                const subLabel = `  └─ Sottoprogetto "${sub.titolo || sub.id || sIdx + 1}"`;
                if (!sub.id) logError(`${subLabel}: campo "id" mancante.`);
                if (!sub.cartella) logError(`${subLabel}: campo "cartella" mancante.`);
                if (!sub.descrizione) logWarn(`${subLabel}: descrizione mancante.`);
            });
        }
    });
}

function validatePlayground() {
    console.log('\n\x1b[1m🔍 [2/3] Validazione Playground (playground-data.json)\x1b[0m');
    const data = readJSON(PLAYGROUND_DATA_PATH, 'Playground');
    if (!data) return;

    if (!Array.isArray(data)) {
        logError('playground-data.json deve contenere un array di oggetti.');
        return;
    }

    logPass(`Array JSON valido (${data.length} esperimenti registrati).`);

    data.forEach((p, idx) => {
        const pLabel = p.titolo ? `"${p.titolo}" (ID: ${p.id})` : `Esperimento #${idx + 1}`;
        if (!p.id) logError(`${pLabel}: campo "id" mancante.`);

        if (!p.cartella) {
            logError(`${pLabel}: campo "cartella" mancante.`);
        } else {
            const expDir = path.join(PLAYGROUND_DIR, p.cartella);
            if (!fs.existsSync(expDir)) {
                logError(`${pLabel}: cartella non trovata: ${path.relative(ROOT_DIR, expDir)}`);
            } else {
                const indexHtml = path.join(expDir, 'index.html');
                if (!fs.existsSync(indexHtml)) {
                    logError(`${pLabel}: file entry point mancante (${path.relative(ROOT_DIR, indexHtml)})`);
                } else {
                    logPass(`${pLabel}: esperimento interattivo valido con index.html.`);
                }
            }
        }
    });
}

function validateBranding() {
    console.log('\n\x1b[1m🔍 [3/3] Validazione Personal Branding & Bio\x1b[0m');
    const bio = readJSON(BIO_DATA_PATH, 'Bio');
    if (!bio) return;

    if (!bio.claim) logWarn('Claim mancante in BIO-ABOUT-US.json.');
    if (!bio.bio) logWarn('Bio mancante in BIO-ABOUT-US.json.');
    if (!bio.link || !bio.link.email) logError('Link email mancante in BIO-ABOUT-US.json.');

    // Controlla asset essenziali
    const fotoBio = path.join(BRANDING_DIR, 'FOTO-BIO.webp');
    if (!fs.existsSync(fotoBio)) {
        logWarn('FOTO-BIO.webp non trovata in Personal Branding/.');
    } else {
        logPass('FOTO-BIO.webp presente.');
    }

    const cvFiles = fs.readdirSync(BRANDING_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    if (cvFiles.length === 0) {
        logWarn('Nessun file CV (.pdf) trovato in Personal Branding/.');
    } else {
        logPass(`File CV trovato: ${cvFiles[0]}`);
    }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('   SISTEMA DI VALIDAZIONE E INTEGRITÀ PORTFOLIO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

validateProgetti();
validatePlayground();
validateBranding();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Esito: \x1b[32m${passCount} superati\x1b[0m | \x1b[33m${warnCount} avvisi\x1b[0m | \x1b[31m${errorCount} errori\x1b[0m`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (errorCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
