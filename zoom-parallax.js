/**
 * zoom-parallax.js
 * Dipendenze CDN (già in index.html con defer):
 *   - GSAP 3.12.5
 *   - ScrollTrigger
 *   - Lenis 1.0.42
 *
 * Effetto:
 * - Fase 1: tutte le card visibili e ferme
 * - Fase 2: zoom "camera" sull'intera griglia
 * - Fase 3: rilascio del pin, la foto scorre verso l'alto nel flusso normale
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

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        pin: sticky,
        pinSpacing: false,
        scrub: 1.2,
        anticipatePin: 1,
      }
    });

    tl.to({}, { duration: 0.3 });

    tl.to(grid, {
      scale: 4.5,
      duration: 0.55,
      ease: "none",
    });

    tl.to({}, { duration: 0.15 });

    window.addEventListener("resize", () => {
      ScrollTrigger.refresh();
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
