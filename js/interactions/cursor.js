// Cursore personalizzato desktop: quadratino piccolo blu del branding che diventa cerchietto in hover

export function initCustomCursor() {
    // Attiva solo su desktop con puntatore fine e supporto hover (nessun touch)
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        return;
    }

    let cursor = document.getElementById('custom-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'custom-cursor';
        cursor.className = 'custom-cursor';
        cursor.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cursor);
    }

    let isVisible = false;

    function isInteractive(element) {
        if (!element || element === document.body || element === document.documentElement) return false;
        return !!element.closest(
            'a, button, input, textarea, select, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"]), label, summary, .manifesto-card, .progetto-card, .filter-chip, .clickable, [onclick]'
        );
    }

    const onPointerMove = (e) => {
        if (!isVisible) {
            isVisible = true;
            cursor.classList.add('is-visible');
        }
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;

        const target = document.elementFromPoint(e.clientX, e.clientY) || e.target;
        if (target && isInteractive(target)) {
            cursor.classList.add('is-hover');
        } else {
            cursor.classList.remove('is-hover');
        }
    };

    const onPointerLeave = () => {
        isVisible = false;
        cursor.classList.remove('is-visible');
    };

    const onPointerEnter = () => {
        isVisible = true;
        cursor.classList.add('is-visible');
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    document.addEventListener('mouseenter', onPointerEnter);
}
