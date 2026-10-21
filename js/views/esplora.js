import { state, getProjectMedia, getCoverMedia } from '../state.js';
import { initScrollReveal } from '../interactions/reveal.js';
import { initTiltEffect } from '../interactions/tilt.js';
import { setActiveNav, scrollToTop } from '../router.js';

export function renderEsplora() {
    setActiveNav('esplora');
    document.body.classList.add('page-esplora');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // Recupera la stringa dal JSON o usa il fallback con maiuscole/minuscole corrette
    const rawClaim = state.bioData.claim || "Progetto cioè proietto. Racconto storie, a volte futuri.";

    // Separa le due frasi basandosi sul punto fermo
    const parts = rawClaim.split(/(?<=\.)\s+/);
    let line1 = parts[0] || "Progetto cioè proietto.";
    let line2 = parts[1] || "Racconto storie, a volte futuri.";

    // Evidenzia le parole in oro
    line1 = line1.replace(/\bproietto\b/gi, '<span class="claim-accent">proietto</span>');
    line2 = line2.replace(/\bfuturi\b/gi, '<span class="claim-accent">futuri</span>');

    let html = `
        <div class="hero">
            <img src="Personal Branding/logotipo-ferd.png" alt="Ferdinando Virno" class="hero-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <h1 class="claim">
                <span class="claim-line">${line1}</span>
                <span class="claim-line">${line2}</span>
            </h1>
        </div>
        <div class="project-grid">
    `;

    // Mostra solo i progetti con prime === true
    // Ordina: anno desc, poi titolo alfabetico in caso di parità
    const primeProgetti = state.progettiData.filter(p => p.prime === true);
    const sortedProgetti = [...primeProgetti].sort((a, b) => {
        const annoA = (a.metadati && a.metadati.anno) ? a.metadati.anno : 0;
        const annoB = (b.metadati && b.metadati.anno) ? b.metadati.anno : 0;
        const annoDiff = annoB - annoA;
        if (annoDiff !== 0) return annoDiff;
        return a.titolo.localeCompare(b.titolo, 'it', { sensitivity: 'base' });
    });

    sortedProgetti.forEach((p, index) => {
        const media = getProjectMedia(p, state.portfolioStruttura);
        const coverMedia = getCoverMedia(media);

        let coverHtml = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#999; font-size:14px;">Copertina non disponibile</div>`;
        if (coverMedia) {
            if (coverMedia.type === 'video') {
                coverHtml = `<video src="${coverMedia.path}" class="cover" autoplay loop muted playsinline></video>`;
            } else {
                coverHtml = `<img src="${coverMedia.path}" alt="${p.titolo}" class="cover" onerror="this.src='https://via.placeholder.com/800x600/f0f0f0/cccccc?text=${p.titolo}'">`;
            }
        }

        html += `
            <div class="project-card reveal" onclick="navigateTo('/${p.id}')">
                <div class="cover-container">
                    ${coverHtml}
                </div>
                <h3>${p.titolo}</h3>
            </div>
        `;
    });

    html += `</div>`;
    appContent.innerHTML = html;
    scrollToTop();
    initScrollReveal();
    initTiltEffect();
}
