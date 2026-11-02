/**
 * zoom-parallax.js — Motore Spaziale Zero-Lag (120 FPS)
 *
 * Ottimizzato per fluidità assoluta:
 * - Esclusivo uso di trasformazioni GPU (translate3d, scale, opacity)
 * - Nessun filtro blur durante lo scrub (elimina il frame-lag)
 * - Sincronizzazione perfetta tra Lenis e GSAP ScrollTrigger
 * - Espansione cinematografica dell'Hero Card a pieno schermo
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

    // Lenis configurato per risposta istantanea senza attrito
    let lenis = null;
    if (typeof Lenis !== "undefined") {
      lenis = new Lenis({
        duration:        1.0,
        easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth:          true,
        smoothTouch:     false,
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
          radius: 14
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
        x:            0,
        y:            0,
        scale:        1,
        force3D:      true
      });
    }
    setHeroInitial();

    // Selettori card per dispersione fluida
    const card4 = document.querySelector(".zp-card--4");
    const card1 = document.querySelector(".zp-card--1");
    const card2 = document.querySelector(".zp-card--2");
    const card5 = document.querySelector(".zp-card--5");
    const card6 = document.querySelector(".zp-card--6");
    const card7 = document.querySelector(".zp-card--7");
    const heroBadge = heroCard.querySelector(".hero-expand-badge");

    // Master Timeline GSAP con ScrollTrigger leggero e scattante
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger:       section,
        start:         "top top",
        end:           "bottom bottom",
        pin:           sticky,
        pinSpacing:    false,
        scrub:         0.5, // Molto più reattivo ed esente da lag
        anticipatePin: 1,
        fastScrollEnd: true,
      }
    });

    /* FASE 1 (0.00 – 0.18): Breve sospensione per apprezzare la composizione */
    tl.to({}, { duration: 0.18 });

    /* FASE 2 (0.18 – 0.65): Zoom fluido ed elegante senza filtri pesanti */
    // Zoom leggero della camera
    tl.to(grid, {
      scale:    2.8,
      ease:     "power1.inOut",
      duration: 0.45,
      force3D:  true,
    }, "zoomMotion");

    // Dispersione delle card circostanti tramite sole coordinate GPU (x, y, opacity)
    if (card4) {
      tl.to(card4, {
        x:        -vw() * 0.38,
        y:        -vh() * 0.15,
        opacity:  0.02,
        scale:    1.2,
        ease:     "power1.inOut",
        duration: 0.45,
        force3D:  true,
      }, "zoomMotion");
    }

    if (card1) {
      tl.to(card1, {
        y:        -vh() * 0.42,
        opacity:  0.02,
        scale:    1.15,
        ease:     "power1.inOut",
        duration: 0.45,
        force3D:  true,
      }, "zoomMotion");
    }

    if (card2) {
      tl.to(card2, {
        x:        -vw() * 0.38,
        y:        vh() * 0.25,
        opacity:  0.02,
        scale:    1.15,
        ease:     "power1.inOut",
        duration: 0.45,
        force3D:  true,
      }, "zoomMotion");
    }

    if (card5) {
      tl.to(card5, {
        x:        vw() * 0.38,
        y:        -vh() * 0.12,
        opacity:  0.02,
        scale:    1.2,
        ease:     "power1.inOut",
        duration: 0.45,
        force3D:  true,
      }, "zoomMotion");
    }

    if (card6) {
      tl.to(card6, {
        x:        -vw() * 0.25,
        y:        vh() * 0.42,
        opacity:  0.02,
        scale:    1.15,
        ease:     "power1.inOut",
        duration: 0.45,
        force3D:  true,
      }, "zoomMotion");
    }

    if (card7) {
      tl.to(card7, {
        x:        vw() * 0.38,
        y:        vh() * 0.35,
        opacity:  0.02,
        scale:    1.15,
        ease:     "power1.inOut",
        duration: 0.45,
        force3D:  true,
      }, "zoomMotion");
    }

    // Hero Card si espande verso tutto lo schermo (100vw x 100vh) in modo ultra-fluido
    tl.to(heroCard, {
      left:         0,
      top:          0,
      width:        () => vw(),
      height:       () => vh(),
      borderRadius: 0,
      ease:         "power1.inOut",
      duration:     0.45,
      force3D:      true,
    }, "zoomMotion");

    if (heroBadge) {
      tl.to(heroBadge, {
        opacity:  0,
        duration: 0.18,
      }, "zoomMotion");
    }

    /* FASE 3 (0.65 – 0.88): Posa a schermo intero dell'opera */
    tl.to({}, { duration: 0.24 });

    /* FASE 4 (0.88 – 1.00): Transizione graduale alla sezione successiva */
    tl.to({}, { duration: 0.13 });

    // Refresh layout su resize
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
