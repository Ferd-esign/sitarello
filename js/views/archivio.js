import { state, getProjectMedia, getPlaygroundMedia, getCoverMedia } from '../state.js';
import { initScrollReveal } from '../interactions/reveal.js';
import { initTiltEffect } from '../interactions/tilt.js';
import { setActiveNav, scrollToTop } from '../router.js';

let currentSection = 'progetti';
let activeManifestoId = null;
let activeVersionIndex = 0;

export function renderArchivio(initialSection = null) {
    setActiveNav('archivio');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    if (initialSection && ['progetti', 'manifesti', 'playground'].includes(initialSection)) {
        currentSection = initialSection;
    } else {
        // Riconosci eventuale hash nella URL per aprire direttamente la sezione desiderata
        const hash = window.location.hash.toLowerCase();
        if (hash === '#manifesti' || hash === '#/manifesti') {
            currentSection = 'manifesti';
        } else if (hash === '#playground' || hash === '#/playground') {
            currentSection = 'playground';
        } else if (hash === '#progetti' || hash === '#/progetti') {
            currentSection = 'progetti';
        }
    }

    // 1. Dati Progetti (ordinati cronologicamente dal più recente, senza etichette anno)
    const sortedProgetti = [...state.progettiData].sort((a, b) => {
        const annoA = (a.metadati && a.metadati.anno) ? a.metadati.anno : 0;
        const annoB = (b.metadati && b.metadati.anno) ? b.metadati.anno : 0;
        return annoB - annoA;
    });

    // 2. Dati Manifesti (ordinati per data più recente)
    const sortedManifesti = [...(state.manifestiData || [])].sort((a, b) => {
        const orderA = a.dataOrdinamento || a.data || '';
        const orderB = b.dataOrdinamento || b.data || '';
        return orderB.localeCompare(orderA);
    });

    // 3. Dati Playground (ordinati per anno più recente, poi alfabetico)
    const sortedPlayground = [...(state.playgroundData || [])].sort((a, b) => {
        const annoA = (a.metadati && a.metadati.anno) ? a.metadati.anno : 0;
        const annoB = (b.metadati && b.metadati.anno) ? b.metadati.anno : 0;
        if (annoB !== annoA) return annoB - annoA;
        return a.titolo.localeCompare(b.titolo, 'it', { sensitivity: 'base' });
    });

    // 4. Generazione HTML Intestazione e Switcher Sezioni (Progetti, Manifesti, Playground)
    let html = `
        <div class="archivio-header reveal">
            <h2 class="archivio-title">Archivio</h2>
            <div class="archivio-section-tabs" role="tablist" aria-label="Sezioni Archivio">
                <button id="tab-btn-progetti" 
                        class="archivio-tab-btn ${currentSection === 'progetti' ? 'active' : ''}" 
                        onclick="switchArchivioSection('progetti')" 
                        role="tab" 
                        aria-selected="${currentSection === 'progetti'}">
                    PROGETTI
                </button>
                <button id="tab-btn-manifesti" 
                        class="archivio-tab-btn ${currentSection === 'manifesti' ? 'active' : ''}" 
                        onclick="switchArchivioSection('manifesti')" 
                        role="tab" 
                        aria-selected="${currentSection === 'manifesti'}">
                    MANIFESTI
                </button>
                <button id="tab-btn-playground" 
                        class="archivio-tab-btn ${currentSection === 'playground' ? 'active' : ''}" 
                        onclick="switchArchivioSection('playground')" 
                        role="tab" 
                        aria-selected="${currentSection === 'playground'}">
                    PLAYGROUND
                </button>
            </div>
        </div>
    `;

    // 5. Sezione Progetti (griglia continua in ordine temporale, senza linea del tempo / anni)
    html += `
        <div id="archivio-progetti-view" style="${currentSection === 'progetti' ? 'display: block;' : 'display: none;'}">
            <div class="archivio-grid">
    `;

    sortedProgetti.forEach((p) => {
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

    // 6. Sezione Manifesti (Tassellazione Masonry con proporzioni originali)
    html += `
        <div id="archivio-manifesti-view" class="manifesti-container" style="${currentSection === 'manifesti' ? 'display: block;' : 'display: none;'}">
            <div class="manifesti-masonry">
    `;

    if (sortedManifesti.length === 0) {
        html += `
            <div class="manifesti-empty reveal" style="padding: 40px 0; color: #888; font-size: 15px;">
                Nessun manifesto archiviato al momento.
            </div>
        `;
    } else {
        sortedManifesti.forEach((m) => {
            const firstMedia = (m.media && m.media.length > 0) ? m.media[0] : null;
            let mediaPreviewHtml = `<div class="manifesto-card-placeholder">—</div>`;

            if (firstMedia) {
                const mediaPath = `Manifesti/${m.cartella}/${firstMedia.file}`;
                if (firstMedia.type === 'video') {
                    mediaPreviewHtml = `
                        <video src="${mediaPath}" 
                               class="manifesto-card-media" 
                               autoplay loop muted playsinline>
                        </video>
                    `;
                } else {
                    mediaPreviewHtml = `
                        <img src="${mediaPath}" 
                             alt="${m.titolo}" 
                             class="manifesto-card-media" 
                             loading="lazy">
                    `;
                }
            }

            html += `
                <div class="manifesto-card reveal" 
                     onclick="openManifestoModal('${m.id}')" 
                     role="button" 
                     tabindex="0" 
                     aria-label="Ingrandisci manifesto: ${m.titolo}">
                    ${mediaPreviewHtml}
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
    `;

    // 7. Sezione Playground
    html += `
        <div id="archivio-playground-view" style="${currentSection === 'playground' ? 'display: block;' : 'display: none;'}">
            <div class="archivio-grid">
    `;

    sortedPlayground.forEach((p) => {
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

    html += `
            </div>
        </div>
    `;

    // 6. Modale Lightbox con Blur per i Manifesti
    html += `
        <div id="manifesto-lightbox-modal" 
             class="manifesto-modal-overlay" 
             onclick="handleManifestoModalOverlayClick(event)" 
             role="dialog" 
             aria-modal="true" 
             aria-hidden="true">
            <div class="manifesto-modal-dialog">
                <button class="manifesto-modal-close" onclick="closeManifestoModal()" aria-label="Chiudi modale">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="manifesto-modal-main-stage">
                    <div id="manifesto-modal-media-slot" class="manifesto-modal-media-wrapper">
                        <!-- Media attivo iniettato dinamicamente -->
                    </div>
                </div>
                <div id="manifesto-modal-versions-bar" class="manifesto-modal-versions-bar">
                    <!-- Miniature versioni se presenti -->
                </div>
                <div class="manifesto-modal-details">
                    <div class="manifesto-modal-header-meta">
                        <h3 id="manifesto-modal-title" class="manifesto-modal-title"></h3>
                        <span id="manifesto-modal-date" class="manifesto-modal-date"></span>
                    </div>
                    <p id="manifesto-modal-desc" class="manifesto-modal-desc"></p>
                </div>
            </div>
        </div>
    `;

    appContent.innerHTML = html;
    scrollToTop();
    initScrollReveal();
    initTiltEffect();

    // Listener globale per chiusura tramite tasto ESC
    window.removeEventListener('keydown', handleManifestoKeyDown);
    window.addEventListener('keydown', handleManifestoKeyDown);
}

// Switch tra le sezioni "Progetti", "Manifesti" e "Playground"
export function switchArchivioSection(section) {
    currentSection = section;

    const btnProgetti = document.getElementById('tab-btn-progetti');
    const btnManifesti = document.getElementById('tab-btn-manifesti');
    const btnPlayground = document.getElementById('tab-btn-playground');
    const viewProgetti = document.getElementById('archivio-progetti-view');
    const viewManifesti = document.getElementById('archivio-manifesti-view');
    const viewPlayground = document.getElementById('archivio-playground-view');

    if (btnProgetti) {
        btnProgetti.classList.toggle('active', section === 'progetti');
        btnProgetti.setAttribute('aria-selected', String(section === 'progetti'));
    }
    if (btnManifesti) {
        btnManifesti.classList.toggle('active', section === 'manifesti');
        btnManifesti.setAttribute('aria-selected', String(section === 'manifesti'));
    }
    if (btnPlayground) {
        btnPlayground.classList.toggle('active', section === 'playground');
        btnPlayground.setAttribute('aria-selected', String(section === 'playground'));
    }

    if (viewProgetti) viewProgetti.style.display = section === 'progetti' ? 'block' : 'none';
    if (viewManifesti) viewManifesti.style.display = section === 'manifesti' ? 'block' : 'none';
    if (viewPlayground) viewPlayground.style.display = section === 'playground' ? 'block' : 'none';

    window.history.replaceState(null, '', `#${section}`);

    initScrollReveal();
    initTiltEffect();
}

// Apertura Modale Manifesto
export function openManifestoModal(manifestoId, versionIndex = 0) {
    const list = state.manifestiData || [];
    const manifesto = list.find(m => m.id === manifestoId);
    if (!manifesto) return;

    activeManifestoId = manifestoId;
    activeVersionIndex = versionIndex;

    const modal = document.getElementById('manifesto-lightbox-modal');
    if (!modal) return;

    // Titolo, Data, Descrizione
    const titleEl = document.getElementById('manifesto-modal-title');
    const dateEl = document.getElementById('manifesto-modal-date');
    const descEl = document.getElementById('manifesto-modal-desc');

    if (titleEl) titleEl.textContent = manifesto.titolo;
    if (dateEl) dateEl.textContent = manifesto.data || '';
    if (descEl) descEl.textContent = manifesto.descrizione || '';

    // Renderizza media grande attivo
    renderActiveModalMedia(manifesto, versionIndex);

    // Renderizza strip miniature delle versioni se > 1
    renderModalVersionsBar(manifesto, versionIndex);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function renderActiveModalMedia(manifesto, versionIdx) {
    const mediaSlot = document.getElementById('manifesto-modal-media-slot');
    if (!mediaSlot) return;

    const mediaList = manifesto.media || [];
    const currentMedia = mediaList[versionIdx] || mediaList[0];

    if (!currentMedia) {
        mediaSlot.innerHTML = `<div class="manifesto-modal-large-placeholder">—</div>`;
        return;
    }

    const path = `Manifesti/${manifesto.cartella}/${currentMedia.file}`;
    if (currentMedia.type === 'video') {
        mediaSlot.innerHTML = `
            <video src="${path}" 
                   class="manifesto-modal-large-media" 
                   autoplay loop muted playsinline 
                   disablepictureinpicture 
                   disableremoteplayback>
            </video>
        `;
    } else {
        mediaSlot.innerHTML = `
            <img src="${path}" 
                 alt="${currentMedia.label || manifesto.titolo}" 
                 class="manifesto-modal-large-media">
        `;
    }
}

function renderModalVersionsBar(manifesto, activeIdx) {
    const bar = document.getElementById('manifesto-modal-versions-bar');
    if (!bar) return;

    const mediaList = manifesto.media || [];
    if (mediaList.length <= 1) {
        bar.innerHTML = '';
        bar.style.display = 'none';
        return;
    }

    bar.style.display = 'flex';
    let html = '';
    mediaList.forEach((item, idx) => {
        const path = `Manifesti/${manifesto.cartella}/${item.file}`;
        const isActive = idx === activeIdx;
        let thumbContent = '';

        if (item.type === 'video') {
            thumbContent = `<video src="${path}" muted loop playsinline class="manifesto-version-thumb-media"></video>`;
        } else {
            thumbContent = `<img src="${path}" alt="${item.label || 'Versione ' + (idx + 1)}" class="manifesto-version-thumb-media">`;
        }

        html += `
            <button class="manifesto-version-thumb ${isActive ? 'active' : ''}" 
                    onclick="selectManifestoVersion('${manifesto.id}', ${idx})" 
                    title="${item.label || 'Versione ' + (idx + 1)}" 
                    aria-label="${item.label || 'Versione ' + (idx + 1)}">
                ${thumbContent}
            </button>
        `;
    });

    bar.innerHTML = html;
}

// Selezione specifica versione dentro la modale
export function selectManifestoVersion(manifestoId, versionIndex) {
    const list = state.manifestiData || [];
    const manifesto = list.find(m => m.id === manifestoId);
    if (!manifesto) return;

    activeVersionIndex = versionIndex;
    renderActiveModalMedia(manifesto, versionIndex);
    renderModalVersionsBar(manifesto, versionIndex);
}

// Chiusura Modale
export function closeManifestoModal() {
    const modal = document.getElementById('manifesto-lightbox-modal');
    if (!modal) return;

    // Ferma eventuali video riprodotti nella modale
    const video = modal.querySelector('video');
    if (video) {
        video.pause();
    }

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    activeManifestoId = null;
}

// Chiudi se si clicca sul backdrop (blur overlay)
export function handleManifestoModalOverlayClick(event) {
    if (event.target && event.target.id === 'manifesto-lightbox-modal') {
        closeManifestoModal();
    }
}

// Gestione tasto ESC
function handleManifestoKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        const modal = document.getElementById('manifesto-lightbox-modal');
        if (modal && modal.classList.contains('active')) {
            closeManifestoModal();
        }
    }
}
