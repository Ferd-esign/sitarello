// Dati globali caricati asincronamente
let progettiData = [];
let bioData = {};
let portfolioStruttura = [];
let portfolioFile = [];

// Helper per mappare i media di ciascun progetto dalla struttura dei file
function getProjectMedia(project, struttura) {
    const cartellaLower = project.cartella.toLowerCase();

    // 1. Cerca una cartella in portfolio-struttura che corrisponda alla cartella del progetto (es. Tratti, SponzFest, Identity)
    const folderMatch = struttura.find(item => {
        const itemLower = item.Cartella.toLowerCase();
        return itemLower === cartellaLower ||
            cartellaLower.includes(itemLower) ||
            itemLower.includes(cartellaLower);
    });

    if (folderMatch) {
        return folderMatch.File.map(fileName => ({
            name: fileName,
            path: `Progetti/${folderMatch.Cartella}/${fileName}`,
            type: fileName.toLowerCase().endsWith('.mp4') ? 'video' : 'image'
        }));
    }

    // 2. Se non corrisponde direttamente (es. NLM, Marathia, Cunti), cerca tra tutti i file in tutte le cartelle (es. Tesi)
    const matchedFiles = [];
    struttura.forEach(item => {
        item.File.forEach(fileName => {
            const fileNameLower = fileName.toLowerCase();
            if (fileNameLower.includes(cartellaLower)) {
                matchedFiles.push({
                    name: fileName,
                    path: `Progetti/${item.Cartella}/${fileName}`,
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

    progettiData.forEach(p => {
        const media = getProjectMedia(p, portfolioStruttura);
        const firstImage = media.find(m => m.type === 'image');
        const coverSrc = firstImage ? firstImage.path : '';

        html += `
            <div class="project-card" onclick="renderProgetto('${p.id}')">
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
    appContent.innerHTML = `
        <div class="contatti-section">
            <img src="Personal Branding/foto_ferd_2024.jpg" alt="Ferdinando Virno" class="profile-pic" onerror="this.src='https://via.placeholder.com/300?text=FV'">
            <div class="bio-text">
                <p>${bioData.bio || ''}</p>
                <p>${bioData.interesse || ''}</p>
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 20px; text-transform: uppercase; font-weight: 600;">
                <a href="${bioData.link ? bioData.link.email : '#'}" class="contact-link">Email</a>
                <a href="${bioData.link ? bioData.link.linkedin : '#'}" target="_blank" class="contact-link">LinkedIn</a>
                <a href="${bioData.link ? bioData.link.instagram : '#'}" target="_blank" class="contact-link">Instagram</a>
                <a href="Personal Branding/VIRNO-FERDINANDO_CV_2026.pdf" target="_blank" class="cv-link">Scarica CV</a>
            </div>
        </div>
    `;
    scrollToTop();
}

function renderProgetto(id) {
    const p = progettiData.find(x => x.id === id);
    if (!p) return;

    setActiveNav(null); // Nessun link nav attivo se siamo in una scheda progetto

    const media = getProjectMedia(p, portfolioStruttura);
    let galleryHtml = '';

    if (media.length > 0) {
        media.forEach(m => {
            if (m.type === 'video') {
                galleryHtml += `
                    <div class="media-container video-container">
                        <video src="${m.path}" autoplay loop muted playsinline></video>
                    </div>
                `;
            } else {
                galleryHtml += `
                    <div class="media-container image-container">
                        <img src="${m.path}" alt="${p.titolo}">
                    </div>
                `;
            }
        });
    } else {
        galleryHtml = `<div style="text-align: center; color: #999; padding: 40px;">Nessun elemento multimediale disponibile per questo progetto.</div>`;
    }

    appContent.innerHTML = `
        <div class="progetto-detail">
            <h2>${p.titolo}</h2>
            <div class="evocativo">${p.titoloEvocativo}</div>
            
            <div class="meta-grid">
                <div class="meta-item">
                    <strong>Cliente</strong>
                    ${p.metadati.cliente}
                </div>
                <div class="meta-item">
                    <strong>Settore</strong>
                    ${p.metadati.settore}
                </div>
                <div class="meta-item">
                    <strong>Tipologia</strong>
                    ${p.metadati.progetto.join(', ')}
                </div>
                <div class="meta-item">
                    <strong>Anno</strong>
                    ${p.metadati.anno}
                </div>
            </div>
            
            <p class="progetto-descrizione">${p.descrizione}</p>
            
            <div class="gallery">
                ${galleryHtml}
            </div>
            
            <button class="btn-back" onclick="renderEsplora()">Torna a Esplora</button>
        </div>
    `;
    scrollToTop();
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
