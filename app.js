// Dati globali caricati asincronamente
let progettiData = [];
let bioData = {};
let portfolioStruttura = [];
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
            <div class="project-card reveal" data-delay="${delayIndex}" onclick="window.location.hash = '#/progetto/${p.id}'">
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
                        type: isMediaTypeVideo(fileName) ? 'video' : 'image'
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
            type: isMediaTypeVideo(fileName) ? 'video' : 'image'
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

            <!-- NUOVO BOX AVVISO -->
            <div class="archivio-alert">
                Questa sezione è in fase di compilazione. L'archivio verrà presto popolato con i progetti completi.
            </div>

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
                <div class="archivio-card reveal" data-delay="${(pi % 4) + 1}" onclick="window.location.hash = '#/archivio/${p.id}'" role="button" tabindex="0" aria-label="Apri progetto ${p.titolo}">
                    <div class="archivio-card-cover">
                        ${coverHtml}
                    
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
    document.body.classList.add('hide-footer');
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
                <div class="next-project-trigger" id="next-project-trigger" onclick="triggerNextProject(() => window.location.hash = '#/archivio/${nextProject.id}')" role="button" tabindex="0" aria-label="Passa al prossimo progetto: ${nextProject.titolo}">
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


            ${nextProjectHtml}
        </div>
    `;
    scrollToTop();
    initScrollReveal();
    if (nextProject && nextProject.id !== id) {
        setupNextProjectScrollTrigger(() => window.location.hash = `#/archivio/${nextProject.id}`);
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
    document.body.classList.add('hide-footer');
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
                <div class="next-project-trigger" id="next-project-trigger" onclick="triggerNextProject(() => window.location.hash = '#/progetto/${nextProject.id}')" role="button" tabindex="0" aria-label="Passa al prossimo progetto: ${nextProject.titolo}">
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

            ${nextProjectHtml}
        </div>
    `;
    scrollToTop();
    initScrollReveal();
    if (nextProject && nextProject.id !== id) {
        setupNextProjectScrollTrigger(() => window.location.hash = `#/progetto/${nextProject.id}`);
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
        const [progettiRes, strutturaRes, bioRes, archivioRes, archivioStrutturaRes] = await Promise.all([
            fetch('Progetti/progetti-data.json'),
            fetch('Progetti/portfolio-struttura.json'),
            fetch('Personal Branding/BIO-ABOUT-US.json'),
            fetch('Progetti/Archivio/archivio-data.json'),
            fetch('Progetti/Archivio/struttura-archivio.json')
        ]);

        progettiData = await progettiRes.json();
        portfolioStruttura = await strutturaRes.json();
        bioData = await bioRes.json();
        archivioData = await archivioRes.json();
        archivioStruttura = await archivioStrutturaRes.json();

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

            const media = getArchivioMedia(data, archivioStruttura);
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
        } else if (page === 'archivio') {
            title = 'Archivio - Ferdinando Virno';
        } else if (page === 'contatti') {
            title = 'About - Ferdinando Virno';
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
        if (canonical) canonical.href = url.split('#')[0]; // Canonical in genere punta alla radice o alla base url se è una vera SPA con rewrite

        const schemaScript = document.getElementById('schema-ld');
        if (schemaScript) schemaScript.textContent = JSON.stringify(schema, null, 2);
    }
};

function handleRoute() {
    document.body.classList.remove('hide-footer');
    const hash = window.location.hash;

    if (hash.startsWith('#/progetto/')) {
        const id = hash.replace('#/progetto/', '');
        const p = progettiData.find(x => x.id === id);
        if (p) {
            renderProgetto(id);
            SEOManager.update('progetto', p);
        } else {
            window.location.hash = '#/esplora';
        }
    } else if (hash.startsWith('#/archivio/')) {
        const id = hash.replace('#/archivio/', '');
        const p = archivioData.find(x => x.id === id);
        if (p) {
            renderProgettoArchivio(id);
            SEOManager.update('archivio_progetto', p);
        } else {
            window.location.hash = '#/archivio';
        }
    } else if (hash === '#/archivio') {
        renderArchivio();
        SEOManager.update('archivio');
    } else if (hash === '#/contatti') {
        renderContatti();
        SEOManager.update('contatti');
    } else {
        renderEsplora();
        SEOManager.update('esplora');
    }
}

window.addEventListener('hashchange', handleRoute);

// Inizializzazione
init();
