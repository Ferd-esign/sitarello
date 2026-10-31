// Dati globali caricati asincronamente
let progettiData = [];
let bioData = {};
let portfolioStruttura = [];
let playgroundData = [];
let playgroundStruttura = [];
let manifestiData = [];
let manifestiStruttura = [];
let currentArchivioSection = 'progetti';
let activeManifestoId = null;
let activeVersionIndex = 0;


// Helper per verificare se un file è un video
function isMediaTypeVideo(fileName) {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.m4v') || lower.endsWith('.avi');
}

// Helper per mappare i media di ciascun progetto dalla struttura dei file
function getProjectMedia(project, struttura) {
    const cartellaLower = project.cartella.toLowerCase();

    // 1. GESTIONE SPECIALE CARTELLA "TESI" (Intrecci Narrativi e sottoprogetti)
    if (cartellaLower === 'nlm' || cartellaLower === 'marathia' || cartellaLower === 'cunti') {
        const tesiFolder = struttura.find(item => item.Cartella.toLowerCase() === 'tesi');
        if (tesiFolder) {
            let matchedFiles = [];
            tesiFolder.File.forEach(fileName => {
                const fileNameLower = fileName.toLowerCase();

                // Se stiamo caricando il progetto padre (NLM), prendiamo tutti i file della cartella Tesi,
                // perché renderProgetto li filtrerà poi per assegnarli ai rispettivi sottoprogetti.
                let isMatch = false;
                if (cartellaLower === 'nlm') {
                    isMatch = true;
                } else if (cartellaLower === 'marathia' && fileNameLower.includes('marathia')) {
                    isMatch = true;
                } else if (cartellaLower === 'cunti' && fileNameLower.includes('cunti')) {
                    isMatch = true;
                }

                if (isMatch) {
                    matchedFiles.push({
                        name: fileName,
                        path: `Progetti/Tesi/${fileName}`,
                        type: isMediaTypeVideo(fileName) ? 'video' : 'image'
                    });
                }
            });
            return matchedFiles;
        }
    }

    // 2. Cerca una cartella in portfolio-struttura che corrisponda alla cartella del progetto
    const folderMatch = struttura.find(item => {
        const itemLower = item.Cartella.toLowerCase();
        return itemLower === cartellaLower ||
            cartellaLower.includes(itemLower) ||
            itemLower.includes(cartellaLower);
    });

    if (folderMatch) {
        // Usa CartellaFisica se presente (es. NLM -> Tesi), altrimenti usa Cartella
        const physicalFolder = folderMatch.CartellaFisica || folderMatch.Cartella;
        return folderMatch.File.map(fileName => ({
            name: fileName,
            path: `Progetti/${physicalFolder}/${fileName}`,
            type: isMediaTypeVideo(fileName) ? 'video' : 'image'
        }));
    }

    // 3. Fallback: cerca per nome file in tutte le cartelle
    const matchedFiles = [];
    struttura.forEach(item => {
        const physicalFolder = item.CartellaFisica || item.Cartella;
        item.File.forEach(fileName => {
            const fileNameLower = fileName.toLowerCase();
            if (fileNameLower.includes(cartellaLower)) {
                matchedFiles.push({
                    name: fileName,
                    path: `Progetti/${physicalFolder}/${fileName}`,
                    type: isMediaTypeVideo(fileName) ? 'video' : 'image'
                });
            }
        });
    });

    return matchedFiles;
}

// Helper: trova la copertina di un progetto (file contenente 'copertina', case-insensitive)
function getCoverMedia(media) {
    if (!media || media.length === 0) return null;
    // Prima priorità: file con nome che contiene 'copertina' (case-insensitive, es. 01_copertina.webp, COPERTINA.mp4)
    const copertina = media.find(m =>
        m.name.toLowerCase().includes('copertina')
    );
    if (copertina) return copertina;
    // Fallback: primo media disponibile (già ordinato numericamente)
    return media[0] || null;
}

// DOM Elements
const appContent = document.getElementById('app-content');
const navLinks = document.querySelectorAll('.nav-link');

// Utils
function setActiveNav(targetId) {
    navLinks.forEach(l => l.classList.remove('active'));
    if (targetId) {
        const ids = (targetId === 'about' || targetId === 'contatti') ? ['about', 'contatti'] : [targetId];
        ids.forEach(id => {
            const activeLinks = document.querySelectorAll(`[data-target="${id}"]`);
            activeLinks.forEach(link => link.classList.add('active'));
        });
    }
}

function scrollToTop() {
    if (window._npScrollHandler) {
        window.removeEventListener('scroll', window._npScrollHandler);
        window._npScrollHandler = null;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Gestione Prossimo Progetto (Scroll continuo e Trigger) ──
let isNavigatingNextProject = false;

function setupNextProjectScrollTrigger(onNavigate) {
    isNavigatingNextProject = false;

    if (window._npScrollHandler) {
        window.removeEventListener('scroll', window._npScrollHandler);
        window._npScrollHandler = null;
    }

    const triggerEl = document.getElementById('next-project-trigger');
    if (!triggerEl) return;

    let hasTriggered = false;
    let holdTimer = null; // Timer per la pausa di 1 secondo

    const handleScroll = () => {
        if (hasTriggered || isNavigatingNextProject) return;

        const fillBar = document.getElementById('np-bar-fill');
        const distanceToBottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);

        const scrollRange = 350;
        const fillRatio = Math.min(1, Math.max(0, 1 - (distanceToBottom / scrollRange)));

        if (fillBar) {
            fillBar.style.width = `${fillRatio * 100}%`;
        }

        // Condizione: l'utente ha completato lo scroll ed è in fondo
        if (distanceToBottom <= 5 && fillRatio >= 0.98) {
            // Avvia la pausa di 1 secondo se non è già in corso
            if (!holdTimer) {
                holdTimer = setTimeout(() => {
                    hasTriggered = true;
                    triggerNextProject(onNavigate);
                }, 1000); // ⏱️ 1000 ms (1 secondo di attesa)
            }
        } else {
            // Se l'utente scolla verso l'alto prima dello scadere del secondo, annulla il passaggio
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
        }
    };

    window._npScrollHandler = handleScroll;
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function triggerNextProject(onNavigate) {
    if (isNavigatingNextProject) return;
    isNavigatingNextProject = true;

    if (window._npScrollHandler) {
        window.removeEventListener('scroll', window._npScrollHandler);
        window._npScrollHandler = null;
    }

    const appContent = document.getElementById('app-content');
    const triggerEl = document.getElementById('next-project-trigger');
    if (triggerEl) {
        triggerEl.classList.add('trigger-active');
    }

    if (appContent) {
        appContent.classList.add('page-transition-out');
    }

    // 3. RALLENTATO: aumentato il tempo di attesa della transizione da 300ms a 600ms per un effetto più fluido
    setTimeout(() => {
        if (appContent) appContent.classList.remove('page-transition-out');
        onNavigate();
    }, 600);
}

// Scroll Reveal — IntersectionObserver globale
function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // anima solo una volta
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
}

// ── EFFETTO TILT 3D ──
function initTiltEffect() {
    const cards = document.querySelectorAll('.project-card, .archivio-card');

    cards.forEach(card => {
        // Rimuovi eventuali event listener precedenti se la funzione viene chiamata più volte
        if (card.dataset.tiltInitialized) return;
        card.dataset.tiltInitialized = 'true';

        let isHovered = false;
        let bounds = null;

        const onMove = (clientX, clientY) => {
            if (!bounds) bounds = card.getBoundingClientRect();

            // Calcola la posizione relativa del cursore/tocco
            const x = clientX - bounds.left;
            const y = clientY - bounds.top;

            // Normalizza tra -1 e 1
            const xNorm = (x / bounds.width) * 2 - 1;
            const yNorm = (y / bounds.height) * 2 - 1;

            const maxRotation = 6; // Gradi massimi (5°-8°)
            const rotateX = yNorm * -maxRotation;
            const rotateY = xNorm * maxRotation;

            requestAnimationFrame(() => {
                if (isHovered) {
                    card.style.transform = `perspective(1000px) scale3d(1.02, 1.02, 1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    card.style.transition = 'none'; // Reattività immediata al movimento
                }
            });
        };

        const onEnter = () => {
            isHovered = true;
            bounds = card.getBoundingClientRect();
            card.style.transition = 'transform 0.3s ease';
        };

        const onLeave = () => {
            isHovered = false;
            bounds = null;
            requestAnimationFrame(() => {
                card.style.transition = 'transform 0.3s ease';
                card.style.transform = 'perspective(1000px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg)';

                // Rimuovi gli stili inline per ripristinare le regole CSS originali
                setTimeout(() => {
                    if (!isHovered) {
                        card.style.transform = '';
                        card.style.transition = '';
                    }
                }, 300);
            });
        };

        // Desktop
        card.addEventListener('mouseenter', onEnter);
        card.addEventListener('mousemove', (e) => {
            if (!isHovered) onEnter();
            onMove(e.clientX, e.clientY);
        });
        card.addEventListener('mouseleave', onLeave);

        // Mobile
        card.addEventListener('touchstart', onEnter, { passive: true });
        card.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                onMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
        card.addEventListener('touchend', onLeave);
    });
}

// ── HELPER ROUTING HTML5 HISTORY API ──
function navigateTo(path, replace = false) {
    isNavigatingNextProject = false;
    const targetUrl = path.startsWith('/') ? path : '/' + path;
    if (replace) {
        window.history.replaceState(null, '', targetUrl);
    } else if (window.location.pathname + window.location.search !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
    }
    handleRoute();
}

// Delegazione dei click sui link per navigazione SPA client-side
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('/') || href.startsWith('#')) && !href.startsWith('mailto:') && link.getAttribute('target') !== '_blank') {
            e.preventDefault();
            const targetPath = href.startsWith('#') ? href.replace(/^#\/?/, '/') : href;
            navigateTo(targetPath || '/');
        }
    }
});


function renderEsplora() {
    setActiveNav('esplora');
    document.body.classList.add('page-esplora');

    // Recupera la stringa dal JSON o usa il fallback con maiuscole/minuscole corrette
    const rawClaim = bioData.claim || "Progetto cioè proietto. Racconto storie, a volte futuri.";

    // Separa le due frasi basandosi sul punto fermo
    const parts = rawClaim.split(/(?<=\.)\s+/);
    let line1 = parts[0] || "Progetto cioè proietto.";
    let line2 = parts[1] || "Racconto storie, a volte futuri.";

    // Evidenzia le parole in oro garantendo la rispondenza alle minuscole/maiuscole
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
    const primeProgetti = progettiData.filter(p => p.prime === true);
    const sortedProgetti = [...primeProgetti].sort((a, b) => {
        const annoA = (a.metadati && a.metadati.anno) ? a.metadati.anno : 0;
        const annoB = (b.metadati && b.metadati.anno) ? b.metadati.anno : 0;
        const annoDiff = annoB - annoA;
        if (annoDiff !== 0) return annoDiff;
        return a.titolo.localeCompare(b.titolo, 'it', { sensitivity: 'base' });
    });

    sortedProgetti.forEach((p, index) => {
        const media = getProjectMedia(p, portfolioStruttura);
        const coverMedia = getCoverMedia(media);
        const delayIndex = (index % 4) + 1; // delay 1-4 ciclicamente

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

function getArchivioMedia(project, struttura) {
    return getProjectMedia(project, portfolioStruttura);
}

function renderArchivio() {
    setActiveNav('archivio');

    // Riconosci eventuale hash nella URL per aprire direttamente la sezione Manifesti
    const hash = window.location.hash.toLowerCase();
    if (hash === '#manifesti' || hash === '#/manifesti') {
        currentArchivioSection = 'manifesti';
    } else if (hash === '#progetti' || hash === '#/progetti') {
        currentArchivioSection = 'progetti';
    }

    // 1. Dati Progetti (raggruppati per anno)
    const sorted = [...progettiData].sort((a, b) => {
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

    // 2. Dati Manifesti (ordinati per data più recente)
    const sortedManifesti = [...manifestiData].sort((a, b) => {
        const orderA = a.dataOrdinamento || a.data || '';
        const orderB = b.dataOrdinamento || b.data || '';
        return orderB.localeCompare(orderA);
    });

    let html = `
        <div class="archivio-header reveal">
            <div class="archivio-header-top">
                <h2 class="archivio-title">Archivio</h2>
                <div class="archivio-section-tabs" role="tablist" aria-label="Sezioni Archivio">
                    <button id="tab-btn-progetti" 
                            class="archivio-tab-btn ${currentArchivioSection === 'progetti' ? 'active' : ''}" 
                            onclick="switchArchivioSection('progetti')" 
                            role="tab" 
                            aria-selected="${currentArchivioSection === 'progetti'}">
                        PROGETTI <span class="archivio-tab-count">${sorted.length}</span>
                    </button>
                    <button id="tab-btn-manifesti" 
                            class="archivio-tab-btn ${currentArchivioSection === 'manifesti' ? 'active' : ''}" 
                            onclick="switchArchivioSection('manifesti')" 
                            role="tab" 
                            aria-selected="${currentArchivioSection === 'manifesti'}">
                        MANIFESTI <span class="archivio-tab-count">${sortedManifesti.length}</span>
                    </button>
                </div>
            </div>
            <p class="archivio-subtitle" id="archivio-subtitle">
                ${currentArchivioSection === 'manifesti'
                    ? 'Una raccolta visiva di manifesti, poster e sperimentazioni grafiche.'
                    : 'Una selezione di progetti significativi, organizzati nel tempo.'}
            </p>
        </div>
        <div id="archivio-progetti-view" class="archivio-timeline" style="${currentArchivioSection === 'progetti' ? 'display: flex;' : 'display: none;'}">
    `;

    years.forEach((year) => {
        const progetti = byYear[year];
        html += `
            <div class="archivio-year-block reveal">
                <div class="archivio-year-label">${year}</div>
                <div class="archivio-grid">
        `;

        progetti.forEach((p) => {
            const media = getProjectMedia(p, portfolioStruttura);
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

    html += `</div>`; // Fine archivio-timeline

    // Sezione Manifesti
    html += `
        <div id="archivio-manifesti-view" class="manifesti-container" style="${currentArchivioSection === 'manifesti' ? 'display: block;' : 'display: none;'}">
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

    // Modale Lightbox
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
                    </div>
                </div>
                <div id="manifesto-modal-versions-bar" class="manifesto-modal-versions-bar">
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

    window.removeEventListener('keydown', handleManifestoKeyDown);
    window.addEventListener('keydown', handleManifestoKeyDown);
}

function switchArchivioSection(section) {
    currentArchivioSection = section;

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

function openManifestoModal(manifestoId, versionIndex = 0) {
    const list = manifestiData || [];
    const manifesto = list.find(m => m.id === manifestoId);
    if (!manifesto) return;

    activeManifestoId = manifestoId;
    activeVersionIndex = versionIndex;

    const modal = document.getElementById('manifesto-lightbox-modal');
    if (!modal) return;

    const titleEl = document.getElementById('manifesto-modal-title');
    const dateEl = document.getElementById('manifesto-modal-date');
    const descEl = document.getElementById('manifesto-modal-desc');

    if (titleEl) titleEl.textContent = manifesto.titolo;
    if (dateEl) dateEl.textContent = manifesto.data || '';
    if (descEl) descEl.textContent = manifesto.descrizione || '';

    renderActiveModalMediaInApp(manifesto, versionIndex);
    renderModalVersionsBarInApp(manifesto, versionIndex);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function renderActiveModalMediaInApp(manifesto, versionIdx) {
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

function renderModalVersionsBarInApp(manifesto, activeIdx) {
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

function selectManifestoVersion(manifestoId, versionIndex) {
    const list = manifestiData || [];
    const manifesto = list.find(m => m.id === manifestoId);
    if (!manifesto) return;

    activeVersionIndex = versionIndex;
    renderActiveModalMediaInApp(manifesto, versionIndex);
    renderModalVersionsBarInApp(manifesto, versionIndex);
}

function closeManifestoModal() {
    const modal = document.getElementById('manifesto-lightbox-modal');
    if (!modal) return;

    const video = modal.querySelector('video');
    if (video) video.pause();

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    activeManifestoId = null;
}

function handleManifestoModalOverlayClick(event) {
    if (event.target && event.target.id === 'manifesto-lightbox-modal') {
        closeManifestoModal();
    }
}

function handleManifestoKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        const modal = document.getElementById('manifesto-lightbox-modal');
        if (modal && modal.classList.contains('active')) {
            closeManifestoModal();
        }
    }
}

function renderProgettoArchivio(id) {
    renderProgetto(id);
}

// Helper: recupera i media di un progetto dal playground (path base: Playground/{Cartella}/)
function getPlaygroundMedia(project, struttura) {
    const cartellaLower = project.cartella.toLowerCase();

    const folderMatch = struttura.find(item =>
        item.Cartella.toLowerCase() === cartellaLower ||
        cartellaLower.includes(item.Cartella.toLowerCase()) ||
        item.Cartella.toLowerCase().includes(cartellaLower)
    );

    if (folderMatch) {
        return folderMatch.File.map(fileName => ({
            name: fileName,
            path: `Playground/${folderMatch.Cartella}/${fileName}`,
            type: isMediaTypeVideo(fileName) ? 'video' : 'image'
        }));
    }

    return [];
}

function renderPlayground() {
    setActiveNav('playground');

    const sorted = [...playgroundData].sort((a, b) => {
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

    sorted.forEach((p, pi) => {
        const media = getPlaygroundMedia(p, playgroundStruttura);
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

// ── Gestione Modale Info Playground ──
function togglePlaygroundModal(show) {
    const modal = document.getElementById('pg-info-modal');
    if (!modal) return;
    if (show) {
        modal.classList.add('open');
    } else {
        modal.classList.remove('open');
    }
}

function handlePlaygroundModalOverlayClick(event) {
    if (event.target && event.target.id === 'pg-info-modal') {
        togglePlaygroundModal(false);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePlaygroundModal(false);
    }
});

function renderProgettoPlayground(id) {
    const p = playgroundData.find(x => x.id === id);
    if (!p) return;
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

function renderAbout() {
    setActiveNav('about');

    appContent.innerHTML = `
        <main class="about-page">

            <!-- Hero Section - Large Bio Heading -->
            <section class="hero-about">
                <div class="hero-text-wrapper">
                    <h1 class="hero-title">
                        Ciao, sono Ferd, designer sistemico. Credo in una progettazione che nasce dall'ascolto e dalla volontà di creare connessioni autentiche. Una ricerca che inizia dalla complessità dei problemi, per arrivare a una chiarezza fruibile e narrativa.
                    </h1>
                </div>
            </section>

            <!-- Main Content Row: CV + Image + Bio Details -->
            <section class="about-content-row">
                <div class="about-cv-link">
                    <h3><a href="Personal Branding/VIRNO-FERDINANDO_CV_2026.pdf" target="_blank" rel="noopener noreferrer" class="cv-link">CV ↗</a></h3>
                </div>

                <div class="about-image-wrapper">
                    <div class="about-image">
                        <img src="Personal Branding/FOTO-BIO.webp" alt="Ferdinando Virno" onerror="this.onerror=null; this.src='Personal Branding/foto_ferd_2024.jpg'">
                    </div>
                </div>

                <div class="about-details">
                    <!-- Come lavoro / Approccio -->
                    <div class="detail-block">
        
                        <p class="detail-text">
                            Il mio processo progettuale parte dall’ascolto e dalla comprensione profonda delle esigenze del contesto e delle persone. Sviluppo i concetti attraverso ricerca, strategia e sperimentazione visiva, affrontando la complessità dei problemi in maniera metodologica e sistemica. Condivido la convinzione che il design sia un modo di essere prima ancora che una disciplina tecnica: per questo realizzo linguaggi visivi flessibili e orientati a generare valore e legami duraturi all'interno della comunità.
                        </p>
                    </div>

                    <!-- Esperienza & Attività -->
                    <div class="experience-columns">
                        <!-- Esperienza -->
                        <div class="detail-block">
                            <h3 class="detail-title">Esperienza:</h3>
                            <div class="experience-list">
                                <div class="experience-item">
                                    <p class="experience-agency">Freelance Designer</p>
                                    <p class="experience-detail">In corso</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency">Perseverance Studio</p>
                                    <p class="experience-detail">Graphic Designer / 2025</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency">DOTFOG Studio</p>
                                    <p class="experience-detail">Tirocinio / Napoli, 2025</p>
                                </div>
                            </div>
                        </div>

                        <!-- Attività & Workshop -->
                        <div class="detail-block">
                            <h3 class="detail-title">Attività & Workshop:</h3>
                            <div class="experience-list">
                                <div class="experience-item">
                                    <p class="experience-agency"><a href="https://www.isiaroma.it/" target="_blank" rel="noopener noreferrer" class="experience-link">Unexpected Rome</a></p>
                                    <p class="experience-detail">ISIA Roma x Kean Univ. / Roma, 2026</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency"><a href="https://www.sponzfest.it/" target="_blank" rel="noopener noreferrer" class="experience-link">Sponz Fest</a></p>
                                    <p class="experience-detail">Branding & Manifesti / Calitri, 2025</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency"><a href="https://www.desina.it/" target="_blank" rel="noopener noreferrer" class="experience-link">Desina Festival</a></p>
                                    <p class="experience-detail">Workshop “Fuck Logo” / Napoli, 2025</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Formazione -->
                    <div class="detail-block">
                        <h3 class="detail-title">Formazione:</h3>
                        <div class="experience-list">
                            <div class="experience-item">
                                <p class="experience-agency">ISIA Roma Design</p>
                                <p class="experience-detail">Magistrale in Design Sistemico per la Comunicazione / In corso</p>
                            </div>
                            <div class="experience-item">
                                <p class="experience-agency">Università Federico II di Napoli</p>
                                <p class="experience-detail">Laurea in Design per la Comunità / 2022–2025</p>
                            </div>
                            <div class="experience-item">
                                <p class="experience-agency">Talent Garden</p>
                                <p class="experience-detail">UI/UX Design con Breccia / 2023</p>
                            </div>
                            <div class="experience-item">
                                <p class="experience-agency">Liceo Artistico Sabatini Menna</p>
                                <p class="experience-detail">Grafica e Comunicazione Visiva / Salerno</p>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            <!-- Spacer after content -->
            <div class="about-spacer"></div>
        </main>
    `;
    scrollToTop();
}

// Alias per retrocompatibilità
const renderContatti = renderAbout;


// ── YouTube IFrame API Helper ──
let isYTScriptLoading = false;
const ytPlayerInitCallbacks = [];

function disableYTCaptions(player) {
    if (!player) return;
    try {
        if (typeof player.unloadModule === 'function') {
            player.unloadModule('captions');
            player.unloadModule('cc');
        }
        if (typeof player.setOption === 'function') {
            player.setOption('captions', 'track', {});
            player.setOption('cc', 'track', {});
            player.setOption('captions', 'reload', false);
        }
    } catch (e) { }
}

function initYouTubePlayer(iframeId, volume = 50) {
    function setupPlayer() {
        const iframe = document.getElementById(iframeId);
        if (!iframe) return;

        if (window.YT && window.YT.Player) {
            try {
                new YT.Player(iframeId, {
                    events: {
                        'onReady': function (event) {
                            event.target.setVolume(volume);
                            disableYTCaptions(event.target);
                            if (typeof event.target.setPlaybackQuality === 'function') {
                                event.target.setPlaybackQuality('hd1080');
                            }
                        },
                        'onStateChange': function (event) {
                            if (event.data === 1 || event.data === 3) { // PLAYING or BUFFERING (mobile tap)
                                disableYTCaptions(event.target);
                            }
                        }
                    }
                });
            } catch (e) {
                console.error('Error initializing YouTube Player API:', e);
            }
        }
    }

    if (window.YT && window.YT.Player) {
        setupPlayer();
    } else {
        ytPlayerInitCallbacks.push(setupPlayer);

        if (!window.onYouTubeIframeAPIReady) {
            window.onYouTubeIframeAPIReady = function () {
                while (ytPlayerInitCallbacks.length > 0) {
                    const cb = ytPlayerInitCallbacks.shift();
                    if (typeof cb === 'function') cb();
                }
            };
        }

        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]') && !isYTScriptLoading) {
            isYTScriptLoading = true;
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                document.head.appendChild(tag);
            }
        }
    }
}

function renderProgetto(id) {
    const p = progettiData.find(x => x.id === id);
    if (!p) return;
    document.body.classList.add('hide-footer');
    setActiveNav(null);

    const media = getProjectMedia(p, portfolioStruttura);
    const coverMedia = getCoverMedia(media);

    // ── Galleria principale (solo i media del progetto padre, non dei sottoprogetti) ──
    const subKeywords = (p.sottoprogetti || []).map(sp => sp.cartella.toLowerCase());
    let mainMedia = p.sottoprogetti
        ? media.filter(m => !subKeywords.some(kw => m.name.toLowerCase().includes(kw)))
        : media;

    // Escludi la copertina dalla galleria principale
    if (coverMedia) {
        mainMedia = mainMedia.filter(m => m.path !== coverMedia.path);
    }

    let galleryHtml = '';
    if (mainMedia.length > 0) {
        mainMedia.forEach(m => {
            galleryHtml += m.type === 'video'
                ? `<div class="media-container video-container reveal"><video src="${m.path}" autoplay loop muted playsinline></video></div>`
                : `<div class="media-container image-container reveal"><img src="${m.path}" alt="${p.titolo}"></div>`;
        });
    } else {
        galleryHtml = `<div style="text-align:center;color:#999;padding:40px;">Nessun elemento multimediale disponibile.</div>`;
    }

    // ── Video Embed (es. YouTube per Sponz Fest) ──
    let videoEmbedHtml = '';
    const youtubeId = p.youtubeVideoId || (p.id === 'sponzfest' ? 'ruE7jEkWyIg' : null);
    const videoTitle = p.youtubeVideoTitle || (p.titolo + ' Video');
    if (youtubeId) {
        videoEmbedHtml = `
            <div class="youtube-video-container reveal">
                <iframe id="sponz-yt-player" src="https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&cc_load_policy=0&cc_lang_pref=off&playsinline=1&vq=hd1080" title="${videoTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            </div>
        `;
    }

    // ── Sezioni sottoprogetti (Marathia, Cunti…) ──
    let subProjectsHtml = '';
    if (p.sottoprogetti && p.sottoprogetti.length > 0) {
        p.sottoprogetti.forEach(sp => {
            // Filtra i media del sottoprogetto per nome file
            const spKey = sp.cartella.toLowerCase();
            const spMedia = media.filter(m => m.name.toLowerCase().includes(spKey));

            const spCoverMedia = getCoverMedia(spMedia);

            let spGalleryHtml = '';
            let spGalleryMedia = spMedia;

            // Escludi la copertina dalla galleria del sottoprogetto
            if (spCoverMedia) {
                spGalleryMedia = spMedia.filter(m => m.path !== spCoverMedia.path);
            }

            if (spGalleryMedia.length > 0) {
                spGalleryMedia.forEach(m => {
                    spGalleryHtml += m.type === 'video'
                        ? `<div class="media-container video-container reveal"><video src="${m.path}" autoplay loop muted playsinline></video></div>`
                        : `<div class="media-container image-container reveal"><img src="${m.path}" alt="${sp.titolo}"></div>`;
                });
            }

            let spCoverHeroHtml = '';
            if (spCoverMedia) {
                spCoverHeroHtml = spCoverMedia.type === 'video' ? `
                <div class="detail-hero-cover">
                    <video src="${spCoverMedia.path}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover; display:block; max-height:480px;"></video>
                </div>` : `
                <div class="detail-hero-cover">
                    <img src="${spCoverMedia.path}" alt="${sp.titolo} — cover" onerror="this.parentElement.style.display='none'">
                </div>`;
            }

            subProjectsHtml += `
                <div class="subproject-section reveal">
                    <div class="subproject-header">
                        <h3 class="subproject-title">
                            ${sp.titolo} ${sp.titoloEvocativo ? `<span class="subproject-evocativo">— ${sp.titoloEvocativo}</span>` : ''}
                        </h3>
                    </div>
                    ${spCoverHeroHtml}
                    ${sp.descrizione ? `<p class="progetto-descrizione reveal" style="margin-top:32px;">${sp.descrizione}</p>` : ''}
                    <div class="gallery">${spGalleryHtml}</div>
                </div>
            `;
        });
    }

    // Cover hero del progetto principale
    let coverHeroHtml = '';
    if (coverMedia) {
        coverHeroHtml = coverMedia.type === 'video' ? `
        <div class="detail-hero-cover">
            <video src="${coverMedia.path}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover; display:block; max-height:480px;"></video>
        </div>` : `
        <div class="detail-hero-cover">
            <img src="${coverMedia.path}" alt="${p.titolo} — cover" onerror="this.parentElement.style.display='none'">
        </div>`;
    }

    // Calcola il prossimo progetto nei progetti principali (Esplora)
    const currentIndex = progettiData.findIndex(x => x.id === id);
    const nextProject = (progettiData.length > 0 && currentIndex !== -1)
        ? progettiData[(currentIndex + 1) % progettiData.length]
        : null;

    let nextProjectHtml = '';
    if (nextProject && nextProject.id !== id) {
        const nextMedia = getProjectMedia(nextProject, portfolioStruttura);
        const nextCover = getCoverMedia(nextMedia);

        let coverImgHtml = '';
        if (nextCover && nextCover.path) {
            coverImgHtml = `
                <div class="np-trigger-thumb-wrapper">
                    ${nextCover.type === 'video'
                    ? `<video src="${nextCover.path}" class="np-trigger-thumb" autoplay loop muted playsinline></video>`
                    : `<img src="${nextCover.path}" alt="${nextProject.titolo}" class="np-trigger-thumb" onerror="this.parentElement.style.display='none'">`
                }
                </div>
            `;
        }

        const nextYear = (nextProject.metadati && nextProject.metadati.anno) ? nextProject.metadati.anno : '';
        const nextSettore = (nextProject.metadati && nextProject.metadati.settore) ? nextProject.metadati.settore : '';
        const metaInfo = [nextSettore, nextYear].filter(Boolean).join(' • ');

        nextProjectHtml = `
            <div class="next-project-trigger-wrapper reveal">
                <div class="next-project-trigger" id="next-project-trigger" onclick="triggerNextProject(() => navigateTo('/${nextProject.id}'))" role="button" tabindex="0" aria-label="Passa al prossimo progetto: ${nextProject.titolo}">
                    <div class="np-trigger-content">
                        <div class="np-trigger-top">
                            <span class="np-trigger-badge">
                                <span class="np-trigger-dot"></span>
                                PROSSIMO PROGETTO
                            </span>
                            ${metaInfo ? `<span class="np-trigger-meta">${metaInfo}</span>` : ''}
                        </div>
                        <h3 class="np-trigger-title">${nextProject.titolo}</h3>
                        ${nextProject.titoloEvocativo ? `<p class="np-trigger-evocativo">${nextProject.titoloEvocativo}</p>` : ''}
                        
                        <div class="np-trigger-action">
                            <span class="np-trigger-cta">Esplora progetto</span>
                            <span class="np-trigger-arrow" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </span>
                        </div>
                    </div>
                    ${coverImgHtml}
                    <div class="np-trigger-bar" aria-hidden="true">
                        <div class="np-trigger-bar-fill" id="np-bar-fill"></div>
                    </div>
                </div>
            </div>
        `;
    }

    appContent.innerHTML = `
        <div class="progetto-detail">
            <h2 class="reveal visible">${p.titolo}</h2>
            <div class="evocativo reveal visible">${p.titoloEvocativo}</div>

            <div class="meta-grid reveal visible">
                <div class="meta-item"><strong>Cliente</strong>${p.metadati.cliente}</div>
                <div class="meta-item"><strong>Settore</strong>${p.metadati.settore}</div>
                <div class="meta-item"><strong>Tipologia</strong>${p.metadati.progetto.join(', ')}</div>
                <div class="meta-item"><strong>Anno</strong>${p.metadati.anno}</div>
            </div>

            ${coverHeroHtml}

            <p class="progetto-descrizione reveal">${p.descrizione}</p>

            ${videoEmbedHtml}

            <div class="gallery">${galleryHtml}</div>

            ${subProjectsHtml}

            ${nextProjectHtml}
        </div>
    `;
    scrollToTop();
    initScrollReveal();
    if (youtubeId) {
        initYouTubePlayer('sponz-yt-player', 50);
    }
    if (nextProject && nextProject.id !== id) {
        setupNextProjectScrollTrigger(() => navigateTo(`/${nextProject.id}`));
    }
}

// Event Listeners for Nav
// Rimossi per delegare al routing basato su hash

// Gestione Drawer Mobile
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const drawerCloseBtn = document.getElementById('drawer-close-btn');
const mobileDrawer = document.getElementById('mobile-drawer');
const drawerOverlay = document.getElementById('mobile-drawer-overlay');

function openDrawer() {
    if (mobileDrawer && drawerOverlay) {
        mobileDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Blocca lo scroll della pagina sottostante
    }
}

function closeDrawer() {
    if (mobileDrawer && drawerOverlay) {
        mobileDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
        document.body.style.overflow = ''; // Ripristina lo scroll
    }
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

// Chiudi il drawer quando si clicca su una qualsiasi voce del menu
navLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
});

// Funzione asincrona di avvio per caricare i file JSON
async function init() {
    try {
        const [progettiRes, strutturaRes, bioRes, playgroundRes, playgroundStrutturaRes, manifestiRes, manifestiStrutturaRes] = await Promise.all([
            fetch('Progetti/progetti-data.json'),
            fetch('Progetti/portfolio-struttura.json'),
            fetch('Personal Branding/BIO-ABOUT-US.json'),
            fetch('Playground/playground-data.json').catch(() => ({ json: async () => [] })),
            fetch('Playground/struttura-playground.json').catch(() => ({ json: async () => [] })),
            fetch('Manifesti/manifesti-data.json').catch(() => ({ json: async () => [] })),
            fetch('Manifesti/struttura-manifesti.json').catch(() => ({ json: async () => [] }))
        ]);

        progettiData = await progettiRes.json();
        portfolioStruttura = await strutturaRes.json();
        bioData = await bioRes.json();
        playgroundData = await playgroundRes.json();
        playgroundStruttura = await playgroundStrutturaRes.json();
        manifestiData = await manifestiRes.json();
        manifestiStruttura = await manifestiStrutturaRes.json();

        // Auto-discovery lato client: aggiunge dinamiche cartelle non ancora descritte
        if (Array.isArray(playgroundStruttura)) {
            playgroundStruttura.forEach(item => {
                const folder = item.Cartella;
                const exists = playgroundData.some(p => p.cartella.toLowerCase() === folder.toLowerCase() || p.id.toLowerCase() === folder.toLowerCase());
                if (!exists) {
                    const formattedTitle = folder.charAt(0).toUpperCase() + folder.slice(1).replace(/[-_]/g, ' ');
                    playgroundData.push({
                        id: folder.toLowerCase(),
                        cartella: folder,
                        titolo: formattedTitle,
                        titoloEvocativo: "Esperimento di codice",
                        descrizione: `Progetto sperimentale della sezione Playground: ${formattedTitle}.`,
                        url: `Playground/${folder}/index.html`,
                        metadati: {
                            progetto: ["Interactive", "Creative Coding"],
                            anno: 2026
                        }
                    });
                }
            });
        }

        // Avvia il routing iniziale
        handleRoute();
    } catch (err) {
        console.error("Errore nel caricamento dei dati JSON del portfolio:", err);
        appContent.innerHTML = `
            <div style="text-align: center; padding: 100px 20px; font-family: sans-serif;">
                <h2 style="color: #ff3333; margin-bottom: 20px;">Impossibile caricare il portfolio</h2>
                <p style="color: #666; font-size: 16px;">Assicurati che l'applicazione sia servita tramite un server web (http/https) e che i file JSON siano accessibili.</p>
            </div>
        `;
    }
}

// ── GESTIONE SEO E ROUTING ──
const SEOManager = {
    update(page, data = null) {
        let title = 'Ferdinando Virno - Portfolio';
        let description = 'Portfolio di Ferdinando Virno, designer per la comunità e comunicatore visivo.';
        let keywords = 'Ferdinando Virno, Portfolio, Design, Comunicazione Visiva';
        let ogImage = 'https://ferd.esign/Personal%20Branding/FOTO-BIO.webp';
        let url = window.location.href;

        // Estrazione base dalla bio
        const bioText = bioData && bioData.bio ? bioData.bio : description;

        let schema = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "Ferdinando Virno",
            "url": "https://ferd.esign/",
            "jobTitle": "Designer per la Comunità",
            "description": bioText
        };

        if (page === 'progetto' && data) {
            title = `${data.titolo} - Ferdinando Virno`;
            description = data.descrizione || description;
            keywords = data.metadati && data.metadati.progetto ? data.metadati.progetto.join(', ') : keywords;

            const media = getProjectMedia(data, portfolioStruttura);
            const cover = getCoverMedia(media);
            if (cover && cover.type === 'image') {
                ogImage = `https://ferd.esign/${cover.path.replace(/ /g, '%20')}`;
            }

            schema = {
                "@context": "https://schema.org",
                "@type": "CreativeWork",
                "name": data.titolo,
                "author": {
                    "@type": "Person",
                    "name": "Ferdinando Virno"
                },
                "description": description,
                "url": url,
                "datePublished": (data.metadati && data.metadati.anno ? data.metadati.anno : "").toString()
            };
        } else if (page === 'archivio_progetto' && data) {
            title = `${data.titolo} - Archivio - Ferdinando Virno`;
            description = data.descrizione || description;
            keywords = data.metadati && data.metadati.progetto ? data.metadati.progetto.join(', ') : keywords;

            const media = getProjectMedia(data, portfolioStruttura);
            const cover = getCoverMedia(media);
            if (cover && cover.type === 'image') {
                ogImage = `https://ferd.esign/${cover.path.replace(/ /g, '%20')}`;
            }

            schema = {
                "@context": "https://schema.org",
                "@type": "CreativeWork",
                "name": data.titolo,
                "author": {
                    "@type": "Person",
                    "name": "Ferdinando Virno"
                },
                "description": description,
                "url": url,
                "datePublished": (data.metadati && data.metadati.anno ? data.metadati.anno : "").toString()
            };
        } else if (page === 'playground_progetto' && data) {
            title = `${data.titolo} - Playground - Ferdinando Virno`;
            description = data.descrizione || description;
            keywords = data.metadati && data.metadati.progetto ? data.metadati.progetto.join(', ') : keywords;

            const media = getPlaygroundMedia(data, playgroundStruttura);
            const cover = getCoverMedia(media);
            if (cover && cover.type === 'image') {
                ogImage = `https://ferd.esign/${cover.path.replace(/ /g, '%20')}`;
            }

            schema = {
                "@context": "https://schema.org",
                "@type": "CreativeWork",
                "name": data.titolo,
                "author": {
                    "@type": "Person",
                    "name": "Ferdinando Virno"
                },
                "description": description,
                "url": url,
                "datePublished": (data.metadati && data.metadati.anno ? data.metadati.anno : "").toString()
            };
        } else if (page === 'playground') {
            title = 'Playground - Ferdinando Virno';
        } else if (page === 'archivio') {
            title = 'Archivio - Ferdinando Virno';
        } else if (page === 'contatti' || page === 'about') {
            title = 'About - Ferdinando Virno';
            description = 'Biografia, percorso e approccio di Ferdinando Virno, designer per la comunità e comunicatore visivo.';
        }

        document.title = title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = description;

        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) metaKeywords.content = keywords;

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = title;

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = description;

        const ogImg = document.querySelector('meta[property="og:image"]');
        if (ogImg) ogImg.content = ogImage;

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.content = url;

        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = url;

        const schemaScript = document.getElementById('schema-ld');
        if (schemaScript) schemaScript.textContent = JSON.stringify(schema, null, 2);
    }
};

function handleRoute() {
    isNavigatingNextProject = false;
    document.body.classList.remove('hide-footer');
    document.body.classList.remove('playground-fullscreen-mode');
    document.body.classList.remove('page-esplora');
    togglePlaygroundModal(false);

    // Gestione retrocompatibilità con eventuali URL vecchi con Hash (es. #/munarino -> /munarino)
    let pathname = window.location.pathname;
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const cleanHash = hash.replace(/^#\/?/, '');
        if (cleanHash) {
            pathname = '/' + cleanHash;
            window.history.replaceState(null, '', pathname);
        }
    }

    // Estragga lo slug pulito dall'URL pathname
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const segments = cleanPath ? cleanPath.split('/') : [];
    const slug = segments.length > 0 ? segments[segments.length - 1].toLowerCase() : '';

    if (!cleanPath || cleanPath === 'esplora') {
        renderEsplora();
        SEOManager.update('esplora');
        return;
    }

    if (cleanPath === 'archivio') {
        renderArchivio();
        SEOManager.update('archivio');
        return;
    }

    if (cleanPath === 'playground') {
        renderPlayground();
        SEOManager.update('playground');
        return;
    }

    if (cleanPath === 'contatti' || cleanPath === 'about') {
        renderAbout();
        SEOManager.update('about');
        return;
    }

    // 1. Cerca nei Progetti Principali (compresi sottoprogetti come marathia, cunti)
    const pMain = progettiData.find(x =>
        x.id.toLowerCase() === slug ||
        x.cartella.toLowerCase() === slug ||
        (x.sottoprogetti && x.sottoprogetti.some(sp => sp.id.toLowerCase() === slug || sp.cartella.toLowerCase() === slug))
    );
    if (pMain) {
        renderProgetto(pMain.id);
        SEOManager.update('progetto', pMain);
        return;
    }

    // 2. Cerca nel Playground (es. munarino)
    const pPlayground = playgroundData.find(x =>
        x.id.toLowerCase() === slug ||
        x.cartella.toLowerCase() === slug
    );
    if (pPlayground) {
        renderProgettoPlayground(pPlayground.id);
        SEOManager.update('playground_progetto', pPlayground);
        return;
    }

    // Rotta non trovata: fallback a Esplora
    renderEsplora();
    SEOManager.update('esplora');
    window.history.replaceState(null, '', '/');
}

window.switchArchivioSection = switchArchivioSection;
window.openManifestoModal = openManifestoModal;
window.closeManifestoModal = closeManifestoModal;
window.selectManifestoVersion = selectManifestoVersion;
window.handleManifestoModalOverlayClick = handleManifestoModalOverlayClick;

window.addEventListener('popstate', handleRoute);

// Inizializzazione
init();
