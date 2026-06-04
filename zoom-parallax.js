/**
 * zoom-parallax.js
 * Dipendenze CDN (già in index.html con defer):
 *   - GSAP 3.12.5       cdnjs.cloudflare.com
 *   - ScrollTrigger     cdnjs.cloudflare.com
 *   - Lenis 1.0.42      cdn.jsdelivr.net
 *
 * TECNICA ANTI-SGRANATURA per immagini ad alta risoluzione:
 *
 * Il problema di scale() su CSS transform è che il browser
 * renderizza il layer alla sua dimensione originale e poi fa
 * upscaling GPU → pixelatura visibile su foto 4K+.
 *
 * Soluzione: la hero card (#zp-hero-card) NON è dentro #zp-grid,
 * quindi NON scala con la griglia. Ha le sue dimensioni reali
 * (larghezza/altezza in px) animate da GSAP verso 100vw × 100vh.
 * Così il browser ricampiona sempre dall'originale → nitidezza massima.
 *
 * FASI:
 * 1 (0–30%)  : layout fermo, tutte le card visibili
 * 2 (30–85%) : #zp-grid scala 4.5× (effetto camera)
 *              contemporaneamente #zp-hero-card espande
 *              le sue dimensioni reali verso 100vw × 100vh
 * 3 (85–100%): hero a tutto schermo, stabilizzazione
 *              poi il pin si libera e la foto scorre nel flusso
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

    const heroInitW = () => Math.min(vw() * 0.38, 520);
    const heroInitH = () => Math.min(vh() * 0.52, 540);
    const heroInitL = () => (vw() - heroInitW()) / 2;
    const heroInitT = () => (vh() - heroInitH()) / 2;

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

    tl.to({}, { duration: 0.3 });

    tl
      .to(grid, {
        scale:    4.5,
        duration: 0.55,
        ease:     "none",
      }, "<")
      .to(heroCard, {
        width:    () => vw(),
        height:   () => vh(),
        left:     0,
        top:      0,
        duration: 0.55,
        ease:     "none",
      }, "<");

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
