/**
 * zoom-parallax.js — Cinematic 3D Engine & Sequence Controller
 * Gabriele Madeo — Visual Space
 *
 * Implements:
 * 1. Minimal neutral Hero: only "GABRIELE MADEO"
 * 2. Clevir.li style 3D volumetric cloud dive & perspective shift using uploaded clouds panorama
 * 3. 117-frame landscape sequence scrub (compressed_002.webp to 118)
 * 4. Spatial 3D transition stages before each author photo (Tunnel, Unfolding Box, Vortex, Prism)
 * 5. Pure author photography with zero text overlays on the images
 * 6. Responsive mobile-first performance (60/120fps hardware accelerated)
 * 7. Desktop dynamic photo cursor & high-res lightbox
 */

(function () {
  "use strict";

  if (window.__MADEO_ENGINE_INIT__) return;
  window.__MADEO_ENGINE_INIT__ = true;

  const isTouch = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 768;
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══════════════════════════════════════════════════════
     1. LENIS SMOOTH SCROLL (CALIBRATO ZERO-LAG)
     ═══════════════════════════════════════════════════════ */
  let lenis = null;
  function initLenis() {
    if (typeof Lenis === "undefined" || prefersReducedMotion()) return;

    lenis = new Lenis({
      duration: isTouch() ? 0.75 : 0.95,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false, // Maintain native instantaneous touch response
      touchMultiplier: 1.15,
      wheelMultiplier: 1.0,
    });

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ═══════════════════════════════════════════════════════
     2. 117-FRAME LANDSCAPE SEQUENCE ENGINE
     ═══════════════════════════════════════════════════════ */
  const FRAME_COUNT = 117;
  const frameSrc = (idx) => `img-sequence/compressed_${String(idx + 2).padStart(3, '0')}.webp`;

  const canvas = document.getElementById("sequence-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const frameCache = new Array(FRAME_COUNT);
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }
  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  function drawCover(img) {
    if (!ctx || !img || !img.width) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const imgRatio = img.width / img.height;
    const canRatio = cw / ch;
    let rw, rh, ox, oy;

    if (canRatio > imgRatio) {
      rw = cw;
      rh = cw / imgRatio;
      ox = 0;
      oy = (ch - rh) / 2;
    } else {
      rw = ch * imgRatio;
      rh = ch;
      ox = (cw - rw) / 2;
      oy = 0;
    }
    ctx.drawImage(img, ox, oy, rw, rh);
  }

  function loadFrame(index, priority = "auto") {
    if (index < 0 || index >= FRAME_COUNT) return Promise.resolve(null);
    if (frameCache[index]) return Promise.resolve(frameCache[index]);

    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.fetchPriority = priority;
      img.src = frameSrc(index);

      img.onload = async () => {
        try {
          if (window.createImageBitmap) {
            const bmp = await createImageBitmap(img);
            frameCache[index] = bmp;
            resolve(bmp);
            return;
          }
        } catch (e) {}
        frameCache[index] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
    });
  }

  let lastDrawnFrame = -1;
  function renderSequenceFrame(progress) {
    const frameIndex = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(progress * (FRAME_COUNT - 1))));
    if (frameCache[frameIndex]) {
      drawCover(frameCache[frameIndex]);
      lastDrawnFrame = frameIndex;
    } else if (lastDrawnFrame === -1) {
      for (let i = 0; i < FRAME_COUNT; i++) {
        if (frameCache[i]) {
          drawCover(frameCache[i]);
          lastDrawnFrame = i;
          break;
        }
      }
    }
  }

  async function preloadSequence() {
    // Load first 15 frames immediately with high priority
    for (let i = 0; i < Math.min(15, FRAME_COUNT); i++) {
      await loadFrame(i, "high");
    }
    renderSequenceFrame(0);

    // Pump remaining frames in idle time
    let cur = 15;
    function pump() {
      let batch = 0;
      while (cur < FRAME_COUNT && batch < 8) {
        loadFrame(cur, "low");
        cur++;
        batch++;
      }
      if (cur < FRAME_COUNT) {
        if ("requestIdleCallback" in window) {
          requestIdleCallback(pump, { timeout: 120 });
        } else {
          setTimeout(pump, 40);
        }
      }
    }
    setTimeout(pump, 60);
  }

  /* ═══════════════════════════════════════════════════════
     3. GSAP SCROLL MASTER TIMELINES
     ═══════════════════════════════════════════════════════ */
  function initScrollExperience() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" || prefersReducedMotion()) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const scrubRate = isTouch() ? 0.35 : 0.5;

    /* ─── PHASE 1: HERO EXIT & CLEVIR.LI CLOUD DIVE ─── */
    const heroIntro = document.getElementById("hero-intro");
    const heroHint = document.getElementById("hero-hint");
    const cloudsStage = document.getElementById("clouds-dive-stage");
    const cloudsBackdrop = document.getElementById("clouds-backdrop");
    const cloudL1 = document.getElementById("cloud-l1");
    const cloudR1 = document.getElementById("cloud-r1");
    const cloudL2 = document.getElementById("cloud-l2");
    const cloudR2 = document.getElementById("cloud-r2");
    const cloudC = document.getElementById("cloud-c");
    const seqStage = document.getElementById("sequence-fixed-stage");

    // Master Timeline for Hero -> Clouds -> First Frame of Sequence
    const introTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#intro-track",
        start: "top top",
        endTrigger: "#clouds-track",
        end: "bottom top",
        scrub: scrubRate,
      }
    });

    // 1. Hero Text expands and dissolves
    introTl.to(heroHint, { opacity: 0, duration: 0.2 }, 0);
    introTl.to(heroIntro, {
      opacity: 0,
      scale: 1.15,
      y: -30,
      duration: 0.6,
      ease: "power2.inOut",
      onComplete: () => { heroIntro.style.visibility = "hidden"; },
      onReverseComplete: () => { heroIntro.style.visibility = "visible"; }
    }, 0.1);

    // 2. Clouds 3D Stage fades in and camera flies through
    introTl.to(cloudsStage, { opacity: 1, duration: 0.3 }, 0.2);
    introTl.fromTo(cloudsBackdrop,
      { scale: 1.3, z: -300 },
      { scale: 2.2, z: 200, ease: "none", duration: 1.4 },
      0.2
    );

    // Volumetric cloud masses split apart and fly past camera
    introTl.to(cloudL1, { xPercent: -120, yPercent: -40, scale: 1.8, opacity: 0, duration: 1.2, ease: "power1.in" }, 0.3);
    introTl.to(cloudR1, { xPercent: 120, yPercent: -40, scale: 1.8, opacity: 0, duration: 1.2, ease: "power1.in" }, 0.3);
    introTl.to(cloudL2, { xPercent: -100, yPercent: 40, scale: 2.0, opacity: 0, duration: 1.2, ease: "power1.in" }, 0.4);
    introTl.to(cloudR2, { xPercent: 100, yPercent: 40, scale: 2.0, opacity: 0, duration: 1.2, ease: "power1.in" }, 0.4);
    introTl.to(cloudC, { scale: 3.5, opacity: 0, duration: 1.0, ease: "power2.in" }, 0.3);

    // 3. Clouds dissolve into the sequence stage
    introTl.to(cloudsStage, { opacity: 0, duration: 0.4 }, 1.2);
    introTl.to(seqStage, { opacity: 1, duration: 0.4 }, 1.1);

    /* ─── PHASE 2: 117-FRAME LANDSCAPE SEQUENCE SCRUB ─── */
    ScrollTrigger.create({
      trigger: "#sequence-track",
      start: "top top",
      end: "bottom bottom",
      scrub: scrubRate,
      onUpdate: (self) => {
        renderSequenceFrame(self.progress);
      }
    });

    // Sequence Stage Exit into Station 1
    gsap.to(seqStage, {
      opacity: 0,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: "#sequence-track",
        start: "bottom 90%",
        end: "bottom top",
        scrub: scrubRate,
      }
    });

    /* ─── PHASE 3: SPATIAL 3D EFFECTS BEFORE EACH PHOTO ─── */

    // 1. TUNNEL 3D EFFECT (Before Station 2)
    const tunnelViewport = document.getElementById("tunnel-viewport-2");
    if (tunnelViewport) {
      gsap.fromTo(tunnelViewport,
        { z: -800, rotateZ: 0 },
        {
          z: 1100,
          rotateZ: 45,
          ease: "none",
          scrollTrigger: {
            trigger: "#tunnel-stage-2",
            start: "top top",
            end: "bottom bottom",
            scrub: scrubRate,
          }
        }
      );
    }

    // 2. 3D UNFOLDING BOX EFFECT (Before Station 3)
    const box3d = document.getElementById("box-3d");
    const boxFront = document.getElementById("box-f-front");
    const boxTop = document.getElementById("box-f-top");
    const boxBottom = document.getElementById("box-f-bottom");
    const boxLeft = document.getElementById("box-f-left");
    const boxRight = document.getElementById("box-f-right");
    const boxInner = document.getElementById("box-inner-img");

    if (box3d) {
      const boxTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#box-unfold-stage-3",
          start: "top top",
          end: "bottom bottom",
          scrub: scrubRate,
        }
      });

      // Box rotates into position
      boxTl.fromTo(box3d, 
        { rotateX: 20, rotateY: -35, scale: 0.8 },
        { rotateX: 0, rotateY: 0, scale: 1.05, duration: 0.5, ease: "power1.out" },
        0
      );

      // Faces unfold outward
      boxTl.to(boxFront, { opacity: 0, scale: 1.3, duration: 0.3 }, 0.2);
      boxTl.to(boxTop, { rotateX: 110, opacity: 0.2, duration: 0.6, ease: "power2.inOut" }, 0.3);
      boxTl.to(boxBottom, { rotateX: -110, opacity: 0.2, duration: 0.6, ease: "power2.inOut" }, 0.3);
      boxTl.to(boxLeft, { rotateY: -110, opacity: 0.2, duration: 0.6, ease: "power2.inOut" }, 0.3);
      boxTl.to(boxRight, { rotateY: 110, opacity: 0.2, duration: 0.6, ease: "power2.inOut" }, 0.3);

      // Inside image zooms forward to full screen
      boxTl.fromTo(boxInner,
        { scale: 0.6, opacity: 0.7 },
        { scale: 2.2, opacity: 1, duration: 0.7, ease: "power2.inOut" },
        0.4
      );
    }

    // 3. 3D VORTEX PORTAL EFFECT (Before Station 4)
    const vDiscs = [
      document.getElementById("v-disc-1"),
      document.getElementById("v-disc-2"),
      document.getElementById("v-disc-3"),
      document.getElementById("v-disc-4"),
    ];
    if (vDiscs[0]) {
      vDiscs.forEach((disc, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.fromTo(disc,
          { scale: 0.4 + i * 0.2, rotate: 0, opacity: 0.2 },
          {
            scale: 1.8 + i * 0.4,
            rotate: 180 * dir,
            opacity: 0.9,
            ease: "none",
            scrollTrigger: {
              trigger: "#vortex-stage-4",
              start: "top top",
              end: "bottom bottom",
              scrub: scrubRate,
            }
          }
        );
      });
    }

    // 4. 3D PRISMATIC PANELS (Before Station 5)
    const prismTl = document.getElementById("prism-tl");
    const prismTr = document.getElementById("prism-tr");
    const prismBl = document.getElementById("prism-bl");
    const prismBr = document.getElementById("prism-br");

    if (prismTl) {
      const pTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#prism-stage-5",
          start: "top top",
          end: "bottom bottom",
          scrub: scrubRate,
        }
      });
      pTl.to(prismTl, { xPercent: -100, yPercent: -100, rotateZ: -30, opacity: 0, duration: 1 }, 0);
      pTl.to(prismTr, { xPercent: 100, yPercent: -100, rotateZ: 30, opacity: 0, duration: 1 }, 0);
      pTl.to(prismBl, { xPercent: -100, yPercent: 100, rotateZ: 30, opacity: 0, duration: 1 }, 0);
      pTl.to(prismBr, { xPercent: 100, yPercent: 100, rotateZ: -30, opacity: 0, duration: 1 }, 0);
    }

    // 5. STATIONS SUBTLE DEPTH PARALLAX
    const stations = gsap.utils.toArray(".gallery-station");
    stations.forEach((st) => {
      const img = st.querySelector(".photo-clean-img");
      if (img) {
        gsap.fromTo(img,
          { scale: 1.08 },
          {
            scale: 1.0,
            ease: "none",
            scrollTrigger: {
              trigger: st,
              start: "top bottom",
              end: "bottom top",
              scrub: scrubRate,
            }
          }
        );
      }
    });

    // 6. EPILOGUE ENTRANCE
    const igCard = document.getElementById("instagram-card");
    if (igCard) {
      gsap.fromTo(igCard,
        { y: 35, opacity: 0, scale: 0.96 },
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
  }

  /* ═══════════════════════════════════════════════════════
     4. CUSTOM DESKTOP PHOTO CURSOR
     ═══════════════════════════════════════════════════════ */
  function initCustomCursor() {
    const cursor = document.getElementById("custom-cursor");
    const ring = document.getElementById("cursor-ring");
    const cursorThumb = document.getElementById("cursor-thumb");

    if (!cursor || !ring || window.matchMedia("(hover: none) or (pointer: coarse)").matches) {
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function renderCursor() {
      curX += (mouseX - curX) * 0.22;
      curY += (mouseY - curY) * 0.22;
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate3d(-50%, -50%, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate3d(-50%, -50%, 0)`;

      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Hover expanders
    document.querySelectorAll(".touch-target, a, button, .inspect-trigger").forEach((el) => {
      el.addEventListener("mouseenter", () => document.body.classList.add("cursor-active"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-active"));
    });

    // Update cursor image based on visible station
    const stations = document.querySelectorAll(".gallery-station");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && cursorThumb) {
          const nextSrc = en.dataset.cursor;
          if (nextSrc && cursorThumb.src !== nextSrc) {
            cursorThumb.src = nextSrc;
          }
        }
      });
    }, { threshold: 0.35 });
    stations.forEach((s) => obs.observe(s));
  }

  /* ═══════════════════════════════════════════════════════
     5. LIGHTBOX MODAL INSPECTOR
     ═══════════════════════════════════════════════════════ */
  function initLightbox() {
    const modal = document.getElementById("lightbox");
    const targetImg = document.getElementById("lightbox-img");
    const closeBtn = document.getElementById("lightbox-close");

    if (!modal || !targetImg || !closeBtn) return;

    function open(src) {
      targetImg.src = src;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
    }

    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      targetImg.src = "";
      document.body.style.overflow = "";
      if (lenis) lenis.start();
    }

    document.querySelectorAll(".inspect-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const full = btn.dataset.full;
        if (full) open(full);
      });
    });

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        close();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     6. BACK TO TOP
     ═══════════════════════════════════════════════════════ */
  function initBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     BOOTSTRAP
     ═══════════════════════════════════════════════════════ */
  function start() {
    initLenis();
    preloadSequence();
    initScrollExperience();
    initCustomCursor();
    initLightbox();
    initBackToTop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();
