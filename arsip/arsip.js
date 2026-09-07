/* =========================================================
   JAZMI — ARSIP GLOBAL (C15)
   arsip.js
   Pola nav mobile & reveal-on-scroll disalin PERSIS dari
   produk-global.js (C14), sesuai kontrak 4.2 / 3.3. Menambahkan
   pencarian judul + filter tipe + filter ranah sisi klien
   (tanpa dependency eksternal), khusus kebutuhan Arsip Global
   C15. Kegagalan memuat data tidak boleh merusak bagian statis
   halaman lain.
   ========================================================= */
(function () {
  "use strict";

  const ARSIP_DATA_URL = "data/arsip-demo.json";
  let semuaArsip = [];
  let tipeAktif = "semua";
  let ranahAktif = "semua";
  let kataKunci = "";

  /* ---------------------------------------------------------
     0. UTIL
     --------------------------------------------------------- */

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---------------------------------------------------------
     1. NAVIGASI MOBILE (disalin persis dari produk-global.js C14)
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

    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => tutupMenu());
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") tutupMenu();
    });

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
     2. REVEAL ON SCROLL (disalin persis dari produk-global.js C14)
     --------------------------------------------------------- */

  function initRevealOnScroll() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = document.querySelectorAll(".domain-hero, .section");

    if (prefersReduced || !("IntersectionObserver" in window)) {
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
     3. STATE HELPER (loading/error/empty — pola dari C14)
     --------------------------------------------------------- */

  function showState(id) {
    ["Loading", "Error", "Empty"].forEach((s) => {
      const el = document.getElementById("arsipState" + s);
      if (el) el.hidden = ("State" + s) !== id;
    });
  }

  function sembunyikanSemuaState() {
    ["arsipStateLoading", "arsipStateError", "arsipStateEmpty"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  /* ---------------------------------------------------------
     4. KARTU ARSIP
     --------------------------------------------------------- */

  function buatKartuArsip(item) {
    const card = document.createElement("article");
    card.className = "arsip-card";
    card.innerHTML =
      '<div class="arsip-card-badges">' +
      '<span class="arsip-card-tipe">' + escapeHTML(item.tipeLabel || item.tipe) + "</span>" +
      '<span class="arsip-card-ranah">' + escapeHTML(item.ranahLabel || item.ranah) + "</span>" +
      "</div>" +
      '<h3 class="arsip-card-title">' + escapeHTML(item.judul) + "</h3>" +
      '<p class="arsip-card-desc">' + escapeHTML(item.ringkasan) + "</p>" +
      '<div class="arsip-card-aksi">' +
      '<a class="btn-text" href="' + escapeHTML(item.tautan || "#") + '">' + escapeHTML(item.tautanLabel || "Jelajahi →") + "</a>" +
      "</div>";
    return card;
  }

  /* ---------------------------------------------------------
     5. SARING (pencarian + tipe + ranah, gabungan)
     --------------------------------------------------------- */

  function terapkanSaringan() {
    const grid = document.getElementById("arsipGrid");
    const status = document.getElementById("filterStatus");
    if (!grid) return;

    if (!Array.isArray(semuaArsip) || semuaArsip.length === 0) {
      showState("StateEmpty");
      grid.hidden = true;
      return;
    }

    const kunci = kataKunci.trim().toLowerCase();

    const hasil = semuaArsip.filter((item) => {
      const cocokTipe = tipeAktif === "semua" || item.tipe === tipeAktif;
      const cocokRanah = ranahAktif === "semua" || item.ranah === ranahAktif;
      const cocokKunci = !kunci ||
        (item.judul && item.judul.toLowerCase().indexOf(kunci) !== -1) ||
        (item.ringkasan && item.ringkasan.toLowerCase().indexOf(kunci) !== -1);
      return cocokTipe && cocokRanah && cocokKunci;
    });

    if (status) {
      status.textContent = "Menampilkan " + hasil.length + " dari " + semuaArsip.length + " bahan arsip.";
    }

    grid.innerHTML = "";

    if (hasil.length === 0) {
      showState("StateEmpty");
      grid.hidden = true;
      return;
    }

    hasil.forEach((item) => grid.appendChild(buatKartuArsip(item)));
    grid.hidden = false;
    sembunyikanSemuaState();
  }

  function initFilterTipe() {
    const bar = document.getElementById("tipeFilterBar");
    if (!bar) return;

    bar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        tipeAktif = btn.getAttribute("data-tipe") || "semua";
        bar.querySelectorAll(".filter-btn").forEach((b) => {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        terapkanSaringan();
      });
    });
  }

  function initFilterRanah() {
    const select = document.getElementById("ranahFilter");
    if (!select) return;

    select.addEventListener("change", () => {
      ranahAktif = select.value || "semua";
      terapkanSaringan();
    });
  }

  function initPencarian() {
    const input = document.getElementById("arsipSearch");
    if (!input) return;

    input.addEventListener("input", () => {
      kataKunci = input.value || "";
      terapkanSaringan();
    });
  }

  /* ---------------------------------------------------------
     6. MUAT DATA
     --------------------------------------------------------- */

  function muatArsip() {
    const grid = document.getElementById("arsipGrid");
    if (!grid) return;

    fetch(ARSIP_DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data arsip: " + res.status);
        return res.json();
      })
      .then((data) => {
        semuaArsip = Array.isArray(data && data.arsip) ? data.arsip : [];
        terapkanSaringan();
      })
      .catch(() => {
        showState("StateError");
        grid.hidden = true;
      });
  }

  /* ---------------------------------------------------------
     Jalankan semuanya
     --------------------------------------------------------- */

  function init() {
    initNavigasiMobile();
    initRevealOnScroll();
    initFilterTipe();
    initFilterRanah();
    initPencarian();
    muatArsip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
