// ==========================================
// 1. INIZIALIZZAZIONE
// ==========================================

function initAll() {
    initCustomCursor();
    initFloatingInteraction();
    initProjectOverlay();
    initGoldWords();
    initContactSwap();
    initScrollInteraction();

    const cta = document.getElementById('heroScrollCTA');
    if (cta) cta.classList.add('loaded-visible');
}

// Esegui quando il DOM è pronto
document.addEventListener('DOMContentLoaded', initAll);


let mouseTimeout;

function initCustomCursor() {
    const cursor = document.getElementById('customCursor');
    // Se siamo su mobile o il cursore non esiste, esci
    if (!cursor || window.innerWidth <= 768) return;

    // LISTA COMPLETA: Tutto ciò che deve attivare l'ingrandimento e il blend mode
    const interactiveSelectors = 'a, button, .project-square, .cta-btn, .hover-trigger, .dynamic-trigger, input, textarea, img, p, h1, h2, h3, h4, h5, h6, span, label, select';

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;

        // 1. POSIZIONAMENTO (Senza transizione per massima reattività)
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;

        // 2. GESTIONE STATO MOVIMENTO (Il look è gestito dal CSS con ease)
        document.body.classList.add('mouse-moving');
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(() => {
            document.body.classList.remove('mouse-moving');
        }, 1000);

        // 3. RILEVAMENTO OGGETTI (Blend Mode)
        const isHovering = e.target.closest(interactiveSelectors);
        if (isHovering) {
            document.body.classList.add('hovering');
        } else {
            document.body.classList.remove('hovering');
        }
    });
}

function initFloatingInteraction() {
    const heroScene = document.getElementById('heroScene');
    const elementsToMove = document.querySelectorAll('.project-square');

    if (!heroScene) return;

    heroScene.addEventListener('mousemove', (e) => {

        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;

        elementsToMove.forEach(el => {
            const speed = el.getAttribute('data-speed') || 2;
            const moveX = x * speed * 20;
            const moveY = y * speed * 20;
            el.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
        });
    });
}

// ==========================================
// 3. OVERLAY PROGETTI
// ==========================================
const projectsData = {
    "Tratti": {
        title: "Collezione Tratti",
        evocativeTitle: "Tratti di Pompei",
        description: "Ricerca tra le domus di Pompei tradotta in mattonelle ceramiche d’autore. Il progetto rilegge i segni del passato in chiave contemporanea, trasformando la materia in narrazione visiva. Dallo studio dei pigmenti alle geometrie, ogni pezzo racconta un frammento di storia romana. Un dialogo materico tra eredità archeologica e design industriale d'eccellenza per Ma.vi. Ceramica.",
        meta: {
            project: "Prodotto, Comunicazione",
            client: "Ma.Vi. Ceramica",
            sector: "Ceramica",
            year: "2024"
        },
        images: [
            "assets/Tratti/Collezione tratti.mp4",
            "assets/Tratti/TRATTI (3).mp4",
            "assets/Tratti/TRATTI (1).mp4",
            "assets/Tratti/TRATTI-(2).webp",
            "assets/Tratti/TRATTI-(3).webp"
        ]
    },

    "NLM": {
        title: "Intrecci Narrativi",
        evocativeTitle: "La Nuova Libbaneria Mediterranea",
        description: "Raccolta editoriale che esplora il legame tra territorio e antiche tecniche artigianali. Al centro vi è la riscoperta dei libbani, corde vegetali oggi reinterpretate con lente moderna. Il cofanetto racchiude un albo e una mappa che guidano tra memoria e innovazione sociale. Il progetto riattiva un patrimonio immateriale rendendolo nuovamente tangibile e narrabile per la comunità.",
        meta: {
            project: "Ricerca, Editoria",
            client: "La Nuova Libbaneria Mediterranea",
            sector: "Design per la Comunità",
            year: "2024"
        },
        images: [
            "assets/Tesi/NLM (1).webp",
            "assets/Tesi/NLM (5).webp",
            "assets/Tesi/NLM (2).webp",
            "assets/Tesi/NLM (3).webp",
            "assets/Tesi/NLM (4).webp"
        ]
    },

    "SponzFest": {
        title: "Sponz Fest",
        evocativeTitle: "Sponziamoci per le Feste!",
        description: "Branding per l'edizione invernale \"Viern25\" del festival di Vinicio Capossela. Il tema dello sposalizio è reinterpretato attraverso la \"Dodicesima Notte\" shakespeariana, tra sacro e profano. L'identità visiva fonde tradizione irpina e atmosfere oniriche, coprendo ogni aspetto, dal digital alla segnaletica. Un progetto che celebra il rito della festa come coesione d'identità.",
        meta: {
            project: "Branding, Comunicazione",
            client: "Vinicio Capossela / Sponz Fest",
            sector: "Festival Folkloristico",
            year: "2025"
        },
        images: [
            "assets/SponzFest/sponz (6-).webp",
            "assets/SponzFest/sponz (2).webp",
            "assets/SponzFest/sponz (3).webp",
            "assets/SponzFest/sponz (5).webp",
            "assets/SponzFest/sponz (1).webp"
        ]
    },

    "identity-salon": {
        title: "Identity",
        evocativeTitle: "Find Your Identity",
        description: "Branding totale per un salone di bellezza napoletano incentrato sull’unicità della persona. Il lavoro definisce un’identità visiva elegante, dal naming ai capi da lavoro sartoriali. Ogni dettaglio è curato per garantire coerenza in ogni punto di contatto, inclusi merchandising e comunicazione. Uno spazio dove il design incontra la bellezza in un’esperienza professionale completa.",
        meta: {
            project: "Naming, Branding, Merchandising",
            client: "Identity Salon Napoli",
            sector: "Salone di Bellezza",
            year: "2025"
        },
        images: [
            "assets/identity/identity-1.mp4",
            "assets/identity/identity-2.mp4",
            "assets/identity/identity-3.mp4",
            "assets/identity/identity8.webp",
            "assets/identity/identity9.webp"
        ]
    },

    "Marathia": {
        title: "Marathia",
        evocativeTitle: "Geografie Emotive di Maratea",
        description: "Sistema di editoria e servizi per scoprire Maratea attraverso una mappatura partecipativa. Una mappa pieghevole raccoglie emozioni e tracce urbane, espandendosi grazie a sticker interattivi usati dagli utenti. L'approccio trasforma il cammino in pratica collettiva di riscoperta del paesaggio. Uno strumento che unisce rigore cartografico alla poesia dell'esperienza vissuta sul campo.",
        meta: {
            project: "Sedicesimo",
            client: "Nuova Libbaneria Mediterranea",
            sector: "Design per la Comunità",
            year: "2024"
        },
        images: [
            "assets/Marathia/Marathia (1).webp",
            "assets/Marathia/Marathia (2).webp",
            "assets/Marathia/Marathia (3).webp",
            "assets/Marathia/Marathia (6).webp",
            "assets/Marathia/Marathia (5).webp"
        ]
    },

    "Cunti": {
        title: "Cunti da libbàni",
        evocativeTitle: "Una Ricetta del Saper Fare Comunità",
        description: "Albo illustrato e manifesto per un design collaborativo radicato nelle tradizioni locali. La pubblicazione documenta la lavorazione delle fibre vegetali come simbolo di resilienza creativa. Raccoglie visioni di designer che hanno reinterpretato i libbani per oggetti d'uso quotidiano. Una guida su come la condivisione di saperi possa rigenerare l’identità di un intero territorio.",
        meta: {
            project: "Illustrazione,Editoria",
            client: "La Nuova Libbaneria Mediterranea",
            sector: "Design per la Comunità",
            year: "2025"
        },
        images: [
            "assets/Cunti/NLM (5).webp",
            "assets/Cunti/Cunti (1).webp",
            "assets/Cunti/Cunti (2).webp",
            "assets/Cunti/NLM (4).webp",
            "assets/Cunti/cunti_stopmotion.mp4"
        ]
    }
};

function initProjectOverlay() {
    // Selezione elementi DOM sicura
    const squares = document.querySelectorAll('.project-square');
    const overlay = document.getElementById('projectOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.getElementById('closeOverlay');
    const galleryTrack = document.getElementById('galleryTrack');
    const galleryContainer = document.getElementById('galleryContainer');
    const gradTop = document.getElementById('gradTop');
    const gradBottom = document.getElementById('gradBottom');
    const pageCounter = document.getElementById('pageCounter');

    // Frecce di navigazione
    const navArrowUp = document.getElementById('navArrowUp');
    const navArrowDown = document.getElementById('navArrowDown');
    const navReturnTop = document.getElementById('navReturnTop');
    const overlayModal = document.querySelector('.overlay-modal');

    // Elementi Sezione Info
    const infoBtn = document.querySelector('.info-placeholder');
    const infoSection = document.getElementById('infoSection');
    const infoTitle = document.getElementById('infoTitle');
    const infoDescription = document.getElementById('infoDescription');
    const metaProject = document.getElementById('metaProject');
    const metaClient = document.getElementById('metaClient');
    const metaSector = document.getElementById('metaSector');
    const metaYear = document.getElementById('metaYear');

    // Se mancano elementi fondamentali, usciamo per non rompere il sito
    if (!overlay || !galleryTrack || !galleryContainer) return;

    // --- VARIABILI DI STATO ---
    let targetY = 0;
    let currentY = 0;
    let containerHeight = 0;
    let imageCount = 0;
    let animationFrame;
    let currentProjectIndex = 0;
    let currentProjectId = "";



    // Helper: Aggiorna il testo 1/5
    const updateCounter = () => {
        if (pageCounter) {
            pageCounter.innerText = `pag. ${currentProjectIndex + 1}/${imageCount}`;
        }
    };

    // Helper: Popola e Toggle Info
    const toggleInfo = () => {
        const isOpen = overlay.classList.contains('info-open');

        if (!isOpen) {
            // Popolamento dinamico prima dell'apertura
            const data = projectsData[currentProjectId];
            if (data) {
                if (infoTitle) infoTitle.innerText = data.evocativeTitle || data.title;
                if (infoDescription) infoDescription.innerText = data.description;
                if (metaProject) metaProject.innerText = data.meta.project;
                if (metaClient) metaClient.innerText = data.meta.client;
                if (metaSector) metaSector.innerText = data.meta.sector;
                if (metaYear) metaYear.innerText = data.meta.year;
            }

            overlay.classList.add('info-open');
            if (infoBtn) infoBtn.classList.add('active');
        } else {
            overlay.classList.remove('info-open');
            if (infoBtn) infoBtn.classList.remove('active');
        }
    };

    // Click sulla "i"
    if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleInfo();
        });
    }

    // Helper: Gestisci la visibilità delle frecce
    const updateArrowsVisibility = () => {
        if (imageCount <= 1) {
            if (navArrowUp) navArrowUp.classList.remove('visible');
            if (navArrowDown) navArrowDown.classList.remove('visible');
            if (navReturnTop) navReturnTop.classList.remove('visible');
            return;
        }

        // Freccia Su: visibile se non siamo alla prima pagina
        if (navArrowUp) {
            if (currentProjectIndex > 0) navArrowUp.classList.add('visible');
            else navArrowUp.classList.remove('visible');
        }

        // Freccia Giù: visibile se non siamo all'ultima pagina
        if (navArrowDown) {
            if (currentProjectIndex < imageCount - 1) navArrowDown.classList.add('visible');
            else navArrowDown.classList.remove('visible');
        }

        // Tasto Ritorno: visibile solo all'ultima pagina
        if (navReturnTop) {
            if (currentProjectIndex === imageCount - 1) navReturnTop.classList.add('visible');
            else navReturnTop.classList.remove('visible');
        }
    };

    // Click eventi sulle frecce
    if (navArrowUp) {
        navArrowUp.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentProjectIndex > 0) {
                currentProjectIndex--;
                targetY = currentProjectIndex * containerHeight;
                updateCounter();
                updateArrowsVisibility();
            }
        });

        // Hover: attiva sfumatura oro superiore
        navArrowUp.addEventListener('mouseenter', () => {
            if (gradTop && navArrowUp.classList.contains('visible')) gradTop.style.opacity = 1;
        });
        navArrowUp.addEventListener('mouseleave', () => {
            if (gradTop) gradTop.style.opacity = 0;
        });
    }

    if (navArrowDown) {
        navArrowDown.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentProjectIndex < imageCount - 1) {
                currentProjectIndex++;
                targetY = currentProjectIndex * containerHeight;
                updateCounter();
                updateArrowsVisibility();
            }
        });

        // Hover: attiva sfumatura oro inferiore
        navArrowDown.addEventListener('mouseenter', () => {
            if (gradBottom && navArrowDown.classList.contains('visible')) gradBottom.style.opacity = 1;
        });
        navArrowDown.addEventListener('mouseleave', () => {
            if (gradBottom) gradBottom.style.opacity = 0;
        });
    }

    if (navReturnTop) {
        navReturnTop.addEventListener('click', (e) => {
            e.stopPropagation();
            currentProjectIndex = 0;
            targetY = 0;
            updateCounter();
            updateArrowsVisibility();
        });
    }



    // --- ANIMAZIONE ---
    function animateGallery() {
        if (!overlay.classList.contains('active')) return;

        // Auto-esegue il resize dell'altezza container durante l'animazione CSS
        if (galleryContainer) {
            const newHeight = galleryContainer.offsetHeight;
            if (containerHeight && containerHeight !== newHeight) {
                // Scala proportionalmente currentY per evitare ritardi o salti visivi
                const ratio = currentY / containerHeight;
                currentY = ratio * newHeight;
            }
            containerHeight = newHeight;
            targetY = currentProjectIndex * containerHeight;
            galleryTrack.style.height = `${containerHeight * imageCount}px`;
        }

        currentY += (targetY - currentY) * 0.10;

        galleryTrack.style.transform = `translateY(${-currentY}px)`;

        const images = galleryTrack.querySelectorAll('.gallery-img');
        images.forEach((img, index) => {
            const imgTop = index * containerHeight;
            const dist = Math.abs(currentY - imgTop);
            if (dist < containerHeight * 0.4) img.classList.add('focused');
            else img.classList.remove('focused');
        });

        animationFrame = requestAnimationFrame(animateGallery);
    }

    // Helper: mostra/nasconde il CTA "Sei rimasto abbagliato?"
    const heroScrollCTA = document.getElementById('heroScrollCTA');
    const hideCTA = () => {
        if (heroScrollCTA) {
            heroScrollCTA.style.opacity = '0';
            heroScrollCTA.style.pointerEvents = 'none';
            heroScrollCTA.style.visibility = 'hidden';
        }
    };
    const showCTA = () => {
        if (heroScrollCTA && heroScrollCTA.classList.contains('loaded-visible')) {
            heroScrollCTA.style.opacity = '';
            heroScrollCTA.style.pointerEvents = '';
            heroScrollCTA.style.visibility = '';
        }
    };

    // --- APERTURA ---
    squares.forEach(sq => {
        sq.addEventListener('click', (e) => {
            e.preventDefault();
            const id = sq.getAttribute('data-id');
            currentProjectId = id;

            // Controllo esistenza dati
            if (typeof projectsData === 'undefined' || !projectsData[id]) return;

            const data = projectsData[id];
            modalTitle.innerText = data.title;
            galleryTrack.innerHTML = "";

            // Reset
            currentY = 0;
            targetY = 0;
            currentProjectIndex = 0;

            // Caricamento media
            data.images.forEach(src => {
                let element;
                if (src.toLowerCase().endsWith(".mp4")) {
                    element = document.createElement('video');
                    element.src = src;
                    element.className = 'gallery-img';
                    element.autoplay = true;
                    element.loop = true;
                    element.muted = true;
                    element.setAttribute('playsinline', '');
                    element.play().catch(() => { });
                } else {
                    element = document.createElement('img');
                    element.src = src;
                    element.className = 'gallery-img';
                    element.onerror = function () { this.style.backgroundColor = "#111"; this.src = ""; };
                }
                galleryTrack.appendChild(element);
            });

            imageCount = data.images.length;
            overlay.classList.add('active');
            document.body.classList.add('overlay-active'); // Blocca scroll background
            hideCTA(); // ← nasconde il CTA

            updateCounter();
            updateArrowsVisibility();

            // Reset info section visual state when opening a new project
            overlay.classList.remove('info-open');
            if (infoBtn) infoBtn.classList.remove('active');

            setTimeout(() => {
                containerHeight = galleryContainer.offsetHeight;
                galleryTrack.style.height = `${containerHeight * imageCount}px`;
                animateGallery();
            }, 50);
        });
    });

    // --- CHIUSURA ---
    const closeAction = () => {
        overlay.classList.remove('active');
        overlay.classList.remove('info-open');
        document.body.classList.remove('overlay-active'); // Ripristina scroll background
        if (infoBtn) infoBtn.classList.remove('active');
        if (animationFrame) cancelAnimationFrame(animationFrame);

        // Reset visivo immediato
        if (gradTop) gradTop.style.opacity = 0;
        if (gradBottom) gradBottom.style.opacity = 0;
        galleryContainer.style.cursor = "default";
        showCTA(); // ← ripristina il CTA
    };

    if (closeBtn) closeBtn.addEventListener('click', closeAction);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAction();
    });

    // --- LOGICA MOUSE (Gradienti Intelligenti) ---
    galleryContainer.addEventListener('mousemove', (e) => {
        if (!containerHeight || imageCount <= 1) return;

        const rect = galleryContainer.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const triggerZone = 60; // 60px trigger
        const now = Date.now();

        const isFirstPage = currentProjectIndex === 0;
        const isLastPage = currentProjectIndex === imageCount - 1;

        let showTop = false;
        let showBottom = false;
        let cursorStyle = "default";

        // ZONA ALTA
        if (mouseY < triggerZone) {
            // Se NON siamo a pag 1, attiva
            if (!isFirstPage) {
                showTop = true;
                cursorStyle = "n-resize";

                // Navigazione auto rimossa
            }
        }
        // ZONA BASSA
        else if (mouseY > (rect.height - triggerZone)) {
            // Se NON siamo all'ultima pagina, attiva
            if (!isLastPage) {
                showBottom = true;
                cursorStyle = "s-resize";

                // Navigazione auto rimossa
            }
        }

        if (gradTop) gradTop.style.opacity = showTop ? 1 : 0;
        if (gradBottom) gradBottom.style.opacity = showBottom ? 1 : 0;
        galleryContainer.style.cursor = cursorStyle;
    });

    // Navigazione al click sulle zone sensibili
    galleryContainer.addEventListener('click', (e) => {
        if (!containerHeight || imageCount <= 1) return;

        const rect = galleryContainer.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const triggerZone = 60;

        if (mouseY < triggerZone && currentProjectIndex > 0) {
            currentProjectIndex--;
            targetY = currentProjectIndex * containerHeight;
            updateCounter();
            updateArrowsVisibility();
        } else if (mouseY > (rect.height - triggerZone) && currentProjectIndex < imageCount - 1) {
            currentProjectIndex++;
            targetY = currentProjectIndex * containerHeight;
            updateCounter();
            updateArrowsVisibility();
        }
    });

    // Reset quando esci col mouse
    galleryContainer.addEventListener('mouseleave', () => {
        if (gradTop) gradTop.style.opacity = 0;
        if (gradBottom) gradBottom.style.opacity = 0;
        galleryContainer.style.cursor = "default";
    });

    window.addEventListener('resize', () => {
        if (overlay.classList.contains('active')) {
            containerHeight = galleryContainer.offsetHeight;
            targetY = currentProjectIndex * containerHeight;
            currentY = targetY;
        }
    });
}

function initGoldWords() {
    const words = document.querySelectorAll('.gold-trigger');
    let moveTimeout;
    document.addEventListener('mousemove', () => {
        words.forEach(w => w.classList.add('active'));
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
            words.forEach(w => w.classList.remove('active'));
        }, 200);
    });
}

// ==========================================
// 4. LOGICA CONTATTI (AGGIORNATA CON DELAY 2s)
// ==========================================
function initContactSwap() {
    const contactSection = document.getElementById('contactSection');
    const contactZone = document.getElementById('contactInteraction');

    let stopTimeout;
    let canInteract = false; // Blocco iniziale

    if (!contactZone || !contactSection) return;

    // 1. Observer: Controlla quando l'utente entra nella sezione
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Appena l'utente arriva, blocchiamo l'interazione
                canInteract = false;

                // Resettiamo visivamente nel caso fosse rimasto attivo
                contactZone.classList.remove('is-moving');

                // Aspettiamo prima di sbloccare
                setTimeout(() => {
                    canInteract = true;
                }, 1000);
            }
        });
    }, { threshold: 0.5 }); // Si attiva quando il 50% della sezione è visibile

    observer.observe(contactSection);

    // 2. Gestione movimento mouse
    const handleMove = (e) => {
        // Se siamo nel periodo di pausa, non fare nulla
        if (!canInteract) return;

        contactZone.classList.add('is-moving');

        // --- NUOVA LOGICA: Ingrandimento in base alla vicinanza ---
        if (triggerScrivimi && contactZone.classList.contains('is-moving')) {
            const rect = triggerScrivimi.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Calcola distanza tra mouse e centro del bottone
            const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

            // Definiamo un raggio di influenza (es. 400px)
            const radius = 400;
            if (dist < radius) {
                // Mappiamo la distanza in un valore di scala da 1.0 (lontano) a 1.2 (vicino)
                // Usiamo una curva morbida
                const proximity = 1 - (dist / radius); // 0 a 1
                const scale = 1 + (proximity * 0.2); // 1.0 a 1.2
                triggerScrivimi.style.transform = `translate(-50%, -50%) scale(${scale})`;
                triggerScrivimi.style.transition = "opacity 0.3s ease, transform 0.1s ease-out"; // Transizione più rapida per seguire il mouse
            } else {
                triggerScrivimi.style.transform = `translate(-50%, -50%) scale(1)`;
                triggerScrivimi.style.transition = "opacity 0.3s ease, transform 0.5s ease"; // Ritorno dolce
            }
        }

        clearTimeout(stopTimeout);
        stopTimeout = setTimeout(() => {
            contactZone.classList.remove('is-moving');
            // Reset scala quando sparisce
            if (triggerScrivimi) {
                triggerScrivimi.style.transform = `translate(-50%, -50%) scale(0.8)`;
            }
        }, 500);
    };

    window.addEventListener('mousemove', handleMove);
}

// ==========================================
// 5. GESTIONE EMAIL E NAVIGAZIONE
// ==========================================
const emailOverlay = document.getElementById('emailOverlay');
const emailClose = document.querySelector('.email-close');
const triggerScrivimi = document.getElementById('triggerScrivimi');
const sendEmailBtn = document.getElementById('sendEmailBtn');

// Funzione per aprire l'overlay
function openEmailModal() {
    if (emailOverlay) {
        emailOverlay.classList.add('active');
        document.body.classList.add('overlay-active');
        // Pulisce i campi quando si apre
        document.getElementById('emailSubject').value = "";
        document.getElementById('emailMessage').value = "";
    }
}

// Click sul pallino "Scrivimi"
if (triggerScrivimi) {
    triggerScrivimi.addEventListener('click', (e) => {
        e.preventDefault();
        openEmailModal();
    });
}

// Click su "Invia Email"
if (sendEmailBtn) {
    sendEmailBtn.addEventListener('click', () => {
        const subject = document.getElementById('emailSubject').value;
        const message = document.getElementById('emailMessage').value;

        // La tua email
        const myEmail = "virnoferdinando@gmail.com";

        // Crea il link mailto dinamico
        // encodeURIComponent serve a gestire spazi e caratteri speciali
        const mailtoLink = `mailto:${myEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

        // Apre il client di posta
        window.location.href = mailtoLink;
    });
}

// overlay email
if (emailOverlay) {
    emailOverlay.addEventListener('click', (e) => {
        // Chiude se clicchi sullo sfondo (emailOverlay) o sul tasto chiudi
        if (e.target === emailOverlay || e.target.classList.contains('email-close')) {
            emailOverlay.classList.remove('active');
            document.body.classList.remove('overlay-active');
        }
    });
}

// Scroll To Top Logo
document.getElementById('homeLink').addEventListener('click', (e) => {
    e.preventDefault();
    const scrollContainer = document.getElementById('scrollContainer');
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
});

// Aggiungi questo in fondo al file sketch.js

// Gestione click Footer "HOME / ARCHIVE"
const footerHomeLink = document.getElementById('footerHomeLink');
if (footerHomeLink) {
    footerHomeLink.addEventListener('click', (e) => {
        e.preventDefault();
        const scrollContainer = document.getElementById('scrollContainer');
        // Scorrimento dolce verso l'alto
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Gestione click Footer "GET IN TOUCH" (Scroll verso contatti)
const footerContactLink = document.getElementById('footerContactLink');
if (footerContactLink) {
    footerContactLink.addEventListener('click', (e) => {
        e.preventDefault();
        const contactSection = document.getElementById('contactSection');
        // Calcola la posizione della sezione contatti all'interno del container
        contactSection.scrollIntoView({ behavior: 'smooth' });
    });
}

// Freccia in fondo alla pagina contatti → scroll verso il footer / back to contacts
const contactScrollCTA = document.getElementById('contactScrollCTA');
const scrollContainer = document.getElementById('scrollContainer');

if (contactScrollCTA && scrollContainer) {
    // 1. CLICK: Toggle scroll tra Footer e Contatti
    contactScrollCTA.addEventListener('click', () => {
        const footer = document.getElementById('brandFooter');
        const contactSection = document.getElementById('contactSection');

        // Verifica se siamo già arrivati in fondo (con tolleranza)
        const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 50;

        if (!isAtBottom) {
            // Scendi al footer
            if (footer) {
                scrollContainer.scrollTo({ top: footer.offsetTop, behavior: 'smooth' });
            }
        } else {
            // Torna su all'inizio della sezione contatti
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // 2. SCROLL: Ruota la freccia dinamicamente
    scrollContainer.addEventListener('scroll', () => {
        const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 70;
        if (isAtBottom) {
            contactScrollCTA.classList.add('is-up');
        } else {
            contactScrollCTA.classList.remove('is-up');
        }
    });
}

// ==========================================
// 4. GESTIONE TRANSIZIONI (CLICK & SCROLL)
// ==========================================

let isTransitioning = false; // "Semaforo" per evitare doppi scatti

// Funzione riutilizzabile per l'effetto Golden Mist
// In sketch.js

function triggerGoldenMist(targetId) {
    if (isTransitioning || document.body.classList.contains('overlay-active')) return;
    isTransitioning = true;

    const heroScrollCTA = document.getElementById('heroScrollCTA');
    const targetSection = document.getElementById(targetId);
    const scrollContainer = document.getElementById('scrollContainer');

    if (!heroScrollCTA || !targetSection || !scrollContainer) {
        isTransitioning = false;
        return;
    }

    // 1. START: La nebbia sale
    heroScrollCTA.classList.add('active-transition');

    // Disabilita scroll-snap per evitare il re-snap dopo lo scroll programmatico
    scrollContainer.style.scrollSnapType = 'none';

    // 2. SCROLL: Avviene nascosto dalla nebbia dorata
    setTimeout(() => {

        // Scroll diretto senza snap né animazioni
        scrollContainer.scrollTop = targetSection.offsetTop;

        // 3. DISSOLVENZA: Rimuove la nebbia
        setTimeout(() => {
            heroScrollCTA.classList.remove('active-transition');

            // 4. RESET: Riabilita scroll-snap solo dopo che la nebbia è scomparsa
            setTimeout(() => {
                scrollContainer.style.scrollSnapType = '';
                isTransitioning = false;
            }, 450);

        }, 200);

    }, 350);
}


// Funzione che attiva gli ascoltatori (Hover Temporizzato e Rotellina)
function initScrollInteraction() {
    const heroScrollCTA = document.getElementById('heroScrollCTA');
    const scrollContainer = document.getElementById('scrollContainer');

    // --- A. GESTIONE CLICK ---
    if (heroScrollCTA) {
        heroScrollCTA.addEventListener('click', (e) => {
            e.preventDefault();
            triggerGoldenMist('contactSection');
        });
    }

    // --- B. GESTIONE ROTELLINA (Rimane invariata) ---
    if (scrollContainer) {
        scrollContainer.addEventListener('wheel', (e) => {
            // Impedisce la transizione se è già in corso o se l'overlay è aperto
            if (isTransitioning || document.body.classList.contains('overlay-active')) return;

            const hero = document.getElementById('heroScene');
            const contact = document.getElementById('contactSection');

            if (!hero || !contact) return;

            const heroRect = hero.getBoundingClientRect();
            const contactRect = contact.getBoundingClientRect();
            const tolerance = 50;

            // SCROLL DOWN: Hero -> Page
            if (Math.abs(heroRect.top) < tolerance && e.deltaY > 0) {
                e.preventDefault();
                triggerGoldenMist('contactSection');
            }

            // SCROLL UP: Page -> Hero
            else if (Math.abs(contactRect.top) < tolerance && e.deltaY < 0) {
                e.preventDefault();
                triggerGoldenMist('heroScene');
            }

        }, { passive: false });
    }
}