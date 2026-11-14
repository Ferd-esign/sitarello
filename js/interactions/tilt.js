// Effetto Tilt 3D:
// - Su Desktop: distorsione 3D delle card basata sul puntatore del mouse
// - SOLO su Mobile (in Homepage): distorsione 3D delle miniature basata sul giroscopio del dispositivo (iOS & Android, cross-browser) previa richiesta di consenso

const CONSENT_STORAGE_KEY = 'fv_gyro_consent_v1';

const gyroState = {
    initialized: false,
    active: false,
    rafId: null,
    hasOrientationReading: false,
    baseBeta: null,
    baseGamma: null,
    targetX: 0, // normalizzato [-1, 1]
    targetY: 0, // normalizzato [-1, 1]
    currentX: 0,
    currentY: 0
};

// Rilevamento affidabile dispositivo Mobile / Touch (Android & iOS su qualsiasi browser)
export function isMobileDevice() {
    const coarsePointer = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const mobileViewport = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    return coarsePointer || mobileUA || isIPadOS || (hasTouch && mobileViewport);
}

function isOnHomepage() {
    return document.body.classList.contains('page-esplora') || !!document.querySelector('.hero');
}

// Richiede permessi nativi iOS 13+ (Safari, Chrome iOS, Firefox iOS, WebKit) e avvia i listener
// NOTA: Deve essere invocata direttamente nel gestore sincrono dell'evento click/touchend dell'utente
async function requestGyroPermissionAndStart() {
    let permissionGranted = false;
    const needsIOSOrientationPerm = typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function';
    const needsIOSMotionPerm = typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function';

    if (needsIOSOrientationPerm || needsIOSMotionPerm) {
        try {
            const promises = [];
            if (needsIOSOrientationPerm) {
                promises.push(DeviceOrientationEvent.requestPermission().catch(() => 'denied'));
            }
            if (needsIOSMotionPerm) {
                promises.push(DeviceMotionEvent.requestPermission().catch(() => 'denied'));
            }
            const results = await Promise.all(promises);
            permissionGranted = results.some(r => r === 'granted');
        } catch (err) {
            console.warn('[GyroTilt] Impossibile ottenere il permesso iOS:', err);
            permissionGranted = false;
        }
    } else {
        // Android (Chrome, Firefox, Samsung Internet, Edge, Opera) e sistemi senza requestPermission esplicito
        permissionGranted = true;
    }

    if (permissionGranted) {
        try {
            sessionStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
        } catch (_) {}
        startGyroListeners();
        return true;
    } else {
        try {
            sessionStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
        } catch (_) {}
        return false;
    }
}

// Calcola l'inclinazione normalizzata [-1, 1] con auto-calibrazione dell'angolo di impugnatura
function processAngles(beta, gamma) {
    if (beta === null || gamma === null || isNaN(beta) || isNaN(gamma)) return;

    // Inizializza il punto zero in base a come l'utente tiene in mano lo smartphone
    if (gyroState.baseBeta === null || gyroState.baseGamma === null) {
        gyroState.baseBeta = beta;
        gyroState.baseGamma = gamma;
    }

    let deltaBeta = beta - gyroState.baseBeta;
    let deltaGamma = gamma - gyroState.baseGamma;

    // Gestione discontinuità angolari (-180/180 e -90/90)
    if (deltaBeta > 180) deltaBeta -= 360;
    if (deltaBeta < -180) deltaBeta += 360;
    if (deltaGamma > 90) deltaGamma -= 180;
    if (deltaGamma < -90) deltaGamma += 180;

    // Auto-calibrazione adattiva continua (compensa cambi di postura dell'utente)
    const driftSpeed = (Math.abs(deltaBeta) > 40 || Math.abs(deltaGamma) > 40) ? 0.08 : 0.012;
    gyroState.baseBeta += deltaBeta * driftSpeed;
    gyroState.baseGamma += deltaGamma * driftSpeed;

    // Sensibilità: ~16° di inclinazione del polso producono la distorsione massima
    const sensitivityDeg = 16;
    const normGamma = Math.tanh(deltaGamma / sensitivityDeg);
    const normBeta = Math.tanh(deltaBeta / sensitivityDeg);

    // Adatta agli assi in base all'orientamento dello schermo (Portrait / Landscape)
    const screenAngle = (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number')
        ? window.screen.orientation.angle
        : (typeof window.orientation === 'number' ? window.orientation : 0);

    let xNorm = normGamma;
    let yNorm = normBeta;

    if (screenAngle === 90) {
        xNorm = normBeta;
        yNorm = -normGamma;
    } else if (screenAngle === -90 || screenAngle === 270) {
        xNorm = -normBeta;
        yNorm = normGamma;
    } else if (screenAngle === 180) {
        xNorm = -normGamma;
        yNorm = -normBeta;
    }

    gyroState.targetX = Math.max(-1, Math.min(1, xNorm));
    gyroState.targetY = Math.max(-1, Math.min(1, yNorm));
}

function handleDeviceOrientation(event) {
    if (event.beta !== null && event.gamma !== null) {
        gyroState.hasOrientationReading = true;
        processAngles(event.beta, event.gamma);
    }
}

function handleDeviceOrientationAbsolute(event) {
    // Usa absolute solo se l'evento standard non fornisce letture
    if (!gyroState.hasOrientationReading && event.beta !== null && event.gamma !== null) {
        processAngles(event.beta, event.gamma);
    }
}

// Fallback universale tramite accelerometro/gravità per dispositivi Android privi di bussola/magnetometro
function handleDeviceMotion(event) {
    if (gyroState.hasOrientationReading) return;
    const ag = event.accelerationIncludingGravity;
    if (!ag || ag.x === null || ag.y === null) return;

    const x = ag.x || 0;
    const y = ag.y || 0;
    const z = ag.z || 0;

    // Ricava gli angoli di Roll (gamma) e Pitch (beta) in gradi dal vettore gravità
    const roll = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
    const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);

    processAngles(pitch, roll);
}

function startGyroListeners() {
    if (gyroState.active) {
        startGyroAnimationLoop();
        return;
    }
    gyroState.active = true;
    gyroState.baseBeta = null;
    gyroState.baseGamma = null;

    window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
    window.addEventListener('deviceorientationabsolute', handleDeviceOrientationAbsolute, { passive: true });
    window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });

    // Ricalibra il centro quando cambia l'orientamento dello schermo
    window.addEventListener('orientationchange', () => {
        gyroState.baseBeta = null;
        gyroState.baseGamma = null;
    });

    startGyroAnimationLoop();
}

function startGyroAnimationLoop() {
    if (gyroState.rafId) {
        cancelAnimationFrame(gyroState.rafId);
        gyroState.rafId = null;
    }

    const maxRotation = 8; // Gradi di distorsione 3D su mobile

    const animate = () => {
        if (!gyroState.active) return;

        if (!document.hidden && isOnHomepage() && isMobileDevice()) {
            // Interpolazione fluida (Lerp) per eliminare micro-vibrazioni del sensore
            gyroState.currentX += (gyroState.targetX - gyroState.currentX) * 0.14;
            gyroState.currentY += (gyroState.targetY - gyroState.currentY) * 0.14;

            const rotateX = (gyroState.currentY * -maxRotation).toFixed(2);
            const rotateY = (gyroState.currentX * maxRotation).toFixed(2);

            const cards = document.querySelectorAll('.project-grid .project-card');
            cards.forEach(card => {
                // Preserva la transizione di opacità del reveal rimuovendo il ritardo sul transform
                card.style.transition = 'opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1)';
                card.style.transform = `perspective(850px) scale3d(1.02, 1.02, 1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
        }

        gyroState.rafId = requestAnimationFrame(animate);
    };

    gyroState.rafId = requestAnimationFrame(animate);
}

// Crea e gestisce il banner professionale di richiesta consenso giroscopio su Mobile
function showGyroConsentBanner() {
    if (!isMobileDevice() || !isOnHomepage()) return;

    let banner = document.getElementById('gyro-consent-banner');
    if (banner) {
        banner.classList.add('is-visible');
        return;
    }

    banner = document.createElement('div');
    banner.id = 'gyro-consent-banner';
    banner.className = 'gyro-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Consenso sensore di movimento 3D');

    banner.innerHTML = `
        <div class="gyro-consent-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <path d="M12 18h.01"></path>
                <path d="M2 12c0-2.8 4.5-5 10-5s10 2.2 10 5-4.5 5-10 5-10-2.2-10-5z"></path>
            </svg>
        </div>
        <div class="gyro-consent-content">
            <span class="gyro-consent-title">Esperienza 3D interattiva</span>
            <span class="gyro-consent-desc">Consenti l'uso del giroscopio per inclinare le miniature muovendo il dispositivo.</span>
        </div>
        <div class="gyro-consent-actions">
            <button type="button" id="gyro-consent-accept" class="gyro-btn-accept">Consenti</button>
            <button type="button" id="gyro-consent-dismiss" class="gyro-btn-dismiss" aria-label="Chiudi">✕</button>
        </div>
    `;

    document.body.appendChild(banner);

    // Mostra con animazione fluida al frame successivo
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            banner.classList.add('is-visible');
        });
    });

    const hideBanner = () => {
        banner.classList.remove('is-visible');
        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        }, 350);
    };

    const acceptBtn = banner.querySelector('#gyro-consent-accept');
    const dismissBtn = banner.querySelector('#gyro-consent-dismiss');

    if (acceptBtn) {
        acceptBtn.addEventListener('click', async () => {
            await requestGyroPermissionAndStart();
            hideBanner();
        });
    }

    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            try {
                sessionStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
            } catch (_) {}
            hideBanner();
        });
    }
}

export function hideGyroConsentBannerIfNotHome() {
    if (!isOnHomepage()) {
        const banner = document.getElementById('gyro-consent-banner');
        if (banner) {
            banner.classList.remove('is-visible');
        }
    }
}

async function initMobileHomepageGyro() {
    if (!isOnHomepage()) {
        hideGyroConsentBannerIfNotHome();
        return;
    }

    if (gyroState.active) {
        startGyroAnimationLoop();
        return;
    }

    let storedConsent = null;
    try {
        storedConsent = sessionStorage.getItem(CONSENT_STORAGE_KEY);
    } catch (_) {}

    if (storedConsent === 'denied') {
        return;
    }

    const needsIOSPermission = (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') ||
        (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function');

    if (storedConsent === 'granted') {
        if (!needsIOSPermission) {
            // Su Android il consenso già accordato nella sessione riattiva subito il giroscopio
            startGyroListeners();
            return;
        } else {
            // Su iOS verifica se la sessione della tab ha già il permesso attivo senza gesto
            try {
                const state = await DeviceOrientationEvent.requestPermission();
                if (state === 'granted') {
                    startGyroListeners();
                    return;
                }
            } catch (_) {
                // iOS richiede un nuovo tap dopo il reload della pagina: mostra il banner
            }
        }
    }

    // Mostra la richiesta di consenso all'utente
    showGyroConsentBanner();
}

// Entry point principale chiamato dalle viste
export function initTiltEffect() {
    // ── MODALITÀ MOBILE: Giroscopio SOLO in Homepage ──
    if (isMobileDevice()) {
        initMobileHomepageGyro();
        return;
    }

    // ── MODALITÀ DESKTOP: Distorsione 3D col puntatore del mouse ──
    const cards = document.querySelectorAll('.project-card, .archivio-card');

    cards.forEach(card => {
        if (card.dataset.tiltInitialized) return;
        card.dataset.tiltInitialized = 'true';

        let isHovered = false;
        let bounds = null;

        const onMove = (clientX, clientY) => {
            if (!bounds) bounds = card.getBoundingClientRect();

            const x = clientX - bounds.left;
            const y = clientY - bounds.top;

            const xNorm = (x / bounds.width) * 2 - 1;
            const yNorm = (y / bounds.height) * 2 - 1;

            const maxRotation = 6;
            const rotateX = yNorm * -maxRotation;
            const rotateY = xNorm * maxRotation;

            requestAnimationFrame(() => {
                if (isHovered) {
                    card.style.transform = `perspective(1000px) scale3d(1.02, 1.02, 1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    card.style.transition = 'none';
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

                setTimeout(() => {
                    if (!isHovered) {
                        card.style.transform = '';
                        card.style.transition = '';
                    }
                }, 300);
            });
        };

        card.addEventListener('mouseenter', onEnter);
        card.addEventListener('mousemove', (e) => {
            if (!isHovered) onEnter();
            onMove(e.clientX, e.clientY);
        });
        card.addEventListener('mouseleave', onLeave);
    });
}
