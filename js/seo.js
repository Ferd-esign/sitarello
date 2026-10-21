import { state, getProjectMedia, getPlaygroundMedia, getCoverMedia } from './state.js';

export const SEOManager = {
    update(page, data = null) {
        let title = 'Ferdinando Virno - Portfolio';
        let description = 'Portfolio di Ferdinando Virno, designer per la comunità e comunicatore visivo.';
        let keywords = 'Ferdinando Virno, Portfolio, Design, Comunicazione Visiva';
        let ogImage = 'https://ferd.esign/Personal%20Branding/FOTO-BIO.webp';
        let url = window.location.href;

        // Estrazione base dalla bio
        const bioText = state.bioData && state.bioData.bio ? state.bioData.bio : description;

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

            const media = getProjectMedia(data, state.portfolioStruttura);
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

            const media = getProjectMedia(data, state.portfolioStruttura);
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
        } else if (page === 'playground_progetto' && data) {
            title = `${data.titolo} - Playground - Ferdinando Virno`;
            description = data.descrizione || description;
            keywords = data.metadati && data.metadati.progetto ? data.metadati.progetto.join(', ') : keywords;

            const media = getPlaygroundMedia(data, state.playgroundStruttura);
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
        } else if (page === 'playground') {
            title = 'Playground - Ferdinando Virno';
        } else if (page === 'archivio') {
            title = 'Archivio - Ferdinando Virno';
        } else if (page === 'contatti' || page === 'about') {
            title = 'About - Ferdinando Virno';
            description = 'Biografia, percorso e approccio di Ferdinando Virno, designer per la comunità e comunicatore visivo.';
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
        if (canonical) canonical.href = url;

        const schemaScript = document.getElementById('schema-ld');
        if (schemaScript) schemaScript.textContent = JSON.stringify(schema, null, 2);
    }
};
