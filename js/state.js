// Stato globale e helper media

export const state = {
    progettiData: [],
    bioData: {},
    portfolioStruttura: [],
    playgroundData: [],
    playgroundStruttura: [],
    manifestiData: [],
    manifestiStruttura: []
};

// Helper per verificare se un file è un video
export function isMediaTypeVideo(fileName) {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.m4v') || lower.endsWith('.avi');
}

// Helper per mappare i media di ciascun progetto dalla struttura dei file
export function getProjectMedia(project, struttura) {
    if (!project || !project.cartella) return [];
    const cartellaLower = project.cartella.toLowerCase();
    const portfolio = struttura || state.portfolioStruttura;

    // 1. Gestione speciale cartella "Tesi" (Intrecci Narrativi e sottoprogetti)
    if (cartellaLower === 'nlm' || cartellaLower === 'marathia' || cartellaLower === 'cunti') {
        const tesiFolder = portfolio.find(item => item.Cartella.toLowerCase() === 'tesi');
        if (tesiFolder) {
            let matchedFiles = [];
            tesiFolder.File.forEach(fileName => {
                const fileNameLower = fileName.toLowerCase();
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
    const folderMatch = portfolio.find(item => {
        const itemLower = item.Cartella.toLowerCase();
        return itemLower === cartellaLower ||
            cartellaLower.includes(itemLower) ||
            itemLower.includes(cartellaLower);
    });

    if (folderMatch) {
        const physicalFolder = folderMatch.CartellaFisica || folderMatch.Cartella;
        return folderMatch.File.map(fileName => ({
            name: fileName,
            path: `Progetti/${physicalFolder}/${fileName}`,
            type: isMediaTypeVideo(fileName) ? 'video' : 'image'
        }));
    }

    // 3. Fallback: cerca per nome file in tutte le cartelle
    const matchedFiles = [];
    portfolio.forEach(item => {
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
export function getCoverMedia(media) {
    if (!media || media.length === 0) return null;
    const copertina = media.find(m =>
        m.name.toLowerCase().includes('copertina')
    );
    if (copertina) return copertina;
    return media[0] || null;
}

// Helper: recupera i media di un progetto dal playground (path base: Playground/{Cartella}/)
export function getPlaygroundMedia(project, struttura) {
    if (!project || !project.cartella) return [];
    const cartellaLower = project.cartella.toLowerCase();
    const pgStruttura = struttura || state.playgroundStruttura;

    const folderMatch = pgStruttura.find(item =>
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

// Caricamento asincrono iniziale dei dati JSON
export async function loadAppData() {
    const [progettiRes, strutturaRes, bioRes, playgroundRes, playgroundStrutturaRes, manifestiRes, manifestiStrutturaRes] = await Promise.all([
        fetch('Progetti/progetti-data.json'),
        fetch('Progetti/portfolio-struttura.json'),
        fetch('Personal Branding/BIO-ABOUT-US.json'),
        fetch('Playground/playground-data.json').catch(() => ({ json: async () => [] })),
        fetch('Playground/struttura-playground.json').catch(() => ({ json: async () => [] })),
        fetch('Manifesti/manifesti-data.json').catch(() => ({ json: async () => [] })),
        fetch('Manifesti/struttura-manifesti.json').catch(() => ({ json: async () => [] }))
    ]);

    state.progettiData = await progettiRes.json();
    state.portfolioStruttura = await strutturaRes.json();
    state.bioData = await bioRes.json();
    state.playgroundData = await playgroundRes.json();
    state.playgroundStruttura = await playgroundStrutturaRes.json();
    state.manifestiData = await manifestiRes.json();
    state.manifestiStruttura = await manifestiStrutturaRes.json();

    // Auto-discovery lato client: aggiunge dinamicamente cartelle non ancora descritte
    if (Array.isArray(state.playgroundStruttura)) {
        state.playgroundStruttura.forEach(item => {
            const folder = item.Cartella;
            const exists = state.playgroundData.some(p => p.cartella.toLowerCase() === folder.toLowerCase() || p.id.toLowerCase() === folder.toLowerCase());
            if (!exists) {
                const formattedTitle = folder.charAt(0).toUpperCase() + folder.slice(1).replace(/[-_]/g, ' ');
                state.playgroundData.push({
                    id: folder.toLowerCase(),
                    cartella: folder,
                    titolo: formattedTitle,
                    titoloEvocativo: "Esperimento di codice",
                    descrizione: `Progetto sperimentale della sezione Playground: ${formattedTitle}.`,
                    url: `Playground/${folder}/index.html`,
                    metadati: {
                        progetto: ["Interactive", "Creative Coding"],
                        anno: new Date().getFullYear()
                    }
                });
            }
        });
    }

    return state;
}
