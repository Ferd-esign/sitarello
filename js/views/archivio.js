import { state, getProjectMedia, getCoverMedia } from '../state.js';
import { initScrollReveal } from '../interactions/reveal.js';
import { initTiltEffect } from '../interactions/tilt.js';
import { setActiveNav, scrollToTop } from '../router.js';

let currentSection = 'progetti';
let activeManifestoId = null;
let activeVersionIndex = 0;

export function renderArchivio() {
    setActiveNav('archivio');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // Riconosci eventuale hash nella URL per aprire direttamente la sezione Manifesti
    const hash = window.location.hash.toLowerCase();
    if (hash === '#manifesti' || hash === '#/manifesti') {
        currentSection = 'manifesti';
    } else if (hash === '#progetti' || hash === '#/progetti') {
        currentSection = 'progetti';
    }

    // 1. Dati Progetti (raggruppati per anno)
    const sortedProgetti = [...state.progettiData].sort((a, b) => {
        const annoA = (a.metadati && a.metadati.anno) ? a.metadati.anno : 0;
        const annoB = (b.metadati && b.metadati.anno) ? b.metadati.anno : 0;
        return annoB - annoA;
    });

    const byYear = {};
    sortedProgetti.forEach(p => {
        const y = (p.metadati && p.metadati.anno) ? p.metadati.anno : 'N/A';
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(p);
    });
    const years = Object.keys(byYear).sort((a, b) => b - a);

    // 2. Dati Manifesti (ordinati per data più recente)
    const sortedManifesti = [...(state.manifestiData || [])].sort((a, b) => {
        const orderA = a.dataOrdinamento || a.data || '';
        const orderB = b.dataOrdinamento || b.data || '';
        return orderB.localeCompare(orderA);
    });

    // 3. Generazione HTML Intestazione e Switcher Sezioni
    let html = `
        <div class="archivio-header reveal">
            <div class="archivio-header-top">
                <h2 class="archivio-title">Archivio</h2>
                <div class="archivio-section-tabs" role="tablist" aria-label="Sezioni Archivio">
                    <button id="tab-btn-progetti" 
                            class="archivio-tab-btn ${currentSection === 'progetti' ? 'active' : ''}" 
                            onclick="switchArchivioSection('progetti')" 
                            role="tab" 
                            aria-selected="${currentSection === 'progetti'}">
                        PROGETTI <span class="archivio-tab-count">${sortedProgetti.length}</span>
                    </button>
                    <button id="tab-btn-manifesti" 
                            class="archivio-tab-btn ${currentSection === 'manifesti' ? 'active' : ''}" 
                            onclick="switchArchivioSection('manifesti')" 
                            role="tab" 
                            aria-selected="${currentSection === 'manifesti'}">
                        MANIFESTI <span class="archivio-tab-count">${sortedManifesti.length}</span>
                    </button>
                </div>
            </div>
            <p class="archivio-subtitle" id="archivio-subtitle">
                ${currentSection === 'manifesti'
                    ? 'Una raccolta visiva di manifesti, poster e sperimentazioni grafiche.'
                    : 'Una selezione di progetti significativi, organizzati nel tempo.'}
            </p>
        </div>
    `;

    // 4. Sezione Progetti
    html += `
        <div id="archivio-progetti-view" class="archivio-timeline" style="${currentSection === 'progetti' ? 'display: flex;' : 'display: none;'}">
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

    html += `</div>`; // fine archivio-timeline

    // 5. Sezione Manifesti (Tassellazione Masonry con proporzioni originali)
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

// Switch tra le sezioni "Progetti" e "Manifesti"
export function switchArchivioSection(section) {
    currentSection = section;

    const btnProgetti = document.getElementById('tab-btn-progetti');
    const btnManifesti = document.getElementById('tab-btn-manifesti');
    const viewProgetti = document.getElementById('archivio-progetti-view');
    const viewManifesti = document.getElementById('archivio-manifesti-view');
    const subtitle = document.getElementById('archivio-subtitle');

    if (section === 'manifesti') {
        if (btnProgetti) btnProgetti.classList.remove('active');
        if (btnManifesti) btnManifesti.classList.add('active');
        if (viewProgetti) viewProgetti.style.display = 'none';
        if (viewManifesti) viewManifesti.style.display = 'block';
        if (subtitle) subtitle.textContent = 'Una raccolta visiva di manifesti, poster e sperimentazioni grafiche.';
        window.history.replaceState(null, '', '#manifesti');
    } else {
        if (btnManifesti) btnManifesti.classList.remove('active');
        if (btnProgetti) btnProgetti.classList.add('active');
        if (viewManifesti) viewManifesti.style.display = 'none';
        if (viewProgetti) viewProgetti.style.display = 'flex';
        if (subtitle) subtitle.textContent = 'Una selezione di progetti significativi, organizzati nel tempo.';
        window.history.replaceState(null, '', '#progetti');
    }

    initScrollReveal();
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
