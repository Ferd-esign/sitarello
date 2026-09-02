// Dati globali caricati asincronamente
let progettiData = [];
let bioData = {};
let portfolioStruttura = [];
let portfolioFile = [];
let archivioData = [];
let archivioStruttura = [];

// ── Flip Card About: gestisce il pendolo → flip → pendolo senza glitch ──
function toggleFlipCard(card) {
    const inner = card.querySelector('.cc-flip-inner');
    if (!inner) return;

    const isFlipped = card.classList.contains('flipped');

    if (!isFlipped) {
        // 1. Blocca il pendolo e congela la posizione corrente
        inner.style.animation = 'none';
        void inner.offsetWidth; // reflow: applica l'animation:none
        // 2. Imposta la partenza esplicita da rotateY(0)
        inner.style.transition = 'none';
        inner.style.transform = 'rotateY(0deg)';
        void inner.offsetWidth; // reflow: fissa il punto di partenza
        // 3. Ora imposta la transition e lancia il flip a 180°
        inner.style.transition = 'transform 0.75s cubic-bezier(0.34, 1.3, 0.64, 1)';
        inner.style.transform = 'rotateY(180deg)';
        card.classList.add('flipped');
    } else {
        // Torna al fronte
        inner.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)';
        inner.style.transform = 'rotateY(0deg)';
        card.classList.remove('flipped');
        // Dopo la transition riavvia il pendolo
        setTimeout(() => {
            inner.style.transition = '';
            inner.style.transform = '';
            inner.style.animation = '';
        }, 650);
    }
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
                        type: fileName.toLowerCase().endsWith('.mp4') ? 'video' : 'image'
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
            type: fileName.toLowerCase().endsWith('.mp4') ? 'video' : 'image'
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
                    type: fileName.toLowerCase().endsWith('.mp4') ? 'video' : 'image'
                });
            }
        });
    });

    return matchedFiles;
}

// Helper: trova la copertina di un progetto (file denominato COPERTINA, case-insensitive)
function getCoverMedia(media) {
    // Prima priorità: file con nome che inizia con 'copertina' (case-insensitive)
    const copertina = media.find(m =>
        m.name.toLowerCase().startsWith('copertina')
    );
    if (copertina) return copertina;
    // Fallback: primo media disponibile
    return media[0] || null;
}

// DOM Elements
const appContent = document.getElementById('app-content');
const navLinks = document.querySelectorAll('.nav-link');

// Utils
function setActiveNav(targetId) {
    navLinks.forEach(l => l.classList.remove('active'));
    if (targetId) {
        const activeLink = document.querySelector(`[data-target="${targetId}"]`);
        if (activeLink) activeLink.classList.add('active');
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

    const handleScroll = () => {
        if (hasTriggered || isNavigatingNextProject) return;

        const rect = triggerEl.getBoundingClientRect();
        const fillBar = document.getElementById('np-bar-fill');
        const windowHeight = window.innerHeight;

        if (rect.top < windowHeight) {
            const visibleRatio = Math.min(1, Math.max(0, (windowHeight - rect.top) / (rect.height * 0.7)));
            if (fillBar) {
                fillBar.style.width = `${visibleRatio * 100}%`;
            }

            const distanceToBottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);
            if (distanceToBottom <= 20 && visibleRatio >= 0.8) {
                hasTriggered = true;
                triggerNextProject(onNavigate);
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

    setTimeout(() => {
        if (appContent) appContent.classList.remove('page-transition-out');
        onNavigate();
    }, 300);
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

function renderEsplora() {
    setActiveNav('esplora');

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

    // Ordina: anno desc, poi titolo alfabetico in caso di parità
    const sortedProgetti = [...progettiData].sort((a, b) => {
        const annoDiff = b.metadati.anno - a.metadati.anno;
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
            <div class="project-card reveal" data-delay="${delayIndex}" onclick="renderProgetto('${p.id}')">
                <div class="cover-container">
                    ${coverHtml}
                </div>
                <h3>${p.titolo}</h3>
                <div class="tags">${p.metadati.progetto.join(', ')} • ${p.metadati.anno}</div>
            </div>
        `;
    });

    html += `</div>`;
    appContent.innerHTML = html;
    scrollToTop();
    initScrollReveal();
}

// Helper: recupera i media di un progetto dall'archivio (path base: Progetti/Archivio/)
function getArchivioMedia(project, struttura) {
    const cartellaLower = project.cartella.toLowerCase();

    // Gestione speciale per i sottoprogetti della Tesi (NLM)
    if (cartellaLower === 'tesi' || cartellaLower === 'marathia' || cartellaLower === 'cunti') {
        const tesiFolder = struttura.find(item => item.Cartella.toLowerCase() === 'tesi');
        if (tesiFolder) {
            let matchedFiles = [];
            tesiFolder.File.forEach(fileName => {
                const fileNameLower = fileName.toLowerCase();
                let isMatch = false;
                if (cartellaLower === 'tesi') {
                    isMatch = true;
                } else if (cartellaLower === 'marathia' && fileNameLower.includes('marathia')) {
                    isMatch = true;
                } else if (cartellaLower === 'cunti' && fileNameLower.includes('cunti')) {
                    isMatch = true;
                }
                if (isMatch) {
                    matchedFiles.push({
                        name: fileName,
                        path: `Progetti/Archivio/Tesi/${fileName}`,
                        type: fileName.toLowerCase().endsWith('.mp4') ? 'video' : 'image'
                    });
                }
            });
            return matchedFiles;
        }
    }

    // Cerca la cartella nella struttura archivio
    const folderMatch = struttura.find(item =>
        item.Cartella.toLowerCase() === cartellaLower ||
        cartellaLower.includes(item.Cartella.toLowerCase()) ||
        item.Cartella.toLowerCase().includes(cartellaLower)
    );

    if (folderMatch) {
        return folderMatch.File.map(fileName => ({
            name: fileName,
            path: `Progetti/Archivio/${folderMatch.Cartella}/${fileName}`,
            type: fileName.toLowerCase().endsWith('.mp4') ? 'video' : 'image'
        }));
    }

    return [];
}

function renderArchivio() {
    setActiveNav('archivio');

    // Raggruppa i progetti per anno, ordine decrescente
    const sorted = [...archivioData].sort((a, b) => b.metadati.anno - a.metadati.anno);
    const byYear = {};
    sorted.forEach(p => {
        const y = p.metadati.anno;
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

    years.forEach((year, yi) => {
        const progetti = byYear[year];
        html += `
            <div class="archivio-year-block reveal" data-delay="${(yi % 3) + 1}">
                <div class="archivio-year-label">${year}</div>
                <div class="archivio-grid">
        `;

        progetti.forEach((p, pi) => {
            const media = getArchivioMedia(p, archivioStruttura);
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
                <div class="archivio-card reveal" data-delay="${(pi % 4) + 1}" onclick="renderProgettoArchivio('${p.id}')" role="button" tabindex="0" aria-label="Apri progetto ${p.titolo}">
                    <div class="archivio-card-cover">
                        ${coverHtml}
                        <div class="archivio-card-overlay">
                            <span class="archivio-card-overlay-label">Vedi progetto <span aria-hidden="true">→</span></span>
                        </div>
                    </div>
                    <div class="archivio-card-info">
                        <h3 class="archivio-card-title">${p.titolo}</h3>
                        <div class="archivio-card-tags">${p.metadati.progetto.join(' · ')}</div>
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
}

function renderProgettoArchivio(id) {
    const p = archivioData.find(x => x.id === id);
    if (!p) return;

    setActiveNav('archivio');

    const media = getArchivioMedia(p, archivioStruttura);
    const coverMedia = getCoverMedia(media);

    // Galleria principale (esclude i media dei sottoprogetti)
    const subKeywords = (p.sottoprogetti || []).map(sp => sp.cartella.toLowerCase());
    const mainMedia = p.sottoprogetti
        ? media.filter(m => !subKeywords.some(kw => m.name.toLowerCase().includes(kw)))
        : media;

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

    // Sezioni sottoprogetti
    let subProjectsHtml = '';
    if (p.sottoprogetti && p.sottoprogetti.length > 0) {
        p.sottoprogetti.forEach(sp => {
            const spMedia = getArchivioMedia(sp, archivioStruttura);
            const spCoverMedia = getCoverMedia(spMedia);

            let spGalleryHtml = '';
            spMedia.forEach(m => {
                spGalleryHtml += m.type === 'video'
                    ? `<div class="media-container video-container reveal"><video src="${m.path}" autoplay loop muted playsinline></video></div>`
                    : `<div class="media-container image-container reveal"><img src="${m.path}" alt="${sp.titolo}"></div>`;
            });

            let spCoverHeroHtml = '';
            if (spCoverMedia) {
                spCoverHeroHtml = spCoverMedia.type === 'video'
                    ? `<div class="detail-hero-cover"><video src="${spCoverMedia.path}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;display:block;max-height:480px;"></video></div>`
                    : `<div class="detail-hero-cover"><img src="${spCoverMedia.path}" alt="${sp.titolo} — cover" onerror="this.parentElement.style.display='none'"></div>`;
            }

            subProjectsHtml += `
                <div class="subproject-section reveal">
                    <div class="subproject-header">
                        <h3 class="subproject-title">
                            ${sp.titolo} <span class="subproject-evocativo">— ${sp.titoloEvocativo}</span>
                        </h3>
                        <div class="meta-grid" style="margin-top:20px;">
                            <div class="meta-item"><strong>Cliente</strong>${sp.metadati.cliente}</div>
                            <div class="meta-item"><strong>Tipologia</strong>${sp.metadati.progetto.join(', ')}</div>
                            <div class="meta-item"><strong>Anno</strong>${sp.metadati.anno}</div>
                        </div>
                    </div>
                    ${spCoverHeroHtml}
                    <p class="progetto-descrizione reveal" style="margin-top:32px;">${sp.descrizione}</p>
                    <div class="gallery">${spGalleryHtml}</div>
                </div>
            `;
        });
    }

    // Cover hero principale
    let coverHeroHtml = '';
    if (coverMedia) {
        coverHeroHtml = coverMedia.type === 'video'
            ? `<div class="detail-hero-cover"><video src="${coverMedia.path}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;display:block;max-height:480px;"></video></div>`
            : `<div class="detail-hero-cover"><img src="${coverMedia.path}" alt="${p.titolo} — cover" onerror="this.parentElement.style.display='none'"></div>`;
    }

    // Calcola il prossimo progetto nell'archivio
    const currentIndex = archivioData.findIndex(x => x.id === id);
    const nextProject = (archivioData.length > 0 && currentIndex !== -1)
        ? archivioData[(currentIndex + 1) % archivioData.length]
        : null;

    let nextProjectHtml = '';
    if (nextProject && nextProject.id !== id) {
        nextProjectHtml = `
            <div class="next-project-trigger-wrapper reveal">
                <div class="next-project-trigger" id="next-project-trigger" onclick="triggerNextProject(() => renderProgettoArchivio('${nextProject.id}'))" role="button" tabindex="0" aria-label="Passa al prossimo progetto: ${nextProject.titolo}">
                    <div class="np-trigger-top">
                        <span class="np-trigger-label">PROSSIMO PROGETTO</span>
                        <span class="np-trigger-arrow" aria-hidden="true">→</span>
                    </div>
                    <h3 class="np-trigger-title">${nextProject.titolo}</h3>
                    ${nextProject.titoloEvocativo ? `<p class="np-trigger-evocativo">${nextProject.titoloEvocativo}</p>` : ''}
                    <div class="np-trigger-bar">
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

            <div class="gallery">${galleryHtml}</div>

            ${subProjectsHtml}

            <button class="btn-back" onclick="renderArchivio()">
                <span class="btn-back-arrow" aria-hidden="true">←</span>
                <span class="btn-back-label">TORNA ALL'ARCHIVIO</span>
            </button>

            ${nextProjectHtml}
        </div>
    `;
    scrollToTop();
    initScrollReveal();
    if (nextProject && nextProject.id !== id) {
        setupNextProjectScrollTrigger(() => renderProgettoArchivio(nextProject.id));
    }
}

function renderContatti() {
    setActiveNav('contatti');

    const email = bioData.link ? bioData.link.email : 'mailto:virnoferdinando@gmail.com';
    const bio = bioData.bio || '';
    const interesse = bioData.interesse || '';

    appContent.innerHTML = `
        <div class="contatti-card">

            <!-- SINISTRA: Titolo, Handle, Link CV -->
            <div class="cc-left-col">
                <h1 class="cc-name">FERDINANDO<br>VIRN<span class="cc-o-geo">O</span></h1>
                <div class="cc-handle">
                    <svg class="cc-arrow" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 16 L16 4 M16 4 L7 4 M16 4 L16 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ferd.esign
                </div>
                <div class="cc-links-row">
                    <a href="Personal Branding/VIRNO-FERDINANDO_CV_2026.pdf" target="_blank" class="cc-pill-link cc-pill-primary">Scarica Curriculum</a>
                </div>
            </div>

            <!-- DESTRA: Flip Card -->
            <div class="cc-foto-wrapper">
                <div class="cc-flip-card" id="cc-flip-card" onclick="toggleFlipCard(this)" title="Clicca per scoprire">
                    <div class="cc-flip-inner">
                        <!-- FRONTE: foto -->
                        <div class="cc-flip-front">
                            <img src="Personal Branding/FOTO-BIO.webp" alt="Ferdinando Virno" class="cc-foto-bio" onerror="this.style.display='none'">
                            <div class="cc-foto-hint">TAP</div>
                        </div>
                        <!-- RETRO: testo -->
                        <div class="cc-flip-back">
                            <p class="cc-flip-bio">${interesse}</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
    scrollToTop();
}


function renderProgetto(id) {
    const p = progettiData.find(x => x.id === id);
    if (!p) return;

    setActiveNav(null);

    const media = getProjectMedia(p, portfolioStruttura);
    const coverMedia = getCoverMedia(media);

    // ── Galleria principale (solo i media del progetto padre, non dei sottoprogetti) ──
    const subKeywords = (p.sottoprogetti || []).map(sp => sp.cartella.toLowerCase());
    const mainMedia = p.sottoprogetti
        ? media.filter(m => !subKeywords.some(kw => m.name.toLowerCase().includes(kw)))
        : media;

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

    // ── Sezioni sottoprogetti (Marathia, Cunti…) ──
    let subProjectsHtml = '';
    if (p.sottoprogetti && p.sottoprogetti.length > 0) {
        p.sottoprogetti.forEach(sp => {
            // Filtra i media del sottoprogetto per nome file
            const spKey = sp.cartella.toLowerCase();
            const spMedia = media.filter(m => m.name.toLowerCase().includes(spKey));

            const spCoverMedia = getCoverMedia(spMedia);

            let spGalleryHtml = '';
            if (spMedia.length > 0) {
                spMedia.forEach(m => {
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
                            ${sp.titolo} <span class="subproject-evocativo">— ${sp.titoloEvocativo}</span>
                        </h3>
                        <div class="meta-grid" style="margin-top:20px;">
                            <div class="meta-item"><strong>Cliente</strong>${sp.metadati.cliente}</div>
                            <div class="meta-item"><strong>Tipologia</strong>${sp.metadati.progetto.join(', ')}</div>
                            <div class="meta-item"><strong>Anno</strong>${sp.metadati.anno}</div>
                        </div>
                    </div>
                    ${spCoverHeroHtml}
                    <p class="progetto-descrizione reveal" style="margin-top:32px;">${sp.descrizione}</p>
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
        nextProjectHtml = `
            <div class="next-project-trigger-wrapper reveal">
                <div class="next-project-trigger" id="next-project-trigger" onclick="triggerNextProject(() => renderProgetto('${nextProject.id}'))" role="button" tabindex="0" aria-label="Passa al prossimo progetto: ${nextProject.titolo}">
                    <div class="np-trigger-top">
                        <span class="np-trigger-label">PROSSIMO PROGETTO</span>
                        <span class="np-trigger-arrow" aria-hidden="true">→</span>
                    </div>
                    <h3 class="np-trigger-title">${nextProject.titolo}</h3>
                    ${nextProject.titoloEvocativo ? `<p class="np-trigger-evocativo">${nextProject.titoloEvocativo}</p>` : ''}
                    <div class="np-trigger-bar">
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

            <div class="gallery">${galleryHtml}</div>

            ${subProjectsHtml}

            <button class="btn-back" onclick="renderEsplora()">
                <span class="btn-back-arrow" aria-hidden="true">←</span>
                <span class="btn-back-label">TORNA A ESPLORA</span>
            </button>

            ${nextProjectHtml}
        </div>
    `;
    scrollToTop();
    initScrollReveal();
    if (nextProject && nextProject.id !== id) {
        setupNextProjectScrollTrigger(() => renderProgetto(nextProject.id));
    }
}

// Event Listeners for Nav
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.getAttribute('data-target');
        if (target === 'esplora') renderEsplora();
        if (target === 'archivio') renderArchivio();
        if (target === 'contatti') renderContatti();
    });
});

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
        const [progettiRes, strutturaRes, bioRes, fileRes, archivioRes, archivioStrutturaRes] = await Promise.all([
            fetch('Progetti/progetti-data.json'),
            fetch('Progetti/portfolio-struttura.json'),
            fetch('Personal Branding/BIO-ABOUT-US.json'),
            fetch('Personal Branding/portfolio-file.json'),
            fetch('Progetti/Archivio/archivio-data.json'),
            fetch('Progetti/Archivio/struttura-archivio.json')
        ]);

        progettiData = await progettiRes.json();
        portfolioStruttura = await strutturaRes.json();
        bioData = await bioRes.json();
        portfolioFile = await fileRes.json();
        archivioData = await archivioRes.json();
        archivioStruttura = await archivioStrutturaRes.json();

        // Avvia il rendering iniziale
        renderEsplora();
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

// Inizializzazione
init();
