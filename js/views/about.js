import { setActiveNav, scrollToTop } from '../router.js';

export function renderAbout() {
    setActiveNav('about');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    appContent.innerHTML = `
        <main class="about-page">
            <!-- Hero Section - Large Bio Heading -->
            <section class="hero-about">
                <div class="hero-text-wrapper">
                    <h1 class="hero-title">
                        Ciao, sono Ferd, designer sistemico. Credo in una progettazione che nasce dall'ascolto e dalla volontà di creare connessioni autentiche. Una ricerca che inizia dalla complessità dei problemi, per arrivare a una chiarezza fruibile e narrativa.
                    </h1>
                </div>
            </section>

            <!-- Main Content Row: CV + Image + Bio Details -->
            <section class="about-content-row">
                <div class="about-cv-link">
                    <h3><a href="Personal Branding/VIRNO-FERDINANDO_CV_2026.pdf" target="_blank" rel="noopener noreferrer" class="cv-link">CV ↗</a></h3>
                </div>

                <div class="about-image-wrapper">
                    <div class="about-image">
                        <img src="Personal Branding/FOTO-BIO.webp" alt="Ferdinando Virno" onerror="this.onerror=null; this.src='Personal Branding/foto_ferd_2024.jpg'">
                    </div>
                </div>

                <div class="about-details">
                    <!-- Come lavoro / Approccio -->
                    <div class="detail-block">
                        <p class="detail-text">
                            Il mio processo progettuale parte dall’ascolto e dalla comprensione profonda delle esigenze del contesto e delle persone. Sviluppo i concetti attraverso ricerca, strategia e sperimentazione visiva, affrontando la complessità dei problemi in maniera metodologica e sistemica. Condivido la convinzione che il design sia un modo di essere prima ancora che una disciplina tecnica: per questo realizzo linguaggi visivi flessibili e orientati a generare valore e legami duraturi all'interno della comunità.
                        </p>
                    </div>

                    <!-- Esperienza & Attività -->
                    <div class="experience-columns">
                        <!-- Esperienza -->
                        <div class="detail-block">
                            <h3 class="detail-title">Esperienza:</h3>
                            <div class="experience-list">
                                <div class="experience-item">
                                    <p class="experience-agency">Freelance Designer</p>
                                    <p class="experience-detail">In corso</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency">Perseverance Studio</p>
                                    <p class="experience-detail">Graphic Designer / 2025</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency">DOTFOG Studio</p>
                                    <p class="experience-detail">Tirocinio / Napoli, 2025</p>
                                </div>
                            </div>
                        </div>

                        <!-- Attività & Workshop -->
                        <div class="detail-block">
                            <h3 class="detail-title">Attività & Workshop:</h3>
                            <div class="experience-list">
                                <div class="experience-item">
                                    <p class="experience-agency"><a href="https://www.isiaroma.it/" target="_blank" rel="noopener noreferrer" class="experience-link">Unexpected Rome</a></p>
                                    <p class="experience-detail">ISIA Roma x Kean Univ. / Roma, 2026</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency"><a href="https://www.sponzfest.it/" target="_blank" rel="noopener noreferrer" class="experience-link">Sponz Fest</a></p>
                                    <p class="experience-detail">Branding & Manifesti / Calitri, 2025</p>
                                </div>
                                <div class="experience-item">
                                    <p class="experience-agency"><a href="https://www.desina.it/" target="_blank" rel="noopener noreferrer" class="experience-link">Desina Festival</a></p>
                                    <p class="experience-detail">Workshop “Fuck Logo” / Napoli, 2025</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Formazione -->
                    <div class="detail-block">
                        <h3 class="detail-title">Formazione:</h3>
                        <div class="experience-list">
                            <div class="experience-item">
                                <p class="experience-agency">ISIA Roma Design</p>
                                <p class="experience-detail">Magistrale in Design Sistemico per la Comunicazione / In corso</p>
                            </div>
                            <div class="experience-item">
                                <p class="experience-agency">Università Federico II di Napoli</p>
                                <p class="experience-detail">Laurea in Design per la Comunità / 2022–2025</p>
                            </div>
                            <div class="experience-item">
                                <p class="experience-agency">Talent Garden</p>
                                <p class="experience-detail">UI/UX Design con Breccia / 2023</p>
                            </div>
                            <div class="experience-item">
                                <p class="experience-agency">Liceo Artistico Sabatini Menna</p>
                                <p class="experience-detail">Grafica e Comunicazione Visiva / Salerno</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Spacer after content -->
            <div class="about-spacer"></div>
        </main>
    `;
    scrollToTop();
}
