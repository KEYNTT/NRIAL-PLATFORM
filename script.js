// ======================================================
// CONFIGURACIÓN Y FUENTE DE DATOS (CLOUDFLARE R2)
// ======================================================
const R2_BASE_URL = "https://media.nrial.com";
const MANIFEST_URL = `${R2_BASE_URL}/manifest.json`;

// Almacén reactivo de publicaciones (se llena vía fetch desde R2)
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
// OBSERVADORES: CARGA POR RANGO + CONTROL VISUAL (SOLO VIDEO)
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

// 2. Inicia reproducción y solicitud de fragmentos al 50% de visibilidad
const playbackObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (isIntersecting) {
      video.play().catch(() => {}); // Previene errores por scroll veloz
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

  // 2. Resolver el elemento "Después" (Video o Imagen)
  const afterClip = clone.querySelector(".after-clip");
  const videoEl = clone.querySelector(".after-video");

  if (isVideoUrl(media.after)) {
    // Es Video: activar observadores de rango y reproducción
    videoEl.dataset.src = media.after;
    preloadObserver.observe(videoEl);
    playbackObserver.observe(videoEl);
  } else {
    // Es Imagen: eliminar el elemento video e inyectar <img>
    videoEl.remove();

    const imgEl = document.createElement("img");
    imgEl.className = "after-media";
    imgEl.src = media.after;
    imgEl.alt = "Después";
    imgEl.loading = "lazy";
    imgEl.draggable = false;
    imgEl.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block;";

    afterClip.appendChild(imgEl);
  }

  // 3. Inicializar comparador interactivo
  setupComparator(clone.querySelector("[data-comparison]"));
  return card;
}

// ======================================================
// RENDERIZADO EN LOTES (GRID RESPONSIVE 2x3)
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
  // Inicializar slider del hero si existe
  setupComparator(document.querySelector(".comparator-16-9"));

  // Descargar catálogo dinámico de R2
  try {
    const res = await fetch(MANIFEST_URL);
    if (res.ok) {
      postsDatabase = await res.json();
    }
  } catch (err) {
    console.warn("No se pudo conectar con el catálogo de R2:", err);
  }

  // Renderizar el primer lote
  renderNextBatch();

  // Control del botón "Ver más..."
  loadMoreBtn?.addEventListener("click", renderNextBatch);
});