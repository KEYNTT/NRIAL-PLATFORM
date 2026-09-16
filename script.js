// ======================================================
// CONFIGURACIÓN DE CLOUDFLARE R2
// ======================================================
// Si prueba en local, puede usar "./assets" o su URL pública de Cloudflare R2:
const R2_BASE_URL = "https://media.nrial.com"; 

// ======================================================
// BASE DE MEDIOS (SOLO RUTAS DE IMAGEN Y VIDEO)
// ======================================================
const postsDatabase = [
  {
    // Imagen de prueba de alta resolución
    before: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",
    // Video de muestra en formato MP4/WebM
    after: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  // resto de cartillas...
];

// ======================================================
// CONTROL DE CARGA (LOTES DE 6 = FORMATO 2x3)
// ======================================================
const BATCH_SIZE = 6;
let displayedCount = 0;

const cardsGrid = document.getElementById("cards-grid");
const loadMoreBtn = document.getElementById("load-more-btn");
const template = document.getElementById("card-template");

// Los videos de R2 solo se descargan y reproducen cuando están en pantalla
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const video = entry.target;
    if (entry.isIntersecting) {
      if (!video.src && video.dataset.src) {
        video.src = video.dataset.src;
        video.load();
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}, { threshold: 0.25 });

// Clonar plantilla e inyectar únicamente las rutas de imagen y video
function createCardElement(media) {
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".ig-card");

  // Asignar imagen "Antes"
  const img = clone.querySelector(".before-media");
  img.src = media.before;

  // Asignar video "Después" (Lazy load con R2)
  const video = clone.querySelector(".after-video");
  video.dataset.src = media.after;
  videoObserver.observe(video);

  // Activar deslizador
  const comparatorEl = clone.querySelector("[data-comparison]");
  setupComparator(comparatorEl);

  return card;
}

function renderNextBatch() {
  const nextItems = postsDatabase.slice(displayedCount, displayedCount + BATCH_SIZE);

  nextItems.forEach((item) => {
    cardsGrid.appendChild(createCardElement(item));
  });

  displayedCount += nextItems.length;

  if (displayedCount >= postsDatabase.length) {
    loadMoreBtn.classList.add("is-hidden");
  }
}

// ======================================================
// CONTROL DE MOVIMIENTO DEL DESLIZADOR
// ======================================================
function setupComparator(container) {
  if (!container) return;

  let resetTimer = null;

  function setSplit(percent) {
    const bounded = Math.max(0, Math.min(percent, 100));
    container.style.setProperty("--split", `${bounded}%`);
  }

  function handleMove(clientX) {
    if (container.classList.contains("is-resetting")) {
      container.classList.remove("is-resetting");
    }
    clearTimeout(resetTimer);

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const percentage = ((clientX - rect.left) / rect.width) * 100;
    setSplit(percentage);
  }

  function returnToCenter() {
    container.classList.add("is-resetting");
    setSplit(50);

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      container.classList.remove("is-resetting");
    }, 450);
  }

  container.addEventListener("pointerenter", (e) => handleMove(e.clientX));
  container.addEventListener("pointermove", (e) => handleMove(e.clientX));
  container.addEventListener("pointerleave", returnToCenter);
  container.addEventListener("pointerup", returnToCenter);
  container.addEventListener("pointercancel", returnToCenter);

  setSplit(50);
}

// ======================================================
// ARRANQUE
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Inicializar comparador horizontal del Hero
  const heroComparator = document.querySelector(".comparator-16-9");
  if (heroComparator) {
    setupComparator(heroComparator);
  }

  // 2. Renderizar los primeros 6 elementos (2x3)
  renderNextBatch();

  // 3. Botón "Ver más..."
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", renderNextBatch);
  }
});