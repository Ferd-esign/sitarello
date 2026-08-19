// Dati globali caricati asincronamente
let progettiData = [];
let bioData = {};
let portfolioStruttura = [];
let portfolioFile = [];

// Helper per mappare i media di ciascun progetto dalla struttura dei file
function getProjectMedia(project, struttura) {
    const cartellaLower = project.cartella.toLowerCase();

    // 1. Cerca una cartella in portfolio-struttura che corrisponda alla cartella del progetto
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

    // 2. Fallback: cerca per nome file in tutte le cartelle
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

// Renders
function renderEsplora() {
    setActiveNav('esplora');
    const claimText = bioData.claim || '';
    // Divide la bio-claim preservando i punti
    const claimLines = claimText.split(/(?<=\.)\s+/);

    let html = `
        <div class="hero">
            <img src="Personal Branding/logotipo-ferd.png" alt="Ferdinando Virno" class="hero-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <h1 class="claim" style="display:none; font-weight:700; font-size:48px; margin-bottom: 20px;">FERDINANDO VIRNO</h1>
            <h1 class="claim">
                <span>${claimLines[0] || ''}</span>
                <span>${claimLines[1] || ''}</span>
            </h1>
        </div>
        <div class="project-grid">
    `;

    progettiData.forEach((p, index) => {
        const media = getProjectMedia(p, portfolioStruttura);
        const firstImage = media.find(m => m.type === 'image');
        const coverSrc = firstImage ? firstImage.path : '';
        const delayIndex = (index % 4) + 1; // delay 1-4 ciclicamente

        html += `
            <div class="project-card reveal" data-delay="${delayIndex}" onclick="renderProgetto('${p.id}')">
                <div class="cover-container">
                    ${coverSrc ?
                `<img src="${coverSrc}" alt="${p.titolo}" class="cover" onerror="this.src='https://via.placeholder.com/800x600/f0f0f0/cccccc?text=${p.titolo}'">` :
                `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#999; font-size:14px;">Copertina non disponibile</div>`
            }
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

function renderArchivio() {
    setActiveNav('archivio');
    let html = `
        <h2 style="font-size: 40px; margin-bottom: 40px;">Archivio Progetti</h2>
        <div style="overflow-x:auto;">
            <table style="width:100%; text-align:left; border-collapse: collapse; font-size: 16px;">
                <tr style="border-bottom: 2px solid var(--black);">
                    <th style="padding:15px 10px;">Anno</th>
                    <th style="padding:15px 10px;">Progetto</th>
                    <th style="padding:15px 10px;">Cliente</th>
                    <th style="padding:15px 10px;">Settore</th>
                </tr>
    `;

    // Sort desc by year
    const sorted = [...progettiData].sort((a, b) => b.metadati.anno - a.metadati.anno);

    sorted.forEach(p => {
        html += `
            <tr style="border-bottom: 1px solid #eee; cursor:pointer;" onclick="renderProgetto('${p.id}')" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='transparent'">
                <td style="padding:15px 10px;">${p.metadati.anno}</td>
                <td style="padding:15px 10px; font-weight:600;">${p.titolo}</td>
                <td style="padding:15px 10px;">${p.metadati.cliente}</td>
                <td style="padding:15px 10px; color:#666;">${p.metadati.settore}</td>
            </tr>
        `;
    });

    html += `</table></div>`;
    appContent.innerHTML = html;
    scrollToTop();
}

function renderContatti() {
    setActiveNav('contatti');

    const email = bioData.link ? bioData.link.email : 'mailto:virnoferdinando@gmail.com';
    const linkedin = bioData.link ? bioData.link.linkedin : '#';
    const instagram = bioData.link ? bioData.link.instagram : '#';

    appContent.innerHTML = `
        <div class="contatti-card">

            <!-- TOP ROW -->
            <div class="cc-top">
                <div class="cc-top-left">
                    <h1 class="cc-name">FERDINANDO<br>VIRN<span class="cc-o-geo">O</span></h1>
                    <div class="cc-handle">
                        <svg class="cc-arrow" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 16 L16 4 M16 4 L7 4 M16 4 L16 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ferd.esign
                    </div>
                </div>
                <div class="cc-top-center">
                    <span class="cc-tag">22 ANNI</span>
                </div>
                <div class="cc-top-right">
                    <span class="cc-tag">SALERNO / NAPOLI</span>
                </div>
            </div>

            <!-- MIDDLE — SVG GEOMETRY -->
            <div class="cc-middle" aria-hidden="true">
                <svg class="cc-geo-svg" viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                    <!-- Cerchio sinistro -->
                    <circle cx="380" cy="220" r="190" fill="none" stroke="var(--blue)" stroke-width="0.8" opacity="0.55"/>
                    <!-- Cerchio destro -->
                    <circle cx="620" cy="220" r="190" fill="none" stroke="var(--blue)" stroke-width="0.8" opacity="0.55"/>
                    <!-- Rombo sinistro (linee diagonali) -->
                    <polygon points="120,10 340,220 120,430 -100,220" fill="none" stroke="var(--blue)" stroke-width="0.7" opacity="0.4"/>
                    <!-- Rombo destro -->
                    <polygon points="880,10 1100,220 880,430 660,220" fill="none" stroke="var(--blue)" stroke-width="0.7" opacity="0.4"/>
                    <!-- Linea verticale centrale -->
                    <line x1="500" y1="0" x2="500" y2="440" stroke="var(--blue)" stroke-width="0.5" opacity="0.25"/>
                </svg>
            </div>

            <!-- BOTTOM ROW -->
            <div class="cc-bottom">
                <div class="cc-bottom-left">
                    <span class="cc-tag-line">I DESIGN<br>VISUAL STORIES</span>
                </div>
                <div class="cc-bottom-center">
                    <span class="cc-info-label">TEL</span>
                    <a href="tel:+393339128401" class="cc-info-value">3339128401</a>
                </div>
                <div class="cc-bottom-right">
                    <span class="cc-info-label">EMAIL</span>
                    <a href="${email}" class="cc-info-value">VIRNOFERDINANDO@GMAIL.COM</a>
                </div>
            </div>

            <!-- LINKS ROW -->
            <div class="cc-links-row">
                <a href="${linkedin}"  target="_blank" class="cc-pill-link">LinkedIn</a>
                <a href="${instagram}" target="_blank" class="cc-pill-link">Instagram</a>
                <a href="Personal Branding/VIRNO-FERDINANDO_CV_2026.pdf" target="_blank" class="cc-pill-link cc-pill-primary">Scarica CV</a>
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
    const firstImage = media.find(m => m.type === 'image');
    const coverSrc = firstImage ? firstImage.path : '';

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

            const spFirstImg = spMedia.find(m => m.type === 'image');
            const spCoverSrc = spFirstImg ? spFirstImg.path : '';

            let spGalleryHtml = '';
            if (spMedia.length > 0) {
                spMedia.forEach(m => {
                    spGalleryHtml += m.type === 'video'
                        ? `<div class="media-container video-container reveal"><video src="${m.path}" autoplay loop muted playsinline></video></div>`
                        : `<div class="media-container image-container reveal"><img src="${m.path}" alt="${sp.titolo}"></div>`;
                });
            }

            const spCoverHeroHtml = spCoverSrc ? `
                <div class="detail-hero-cover">
                    <img src="${spCoverSrc}" alt="${sp.titolo} — cover" onerror="this.parentElement.style.display='none'">
                </div>` : '';

            subProjectsHtml += `
                <div class="subproject-section reveal">
                    <div class="subproject-header">
                        <h3 class="subproject-title">${sp.titolo}</h3>
                        <div class="subproject-evocativo">${sp.titoloEvocativo}</div>
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
    const coverHeroHtml = coverSrc ? `
        <div class="detail-hero-cover">
            <img src="${coverSrc}" alt="${p.titolo} — cover" onerror="this.parentElement.style.display='none'">
        </div>` : '';

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

            <button class="btn-back" onclick="renderEsplora()">Torna a Esplora</button>
        </div>
    `;
    scrollToTop();
    initScrollReveal();
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

// Funzione asincrona di avvio per caricare i file JSON
async function init() {
    try {
        const [progettiRes, strutturaRes, bioRes, fileRes] = await Promise.all([
            fetch('Progetti/progetti-data.json'),
            fetch('Progetti/portfolio-struttura.json'),
            fetch('Personal Branding/BIO-ABOUT-US.json'),
            fetch('Personal Branding/portfolio-file.json')
        ]);

        progettiData = await progettiRes.json();
        portfolioStruttura = await strutturaRes.json();
        bioData = await bioRes.json();
        portfolioFile = await fileRes.json();

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
