import { state, getProjectMedia, getCoverMedia } from '../state.js';
import { initScrollReveal } from '../interactions/reveal.js';
import { initTiltEffect } from '../interactions/tilt.js';
import { setActiveNav, scrollToTop } from '../router.js';

export function renderArchivio() {
    setActiveNav('archivio');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // Raggruppa TUTTI i progetti per anno, ordine decrescente
    const sorted = [...state.progettiData].sort((a, b) => {
        const annoA = (a.metadati && a.metadati.anno) ? a.metadati.anno : 0;
        const annoB = (b.metadati && b.metadati.anno) ? b.metadati.anno : 0;
        return annoB - annoA;
    });

    const byYear = {};
    sorted.forEach(p => {
        const y = (p.metadati && p.metadati.anno) ? p.metadati.anno : 'N/A';
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(p);
    });
    const years = Object.keys(byYear).sort((a, b) => b - a);

    let html = `
        <div class="archivio-header reveal">
            <h2 class="archivio-title">Archivio</h2>
            <p class="archivio-subtitle">Una selezione di progetti significativi, organizzati nel tempo.</p>
        </div>
        <div class="archivio-timeline">
    `;

    years.forEach((year) => {
        const progetti = byYear[year];
        html += `
            <div class="archivio-year-block reveal">
                <div class="archivio-year-label">${year}</div>
                <div class="archivio-grid">
        `;

        progetti.forEach((p) => {
            const media = getProjectMedia(p, state.portfolioStruttura);
            const coverMedia = getCoverMedia(media);

            let coverHtml = `<div class="archivio-card-cover-placeholder">—</div>`;
            if (coverMedia) {
                if (coverMedia.type === 'video') {
                    coverHtml = `<video src="${coverMedia.path}" class="archivio-card-cover-media" autoplay loop muted playsinline></video>`;
                } else {
                    coverHtml = `<img src="${coverMedia.path}" alt="${p.titolo}" class="archivio-card-cover-media">`;
                }
            }

            html += `
                <div class="archivio-card reveal" onclick="navigateTo('/${p.id}')" role="button" tabindex="0" aria-label="Apri progetto ${p.titolo}">
                    <div class="archivio-card-cover">
                        ${coverHtml}
                    </div>
                    <div class="archivio-card-info">
                        <h3 class="archivio-card-title">${p.titolo}</h3>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `</div>`;
    appContent.innerHTML = html;
    scrollToTop();
    initScrollReveal();
    initTiltEffect();
}
