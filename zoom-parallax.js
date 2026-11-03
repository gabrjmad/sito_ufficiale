/**
 * zoom-parallax.js — Cinematic Scroll & Interaction Engine
 * Gabriele Madeo — Visual Archive
 * 
 * Features:
 * - Ultra-responsive touch scrolling (zero rubber-band lag)
 * - Hardware-accelerated GPU transforms only (translate3d, scale, opacity)
 * - One-photo-at-a-time progressive vertical storytelling
 * - Preserved focal points (volti e composizione protetti)
 * - Desktop dynamic photo cursor with live chapter switching
 * - High-res Lightbox modal inspection
 * - Accessible with prefers-reduced-motion fallback
 */

(function () {
  "use strict";

  // Prevent multiple executions
  if (window.__MADE_VISUAL_INIT__) return;
  window.__MADE_VISUAL_INIT__ = true;

  const isTouch = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 768;
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══════════════════════════════════════════════════════
     1. LENIS SMOOTH SCROLL (CALIBRATO PER ZERO LATENZA)
     ═══════════════════════════════════════════════════════ */
  let lenis = null;

  function initLenis() {
    if (typeof Lenis === "undefined" || prefersReducedMotion()) return;

    lenis = new Lenis({
      duration: isTouch() ? 0.8 : 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false, // Critical: preserve 1:1 native touch responsiveness on mobile
      touchMultiplier: 1.2,
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

  /* ═══════════════════════════════════════════════════════
     2. GSAP SCROLL STORYTELLING
     ═══════════════════════════════════════════════════════ */
  function initMotionStory() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" || prefersReducedMotion()) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Hero Header & Statement Exit
    const heroContent = document.querySelector(".hero-content");
    const heroAmbient = document.querySelector(".hero-ambient-bg");
    if (heroContent) {
      gsap.to(heroContent, {
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.4,
        },
        y: -50,
        opacity: 0,
        ease: "power1.out"
      });
    }

    // Chapters Configuration
    const chapters = gsap.utils.toArray(".photo-chapter");

    chapters.forEach((chapter, index) => {
      const img = chapter.querySelector(".photo-stage-img");
      const meta = chapter.querySelector(".photo-meta-container");
      const panels = chapter.querySelectorAll(".dual-panel");

      // Tight scrub (0.4s) avoids floating lag and ensures instant responsiveness
      const scrubSpeed = isTouch() ? 0.3 : 0.45;

      if (panels.length > 1) {
        // Dual frame chapter (Chapter 5)
        gsap.fromTo(panels[0], 
          { yPercent: 12, scale: 0.96 },
          {
            yPercent: -6,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: chapter,
              start: "top bottom",
              end: "bottom top",
              scrub: scrubSpeed,
            }
          }
        );
        gsap.fromTo(panels[1], 
          { yPercent: 20, scale: 0.94 },
          {
            yPercent: -10,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: chapter,
              start: "top bottom",
              end: "bottom top",
              scrub: scrubSpeed,
            }
          }
        );
      } else if (img) {
        // Individual protagonist photo transitions based on composition
        if (index === 0) {
          // Chapter 1: Emerges from dark void into prominence
          gsap.fromTo(img, 
            { scale: 1.12, opacity: 0.8 },
            {
              scale: 1.0,
              opacity: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: chapter,
                start: "top center",
                end: "center center",
                scrub: scrubSpeed,
              }
            }
          );
        } else if (index === 2) {
          // Chapter 3 (Masterpiece): Pinned breathing perspective
          ScrollTrigger.create({
            trigger: chapter,
            start: "top top",
            end: "+=60%",
            pin: true,
            pinSpacing: true,
            scrub: scrubSpeed,
            onUpdate: (self) => {
              const p = self.progress;
              // Subtle scale breathe: 0.96 -> 1.04
              gsap.set(img, { scale: 0.96 + p * 0.08, force3D: true });
            }
          });
        } else {
          // Subtle vertical parallax on other protagonist images
          gsap.fromTo(img,
            { yPercent: -8, scale: 1.06 },
            {
              yPercent: 8,
              scale: 1.0,
              ease: "none",
              scrollTrigger: {
                trigger: chapter,
                start: "top bottom",
                end: "bottom top",
                scrub: scrubSpeed,
              }
            }
          );
        }
      }

      // Meta & Caption Reveal Animation
      if (meta) {
        gsap.fromTo(meta,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: chapter,
              start: "top 70%",
              end: "top 25%",
              scrub: scrubSpeed,
            }
          }
        );
      }
    });

    // Epilogue entrance
    const epilogueCard = document.querySelector(".instagram-card");
    if (epilogueCard) {
      gsap.fromTo(epilogueCard,
        { y: 30, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: epilogueCard,
            start: "top 85%",
          }
        }
      );
    }
  }

  /* ═══════════════════════════════════════════════════════
     3. CUSTOM DESKTOP PHOTO CURSOR
     ═══════════════════════════════════════════════════════ */
  function initCustomCursor() {
    const cursor = document.getElementById("custom-cursor");
    const ring = document.getElementById("cursor-ring");
    const cursorThumb = document.getElementById("cursor-thumb");

    if (!cursor || !ring || window.matchMedia('(hover: none) or (pointer: coarse)').matches) {
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
      // Lerp for fluid organic cursor movement
      curX += (mouseX - curX) * 0.22;
      curY += (mouseY - curY) * 0.22;
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate3d(-50%, -50%, 0)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate3d(-50%, -50%, 0)`;

      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Dynamic hover reactions
    const interactiveTargets = document.querySelectorAll(".touch-target, a, button");
    interactiveTargets.forEach((el) => {
      el.addEventListener("mouseenter", () => document.body.classList.add("cursor-active"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-active"));
    });

    // Update cursor image as user navigates through chapters
    const chapters = document.querySelectorAll(".photo-chapter");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const newImg = entry.dataset.cursor;
          if (newImg && cursorThumb && cursorThumb.src !== newImg) {
            cursorThumb.src = newImg;
          }
        }
      });
    }, { threshold: 0.4 });

    chapters.forEach((ch) => observer.observe(ch));
  }

  /* ═══════════════════════════════════════════════════════
     4. LIGHTBOX / INSPECTOR MODAL
     ═══════════════════════════════════════════════════════ */
  function initLightbox() {
    const modal = document.getElementById("lightbox");
    const targetImg = document.getElementById("lightbox-target-img");
    const caption = document.getElementById("lightbox-caption");
    const closeBtn = document.getElementById("lightbox-close");

    if (!modal || !targetImg || !closeBtn) return;

    function openModal(src, title) {
      targetImg.src = src;
      if (caption) caption.textContent = title || "";
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      targetImg.src = "";
      document.body.style.overflow = "";
      if (lenis) lenis.start();
    }

    document.querySelectorAll(".inspect-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fullSrc = btn.dataset.full;
        const title = btn.dataset.title;
        if (fullSrc) openModal(fullSrc, title);
      });
    });

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     5. BACK TO TOP CONTROLLER
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
     BOOTSTRAP ON DOM READY
     ═══════════════════════════════════════════════════════ */
  function bootstrap() {
    initLenis();
    initMotionStory();
    initCustomCursor();
    initLightbox();
    initBackToTop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

})();
