/* =========================================================
   JAZMI — Halaman Artikel Index
   artikel.js
   Vanilla JavaScript, mengikuti konvensi js/main.js.
   Berdiri sendiri (tidak memuat main.js) karena halaman ini
   tidak memiliki elemen Bait/Visual/Bahan/Khutbah/Kajian/dll.
   ========================================================= */

(function () {
  "use strict";

  const PAGE_SIZE = 6;
  const KATEGORI_URUTAN = ["Semua", "Agama", "Kesehatan", "Sains", "Astronomi", "Pendidikan"];

  let semuaArtikel = [];
  let kategoriAktif = "Semua";
  let jumlahTampil = PAGE_SIZE;

  /* ---------------------------------------------------------
     util kecil (sama seperti main.js)
     --------------------------------------------------------- */

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatTanggalIndonesia(isoDate) {
    try {
      const bulan = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
      ];
      const d = new Date(isoDate + "T00:00:00");
      if (isNaN(d.getTime())) return isoDate;
      return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return isoDate;
    }
  }

  async function ambilData(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Gagal memuat ${path} (status ${res.status})`);
    }
    return res.json();
  }

  function tampilkanPesanKosong(container, pesan) {
    if (!container) return;
    container.innerHTML = `<p class="data-empty-note">${escapeHTML(pesan)}</p>`;
  }

  /* ---------------------------------------------------------
     filter kategori
     --------------------------------------------------------- */

  function kategoriTersedia() {
    const set = new Set(semuaArtikel.map((a) => a.kategori).filter(Boolean));
    return KATEGORI_URUTAN.filter((k) => k === "Semua" || set.has(k));
  }

  function renderFilterBar() {
    const bar = document.getElementById("filterBar");
    if (!bar) return;

    bar.innerHTML = kategoriTersedia().map((k) => `
      <button type="button" class="filter-chip${k === kategoriAktif ? " is-active" : ""}" data-kategori="${escapeHTML(k)}">
        ${escapeHTML(k)}
      </button>
    `).join("");

    bar.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        kategoriAktif = btn.dataset.kategori;
        jumlahTampil = PAGE_SIZE;
        renderFilterBar();
        renderDaftarArtikel();
      });
    });
  }

  function artikelTersaring() {
    const diurutkan = semuaArtikel.slice()
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    if (kategoriAktif === "Semua") return diurutkan;
    return diurutkan.filter((a) => a.kategori === kategoriAktif);
  }

  /* ---------------------------------------------------------
     render daftar + status + load more
     --------------------------------------------------------- */

  function renderStatus(totalTersaring, ditampilkan) {
    const status = document.getElementById("filterStatus");
    if (!status) return;
    if (!totalTersaring) {
      status.textContent = "";
      return;
    }
    status.textContent = `Menampilkan ${ditampilkan} dari ${totalTersaring} artikel`
      + (kategoriAktif !== "Semua" ? ` — kategori ${kategoriAktif}` : "");
  }

  function renderDaftarArtikel() {
    const list = document.getElementById("articleIndexList");
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (!list) return;

    const tersaring = artikelTersaring();

    if (!tersaring.length) {
      tampilkanPesanKosong(list, "Belum ada artikel pada kategori ini.");
      renderStatus(0, 0);
      if (loadMoreBtn) loadMoreBtn.hidden = true;
      return;
    }

    const ditampilkan = tersaring.slice(0, jumlahTampil);

    list.innerHTML = ditampilkan.map((a) => `
      <li class="article-item">
        <span class="article-date">${escapeHTML(formatTanggalIndonesia(a.tanggal))}</span>
        <div class="article-body">
          <a class="article-title" href="${escapeHTML(a.tautan || "#")}">${escapeHTML(a.judul)}</a>
          ${a.kategori ? `<span class="article-category">${escapeHTML(a.kategori)}</span>` : ""}
        </div>
      </li>
    `).join("");

    renderStatus(tersaring.length, ditampilkan.length);

    if (loadMoreBtn) {
      loadMoreBtn.hidden = ditampilkan.length >= tersaring.length;
    }
  }

  /* ---------------------------------------------------------
     muat data
     --------------------------------------------------------- */

  async function muatArtikelIndex() {
    const list = document.getElementById("articleIndexList");

    try {
      const data = await ambilData("../data/articles.json");
      semuaArtikel = data.artikel || [];

      if (!semuaArtikel.length) {
        tampilkanPesanKosong(list, "Belum ada artikel untuk ditampilkan.");
        return;
      }

      renderFilterBar();
      renderDaftarArtikel();
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Artikel Index:", err);
      tampilkanPesanKosong(list, "Daftar artikel belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     navigasi mobile (disalin dari main.js — halaman ini berdiri
     sendiri dan tidak memuat main.js)
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
      if (lebarSekarang >= 860 && lebarSebelumnya < 860) tutupMenu();
      lebarSebelumnya = lebarSekarang;
    });
  }

  /* ---------------------------------------------------------
     init
     --------------------------------------------------------- */

  function init() {
    initNavigasiMobile();

    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        jumlahTampil += PAGE_SIZE;
        renderDaftarArtikel();
      });
    }

    muatArtikelIndex();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
