/**
 * zoom-parallax.js
 * Dipendenze (CDN, caricate in index.html prima di questo file):
 *   - GSAP 3        https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
 *   - ScrollTrigger https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
 *   - Lenis         https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js
 *
 * Struttura HTML attesa (già presente in index.html):
 *
 *  <section id="zp-section">          ← scroll container (height: 300vh)
 *    <div id="zp-sticky">             ← sticky inner (height:100vh, top:0)
 *      <div id="zp-grid">             ← griglia card
 *        <div class="zp-layer"
 *             data-scale-from="4"
 *             data-scale-to="1">      ← ogni card ha la propria scala iniziale
 *          <div class="zp-card">
 *            <img src="...">
 *          </div>
 *        </div>
 *      </div>
 *      <div id="zp-hero-wrapper">
 *        <div id="zp-hero-card">      ← appare nella seconda metà dello scroll
 *          <img src="...">
 *        </div>
 *      </div>
 *    </div>
 *  </section>
 *
 * L'effetto è identico all'originale Olivier Larose / 21st.dev efferd:
 * le card partono zoomate (scale grande) e zoom-out verso scale(1)
 * mentre lo scroll avanza, con smooth easing tramite Lenis.
 */

(function () {
  "use strict";

  function init() {
    const section  = document.getElementById("zp-section");
    const sticky   = document.getElementById("zp-sticky");
    const layers   = [...document.querySelectorAll(".zp-layer")];
    const heroCard = document.getElementById("zp-hero-card");

    if (!section || !sticky || !layers.length) return;

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

    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      pin: sticky,
      pinSpacing: false,
      scrub: true,
    });

    layers.forEach((layer) => {
      const scaleFrom = parseFloat(layer.dataset.scaleFrom || "3");
      const scaleTo   = parseFloat(layer.dataset.scaleTo || "1");

      gsap.set(layer, { scale: scaleFrom, opacity: 0 });

      gsap.to(layer, {
        scale: scaleTo,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5,
        },
      });
    });

    if (heroCard) {
      gsap.set(heroCard, { scale: 0.5, opacity: 0 });

      gsap.to(heroCard, {
        scale: 1,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "40% top",
          end: "bottom bottom",
          scrub: 1.5,
        },
      });
    }

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
