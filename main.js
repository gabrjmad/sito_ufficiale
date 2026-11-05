/**
 * GABRIELE MADEO — MAIN CONTROLLER & EXPERIENTIAL MOTION ENGINE
 * 
 * Requisiti Prestazionali Implementati:
 * 1. Pre-decodifica in RAM via `await img.decode()`
 * 2. Canvas 2D con alpha: false e desynchronized: true
 * 3. Rendering completamente disaccoppiato dallo scroll (RAF loop continuo)
 * 4. Scaling demandato alla GPU via CSS object-fit: cover (nessun calcolo CPU)
 * 5. Scroll smoothing tramite Lenis + ScrollTrigger scrub: 1
 */

(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     CONFIGURAZIONE FRAME SEQUENZE VIDEO
     ═══════════════════════════════════════════════════════════════ */

  // SEQUENZA 1: Il Tuffo / Caduta (117 frame da compressed_002 a 118)
  const SEQUENCE_1_FRAMES = Array.from({ length: 117 }, (_, i) => 
    `img-sequence/compressed_${String(i + 2).padStart(3, '0')}.webp`
  );

  /* ═══════════════════════════════════════════════════════════════
     CONFIGURAZIONE SEQUENZA 2: ZOOM NELL'OCCHIO -> FOTO 4
     Inserisci qui l'array con i percorsi dei frame quando pronti:
     Esempio:
     const SEQUENCE_2_FRAMES = [
       'eye-sequence/frame_001.webp',
       'eye-sequence/frame_002.webp',
       ...
     ];
     ═══════════════════════════════════════════════════════════════ */
  const SEQUENCE_2_FRAMES = [
    // [SPAZIO RISERVATO PER LA TUA SECONDA SEQUENZA DI IMMAGINI]
  ];

  /* ═══════════════════════════════════════════════════════════════
     1. INIZIALIZZAZIONE SMOOTH SCROLL (LENIS)
     ═══════════════════════════════════════════════════════════════ */
  let lenis = null;
  const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 768;

  function initSmoothScroll() {
    if (typeof Lenis === "undefined") return;

    lenis = new Lenis({
      duration: isTouchDevice() ? 0.8 : 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false, // Preserva la reattività istantanea al tocco sui dispositivi mobili
      touchMultiplier: 1.15,
      wheelMultiplier: 1.0,
    });

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     2. GESTIONE CANVAS & PRE-DECODIFICA IN RAM VIA img.decode()
     ═══════════════════════════════════════════════════════════════ */
  const canvas1 = document.getElementById("canvas-seq-1");
  // REQUISITO: Disattivazione canale alpha (alpha: false) per massime performance
  const ctx1 = canvas1 ? canvas1.getContext("2d", { alpha: false, desynchronized: true }) : null;

  const canvas2 = document.getElementById("canvas-seq-2");
  const ctx2 = canvas2 ? canvas2.getContext("2d", { alpha: false, desynchronized: true }) : null;

  const loadedFrames1 = new Array(SEQUENCE_1_FRAMES.length);
  const loadedFrames2 = new Array(SEQUENCE_2_FRAMES.length);

  let targetFrameIndex1 = 0;
  let currentFrameIndex1 = -1;

  let targetFrameIndex2 = 0;
  let currentFrameIndex2 = -1;

  // Impostazione dimensioni native per demandare lo scaling alla GPU via CSS object-fit: cover
  function setupCanvasNativeDimensions(cvs, width, height) {
    if (!cvs) return;
    cvs.width = width;
    cvs.height = height;
  }
  // Risoluzione nativa della prima sequenza (2400x1350)
  setupCanvasNativeDimensions(canvas1, 2400, 1350);
  setupCanvasNativeDimensions(canvas2, 2400, 1350);

  /**
   * Pre-decodifica singola immagine in RAM via await img.decode()
   */
  async function decodeImageToRAM(url, priority = "auto") {
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = priority;
    img.src = url;
    try {
      // REQUISITO TASSATIVO: await img.decode() al posto del semplice onload
      await img.decode();
      return img;
    } catch (e) {
      return new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     3. DISACCOPPIAMENTO RENDERING DALLO SCROLL (LOOP RAF CONTINUO)
     ═══════════════════════════════════════════════════════════════ */
  function startCanvasRenderLoop() {
    function tick() {
      // Rendering Sequenza 1
      if (ctx1 && currentFrameIndex1 !== targetFrameIndex1) {
        currentFrameIndex1 = targetFrameIndex1;
        const img = loadedFrames1[currentFrameIndex1];
        if (img && img.complete) {
          // REQUISITO TASSATIVO: Disegno diretto 0, 0 (scaling gestito dalla GPU via CSS)
          ctx1.drawImage(img, 0, 0);
        }
      }

      // Rendering Sequenza 2 (quando popolata)
      if (ctx2 && SEQUENCE_2_FRAMES.length > 0 && currentFrameIndex2 !== targetFrameIndex2) {
        currentFrameIndex2 = targetFrameIndex2;
        const img = loadedFrames2[currentFrameIndex2];
        if (img && img.complete) {
          ctx2.drawImage(img, 0, 0);
        }
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════════════════════════════
     4. PRELOADER CON LINEA ORIZZONTALE E SCHERMO CHE SI DIVIDE A METÀ
     ═══════════════════════════════════════════════════════════════ */
  async function runPreloader() {
    const preloaderEl = document.getElementById("preloader");
    const barEl = document.getElementById("loader-bar");
    const pctEl = document.getElementById("loader-pct");

    const INITIAL_CRITICAL_COUNT = Math.min(24, SEQUENCE_1_FRAMES.length);
    let loadedCount = 0;

    function updateProgress(val) {
      const pct = Math.min(100, Math.round(val));
      if (barEl) barEl.style.width = pct + "%";
      if (pctEl) pctEl.textContent = pct + "%";
    }

    // 1. Decodifica prioritaria dei primi frame essenziali per avvio istantaneo a 60fps
    for (let i = 0; i < INITIAL_CRITICAL_COUNT; i++) {
      const img = await decodeImageToRAM(SEQUENCE_1_FRAMES[i], "high");
      loadedFrames1[i] = img;
      loadedCount++;
      updateProgress((loadedCount / INITIAL_CRITICAL_COUNT) * 100);
    }

    // Disegna il primo frame sul canvas
    if (loadedFrames1[0] && ctx1) {
      ctx1.drawImage(loadedFrames1[0], 0, 0);
      currentFrameIndex1 = 0;
    }

    // 2. A caricamento completato, lo schermo si divide a metà (curtain split)
    setTimeout(() => {
      if (preloaderEl) {
        preloaderEl.classList.add("is-opened");
      }
    }, 200);

    // 3. Decodifica in background dei frame rimanenti senza impattare la UI
    let nextIndex = INITIAL_CRITICAL_COUNT;
    function pumpRemainingFrames() {
      let batch = 0;
      while (nextIndex < SEQUENCE_1_FRAMES.length && batch < 6) {
        const idx = nextIndex;
        decodeImageToRAM(SEQUENCE_1_FRAMES[idx], "low").then((img) => {
          loadedFrames1[idx] = img;
        });
        nextIndex++;
        batch++;
      }
      if (nextIndex < SEQUENCE_1_FRAMES.length) {
        if ("requestIdleCallback" in window) {
          requestIdleCallback(pumpRemainingFrames, { timeout: 100 });
        } else {
          setTimeout(pumpRemainingFrames, 35);
        }
      }
    }
    setTimeout(pumpRemainingFrames, 100);

    // Pre-decodifica Sequenza 2 se presente
    if (SEQUENCE_2_FRAMES.length > 0) {
      SEQUENCE_2_FRAMES.forEach((src, idx) => {
        decodeImageToRAM(src, "low").then((img) => {
          loadedFrames2[idx] = img;
        });
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     5. SCROLLTRIGGER & FLUSSO NARRATIVO A SCORRIMENTO CONTINUO
     ═══════════════════════════════════════════════════════════════ */
  function initNarrativeScroll() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    /* ─── 1. CIELO -> PRIMO FRAME SEQUENZA 1 ─── */
    // La visuale scende dal cielo e si ricollega in modo impercettibile a compressed_002.webp
    const skyContent = document.getElementById("sky-content");
    const skyBg = document.getElementById("sky-bg");

    gsap.timeline({
      scrollTrigger: {
        trigger: "#sky-intro",
        start: "top top",
        end: "bottom top",
        scrub: 1, // REQUISITO: scrub: 1 per fluidità di inerzia
      }
    })
    .to(skyContent, { y: -80, opacity: 0, ease: "power1.in" }, 0)
    .to(skyBg, { y: -100, ease: "none" }, 0);

    /* ─── 2. SEQUENZA 1 (IL TUFFO/CADUTA) ─── */
    // REQUISITO: Disaccoppiamento dello scroll: aggiorna solo targetFrameIndex1
    ScrollTrigger.create({
      trigger: "#seq-1-track",
      start: "top top",
      end: "bottom bottom",
      scrub: 1, // REQUISITO TASSATIVO: scrub: 1
      onUpdate: (self) => {
        targetFrameIndex1 = Math.round(self.progress * (SEQUENCE_1_FRAMES.length - 1));
      }
    });

    // Dissolvenza finale in nero totale alla fine della sequenza 1
    gsap.to("#seq-1-fade", {
      opacity: 1,
      ease: "power2.inOut",
      scrollTrigger: {
        trigger: "#seq-1-track",
        start: "bottom 85%",
        end: "bottom top",
        scrub: 1,
      }
    });

    /* ─── 3. SEZIONE BIO: FOTO_1 FISSA SULLA DESTRA + TESTI A SINISTRA ─── */
    const bioPhoto = document.getElementById("bio-photo-1");
    const bioBlocks = [
      document.getElementById("bio-block-1"),
      document.getElementById("bio-block-2"),
      document.getElementById("bio-block-3")
    ];

    // Floating e parallax morbido su foto_1.png (sfondo trasparente)
    if (bioPhoto) {
      gsap.fromTo(bioPhoto,
        { y: 30, opacity: 0 },
        {
          y: -20,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "#bio-section",
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          }
        }
      );
    }

    // Comparsa sequenziale dei 3 blocchi di testo (fade-in, permanenza, fade-out verso l'alto)
    const bioTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#bio-section",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      }
    });

    bioBlocks.forEach((block, index) => {
      if (!block) return;
      const startAt = index * 0.33;

      // Entrata dal basso con dissolvenza
      bioTl.fromTo(block,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.12,
          ease: "power2.out",
          onStart: () => block.classList.add("is-active")
        },
        startAt
      );

      // Permanenza e uscita verso l'alto
      bioTl.to(block,
        {
          opacity: 0,
          y: -40,
          duration: 0.12,
          ease: "power2.in",
          onComplete: () => block.classList.remove("is-active")
        },
        startAt + 0.20
      );
    });

    /* ─── 4. TRANSIZIONE VERSO FOTO_2 E FOTO_3 ─── */
    const layerPhoto2 = document.getElementById("layer-photo-2");
    const layerPhoto3 = document.getElementById("layer-photo-3");

    const transitionTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#photos-transition-section",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      }
    });

    // 1. foto_1 scompare fluidamente
    // 2. foto_2 (panoramica) appare con zoom slow-motion e maschera di ritaglio morbida
    transitionTl.fromTo(layerPhoto2,
      {
        opacity: 0,
        scale: 1.15,
        clipPath: "circle(0% at 50% 50%)",
      },
      {
        opacity: 1,
        scale: 1.0,
        clipPath: "circle(100% at 50% 50%)",
        duration: 0.5,
        ease: "power2.out",
      },
      0
    );

    // 3. foto_2 transiziona morbidamente in foto_3 (volto trasparente)
    transitionTl.fromTo(layerPhoto3,
      {
        opacity: 0,
        scale: 0.92,
        y: 40,
      },
      {
        opacity: 1,
        scale: 1.0,
        y: 0,
        duration: 0.45,
        ease: "power2.inOut",
      },
      0.5
    );

    /* ─── 5. SEQUENZA 2: ZOOM NELL'OCCHIO -> FOTO_4 (NOTTURNO) ─── */
    const eyeSection = document.getElementById("eye-sequence-section");
    const faceImg = document.getElementById("img-face-3");
    const nightReveal = document.getElementById("night-city-reveal");

    if (SEQUENCE_2_FRAMES.length > 0) {
      // Modalità Frame-by-Frame per la sequenza 2 quando popolata dall'utente
      ScrollTrigger.create({
        trigger: eyeSection,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          targetFrameIndex2 = Math.round(self.progress * (SEQUENCE_2_FRAMES.length - 1));
        }
      });

      // Svelamento progressivo di foto_4.png alla fine della sequenza
      gsap.to(nightReveal, {
        opacity: 1,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: eyeSection,
          start: "center center",
          end: "bottom bottom",
          scrub: 1,
        }
      });
    } else {
      // Modalità Ottica Continua (Zoom cinematografico centrato sull'occhio di foto_3)
      // L'occhio in foto_3 si trova esattamente a ~48% orizzontale e ~46% verticale
      const eyeTl = gsap.timeline({
        scrollTrigger: {
          trigger: eyeSection,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        }
      });

      // Zoom drammatico dentro la pupilla di foto_3
      if (faceImg) {
        eyeTl.to(faceImg, {
          transformOrigin: "48% 46%",
          scale: 7.0,
          duration: 0.6,
          ease: "power2.in",
        }, 0);
      }

      // Riemersione e svelamento di foto_4.png (paesaggio notturno)
      eyeTl.fromTo(nightReveal,
        { opacity: 0, scale: 1.15 },
        { opacity: 1, scale: 1.0, duration: 0.5, ease: "power2.out" },
        0.4
      );
    }

    /* ─── 6. CHIUSURA IMMERSIVA: FOTO_5, FOTO_6, FOTO_7 ─── */
    // FOTO_5: Spiaggia (Parallax intensivo + de-blur progressivo che si nitidizza)
    const imgPhoto5 = document.getElementById("img-photo-5");
    if (imgPhoto5) {
      gsap.fromTo(imgPhoto5,
        { filter: "blur(18px)", scale: 1.15, yPercent: 12 },
        {
          filter: "blur(0px)",
          scale: 1.0,
          yPercent: -8,
          ease: "none",
          scrollTrigger: {
            trigger: "#frame-photo-5",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          }
        }
      );
    }

    // FOTO_6: Scogliera (Espansione immersiva a tutto schermo)
    const imgPhoto6 = document.getElementById("img-photo-6");
    if (imgPhoto6) {
      gsap.fromTo(imgPhoto6,
        { scale: 0.92 },
        {
          scale: 1.05,
          ease: "none",
          scrollTrigger: {
            trigger: "#frame-photo-6",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          }
        }
      );
    }

    // FOTO_7: Ragazzo al tramonto (Sfondo trasparente, floating silhouette)
    const imgPhoto7 = document.getElementById("img-photo-7");
    if (imgPhoto7) {
      gsap.fromTo(imgPhoto7,
        { yPercent: 15, opacity: 0.8 },
        {
          yPercent: -10,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "#frame-photo-7",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          }
        }
      );
    }

    // Footer & Instagram Card
    const igCard = document.getElementById("ig-card");
    if (igCard) {
      gsap.fromTo(igCard,
        { y: 30, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: igCard,
            start: "top 85%",
          }
        }
      );
    }

    // Pulsante Torna all'inizio
    const backToTopBtn = document.getElementById("btn-back-to-top");
    if (backToTopBtn) {
      backToTopBtn.addEventListener("click", () => {
        if (lenis) {
          lenis.scrollTo(0, { duration: 1.2 });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     AVVIO COMPLESSIVO ALLA DISPONIBILITÀ DEL DOM
     ═══════════════════════════════════════════════════════════════ */
  function boot() {
    initSmoothScroll();
    startCanvasRenderLoop();
    runPreloader();
    initNarrativeScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
