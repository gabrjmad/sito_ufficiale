/**
 * GABRIELE MADEO — MAIN CONTROLLER & EXPERIENTIAL MOTION ENGINE
 * 
 * Requisiti Prestazionali Tassativi Implementati:
 * 1. Pre-decodifica in RAM via `await img.decode()`
 * 2. Canvas 2D con alpha disattivato (alpha: false, desynchronized: true)
 * 3. Rendering completamente disaccoppiato dallo scroll (RAF loop continuo)
 * 4. Scaling demandato alla GPU via CSS object-fit: cover (nessun calcolo CPU)
 * 5. Scroll smoothing tramite Lenis + ScrollTrigger scrub: 1
 * 6. Puntatore sleek con scia di dissolvenza/aura (senza immagine)
 */

(function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════
     0. PUNTATORE SLEEK CON DISSOLVENZA / AURA CHE SEGUE
     ═══════════════════════════════════════════════════════════════ */
  function initPointer() {
    const dot = document.getElementById("pointer-dot");
    const trail = document.getElementById("pointer-trail");

    if (!dot || !trail) return;
    if (window.matchMedia("(hover: none) or (pointer: coarse)").matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX, dotY = mouseY;
    let trailX = mouseX, trailY = mouseY;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function renderPointer() {
      // Dot reattivo e puntuale
      dotX += (mouseX - dotX) * 0.45;
      dotY += (mouseY - dotY) * 0.45;

      // Trail con inerzia fluida per creare la leggera scia di dissolvenza
      trailX += (mouseX - trailX) * 0.14;
      trailY += (mouseY - trailY) * 0.14;

      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate3d(-50%, -50%, 0)`;
      trail.style.transform = `translate3d(${trailX}px, ${trailY}px, 0) translate3d(-50%, -50%, 0)`;

      requestAnimationFrame(renderPointer);
    }
    requestAnimationFrame(renderPointer);

    // Hover state sugli elementi cliccabili
    document.querySelectorAll("a, button, .touch-interactive, .instagram-master-card").forEach((el) => {
      el.addEventListener("mouseenter", () => document.body.classList.add("pointer-hover"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("pointer-hover"));
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     1. CONFIGURAZIONE FRAME SEQUENZE VIDEO
     ═══════════════════════════════════════════════════════════════ */

  // ═══════════════════════════════════════════════════════════════
  // ARRAY FRAME SEQUENZA 1: IL TUFFO / CADUTA (117 frame reali)
  // Immagine di partenza: compressed_002.webp (ragazzo di schiena sulla gola)
  // ═══════════════════════════════════════════════════════════════
  const SEQUENCE_1_FRAMES = Array.from({ length: 117 }, (_, i) => 
    `img-sequence/compressed_${String(i + 2).padStart(3, '0')}.webp`
  );

  // ═══════════════════════════════════════════════════════════════
  // ARRAY FRAME SEQUENZA 2: ZOOM NELL'OCCHIO -> FOTO 4
  // Inserisci qui l'array con i percorsi dei frame quando pronti:
  // Esempio:
  // const SEQUENCE_2_FRAMES = [
  //   'eye-sequence/frame_001.webp',
  //   'eye-sequence/frame_002.webp',
  //   ...
  // ];
  // ═══════════════════════════════════════════════════════════════
  const SEQUENCE_2_FRAMES = [
    // [INSERISCI QUI I PERCORSI DEI FRAME DELLA SECONDA SEQUENZA]
  ];

  /* ═══════════════════════════════════════════════════════════════
     2. INIZIALIZZAZIONE SMOOTH SCROLL (LENIS)
     ═══════════════════════════════════════════════════════════════ */
  let lenis = null;
  const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 768;

  function initSmoothScroll() {
    if (typeof Lenis === "undefined") return;

    lenis = new Lenis({
      duration: isTouchDevice() ? 0.8 : 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false, // Risposta 1:1 nativa al tocco su smartphone
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
     3. GESTIONE CANVAS & PRE-DECODIFICA IN RAM VIA img.decode()
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
   * REQUISITO 1: Pre-decodifica singola immagine in RAM via await img.decode()
   */
  async function decodeImageToRAM(url, priority = "auto") {
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = priority;
    img.src = url;

    try {
      await img.decode();
      return img;
    } catch (err) {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve(img);
        } else {
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
        }
      });
    }
  }

  /**
   * REQUISITO 3: Disaccoppiamento dello scroll dal disegno.
   * Il rendering avviene solo dentro requestAnimationFrame e unicamente se l'indice è mutato.
   */
  function startCanvasRenderLoop() {
    function loop() {
      // Sequenza 1: Il Tuffo / Caduta
      if (ctx1 && targetFrameIndex1 !== currentFrameIndex1 && loadedFrames1[targetFrameIndex1]) {
        currentFrameIndex1 = targetFrameIndex1;
        // REQUISITO 4: Disegno 0,0 senza calcoli complessi (GPU fa lo scaling tramite object-fit: cover)
        ctx1.drawImage(loadedFrames1[currentFrameIndex1], 0, 0);
      }

      // Sequenza 2: Zoom nell'Occhio
      if (ctx2 && SEQUENCE_2_FRAMES.length > 0 && targetFrameIndex2 !== currentFrameIndex2 && loadedFrames2[targetFrameIndex2]) {
        currentFrameIndex2 = targetFrameIndex2;
        ctx2.drawImage(loadedFrames2[currentFrameIndex2], 0, 0);
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ═══════════════════════════════════════════════════════════════
     4. LOADER & PRECARICAMENTO ASSET INIZIALI
     ═══════════════════════════════════════════════════════════════ */
  async function runPreloader() {
    const loaderBar = document.getElementById("loader-bar");
    const loaderPct = document.getElementById("loader-pct");
    const preloader = document.getElementById("preloader");
    const curtainTop = document.querySelector(".curtain-top");
    const curtainBottom = document.querySelector(".curtain-bottom");

    // Precarica i primi 15 frame prioritari in RAM con decode()
    const PRIORITY_FRAMES = Math.min(15, SEQUENCE_1_FRAMES.length);
    let loadedCount = 0;

    for (let i = 0; i < PRIORITY_FRAMES; i++) {
      const img = await decodeImageToRAM(SEQUENCE_1_FRAMES[i], "high");
      if (img) {
        loadedFrames1[i] = img;
        if (i === 0 && ctx1) {
          setupCanvasNativeDimensions(canvas1, img.naturalWidth || 2400, img.naturalHeight || 1350);
          ctx1.drawImage(img, 0, 0);
          currentFrameIndex1 = 0;
        }
      }
      loadedCount++;
      const progress = Math.round((loadedCount / PRIORITY_FRAMES) * 100);
      if (loaderBar) loaderBar.style.width = progress + "%";
      if (loaderPct) loaderPct.textContent = progress + "%";
    }

    // A completamento del caricamento iniziale: divisione dello schermo in due
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (preloader) {
      preloader.classList.add("is-opened");
    }

    if (curtainTop && curtainBottom) {
      gsap.to(curtainTop, {
        yPercent: -100,
        duration: 0.9,
        ease: "power3.inOut"
      });
      gsap.to(curtainBottom, {
        yPercent: 100,
        duration: 0.9,
        ease: "power3.inOut",
        onComplete: () => {
          if (preloader) {
            preloader.style.display = "none";
          }
        }
      });
    }

    // Caricamento progressivo dei frame rimanenti della sequenza 1
    let nextIndex = PRIORITY_FRAMES;
    function pumpFrames() {
      let batch = 0;
      while (nextIndex < SEQUENCE_1_FRAMES.length && batch < 6) {
        const idx = nextIndex;
        decodeImageToRAM(SEQUENCE_1_FRAMES[idx], "low").then((img) => {
          if (img) loadedFrames1[idx] = img;
        });
        nextIndex++;
        batch++;
      }
      if (nextIndex < SEQUENCE_1_FRAMES.length) {
        if ("requestIdleCallback" in window) {
          requestIdleCallback(pumpFrames, { timeout: 100 });
        } else {
          setTimeout(pumpFrames, 35);
        }
      }
    }
    setTimeout(pumpFrames, 100);

    // Se sono definiti i frame della Sequenza 2, precaricali in background
    if (SEQUENCE_2_FRAMES.length > 0) {
      SEQUENCE_2_FRAMES.forEach((url, i) => {
        decodeImageToRAM(url, "low").then((img) => {
          if (img) {
            loadedFrames2[i] = img;
            if (i === 0 && canvas2) {
              setupCanvasNativeDimensions(canvas2, img.naturalWidth || 2400, img.naturalHeight || 1350);
            }
          }
        });
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     5. FLUSSO NARRATIVO A SCORRIMENTO CONTINUO (GSAP SCROLLTRIGGER)
     ═══════════════════════════════════════════════════════════════ */
  function initNarrativeScroll() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    /* ─── 1. CIELO -> TRANSIZIONE VERSO PRIMO FRAME SEQUENZA 1 ─── */
    const skyIntro = document.getElementById("sky-intro");
    const skyContent = document.getElementById("sky-content");
    const skyBg = document.getElementById("sky-bg");

    gsap.timeline({
      scrollTrigger: {
        trigger: skyIntro,
        start: "top top",
        end: "bottom top",
        scrub: 1, // REQUISITO 5: Scroll smoothing scrub: 1
      }
    })
    .to(skyContent, { yPercent: -40, opacity: 0, ease: "power1.out" }, 0)
    .to(skyBg, { yPercent: 20, scale: 1.25, ease: "none" }, 0);

    /* ─── 2. SEQUENZA 1 (IL TUFFO / CADUTA) & DISSOLVENZA NEL NERO ─── */
    const seq1Container = document.getElementById("seq-1-container");
    const seq1Fade = document.getElementById("seq-1-fade");

    ScrollTrigger.create({
      trigger: seq1Container,
      start: "top top",
      end: "bottom bottom",
      scrub: 1, // REQUISITO 5: Inerzia fluida
      onUpdate: (self) => {
        // Disaccoppiamento: aggiornamento del solo indice target
        targetFrameIndex1 = Math.round(self.progress * (SEQUENCE_1_FRAMES.length - 1));
      }
    });

    // Dissolvenza nel nero totale al termine della sequenza
    gsap.to(seq1Fade, {
      opacity: 1,
      ease: "power2.in",
      scrollTrigger: {
        trigger: seq1Container,
        start: "80% top",
        end: "bottom bottom",
        scrub: 1,
      }
    });

    /* ─── 3. SEZIONE BIO CON FOTO_1 PINNATA A DESTRA E TESTI A SINISTRA ─── */
    const bioSection = document.getElementById("bio-section");
    const bioFigure = document.getElementById("bio-photo-1");
    const block1 = document.getElementById("bio-text-1");
    const block2 = document.getElementById("bio-text-2");
    const block3 = document.getElementById("bio-text-3");

    // Parallasse morbido sulla foto destra
    if (bioFigure) {
      gsap.to(bioFigure, {
        yPercent: -15,
        ease: "none",
        scrollTrigger: {
          trigger: bioSection,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        }
      });
    }

    // Timeline sequenziale per i blocchi di testo a sinistra
    const bioTl = gsap.timeline({
      scrollTrigger: {
        trigger: bioSection,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      }
    });

    bioTl
      // Blocco 1
      .fromTo(block1, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: "power2.out" })
      .to(block1, { opacity: 0, y: -45, duration: 0.8, ease: "power2.in" }, "+=0.6")
      // Blocco 2
      .fromTo(block2, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: "power2.out" })
      .to(block2, { opacity: 0, y: -45, duration: 0.8, ease: "power2.in" }, "+=0.6")
      // Blocco 3 (rimane leggibile)
      .fromTo(block3, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: "power2.out" });

    /* ─── 4. TRANSIZIONE VERSO FOTO_2 (PANORAMICA) E FOTO_3 (VOLTO) ─── */
    const transSection = document.getElementById("trans-2-3-section");
    const panePhoto2 = document.getElementById("pane-photo-2");
    const paneFace3 = document.getElementById("pane-face-3");

    const transTl = gsap.timeline({
      scrollTrigger: {
        trigger: transSection,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      }
    });

    transTl
      // Foto 2 (panoramica): zoom slow-motion immersivo
      .fromTo(panePhoto2,
        { opacity: 0, scale: 1.25 },
        { opacity: 1, scale: 1.0, duration: 1.2, ease: "power2.out" }
      )
      // Foto 2 sfuma e Foto 3 (volto, sfondo trasparente) emerge morbidamente
      .to(panePhoto2, { opacity: 0.15, scale: 0.95, duration: 1.0, ease: "power1.in" })
      .fromTo(paneFace3,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1.0, duration: 1.2, ease: "power2.out" },
        "-=0.7"
      );

    /* ─── 5. SEQUENZA 2: ZOOM NELL'OCCHIO -> FOTO_4 (NOTTURNO) ─── */
    const eyeSection = document.getElementById("eye-sequence-section");
    const faceImg = document.getElementById("img-face-3");
    const nightReveal = document.getElementById("night-city-reveal");

    if (SEQUENCE_2_FRAMES.length > 0) {
      // Modalità Canvas Frame-by-Frame quando popolata
      ScrollTrigger.create({
        trigger: eyeSection,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          targetFrameIndex2 = Math.round(self.progress * (SEQUENCE_2_FRAMES.length - 1));
        }
      });

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
      // Modalità Ottica Continua (Zoom cinematografico centrato sulla pupilla di foto_3)
      // Punto focale occhio in foto_3: ~55% orizzontale e ~38% verticale
      const eyeTl = gsap.timeline({
        scrollTrigger: {
          trigger: eyeSection,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        }
      });

      if (faceImg) {
        eyeTl.to(faceImg, {
          transformOrigin: "55% 38%",
          scale: 7.5,
          opacity: 0,
          duration: 1.2,
          ease: "power2.in",
        }, 0);
      }

      // Riemersione e svelamento progressivo di foto_4.png (paesaggio notturno)
      eyeTl.fromTo(nightReveal,
        { opacity: 0, scale: 1.15 },
        { opacity: 1, scale: 1.0, duration: 1.2, ease: "power2.out" },
        0.5
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
          yPercent: -12,
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

    // FOTO_6: Scogliera (Espansione a tutto schermo)
    const imgPhoto6 = document.getElementById("img-photo-6");
    if (imgPhoto6) {
      gsap.fromTo(imgPhoto6,
        { scale: 0.92, yPercent: 8 },
        {
          scale: 1.06,
          yPercent: -8,
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

    // FOTO_7: Ragazzo al tramonto (Sfondo trasparente, silhouette dorata con 3D parallax)
    const imgPhoto7 = document.getElementById("img-photo-7");
    if (imgPhoto7) {
      gsap.fromTo(imgPhoto7,
        { yPercent: 20, scale: 0.95 },
        {
          yPercent: -12,
          scale: 1.05,
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

    // Footer & Instagram Master Card
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
    initPointer();
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
