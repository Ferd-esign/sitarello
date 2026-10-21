import { state, getProjectMedia, getCoverMedia } from '../state.js';
import { initScrollReveal } from '../interactions/reveal.js';
import { setActiveNav, scrollToTop, navigateTo } from '../router.js';

// ── Gestione Prossimo Progetto (Scroll continuo e Trigger) ──
let isNavigatingNextProject = false;

export function setupNextProjectScrollTrigger(onNavigate) {
    isNavigatingNextProject = false;

    if (window._npScrollHandler) {
        window.removeEventListener('scroll', window._npScrollHandler);
        window._npScrollHandler = null;
    }

    const triggerEl = document.getElementById('next-project-trigger');
    if (!triggerEl) return;

    let hasTriggered = false;
    let holdTimer = null;

    const handleScroll = () => {
        if (hasTriggered || isNavigatingNextProject) return;

        const fillBar = document.getElementById('np-bar-fill');
        const distanceToBottom = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);

        const scrollRange = 350;
        const fillRatio = Math.min(1, Math.max(0, 1 - (distanceToBottom / scrollRange)));

        if (fillBar) {
            fillBar.style.width = `${fillRatio * 100}%`;
        }

        if (distanceToBottom <= 5 && fillRatio >= 0.98) {
            if (!holdTimer) {
                holdTimer = setTimeout(() => {
                    hasTriggered = true;
                    triggerNextProject(onNavigate);
                }, 1000);
            }
        } else {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
        }
    };

    window._npScrollHandler = handleScroll;
    window.addEventListener('scroll', handleScroll, { passive: true });
}

export function triggerNextProject(onNavigate) {
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
        if (typeof onNavigate === 'function') onNavigate();
    }, 600);
}

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
                            if (event.data === 1 || event.data === 3) {
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

// ── Render Progetto ──
export function renderProgetto(id) {
    const p = state.progettiData.find(x => x.id === id);
    if (!p) return;

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    document.body.classList.add('hide-footer');
    setActiveNav(null);

    const media = getProjectMedia(p, state.portfolioStruttura);
    const coverMedia = getCoverMedia(media);

    // Galleria principale (solo i media del progetto padre)
    const subKeywords = (p.sottoprogetti || []).map(sp => sp.cartella.toLowerCase());
    let mainMedia = p.sottoprogetti
        ? media.filter(m => !subKeywords.some(kw => m.name.toLowerCase().includes(kw)))
        : media;

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

    // Video Embed (YouTube)
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

    // Sezioni sottoprogetti (Marathia, Cunti...)
    let subProjectsHtml = '';
    if (p.sottoprogetti && p.sottoprogetti.length > 0) {
        p.sottoprogetti.forEach(sp => {
            const spKey = sp.cartella.toLowerCase();
            const spMedia = media.filter(m => m.name.toLowerCase().includes(spKey));
            const spCoverMedia = getCoverMedia(spMedia);

            let spGalleryHtml = '';
            let spGalleryMedia = spMedia;

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

    // Calcola il prossimo progetto nei progetti principali
    const currentIndex = state.progettiData.findIndex(x => x.id === id);
    const nextProject = (state.progettiData.length > 0 && currentIndex !== -1)
        ? state.progettiData[(currentIndex + 1) % state.progettiData.length]
        : null;

    let nextProjectHtml = '';
    if (nextProject && nextProject.id !== id) {
        const nextMedia = getProjectMedia(nextProject, state.portfolioStruttura);
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
