import { state, getPlaygroundMedia, getCoverMedia } from '../state.js';
import { initScrollReveal } from '../interactions/reveal.js';
import { initTiltEffect } from '../interactions/tilt.js';
import { setActiveNav, scrollToTop } from '../router.js';

export function togglePlaygroundModal(show) {
    const modal = document.getElementById('pg-info-modal');
    if (!modal) return;
    if (show) {
        modal.classList.add('open');
    } else {
        modal.classList.remove('open');
    }
}

export function handlePlaygroundModalOverlayClick(event) {
    if (event.target && event.target.id === 'pg-info-modal') {
        togglePlaygroundModal(false);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePlaygroundModal(false);
    }
});

export function renderPlayground() {
    setActiveNav('playground');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    const sorted = [...state.playgroundData].sort((a, b) => {
        const annoA = (a.metadati && a.metadati.anno) ? a.metadati.anno : 0;
        const annoB = (b.metadati && b.metadati.anno) ? b.metadati.anno : 0;
        if (annoB !== annoA) return annoB - annoA;
        return a.titolo.localeCompare(b.titolo, 'it', { sensitivity: 'base' });
    });

    let html = `
        <div class="archivio-header reveal">
            <h2 class="archivio-title">Playground</h2>
            <p class="archivio-subtitle">Laboratorio di sperimentazioni visive, prototipi interattivi e progetti di codice.</p>
        </div>
        <div class="archivio-grid">
    `;

    sorted.forEach((p) => {
        const media = getPlaygroundMedia(p, state.playgroundStruttura);
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
            <div class="archivio-card reveal" onclick="navigateTo('/${p.id}')" role="button" tabindex="0" aria-label="Apri esperimento ${p.titolo}">
                <div class="archivio-card-cover">
                    ${coverHtml}
                </div>
                <div class="archivio-card-info">
                    <h3 class="archivio-card-title">${p.titolo}</h3>
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

export function renderProgettoPlayground(id) {
    const p = state.playgroundData.find(x => x.id === id);
    if (!p) return;

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    document.body.classList.add('playground-fullscreen-mode');
    document.body.classList.add('hide-footer');
    setActiveNav('playground');

    const projectUrl = p.url || `Playground/${p.cartella}/index.html`;

    const tagsHtml = (p.metadati && p.metadati.progetto)
        ? p.metadati.progetto.map(t => `<span class="pg-modal-tag">${t}</span>`).join('')
        : '';
    const annoHtml = (p.metadati && p.metadati.anno)
        ? `<span class="pg-modal-tag">${p.metadati.anno}</span>`
        : '';

    appContent.innerHTML = `
        <div class="pg-fullscreen-container">
            <header class="pg-fullscreen-header">
                <button class="pg-back-btn" onclick="navigateTo('/playground')" aria-label="Torna a Playground">
                    ← Torna a Playground
                </button>
                <div class="pg-header-actions">
                    <a href="${projectUrl}" target="_blank" rel="noopener noreferrer" class="pg-open-btn" title="Apri in una nuova scheda" aria-label="Apri in una nuova scheda">
                        <span>Apri in nuova scheda</span> ↗
                    </a>
                    <button class="pg-info-btn" id="pg-info-btn" onclick="togglePlaygroundModal(true)" aria-label="Informazioni sul progetto" title="Info progetto">
                        i
                    </button>
                </div>
            </header>

            <iframe src="${projectUrl}" class="pg-fullscreen-iframe" title="${p.titolo}" allow="autoplay"></iframe>

            <div id="pg-info-modal" class="pg-modal-overlay" onclick="handlePlaygroundModalOverlayClick(event)" role="dialog" aria-modal="true" aria-labelledby="pg-modal-title">
                <div class="pg-modal-card">
                    <button class="pg-modal-close-btn" onclick="togglePlaygroundModal(false)" aria-label="Chiudi modale">✕</button>
                    <h2 class="pg-modal-title" id="pg-modal-title">${p.titolo}</h2>
                    ${p.titoloEvocativo ? `<div class="pg-modal-evocativo">${p.titoloEvocativo}</div>` : ''}
                    ${(tagsHtml || annoHtml) ? `<div class="pg-modal-tags">${tagsHtml}${annoHtml}</div>` : ''}
                    <p class="pg-modal-description">${p.descrizione || ''}</p>
                    <div class="pg-modal-actions">
                        <a href="${projectUrl}" target="_blank" rel="noopener noreferrer" class="pg-modal-direct-link">
                            Apri in una nuova scheda ↗
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    scrollToTop();
}
