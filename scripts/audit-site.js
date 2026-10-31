#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const MEDIA_EXTS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.mp4', '.webm', '.mov', '.avi']);

const MAX_IMAGE_SIZE_KB = 1024; // 1 MB
const CRITICAL_IMAGE_SIZE_KB = 2048; // 2 MB
const MAX_VIDEO_SIZE_MB = 15; // 15 MB
const CRITICAL_VIDEO_SIZE_MB = 30; // 30 MB

const stats = {
    totalFiles: 0,
    totalSizeBytes: 0,
    images: { total: 0, webp: 0, legacy: 0, heavy: 0 },
    videos: { total: 0, heavy: 0 },
    other: 0,
    heavyFiles: [],
    legacyImages: []
};

function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        if (item.name === '.DS_Store' || item.name === 'node_modules') continue;
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            scanDir(fullPath);
        } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            const relPath = path.relative(ROOT_DIR, fullPath);
            const size = fs.statSync(fullPath).size;

            stats.totalFiles++;
            stats.totalSizeBytes += size;

            const isVideo = ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
            const isImage = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext);

            if (isVideo) {
                stats.videos.total++;
                const sizeMB = size / (1024 * 1024);
                if (sizeMB > MAX_VIDEO_SIZE_MB) {
                    stats.videos.heavy++;
                    stats.heavyFiles.push({ path: relPath, size, type: 'video', sizeFormatted: formatSize(size) });
                }
            } else if (isImage) {
                stats.images.total++;
                if (ext === '.webp') {
                    stats.images.webp++;
                } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                    stats.images.legacy++;
                    stats.legacyImages.push({ path: relPath, size: formatSize(size) });
                }

                const sizeKB = size / 1024;
                if (sizeKB > MAX_IMAGE_SIZE_KB) {
                    stats.images.heavy++;
                    stats.heavyFiles.push({ path: relPath, size, type: 'image', sizeFormatted: formatSize(size) });
                }
            }
        }
    }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('   AUDIT SALUTE E PERFORMANCE MEDIA PORTFOLIO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

scanDir(path.join(ROOT_DIR, 'Progetti'));
scanDir(path.join(ROOT_DIR, 'Playground'));
scanDir(path.join(ROOT_DIR, 'Personal Branding'));

console.log(`📦 Peso complessivo media: \x1b[1m${formatSize(stats.totalSizeBytes)}\x1b[0m su ${stats.totalFiles} file analizzati.`);
console.log(`🖼️  Immagini: ${stats.images.total} (WebP: \x1b[32m${stats.images.webp}\x1b[0m, Standard/PNG/JPG: \x1b[33m${stats.images.legacy}\x1b[0m)`);
console.log(`🎥 Video: ${stats.videos.total}`);

if (stats.heavyFiles.length > 0) {
    console.log('\n\x1b[33m⚠️  File pesanti che consigliano ulteriore compressione:\x1b[0m');
    stats.heavyFiles.sort((a, b) => b.size - a.size).forEach(f => {
        console.log(`  • [${f.type.toUpperCase()}] ${f.path} (${f.sizeFormatted})`);
    });
} else {
    console.log('\n\x1b[32m✓ Nessun file supera le soglie di peso critiche!\x1b[0m');
}

if (stats.legacyImages.length > 0) {
    console.log('\n\x1b[36m💡 Opportunità di ottimizzazione WebP:\x1b[0m');
    stats.legacyImages.slice(0, 5).forEach(f => {
        console.log(`  • ${f.path} (${f.size}) -> convertibile in WebP`);
    });
    if (stats.legacyImages.length > 5) {
        console.log(`  ... e altri ${stats.legacyImages.length - 5} file.`);
    }
}

// Calcolo punteggio salute (0-100)
let score = 100;
score -= stats.heavyFiles.length * 5;
if (stats.images.total > 0) {
    const nonWebpRatio = stats.images.legacy / stats.images.total;
    score -= Math.round(nonWebpRatio * 15);
}
score = Math.max(20, Math.min(100, score));

let scoreColor = '\x1b[32m'; // verde
if (score < 80) scoreColor = '\x1b[33m'; // giallo
if (score < 60) scoreColor = '\x1b[31m'; // rosso

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Punteggio Salute Asset: ${scoreColor}\x1b[1m${score} / 100\x1b[0m`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
