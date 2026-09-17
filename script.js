// ======================================================
// CONFIGURACIÓN Y API (CLOUDFLARE WORKER)
// ======================================================
// Usamos el Worker directamente para obtener datos en vivo sin caché congelada de CDN
const API_POSTS_URL = "https://nrial-media-api.kevin-123-abanto.workers.dev/api/posts";

let postsDatabase = [];
let displayedCount = 0;
const BATCH_SIZE = 6;

// Elementos del DOM
const cardsGrid = document.getElementById("cards-grid");
const loadMoreBtn = document.getElementById("load-more-btn");
const template = document.getElementById("card-template");

// ======================================================
// DETECCIÓN DE FORMATO MULTIMEDIA
// ======================================================
function isVideoUrl(url) {
  return /\.(webm|mp4|mov|ogg)(\?.*)?$/i.test(url);
}

// ======================================================
// OBSERVADORES: CONTROL DE VIDEO
// ======================================================
const preloadObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (isIntersecting && !video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.preload = "metadata";
      observer.unobserve(video);
    }
  });
}, { rootMargin: "200px 0px" });

const playbackObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (isIntersecting) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}, { threshold: 0.5 });

// ======================================================
// CONSTRUCCIÓN DINÁMICA DE TARJETAS
// ======================================================
function createCardElement(media) {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".ig-card");

  // 1. Asignar siempre la imagen "Antes"
  const beforeImg = clone.querySelector(".before-media");
  beforeImg.src = media.before;

  // 2. Resolver elemento "Después" (Video o Imagen)
  const afterClip = clone.querySelector(".after-clip");
  const videoEl = clone.querySelector(".after-video");

  if (isVideoUrl(media.after)) {
    // Si es Video: observadores activos
    videoEl.dataset.src = media.after;
    preloadObserver.observe(videoEl);
    playbackObserver.observe(videoEl);
  } else {
    // Si es Imagen (JPG, PNG, WEBP): remover video e inyectar <img> perfectamente alineado
    videoEl.remove();

    const imgEl = document.createElement("img");
    imgEl.className = "after-media";
    imgEl.src = media.after;
    imgEl.alt = "Después";
    imgEl.loading = "lazy";
    imgEl.draggable = false;
    imgEl.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none;";

    afterClip.appendChild(imgEl);
  }

  // 3. Inicializar comparador
  setupComparator(card.querySelector("[data-comparison]"));
  return card;
}

// ======================================================
// RENDERIZADO EN LOTES (2x3)
// ======================================================
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
document.addEventListener("DOMContentLoaded", async () => {
  setupComparator(document.querySelector(".comparator-16-9"));

  try {
    // Consulta directa a la API en vivo con parámetro de tiempo anti-caché
    const res = await fetch(`${API_POSTS_URL}?t=${Date.now()}`);
    if (res.ok) {
      postsDatabase = await res.json();
    }
  } catch (err) {
    console.warn("No se pudo obtener el catálogo desde el Worker:", err);
  }

  renderNextBatch();
  loadMoreBtn?.addEventListener("click", renderNextBatch);
});