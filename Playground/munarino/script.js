/* =========================================================
   MUNARINO — script.js
   Scena three.js minimale con una card 3D (il "Munarino")
   che l'utente può ruotare liberamente per leggere fronte
   e retro. Include l'apertura di una modale video YouTube
   (nocookie) tramite un bottone in overlay HTML/CSS.
   ========================================================= */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ---------------------------------------------------------
   1. SETUP BASE: renderer, scena, camera
   --------------------------------------------------------- */

const canvas = document.getElementById("scene");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true, // canvas trasparente: il colore di sfondo arriva dal CSS (var(--paper))
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
// Nessun colore di sfondo qui: resta trasparente, coerente con lo spazio "vuoto" richiesto.
scene.background = null;

const camera = new THREE.PerspectiveCamera(
  32, // FOV stretta: look da "prodotto in vetrina", poca distorsione
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.15, 4.2);

/* ---------------------------------------------------------
   2. LUCI: illuminazione morbida, uniforme, senza ombre dure
   --------------------------------------------------------- */

// Luce ambientale diffusa: base soffusa su tutta la card
const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);

// Luce "cielo/terra": aiuta a leggere i bordi con una gradazione naturale
const hemi = new THREE.HemisphereLight(0xfff6ea, 0x2a241c, 0.6);
scene.add(hemi);

// Luce chiave frontale, morbida, leggermente dall'alto
const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
keyLight.position.set(2.2, 2.5, 3);
scene.add(keyLight);

// Luce di schiarimento sul retro, per non lasciare il retro della card troppo scuro
const backLight = new THREE.DirectionalLight(0xffffff, 0.55);
backLight.position.set(-2, 1.2, -3);
scene.add(backLight);

/* ---------------------------------------------------------
   3. LA CARD 3D — proporzioni di un biglietto da visita
      85 × 55 mm ≈ rapporto 1.545 : 1
   --------------------------------------------------------- */

const CARD_HEIGHT = 1.7;
const CARD_WIDTH = CARD_HEIGHT / (85 / 55);
const CARD_DEPTH = 0.028;

const textureLoader = new THREE.TextureLoader();

// Colore di riserva mentre le texture caricano (o se un file manca)
const fallbackColor = new THREE.Color("#efe9db");

function loadFaceTexture(path) {
  const texture = textureLoader.load(
    path,
    undefined,
    undefined,
    () => {
      // Se l'immagine non viene trovata, la card resta comunque leggibile:
      // niente errori bloccanti in console per l'utente finale.
      console.warn(`Munarino: impossibile caricare "${path}". Verifica che il file sia nella cartella.`);
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const frontTexture = loadFaceTexture("immagini/fronte.jpg");
const backTexture = loadFaceTexture("immagini/retro.jpg");

const frontMaterial = new THREE.MeshStandardMaterial({
  map: frontTexture,
  color: fallbackColor,
  roughness: 0.55,
  metalness: 0.02,
});

const backMaterial = new THREE.MeshStandardMaterial({
  map: backTexture,
  color: fallbackColor,
  roughness: 0.55,
  metalness: 0.02,
});

// Bordo della card: un unico colore neutro, sottile, come il taglio di una vera cartolina
const edgeMaterial = new THREE.MeshStandardMaterial({
  color: 0xe4ddcb,
  roughness: 0.8,
  metalness: 0,
});

const cardGeometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH, 1, 1, 1);

// Ordine facce BoxGeometry: [+x, -x, +y, -y, +z(fronte), -z(retro)]
const cardMaterials = [
  edgeMaterial, // +x
  edgeMaterial, // -x
  edgeMaterial, // +y
  edgeMaterial, // -y
  frontMaterial, // +z → fronte.jpg
  backMaterial, // -z → retro.jpg
];

const card = new THREE.Mesh(cardGeometry, cardMaterials);
scene.add(card);

// Leggerissima inclinazione iniziale: dà subito l'idea di un oggetto in 3D, non piatto
card.rotation.x = -0.08;
card.rotation.y = 0.35;

/* Ombra di contatto morbida sotto la card, per dare profondità
   allo spazio vuoto senza appesantire la scena. È un piano statico
   con texture radiale generata via canvas 2D, non ruota con la card. */
function createShadowTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(26, 23, 18, 0.22)");
  gradient.addColorStop(1, "rgba(26, 23, 18, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const shadowGeo = new THREE.PlaneGeometry(CARD_WIDTH * 2.1, CARD_HEIGHT * 2.1);
const shadowMat = new THREE.MeshBasicMaterial({
  map: createShadowTexture(),
  transparent: true,
  depthWrite: false,
});
const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -CARD_HEIGHT * 0.62;
scene.add(shadowPlane);

/* ---------------------------------------------------------
   4. CONTROLLI — rotazione libera con drag / touch
   --------------------------------------------------------- */

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.65;
controls.enablePan = false;

// Zoom limitato: si può avvicinarsi un po' ma non "entrare" nella card
controls.enableZoom = true;
controls.minDistance = 2.6;
controls.maxDistance = 6;

// Nessun limite sull'angolo: l'utente deve poter vedere sia fronte che retro
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;

// Leggera rotazione automatica finché l'utente non interagisce:
// invita subito a scoprire che l'oggetto è tridimensionale.
controls.autoRotate = true;
controls.autoRotateSpeed = 1.1;

const hintEl = document.getElementById("hint");

function stopIntroRotation() {
  if (controls.autoRotate) {
    controls.autoRotate = false;
  }
  hintEl.classList.add("is-hidden");
}

controls.addEventListener("start", stopIntroRotation);

/* ---------------------------------------------------------
   5. LOOP DI RENDER
   --------------------------------------------------------- */

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // necessario per damping e autoRotate
  renderer.render(scene, camera);
}
animate();

/* ---------------------------------------------------------
   6. RESPONSIVE — resize della finestra
   --------------------------------------------------------- */

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);

  // Su schermi molto stretti (mobile in verticale) allontaniamo leggermente
  // la camera per mantenere la card interamente visibile.
  const isNarrow = width < 480;
  camera.position.z = isNarrow ? 5.2 : 4.2;
}

window.addEventListener("resize", onResize);
onResize();

/* ---------------------------------------------------------
   7. MODALE VIDEO — "Accendi un'idea per il munarino"
   --------------------------------------------------------- */

const YT_EMBED_URL = "https://www.youtube-nocookie.com/embed/O89cfgzrq_Y";

const openBtn = document.getElementById("openModal");
const closeBtn = document.getElementById("closeModal");
const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalIframe = document.getElementById("modalIframe");

function openModal() {
  // Carichiamo l'iframe solo all'apertura, con autoplay, e lo scarichiamo
  // alla chiusura: evita di tenere il video in memoria/riproduzione in background.
  modalIframe.src = `${YT_EMBED_URL}?autoplay=1&rel=0`;
  modal.hidden = false;
  document.body.style.overflow = "hidden";

  // Sospendiamo l'interazione con la scena 3D mentre la modale è aperta.
  controls.enabled = false;
  controls.autoRotate = false;

  closeBtn.focus();
}

function closeModal() {
  modal.hidden = true;
  modalIframe.src = ""; // ferma la riproduzione del video
  document.body.style.overflow = "";

  // Ripristina la piena interazione con la card 3D.
  controls.enabled = true;

  openBtn.focus();
}

openBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

// Chiusura anche con il tasto Esc, per accessibilità da tastiera
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) {
    closeModal();
  }
});
