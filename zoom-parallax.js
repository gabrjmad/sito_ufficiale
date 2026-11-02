/**
 * zoom-parallax.js — Edizione Spaziale 2026
 *
 * Movimento cinematografico a 3 dimensioni con GSAP ScrollTrigger & Lenis Smooth Scroll.
 * - Zoom telecamera tridimensionale con profondità di campo (DoF blur e dispersione 3D)
 * - Incastro Bento perfezionato con angoli smussati e riflessi
 * - Parallasse dinamico al movimento del mouse
 * - Espansione fluida a tutto schermo (100vw x 100vh) senza sgranatura
 */

(function () {
  "use strict";

  function init() {
    const section  = document.getElementById("zp-section");
    const sticky   = document.getElementById("zp-sticky");
    const grid     = document.getElementById("zp-grid");
    const heroCard = document.getElementById("zp-hero-card");

    if (!section || !sticky || !grid || !heroCard) return;

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      setTimeout(init, 50);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Configurazione Lenis Smooth Scroll
    let lenis = null;
    if (typeof Lenis !== "undefined") {
      lenis = new Lenis({
        duration:    1.25,
        easing:      (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth:      true,
        smoothTouch: false,
        wheelMultiplier: 1.0,
      });

      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    const isMobile = () => window.innerWidth <= 768;

    /*
     * Coordinate proporzionali iniziali per la tessera centrale (Hero):
     * Desktop:
     *   Left: 34.67vw | Top: 44.0vh | Width: 30.67vw | Height: 28.0vh
     * Mobile:
     *   Left: 4.0vw   | Top: 34.0vh | Width: 92.0vw  | Height: 24.0vh
     */
    function getHeroDimensions() {
      if (isMobile()) {
        return {
          left:   vw() * 0.04,
          top:    vh() * 0.34,
          width:  vw() * 0.92,
          height: vh() * 0.24,
          radius: 16
        };
      }
      return {
        left:   vw() * 0.3467,
        top:    vh() * 0.4400,
        width:  vw() * 0.3067,
        height: vh() * 0.2800,
        radius: 18
      };
    }

    function setHeroInitial() {
      const dim = getHeroDimensions();
      gsap.set(heroCard, {
        left:         dim.left,
        top:          dim.top,
        width:        dim.width,
        height:       dim.height,
        borderRadius: dim.radius + "px",
        xPercent:     0,
        yPercent:     0,
        clearProps:   "transform"
      });
    }
    setHeroInitial();

    // Selettori card per dispersione tridimensionale
    const card4 = document.querySelector(".zp-card--4");
    const card1 = document.querySelector(".zp-card--1");
    const card2 = document.querySelector(".zp-card--2");
    const card5 = document.querySelector(".zp-card--5");
    const card6 = document.querySelector(".zp-card--6");
    const card7 = document.querySelector(".zp-card--7");
    const heroBadge = heroCard.querySelector(".hero-expand-badge");

    // Master Timeline GSAP con ScrollTrigger
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger:       section,
        start:         "top top",
        end:           "bottom bottom",
        pin:           sticky,
        pinSpacing:    false,
        scrub:         1.1,
        anticipatePin: 1,
      }
    });

    /* FASE 1 (0.00 – 0.25): Breve sospensione per ammirare il mosaico */
    tl.to({}, { duration: 0.22 });

    /* FASE 2 (0.25 – 0.65): Zoom della camera 3D ed espansione dell'Hero Card */
    // La griglia scala e le schede circostanti si disperdono nello spazio 3D con sfocatura
    tl.to(grid, {
      scale: 3.4,
      ease:  "power1.inOut",
      duration: 0.42,
    }, "zoomStart");

    if (card4) {
      tl.to(card4, {
        x: -vw() * 0.35,
        y: -vh() * 0.15,
        rotateY: -18,
        filter: "blur(10px)",
        opacity: 0.1,
        ease: "power1.inOut",
        duration: 0.42,
      }, "zoomStart");
    }

    if (card1) {
      tl.to(card1, {
        y: -vh() * 0.45,
        rotateX: 18,
        filter: "blur(10px)",
        opacity: 0.1,
        ease: "power1.inOut",
        duration: 0.42,
      }, "zoomStart");
    }

    if (card2) {
      tl.to(card2, {
        x: -vw() * 0.35,
        y: vh() * 0.25,
        filter: "blur(8px)",
        opacity: 0.1,
        ease: "power1.inOut",
        duration: 0.42,
      }, "zoomStart");
    }

    if (card5) {
      tl.to(card5, {
        x: vw() * 0.35,
        y: -vh() * 0.10,
        rotateY: 18,
        filter: "blur(8px)",
        opacity: 0.1,
        ease: "power1.inOut",
        duration: 0.42,
      }, "zoomStart");
    }

    if (card6) {
      tl.to(card6, {
        y: vh() * 0.45,
        rotateX: -18,
        filter: "blur(10px)",
        opacity: 0.1,
        ease: "power1.inOut",
        duration: 0.42,
      }, "zoomStart");
    }

    if (card7) {
      tl.to(card7, {
        x: vw() * 0.35,
        y: vh() * 0.35,
        filter: "blur(10px)",
        opacity: 0.1,
        ease: "power1.inOut",
        duration: 0.42,
      }, "zoomStart");
    }

    // Hero Card si espande verso 100vw x 100vh a schermo intero
    tl.to(heroCard, {
      left:         0,
      top:          0,
      width:        () => vw(),
      height:       () => vh(),
      borderRadius: 0,
      ease:         "power1.inOut",
      duration:     0.42,
    }, "zoomStart");

    if (heroBadge) {
      tl.to(heroBadge, {
        opacity:  0,
        duration: 0.2,
      }, "zoomStart");
    }

    /* FASE 3 (0.65 – 0.88): Posa a schermo intero dell'immagine principale */
    tl.to({}, { duration: 0.23 });

    /* FASE 4 (0.88 – 1.00): Stabilizzazione e transizione dolce alla sezione successiva */
    tl.to({}, { duration: 0.13 });

    /* ═══════════════════════════════════════════════════════
       INTERACTIVE 3D MOUSE TILT PARALLAX (DESKTOP)
       ═══════════════════════════════════════════════════════ */
    if (window.matchMedia("(min-width: 900px)").matches) {
      let mouseX = 0, mouseY = 0;
      let targetTiltX = 0, targetTiltY = 0;
      let currentTiltX = 0, currentTiltY = 0;

      sticky.addEventListener("mousemove", (e) => {
        // Solo quando lo zoom non è completato al massimo
        const rect = sticky.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        targetTiltX = ny * -7; // Rotazione asse X (gradi)
        targetTiltY = nx * 9;  // Rotazione asse Y (gradi)
      }, { passive: true });

      sticky.addEventListener("mouseleave", () => {
        targetTiltX = 0;
        targetTiltY = 0;
      });

      function renderTilt() {
        currentTiltX += (targetTiltX - currentTiltX) * 0.08;
        currentTiltY += (targetTiltY - currentTiltY) * 0.08;

        if (grid && !tl.isActive()) {
          gsap.set(grid, {
            rotationX: currentTiltX,
            rotationY: currentTiltY,
            transformPerspective: 1200,
          });
        }
        requestAnimationFrame(renderTilt);
      }
      renderTilt();
    }

    // Refresh layout su resize della finestra
    window.addEventListener("resize", () => {
      setHeroInitial();
      ScrollTrigger.refresh();
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
