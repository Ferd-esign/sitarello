/**
 * SINTESI — Progetto Editoriale Indipendente
 * Modulo JavaScript Principale (Vanilla JS)
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initMobileViews();
  initScrollSpy();
  initSmoothScroll();
  initLetterHoverHeadings();
  initHeroMarquee();
  initArticleCardsScrollTilt();
  initTiltedCallouts();
  initLogoFallback();
  initArticlesEngineStub();
});

/**
 * 1. Mobile-Only Multi-View Architecture (<= 768px)
 * Gestisce le viste separate su mobile (hero, articoli, mission) e il tema del footer fisso
 */
function initMobileViews() {
  if (document.body.classList.contains('page-article')) return;

  const mobileMedia = window.matchMedia('(max-width: 768px)');
  const viewButtons = document.querySelectorAll('.js-mobile-view-btn');
  const homeTrigger = document.querySelector('.js-mobile-home-trigger');
  let currentView = 'hero';

  const resolveViewFromHash = (hash) => {
    if (hash === '#articoli' || hash === '#archivio') return 'articoli';
    if (hash === '#mission' || hash === '#about' || hash === '#team') return 'mission';
    return 'hero';
  };

  const applyMobileView = (view, updateHash = false) => {
    currentView = view;

    if (!mobileMedia.matches) {
      document.body.removeAttribute('data-mobile-view');
      return;
    }

    document.body.setAttribute('data-mobile-view', view);

    viewButtons.forEach((btn) => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('is-active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    // Reset scroll all'inizio della vista attiva
    window.scrollTo(0, 0);

    if (updateHash && window.history && window.history.replaceState) {
      const nextHash = view === 'hero' ? '' : `#${view}`;
      const cleanUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
      window.history.replaceState(null, '', cleanUrl);
    }
  };

  const syncBreakpoint = () => {
    if (mobileMedia.matches) {
      applyMobileView(currentView, false);
    } else {
      document.body.removeAttribute('data-mobile-view');
      viewButtons.forEach((btn) => {
        btn.classList.remove('is-active');
        btn.removeAttribute('aria-current');
      });
    }
  };

  // Click sui pulsanti del footer fisso mobile (Articoli / About)
  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!mobileMedia.matches) return;
      const targetView = btn.dataset.view;
      if (!targetView) return;

      if (currentView === targetView) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      applyMobileView(targetView, true);
    });
  });

  // Tap sul logo nell'header -> torna alla Landing Hero su mobile
  if (homeTrigger) {
    homeTrigger.addEventListener('click', (e) => {
      if (!mobileMedia.matches) return;
      e.preventDefault();
      applyMobileView('hero', true);
    });
  }

  // Sincronizza cambio hash / navigazione browser su mobile
  window.addEventListener('hashchange', () => {
    if (!mobileMedia.matches) return;
    applyMobileView(resolveViewFromHash(window.location.hash), false);
  });

  if (typeof mobileMedia.addEventListener === 'function') {
    mobileMedia.addEventListener('change', syncBreakpoint);
  } else {
    window.addEventListener('resize', syncBreakpoint, { passive: true });
  }

  // Inizializzazione vista iniziale
  currentView = resolveViewFromHash(window.location.hash);
  syncBreakpoint();
}

/**
 * Helper: scorrimento fluido ad alta precisione (60/120fps) senza conflitti con scroll-snap
 */
let activeScrollRaf = null;

function smoothScrollToSection(targetEl, onComplete) {
  if (!targetEl) return;

  if (activeScrollRaf) {
    cancelAnimationFrame(activeScrollRaf);
    activeScrollRaf = null;
  }

  const htmlEl = document.documentElement;
  const headerHeight = document.querySelector('.site-header')?.offsetHeight || 64;
  const startY = window.scrollY;
  const targetRectTop = targetEl.getBoundingClientRect().top;
  const rawTargetY = targetEl.id === 'hero' || targetEl.id === 'top'
    ? 0
    : Math.max(0, startY + targetRectTop - headerHeight);
  const maxScroll = Math.max(0, htmlEl.scrollHeight - window.innerHeight);
  const targetY = Math.min(rawTargetY, maxScroll);
  const distance = targetY - startY;

  if (Math.abs(distance) < 2) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  const prevBehavior = htmlEl.style.scrollBehavior;
  htmlEl.style.scrollBehavior = 'auto';

  const duration = Math.min(620, Math.max(380, Math.abs(distance) * 0.48));
  const startTime = performance.now();

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeOutCubic(progress);

    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      activeScrollRaf = requestAnimationFrame(step);
    } else {
      activeScrollRaf = null;
      htmlEl.style.scrollBehavior = prevBehavior;
      if (typeof onComplete === 'function') onComplete();
    }
  };

  activeScrollRaf = requestAnimationFrame(step);
}

/**
 * 2. Active Section Spy (Sincronizzazione Navigazione & Correzione Landing Hero)
 */
function initScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const sections = [
    { id: 'articoli', el: document.querySelector('#articoli') },
    { id: 'mission', el: document.querySelector('#mission') }
  ].filter((item) => item.el !== null);

  let spyTicking = false;

  const updateActiveNav = () => {
    spyTicking = false;
    const scrollPos = window.scrollY;
    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 64;
    const heroEl = document.querySelector('#hero');
    const heroBottom = heroEl ? (heroEl.offsetTop + heroEl.offsetHeight - headerHeight - 90) : 300;

    if (scrollPos < heroBottom) {
      navLinks.forEach((link) => {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });
      return;
    }

    let activeId = '';
    const probeY = scrollPos + headerHeight + (window.innerHeight * 0.35);

    for (let i = sections.length - 1; i >= 0; i--) {
      const { id, el } = sections[i];
      if (probeY >= el.offsetTop) {
        activeId = id;
        break;
      }
    }

    if ((window.innerHeight + scrollPos) >= (document.documentElement.scrollHeight - 70)) {
      activeId = 'mission';
    }

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (activeId && href === `#${activeId}`) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      }
    });
  };

  const onScroll = () => {
    if (!spyTicking) {
      spyTicking = true;
      requestAnimationFrame(updateActiveNav);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateActiveNav();
}

/**
 * 3. Smooth Scroll e Navigazione Interna
 */
function initSmoothScroll() {
  const scrollLinks = document.querySelectorAll(
    '.js-nav-link[href^="#"], .site-brand[href^="#"], .js-back-to-top, a[href^="#"]'
  );

  scrollLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      // Su mobile (<= 768px) la navigazione avviene tramite viste dedicate (initMobileViews)
      if (window.matchMedia('(max-width: 768px)').matches) return;

      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#') && targetId.length > 1) {
        const targetEl = (targetId === '#top' || targetId === '#hero')
          ? document.querySelector('#hero')
          : document.querySelector(targetId);

        if (targetEl) {
          e.preventDefault();
          smoothScrollToSection(targetEl);
        }
      }
    });
  });
}

/**
 * 6. Interactive Per-Letter Font Hover on Hero Claim
 * Suddivide i caratteri del claim hero (.hero-headline) in singoli span (.hover-letter) mantenendo le parole raggruppate (.hover-word)
 * In hover, ogni singola lettera passa dinamicamente a Calvino (font-accent) con transizione fluida
 */
function initLetterHoverHeadings() {
  const headingSelectors = [
    '.hero-headline',
    '.article-entry-title',
    '.article-chapter-title'
  ];

  const headings = document.querySelectorAll(headingSelectors.join(', '));
  if (!headings.length) return;

  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (!text || !text.length) return null;

      if (/^\s+$/.test(text)) {
        return document.createTextNode(text);
      }

      const fragment = document.createDocumentFragment();
      const tokens = text.split(/(\s+)/);

      tokens.forEach((token) => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          fragment.appendChild(document.createTextNode(' '));
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'hover-word';

          for (const char of token) {
            const letterSpan = document.createElement('span');
            letterSpan.className = 'hover-letter';
            letterSpan.textContent = char;
            wordSpan.appendChild(letterSpan);
          }
          fragment.appendChild(wordSpan);
        }
      });

      return fragment;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList.contains('hover-letter') || node.classList.contains('hover-word') || node.tagName === 'SVG') {
        return null;
      }
      const childNodes = Array.from(node.childNodes);
      childNodes.forEach((child) => {
        const replacement = processNode(child);
        if (replacement) {
          node.replaceChild(replacement, child);
        }
      });
      return null;
    }

    return null;
  };

  headings.forEach((heading) => {
    if (!heading.hasAttribute('aria-label')) {
      heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ' ').trim());
    }

    const childNodes = Array.from(heading.childNodes);
    childNodes.forEach((child) => {
      const replacement = processNode(child);
      if (replacement) {
        heading.replaceChild(replacement, child);
      }
    });
  });
}

/**
 * 7. Carosello manifesti in hero: loop orizzontale infinito, prospettiva 3D e tinta brand
 * - La traccia viene duplicata: l'animazione CSS trasla da 0 a -50% per un loop senza scatti
 * - Hover: pausa + card frontale a colori originali
 * - Click: blocca la card attiva; un nuovo click la riporta in prospettiva e riprende lo scorrimento
 */
function initHeroMarquee() {
  const marquee = document.querySelector('.js-marquee');
  const track = marquee ? marquee.querySelector('.js-marquee-track') : null;
  const groupA = track ? track.querySelector('.js-marquee-group') : null;
  if (!marquee || !track || !groupA) return;

  // Assicura caricamento immediato di tutti i manifesti per evitare salti di larghezza nel loop
  groupA.querySelectorAll('img').forEach((img) => {
    img.loading = 'eager';
  });

  // Duplica l'intera Track A in una Track B identica (gap uniforme tra ultima e prima immagine)
  const groupB = groupA.cloneNode(true);
  groupB.classList.remove('js-marquee-group');
  groupB.setAttribute('aria-hidden', 'true');
  groupB.querySelectorAll('button').forEach((btn) => btn.setAttribute('tabindex', '-1'));
  groupB.querySelectorAll('img').forEach((img) => {
    img.setAttribute('alt', '');
    img.loading = 'eager';
  });
  track.appendChild(groupB);

  // Velocità lineare costante in px/s basata sulla larghezza esatta di Track A
  const updateDuration = () => {
    const groupWidth = groupA.getBoundingClientRect().width;
    if (!groupWidth) return;
    const pxPerSecond = window.innerWidth < 768 ? 36 : 50;
    const duration = (groupWidth / pxPerSecond).toFixed(2);
    track.style.setProperty('--marquee-duration', `${duration}s`);
  };

  updateDuration();
  window.addEventListener('resize', updateDuration, { passive: true });

  let activeCard = null;

  const pause = () => marquee.classList.add('is-paused');
  const resume = () => {
    if (!activeCard) marquee.classList.remove('is-paused');
  };

  const deactivate = (card, keepResting) => {
    card.classList.remove('is-active');
    card.setAttribute('aria-pressed', 'false');
    if (keepResting) card.classList.add('is-resting');
    if (activeCard === card) activeCard = null;
  };

  const cards = track.querySelectorAll('.marquee-card');

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      if (!card.classList.contains('is-resting')) pause();
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-resting');
      resume();
    });

    card.addEventListener('click', () => {
      if (activeCard === card) {
        // Secondo click: torna in prospettiva, riapplica la tinta e riprende il loop
        deactivate(card, true);
        marquee.classList.remove('is-paused');
        return;
      }

      if (activeCard) deactivate(activeCard, false);
      activeCard = card;
      card.classList.remove('is-resting');
      card.classList.add('is-active');
      card.setAttribute('aria-pressed', 'true');
      pause();
    });
  });

  // Escape: rilascia la card attiva e riprende lo scorrimento
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeCard) {
      deactivate(activeCard, false);
      marquee.classList.remove('is-paused');
    }
  });
}

/**
 * 8. Rotazione scroll-driven del rettangolo blu retrostante alle card Archivio su dispositivi touch/mobile
 * - Su desktop la rotazione è guidata dal CSS :hover (-2.2deg -> -5deg)
 * - Su mobile/touch ruota fluidamente tra -2deg e -5.5deg mentre la card attraversa il centro del viewport
 */
function initArticleCardsScrollTilt() {
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isTouch || reducedMotion) return;

  const cards = Array.from(document.querySelectorAll('.article-card:not(.article-card--upcoming)'));
  if (!cards.length) return;

  const visibleCards = new Set();
  let ticking = false;

  const updateAngles = () => {
    ticking = false;
    const viewportCenter = window.innerHeight * 0.5;

    visibleCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.height === 0) return;

      const cardCenter = rect.top + rect.height * 0.5;
      const maxDistance = window.innerHeight * 0.65;
      const normalizedDist = Math.min(1, Math.abs(cardCenter - viewportCenter) / maxDistance);
      const focusFactor = 1 - normalizedDist; // 1 al centro del viewport, 0 ai bordi
      const angle = -2 - (focusFactor * 3.5); // -2deg -> -5.5deg

      card.style.setProperty('--card-back-angle', `${angle.toFixed(2)}deg`);
    });
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateAngles);
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleCards.add(entry.target);
          } else {
            visibleCards.delete(entry.target);
            entry.target.style.setProperty('--card-back-angle', '-2deg');
          }
        });
        requestUpdate();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    cards.forEach((card) => observer.observe(card));
  } else {
    cards.forEach((card) => visibleCards.add(card));
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  // Aggiorna immediatamente al cambio vista mobile (es. apertura tab Archivio)
  const bodyObserver = new MutationObserver(requestUpdate);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['data-mobile-view'] });
}

/**
 * 4. Fallback robusto per il logo immagine
 */
function initLogoFallback() {
  const logoImg = document.querySelector('.site-logo');
  const fallback = document.querySelector('.logo-fallback');

  if (!logoImg || !fallback) return;

  const candidateSources = [
    './branding sintesi/sintesi logo.png',
    './Branding-sintesi/sintesi-logo.png',
    './assets/branding/sintesi-logo.png'
  ];
  let attempt = 0;

  logoImg.addEventListener('error', () => {
    attempt++;
    if (attempt < candidateSources.length) {
      logoImg.src = candidateSources[attempt];
    } else {
      logoImg.style.display = 'none';
      fallback.style.display = 'inline-block';
    }
  });
}

/**
 * 5. Predisposizione Modulare per il Motore Articoli (Filtri & API future)
 */
function initArticlesEngineStub() {
  // Namespace predisposto per future implementazioni editoriali
  window.SintesiArticles = {
    isReady: true,
    version: '1.0.0',
    /**
     * Predisposto per l'iniezione dinamica di articoli o filtri categoria
     * @param {Array} articlesData
     */
    renderArticles: function (articlesData) {
      const grid = document.querySelector('.js-articles-grid');
      const emptyState = document.querySelector('.js-empty-state');
      if (!grid || !Array.isArray(articlesData) || articlesData.length === 0) return;

      if (emptyState) emptyState.style.display = 'none';

      // Rendering sicuro degli articoli
      grid.innerHTML = articlesData.map((item) => `
        <article class="article-card">
          <div class="article-thumb">
            <img src="${item.coverUrl || ''}" alt="${item.title || ''}" loading="lazy">
          </div>
          <div class="article-body">
            <div class="article-meta">
              <span class="article-category">${item.category || 'Editoriale'}</span>
              <span>·</span>
              <time class="article-date" datetime="${item.isoDate || ''}">${item.date || ''}</time>
            </div>
            <h3 class="article-title">${item.title || ''}</h3>
            <p class="article-excerpt">${item.excerpt || ''}</p>
          </div>
        </article>
      `).join('');
    }
  };
}

/**
 * 6. Tilted Callout Blocks ("Pacchetti") - Micro-interazione Tap/Click su Mobile/Touch
 * Alterna lo stato .is-active al tap per raddrizzare il blocco inclinato su touch screen
 */
function initTiltedCallouts() {
  const callouts = document.querySelectorAll(
    '.about-sidebar, .about-quote, blockquote, .callout--primary, .statement-callout, .pull-quote, .quote-editorial, .tilted-callout'
  );
  if (!callouts.length) return;

  callouts.forEach((block) => {
    block.setAttribute('tabindex', '0');
    block.setAttribute('role', 'button');
    block.setAttribute('aria-pressed', 'false');

    block.addEventListener('click', (e) => {
      // Non bloccare eventuali link all'interno del blocco
      if (e.target.closest('a')) return;

      const wasActive = block.classList.contains('is-active');
      callouts.forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });

      if (!wasActive) {
        block.classList.add('is-active');
        block.setAttribute('aria-pressed', 'true');
      }
      e.stopPropagation();
    });

    block.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        block.click();
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.about-sidebar, .about-quote, blockquote, .callout--primary, .statement-callout, .pull-quote, .quote-editorial, .tilted-callout')) {
      callouts.forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
    }
  });
}
