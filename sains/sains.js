/* =========================================================
   JAZMI — SAINS (C11)
   sains.js
   Pola nav mobile & reveal-on-scroll disalin PERSIS dari
   js/main.js (fungsi initNavigasiMobile, initRevealOnScroll)
   sesuai kontrak 4.2 / 3.3, diaudit dari C08/kesehatan.js.
   Halaman C11 statis — tidak ada fetch() data karena "Konten
   Pilihan" memakai data demo statis di HTML (lihat mandat:
   jangan buat relasi/data fiktif, dan halaman boleh sederhana
   tanpa JS bila memungkinkan — bagian 10 instruksi C11).
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. NAVIGASI MOBILE
     --------------------------------------------------------- */

  function initNavigasiMobile() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    if (!toggle || !nav) return;

    function bukaMenu() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    }
    function tutupMenu() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    function toggleMenu() {
      const sedangTerbuka = toggle.getAttribute("aria-expanded") === "true";
      if (sedangTerbuka) tutupMenu(); else bukaMenu();
    }

    toggle.addEventListener("click", toggleMenu);

    // Tutup menu setelah salah satu tautan dipilih (mobile).
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => tutupMenu());
    });

    // Tutup dengan tombol Escape.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") tutupMenu();
    });

    // Jika layar diperbesar melewati breakpoint desktop, pastikan
    // status menu mobile direset agar tidak tersangkut kondisi terbuka.
    let lebarSebelumnya = window.innerWidth;
    window.addEventListener("resize", () => {
      const lebarSekarang = window.innerWidth;
      if (lebarSekarang >= 860 && lebarSebelumnya < 860) {
        tutupMenu();
      }
      lebarSebelumnya = lebarSekarang;
    });
  }

  /* ---------------------------------------------------------
     2. REVEAL ON SCROLL (halus, menghormati prefers-reduced-motion)
     --------------------------------------------------------- */

  function initRevealOnScroll() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const target = document.querySelectorAll(".domain-hero, .section");

    if (prefersReduced || !("IntersectionObserver" in window)) {
      // Tidak perlu animasi — biarkan tampil apa adanya.
      return;
    }

    target.forEach((el) => el.classList.add("reveal"));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    target.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     Jalankan semuanya
     --------------------------------------------------------- */

  function init() {
    initNavigasiMobile();
    initRevealOnScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
