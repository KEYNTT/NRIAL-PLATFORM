// ======================================================
// CONFIGURACIÓN Y MEDIOS (CLOUDFLARE R2)
// ======================================================
const R2_BASE_URL = "https://media.nrial.com";

const postsDatabase = [
  {
    before: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",
    after: `${R2_BASE_URL}/after.webm`
  }
  // Agregue más elementos manteniendo esta misma estructura
];

// ======================================================
// OBSERVADORES: CARGA POR RANGO + CONTROL VISUAL
// ======================================================

// 1. Conecta la URL 200px antes de entrar a pantalla y solicita solo metadatos (HTTP 206)
const preloadObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (isIntersecting && !video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.preload = "metadata"; 
      observer.unobserve(video);
    }
  });
}, { rootMargin: "200px 0px" });

// 2. Inicia la descarga activa de fragmentos y reproducción solo al 50% de visibilidad
const playbackObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (isIntersecting) {
      video.play().catch(() => {}); // Evita errores si el usuario hace scroll rápido
    } else {
      video.pause();
    }
  });
}, { threshold: 0.5 });

// ======================================================
// RENDERIZADO EN LOTES (BATCH 6 = GRID 2x3)
// ======================================================
const BATCH_SIZE = 6;
let displayedCount = 0;

const cardsGrid = document.getElementById("cards-grid");
const loadMoreBtn = document.getElementById("load-more-btn");
const template = document.getElementById("card-template");

function createCardElement(media) {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".ig-card");

  clone.querySelector(".before-media").src = media.before;

  const video = clone.querySelector(".after-video");
  video.dataset.src = media.after;

  preloadObserver.observe(video);
  playbackObserver.observe(video);

  setupComparator(clone.querySelector("[data-comparison]"));
  return card;
}

function renderNextBatch() {
  const nextItems = postsDatabase.slice(displayedCount, displayedCount + BATCH_SIZE);
  nextItems.forEach((item) => cardsGrid.appendChild(createCardElement(item)));
  displayedCount += nextItems.length;

  if (displayedCount >= postsDatabase.length && loadMoreBtn) {
    loadMoreBtn.classList.add("is-hidden");
  }
}

// ======================================================
// CONTROL DEL COMPARADOR (DESLIZADOR)
// ======================================================
function setupComparator(container) {
  if (!container) return;

  let resetTimer = null;
  const updateSplit = (pct) => container.style.setProperty("--split", `${Math.max(0, Math.min(pct, 100))}%`);

  const onMove = (e) => {
    container.classList.remove("is-resetting");
    clearTimeout(resetTimer);
    const { left, width } = container.getBoundingClientRect();
    if (width > 0) updateSplit(((e.clientX - left) / width) * 100);
  };

  const onReset = () => {
    container.classList.add("is-resetting");
    updateSplit(50);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => container.classList.remove("is-resetting"), 450);
  };

  container.addEventListener("pointerenter", onMove);
  container.addEventListener("pointermove", onMove);
  ["pointerleave", "pointerup", "pointercancel"].forEach((evt) => container.addEventListener(evt, onReset));

  updateSplit(50);
}

// ======================================================
// ARRANQUE
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  setupComparator(document.querySelector(".comparator-16-9"));
  renderNextBatch();
  loadMoreBtn?.addEventListener("click", renderNextBatch);
});