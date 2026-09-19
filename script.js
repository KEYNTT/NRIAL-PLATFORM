/**
 * NRIAL PLATFORM — Controlador de Portada
 * Inyecta un máximo estricto de 6 cartillas en la portada.
 * Si existen más piezas, muestra el botón hacia galeria.html.
 */

const API_POSTS_URL = "https://nrial-media-api.kevin-123-abanto.workers.dev/api/posts";
const HOMEPAGE_LIMIT = 6;

// Elementos del DOM
const cardsGrid = document.getElementById("cards-grid");
const loadMoreBtn = document.getElementById("load-more-btn");
const template = document.getElementById("card-template");

/**
 * Valida si la URL contiene una extensión de video
 */
function isVideoUrl(url) {
  return /\.(webm|mp4|mov|ogg)(\?.*)?$/i.test(url);
}

/**
 * Precarga perezosa (Lazy Preload)
 */
const preloadObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (isIntersecting && !video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.preload = "metadata";
      observer.unobserve(video);
    }
  });
}, { rootMargin: "250px 0px" });

/**
 * Reproducción automática al estar en pantalla
 */
const playbackObserver = new IntersectionObserver((entries) => {
  entries.forEach(({ target: video, isIntersecting }) => {
    if (isIntersecting) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}, { threshold: 0.5 });

/**
 * Construye cada cartilla utilizando la plantilla original exacta
 */
function createCardElement(media) {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".ig-card");

  // 1. Asignar imagen "Antes"
  const beforeImg = clone.querySelector(".before-media");
  beforeImg.src = media.before;

  // 2. Asignar capa "Después" (Video o Imagen)
  const afterClip = clone.querySelector(".after-clip");
  const videoEl = clone.querySelector(".after-video");

  if (isVideoUrl(media.after)) {
    videoEl.dataset.src = media.after;
    preloadObserver.observe(videoEl);
    playbackObserver.observe(videoEl);
  } else {
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

  // 3. Inicializar comparador táctil / cursor
  setupComparator(card.querySelector("[data-comparison]"));

  return card;
}

/**
 * Lógica del comparador interactivo
 */
function setupComparator(container) {
  if (!container) return;

  let resetTimer = null;

  const updateSplit = (pct) => {
    const clamped = Math.max(0, Math.min(pct, 100));
    container.style.setProperty("--split", `${clamped}%`);
  };

  const onMove = (e) => {
    container.classList.remove("is-resetting");
    clearTimeout(resetTimer);
    const rect = container.getBoundingClientRect();
    if (rect.width > 0) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      updateSplit(((clientX - rect.left) / rect.width) * 100);
    }
  };

  const onReset = () => {
    container.classList.add("is-resetting");
    updateSplit(50);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => container.classList.remove("is-resetting"), 450);
  };

  container.addEventListener("pointerenter", onMove);
  container.addEventListener("pointermove", onMove);
  ["pointerleave", "pointerup", "pointercancel"].forEach((evt) => {
    container.addEventListener(evt, onReset);
  });

  updateSplit(50);
}

/**
 * Carga de datos desde Cloudflare R2
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar comparador 16:9 del Hero
  setupComparator(document.querySelector(".comparator-16-9"));

  try {
    const res = await fetch(`${API_POSTS_URL}?t=${Date.now()}`);
    if (res.ok) {
      const posts = await res.json();

      if (Array.isArray(posts) && posts.length > 0) {
        // Renderizamos estrictamente las primeras 6 publicaciones
        const initialBatch = posts.slice(0, HOMEPAGE_LIMIT);
        initialBatch.forEach(item => cardsGrid.appendChild(createCardElement(item)));

        // Mostrar botón si hay más de 6 elementos
        if (posts.length > HOMEPAGE_LIMIT && loadMoreBtn) {
          loadMoreBtn.classList.remove("is-hidden");
        } else if (loadMoreBtn) {
          loadMoreBtn.classList.add("is-hidden");
        }
      } else if (loadMoreBtn) {
        loadMoreBtn.classList.add("is-hidden");
      }
    }
  } catch (err) {
    console.warn("No se pudo obtener el catálogo desde el Worker:", err);
    if (loadMoreBtn) loadMoreBtn.classList.add("is-hidden");
  }
});