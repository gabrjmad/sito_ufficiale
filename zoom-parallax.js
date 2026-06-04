/**
 * zoom-parallax.js
 * Dipendenze CDN (in index.html con defer):
 *   - GSAP 3.12.5       cdnjs.cloudflare.com
 *   - ScrollTrigger     cdnjs.cloudflare.com
 *   - Lenis 1.0.42      cdn.jsdelivr.net
 *
 * LAYOUT: griglia 3×3, cella centrale riservata alla hero.
 * 7 card equidistanti senza sovrapposizioni.
 *
 * FASI TIMELINE:
 *  1 (0–30%) : tutto fermo, layout visibile
 *  2 (30–65%): zoom camera (#zp-grid scala 3.5×)
 *              + hero card espande width/height → 100vw × 100vh
 *  P (65–85%): STOP — hero a tutto schermo, pausa intenzionale
 *  3 (85–100%): rilascio pin → foto scorre nel flusso normale
 *
 * ANTI-SGRANATURA: hero fuori da #zp-grid, animata con
 * width/height reali invece di transform:scale → nessun
 * upscaling GPU su foto 4284×5712.
 */

(function () {
  "use strict";

  function init() {
    const section  = document.getElementById("zp-section");
    const sticky   = document.getElementById("zp-sticky");
    const grid     = document.getElementById("zp-grid");
    const heroCard = document.getElementById("zp-hero-card");

    if (!section || !sticky || !grid || !heroCard) return;

    gsap.registerPlugin(ScrollTrigger);

    /* ── Lenis ── */
    const lenis = new Lenis({
      duration:    1.2,
      easing:      (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth:      true,
      smoothTouch: false,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;

    /* Dimensioni iniziali hero (cella centrale della griglia 3×3) */
    const GAP   = 0.02;
    const CELL  = (1 - GAP * 4) / 3;

    const heroInitW = () => vw() * CELL;
    const heroInitH = () => vh() * CELL;
    const heroInitL = () => vw() * (GAP + CELL + GAP);
    const heroInitT = () => vh() * (GAP + CELL + GAP);

    function setHeroInitial() {
      gsap.set(heroCard, {
        width:    heroInitW(),
        height:   heroInitH(),
        left:     heroInitL(),
        top:      heroInitT(),
        xPercent: 0,
        yPercent: 0,
      });
    }
    setHeroInitial();

    /* ── TIMELINE ── */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger:       section,
        start:         "top top",
        end:           "bottom bottom",
        pin:           sticky,
        pinSpacing:    false,
        scrub:         1.2,
        anticipatePin: 1,
      }
    });

    /* FASE 1: layout fermo (0% → 30%) */
    tl.to({}, { duration: 0.3 });

    /* FASE 2: zoom camera + espansione hero (30% → 65%) */
    tl
      .to(grid, {
        scale:    3.5,
        duration: 0.35,
        ease:     "none",
      }, "<")
      .to(heroCard, {
        width:    () => vw(),
        height:   () => vh(),
        left:     0,
        top:      0,
        duration: 0.35,
        ease:     "none",
      }, "<");

    /* STOP (65% → 85%): hero a tutto schermo, zoom fermo */
    tl.to({}, { duration: 0.2 });

    /* FASE 3: stabilizzazione finale (85% → 100%) */
    tl.to({}, { duration: 0.15 });

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
