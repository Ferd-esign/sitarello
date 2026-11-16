import { state } from './state.js';
import { SEOManager } from './seo.js';
import { renderEsplora } from './views/esplora.js';
import { renderArchivio } from './views/archivio.js';
import { renderPlayground, renderProgettoPlayground, togglePlaygroundModal } from './views/playground.js';
import { renderAbout } from './views/about.js';
import { renderProgetto } from './views/progetto.js';
import { hideGyroConsentBannerIfNotHome } from './interactions/tilt.js';

export function setActiveNav(targetId) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(l => l.classList.remove('active'));
    if (targetId) {
        const ids = (targetId === 'about' || targetId === 'contatti') ? ['about', 'contatti'] : [targetId];
        ids.forEach(id => {
            const activeLinks = document.querySelectorAll(`[data-target="${id}"]`);
            activeLinks.forEach(link => link.classList.add('active'));
        });
    }
    if (targetId !== 'esplora') {
        hideGyroConsentBannerIfNotHome();
    }
}

export function scrollToTop() {
    if (window._npScrollHandler) {
        window.removeEventListener('scroll', window._npScrollHandler);
        window._npScrollHandler = null;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function navigateTo(path, replace = false) {
    const targetUrl = path.startsWith('/') ? path : '/' + path;
    if (replace) {
        window.history.replaceState(null, '', targetUrl);
    } else if (window.location.pathname + window.location.search + window.location.hash !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
    }
    handleRoute();
}

export function handleRoute() {
    document.body.classList.remove('hide-footer');
    document.body.classList.remove('playground-fullscreen-mode');
    document.body.classList.remove('page-esplora');
    togglePlaygroundModal(false);

    let pathname = window.location.pathname;
    const hash = window.location.hash;
    const archivioSections = ['progetti', 'manifesti', 'playground'];
    const cleanHash = hash ? hash.replace(/^#\/?/, '').toLowerCase() : '';

    if (hash && hash.length > 1 && !archivioSections.includes(cleanHash)) {
        if (cleanHash) {
            pathname = '/' + cleanHash;
            window.history.replaceState(null, '', pathname);
        }
    }

    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const segments = cleanPath ? cleanPath.split('/') : [];
    const slug = segments.length > 0 ? segments[segments.length - 1].toLowerCase() : '';

    // Se l'URL punta a sintesi, reindirizza direttamente al sottosito indipendente
    if (cleanPath === 'sintesi' || cleanPath.startsWith('sintesi/')) {
        window.location.replace('/sintesi/');
        return;
    }

    if (!cleanPath || cleanPath === 'esplora') {
        renderEsplora();
        SEOManager.update('esplora');
        return;
    }

    if (cleanPath === 'archivio') {
        const targetSec = archivioSections.includes(cleanHash) ? cleanHash : null;
        renderArchivio(targetSec);
        SEOManager.update('archivio');
        return;
    }

    if (cleanPath === 'playground') {
        window.history.replaceState(null, '', '/archivio#playground');
        renderArchivio('playground');
        SEOManager.update('archivio');
        return;
    }

    if (cleanPath === 'contatti' || cleanPath === 'about') {
        renderAbout();
        SEOManager.update('about');
        return;
    }

    // 1. Cerca nei Progetti Principali (compresi sottoprogetti come marathia, cunti)
    const pMain = state.progettiData.find(x =>
        x.id.toLowerCase() === slug ||
        x.cartella.toLowerCase() === slug ||
        (x.sottoprogetti && x.sottoprogetti.some(sp => sp.id.toLowerCase() === slug || sp.cartella.toLowerCase() === slug))
    );
    if (pMain) {
        renderProgetto(pMain.id);
        SEOManager.update('progetto', pMain);
        return;
    }

    // 2. Cerca nel Playground
    const pPlayground = state.playgroundData.find(x =>
        x.id.toLowerCase() === slug ||
        x.cartella.toLowerCase() === slug
    );
    if (pPlayground) {
        renderProgettoPlayground(pPlayground.id);
        SEOManager.update('playground_progetto', pPlayground);
        return;
    }

    // Fallback a Esplora
    renderEsplora();
    SEOManager.update('esplora');
    window.history.replaceState(null, '', '/');
}

export function initRouter() {
    window.addEventListener('popstate', handleRoute);

    // Delegazione dei click sui link per navigazione SPA client-side
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            const href = link.getAttribute('href');
            // Esclude mailto, percorsi esterni, target blank e la sezione indipendente /sintesi
            if (
                href &&
                (href.startsWith('/') || href.startsWith('#')) &&
                !href.startsWith('mailto:') &&
                !href.startsWith('/sintesi') &&
                !link.hasAttribute('data-external') &&
                link.getAttribute('target') !== '_blank'
            ) {
                e.preventDefault();
                const targetPath = href.startsWith('#') ? href.replace(/^#\/?/, '/') : href;
                navigateTo(targetPath || '/');
            }
        }
    });
}
