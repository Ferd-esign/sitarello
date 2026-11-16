/**
 * SINTESI — Progetto Editoriale Indipendente
 * Modulo JavaScript Principale (Vanilla JS)
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initScrollSpy();
  initSmoothScroll();
  initSectionTriggers();
  initLogoFallback();
  initArticlesEngineStub();
});

/**
 * 1. Mobile Navigation & Accessibility
 */
function initMobileNav() {
  const toggleBtn = document.querySelector('.js-nav-toggle');
  const navWrapper = document.querySelector('.js-nav-wrapper');
  const navLinks = document.querySelectorAll('.js-nav-link');

  if (!toggleBtn || !navWrapper) return;

  const toggleMenu = (forceState) => {
    const isCurrentlyOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    const nextState = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

    toggleBtn.setAttribute('aria-expanded', String(nextState));
    toggleBtn.classList.toggle('is-open', nextState);
    navWrapper.classList.toggle('is-open', nextState);
    document.body.style.overflow = nextState ? 'hidden' : '';
    document.documentElement.style.overflow = nextState ? 'hidden' : '';
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Chiudi menu al click sui link interni
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        toggleMenu(false);
      }
    });
  });

  // Chiudi cliccando fuori dal menu aperto (backdrop tap)
  document.addEventListener('click', (e) => {
    if (toggleBtn.getAttribute('aria-expanded') === 'true') {
      if (!navWrapper.contains(e.target) && !toggleBtn.contains(e.target)) {
        toggleMenu(false);
      }
    }
  });

  // Chiudi con il tasto Escape per conformità WCAG
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggleBtn.getAttribute('aria-expanded') === 'true') {
      toggleMenu(false);
      toggleBtn.focus();
    }
  });

  // Ripristina l'overflow quando la finestra viene ridimensionata oltre il breakpoint mobile
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && toggleBtn.getAttribute('aria-expanded') === 'true') {
      toggleMenu(false);
    }
  });
}

/**
 * 2. Active Section Spy (Sincronizzazione Navigazione & Correzione Landing Hero)
 */
function initScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const sections = [
    { id: 'articoli', el: document.querySelector('#articoli') },
    { id: 'mission', el: document.querySelector('#mission') },
    { id: 'about', el: document.querySelector('#about') }
  ].filter((item) => item.el !== null);

  const updateActiveNav = () => {
    const scrollPos = window.scrollY;
    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 64;
    const heroEl = document.querySelector('#hero');
    // Soglia della hero: se siamo sopra o dentro la hero, nessuna voce dell'header deve essere attiva!
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

    // Se siamo arrivati all'estremo fondo della pagina
    if ((window.innerHeight + scrollPos) >= (document.documentElement.scrollHeight - 70)) {
      activeId = 'about';
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

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  window.addEventListener('resize', updateActiveNav, { passive: true });
  updateActiveNav();
}

/**
 * 3. Smooth Scroll e "Torna su"
 */
function initSmoothScroll() {
  const backToTopBtn = document.querySelector('.js-back-to-top');

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

/**
 * 4. Trigger di Scorrimento Bidirezionale (Passaggio Pagina-per-Pagina)
 */
function initSectionTriggers() {
  const triggerLinks = document.querySelectorAll('.js-scroll-trigger');
  triggerLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  const pageSections = [
    document.querySelector('#hero'),
    document.querySelector('#articoli'),
    document.querySelector('#mission'),
    document.querySelector('#about')
  ].filter(Boolean);

  if (!pageSections.length) return;

  let isTriggering = false;
  let accumulatedDelta = 0;
  let touchStartY = 0;
  let resetDeltaTimeout = null;

  const navigateToPage = (targetSection) => {
    if (!targetSection || isTriggering) return;
    isTriggering = true;
    targetSection.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      isTriggering = false;
      accumulatedDelta = 0;
    }, 750);
  };

  const getCurrentPageIndex = () => {
    const scrollPos = window.scrollY;
    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 64;
    const probe = scrollPos + headerHeight + (window.innerHeight * 0.35);

    for (let i = pageSections.length - 1; i >= 0; i--) {
      if (probe >= pageSections[i].offsetTop) {
        return i;
      }
    }
    return 0;
  };

  const isAtSectionBottom = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.bottom <= (window.innerHeight + 45);
  };

  const isAtSectionTop = (el) => {
    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 64;
    const rect = el.getBoundingClientRect();
    return rect.top >= (headerHeight - 45);
  };

  // Trigger con rotella o trackpad bidirezionale (Avanti & Indietro tra tutte le pagine)
  window.addEventListener('wheel', (e) => {
    if (isTriggering) return;
    const currentIndex = getCurrentPageIndex();
    const currentSection = pageSections[currentIndex];

    // Scroll verso il basso: passa alla pagina successiva
    if (e.deltaY > 0) {
      if (currentIndex < pageSections.length - 1 && isAtSectionBottom(currentSection)) {
        accumulatedDelta += e.deltaY;
        if (accumulatedDelta > 40) {
          navigateToPage(pageSections[currentIndex + 1]);
        }
      } else {
        accumulatedDelta = 0;
      }
    } 
    // Scroll verso l'alto: ritorna alla pagina precedente
    else if (e.deltaY < 0) {
      if (currentIndex > 0 && isAtSectionTop(currentSection)) {
        accumulatedDelta += Math.abs(e.deltaY);
        if (accumulatedDelta > 40) {
          navigateToPage(pageSections[currentIndex - 1]);
        }
      } else {
        accumulatedDelta = 0;
      }
    }

    clearTimeout(resetDeltaTimeout);
    resetDeltaTimeout = setTimeout(() => {
      accumulatedDelta = 0;
    }, 250);
  }, { passive: true });

  // Trigger touch per dispositivi mobili (Avanti & Indietro)
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (isTriggering) return;
    const touchY = e.touches[0].clientY;
    const diff = touchStartY - touchY;
    const currentIndex = getCurrentPageIndex();
    const currentSection = pageSections[currentIndex];

    // Nella Hero: swipe verso l'alto (scroll down) conduce alla prima sezione Articoli
    if (currentIndex === 0 && diff > 50) {
      navigateToPage(pageSections[1]);
      return;
    }

    // Su schermi ampi o desktop con touch: swipe controllato tra sezioni
    if (window.innerWidth > 768) {
      if (diff > 55 && currentIndex < pageSections.length - 1 && isAtSectionBottom(currentSection)) {
        navigateToPage(pageSections[currentIndex + 1]);
      } else if (diff < -55 && currentIndex > 0 && isAtSectionTop(currentSection)) {
        navigateToPage(pageSections[currentIndex - 1]);
      }
    }
  }, { passive: true });

  const sections = document.querySelectorAll('.section, .hero-section');
  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-triggered');
        }
      });
    }, {
      rootMargin: '-10% 0px -10% 0px',
      threshold: 0.15
    });

    sections.forEach((sec) => observer.observe(sec));
  }
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
