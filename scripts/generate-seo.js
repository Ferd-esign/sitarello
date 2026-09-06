const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://ferd.esign'; // Modifica se l'URL definitivo cambia

function generateSitemap() {
    console.log("Generazione Sitemap in corso...");

    // Carica dati
    const progettiPath = path.join(__dirname, '..', 'Progetti', 'progetti-data.json');
    const archivioPath = path.join(__dirname, '..', 'Progetti', 'Archivio', 'archivio-data.json');
    const playgroundPath = path.join(__dirname, '..', 'Playground', 'playground-data.json');

    let progetti = [];
    let archivio = [];
    let playground = [];

    if (fs.existsSync(progettiPath)) {
        progetti = JSON.parse(fs.readFileSync(progettiPath, 'utf-8'));
    }
    if (fs.existsSync(archivioPath)) {
        archivio = JSON.parse(fs.readFileSync(archivioPath, 'utf-8'));
    }
    if (fs.existsSync(playgroundPath)) {
        playground = JSON.parse(fs.readFileSync(playgroundPath, 'utf-8'));
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Url statici
    let urls = [
        { loc: `${BASE_URL}/`, priority: '1.0' },
        { loc: `${BASE_URL}/archivio`, priority: '0.8' },
        { loc: `${BASE_URL}/playground`, priority: '0.8' },
        { loc: `${BASE_URL}/contatti`, priority: '0.8' }
    ];

    // Progetti principali
    progetti.forEach(p => {
        urls.push({
            loc: `${BASE_URL}/${p.id}`,
            priority: '0.9'
        });
    });

    // Progetti Playground
    playground.forEach(p => {
        urls.push({
            loc: `${BASE_URL}/${p.id}`,
            priority: '0.8'
        });
    });

    // Progetti in archivio
    archivio.forEach(p => {
        urls.push({
            loc: `${BASE_URL}/${p.id}`,
            priority: '0.7'
        });
    });

    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemapContent += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    urls.forEach(u => {
        sitemapContent += `  <url>\n`;
        sitemapContent += `    <loc>${u.loc}</loc>\n`;
        sitemapContent += `    <lastmod>${today}</lastmod>\n`;
        sitemapContent += `    <priority>${u.priority}</priority>\n`;
        sitemapContent += `  </url>\n`;
    });
    
    sitemapContent += `</urlset>`;

    fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), sitemapContent, 'utf-8');
    console.log("sitemap.xml generato con successo!");
}

function generateRobots() {
    console.log("Generazione Robots in corso...");
    const robotsContent = `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;
    fs.writeFileSync(path.join(__dirname, '..', 'robots.txt'), robotsContent, 'utf-8');
    console.log("robots.txt generato con successo!");
}

generateSitemap();
generateRobots();
