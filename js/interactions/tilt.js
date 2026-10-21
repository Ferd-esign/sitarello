// Effetto Tilt 3D per Card Progetti e Archivio

export function initTiltEffect() {
    const cards = document.querySelectorAll('.project-card, .archivio-card');

    cards.forEach(card => {
        if (card.dataset.tiltInitialized) return;
        card.dataset.tiltInitialized = 'true';

        let isHovered = false;
        let bounds = null;

        const onMove = (clientX, clientY) => {
            if (!bounds) bounds = card.getBoundingClientRect();

            const x = clientX - bounds.left;
            const y = clientY - bounds.top;

            const xNorm = (x / bounds.width) * 2 - 1;
            const yNorm = (y / bounds.height) * 2 - 1;

            const maxRotation = 6;
            const rotateX = yNorm * -maxRotation;
            const rotateY = xNorm * maxRotation;

            requestAnimationFrame(() => {
                if (isHovered) {
                    card.style.transform = `perspective(1000px) scale3d(1.02, 1.02, 1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    card.style.transition = 'none';
                }
            });
        };

        const onEnter = () => {
            isHovered = true;
            bounds = card.getBoundingClientRect();
            card.style.transition = 'transform 0.3s ease';
        };

        const onLeave = () => {
            isHovered = false;
            bounds = null;
            requestAnimationFrame(() => {
                card.style.transition = 'transform 0.3s ease';
                card.style.transform = 'perspective(1000px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg)';

                setTimeout(() => {
                    if (!isHovered) {
                        card.style.transform = '';
                        card.style.transition = '';
                    }
                }, 300);
            });
        };

        // Desktop
        card.addEventListener('mouseenter', onEnter);
        card.addEventListener('mousemove', (e) => {
            if (!isHovered) onEnter();
            onMove(e.clientX, e.clientY);
        });
        card.addEventListener('mouseleave', onLeave);

        // Mobile
        card.addEventListener('touchstart', onEnter, { passive: true });
        card.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                onMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
        card.addEventListener('touchend', onLeave);
    });
}
