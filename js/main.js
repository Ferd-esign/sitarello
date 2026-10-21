import { loadAppData, state } from './state.js';
import { initRouter, navigateTo, handleRoute } from './router.js';
import { initDrawer, openDrawer, closeDrawer } from './interactions/drawer.js';
import { togglePlaygroundModal, handlePlaygroundModalOverlayClick } from './views/playground.js';
import { triggerNextProject } from './views/progetto.js';

// Esposizione su window per piena compatibilità con template dinamici con handler inline (onclick)
window.navigateTo = navigateTo;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.togglePlaygroundModal = togglePlaygroundModal;
window.handlePlaygroundModalOverlayClick = handlePlaygroundModalOverlayClick;
window.triggerNextProject = triggerNextProject;

// Bootstrap dell'applicazione
async function init() {
    initDrawer();
    initRouter();

    const appContent = document.getElementById('app-content');

    try {
        await loadAppData();
        handleRoute();
    } catch (err) {
        console.error("Errore nel caricamento dei dati JSON del portfolio:", err);
        if (appContent) {
            appContent.innerHTML = `
                <div style="text-align: center; padding: 100px 20px; font-family: sans-serif;">
                    <h2 style="color: #ff3333; margin-bottom: 20px;">Impossibile caricare il portfolio</h2>
                    <p style="color: #666; font-size: 16px;">Assicurati che l'applicazione sia servita tramite un server web (http/https) e che i file JSON siano accessibili.</p>
                </div>
            `;
        }
    }
}

// Avvio
init();
