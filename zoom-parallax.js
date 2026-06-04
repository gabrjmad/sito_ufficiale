/**
 * zoom-parallax.js
 * Dipendenze CDN (in index.html con defer):
 *   - GSAP 3.12.5       cdnjs.cloudflare.com
 *   - ScrollTrigger     cdnjs.cloudflare.com
 *   - Lenis 1.0.42      cdn.jsdelivr.net
 *
 * LAYOUT "INCASTRO" — ispirato all'immagine di riferimento:
 *
 *  ┌─────────────┬───────────────────────────────┐
 *  │             │        photo-1 wide            │ 40vh
 *  │  photo-4    ├───────────────┬───────────────┤
 *  │   tall      │  [HERO ph.3] │    photo-5    │ 28vh
 *  ├─────────────┴───────────────┼───────────────┤
 *  │       photo-6 wide          │    photo-7    │ 24vh
 *  └─────────────────────────────┴───────────────┘
 *
 * Gap uniforme 2vw/vh — altezza totale esatta 100vh.
 *
 * FASI TIMELINE:
 *  1 (0–30%) : layout fermo
 *  2 (30–65%): zoom camera (#zp-grid 3.5×) + hero espande → 100vw×100vh
 *  STOP (65–85%): hero a tutto schermo, pausa
 *  3 (85–100%): rilascio pin
 *
 * ANTI-SGRANATURA: hero fuori da #zp-grid, animata con
 * width/height reali (non transform:scale).
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

    /*
     * Posizione iniziale hero = cella col1-row1 del layout incastro:
     * L=34.67%  T=44%  W=30.67%  H=28%
     */
    const HERO_L = 0.3467;
    const HERO_T = 0.4400;
    const HERO_W = 0.3067;
    const HERO_H = 0.2800;

    function setHeroInitial() {
      gsap.set(heroCard, {
        left:     vw() * HERO_L,
        top:      vh() * HERO_T,
        width:    vw() * HERO_W,
        height:   vh() * HERO_H,
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

    /* FASE 1 */
    tl.to({}, { duration: 0.3 });

    /* FASE 2: zoom camera + espansione hero */
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

    /* STOP: hero a tutto schermo, zoom fermo */
    tl.to({}, { duration: 0.2 });

    /* FASE 3: stabilizzazione */
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
