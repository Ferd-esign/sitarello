// Gestione Drawer Laterale Mobile

const mobileDrawer = document.getElementById('mobile-drawer');
const drawerOverlay = document.getElementById('mobile-drawer-overlay');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const drawerCloseBtn = document.getElementById('drawer-close-btn');
const navLinks = document.querySelectorAll('.nav-link');

export function openDrawer() {
    if (mobileDrawer && drawerOverlay) {
        mobileDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

export function closeDrawer() {
    if (mobileDrawer && drawerOverlay) {
        mobileDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

export function initDrawer() {
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    navLinks.forEach(link => {
        link.addEventListener('click', closeDrawer);
    });
}
