/* =========================================================
   JAZMI — Halaman Artikel Detail
   detail.js
   Vanilla JavaScript, mengikuti konvensi js/main.js dan
   artikel/js/artikel.js. Berdiri sendiri (tidak memuat
   main.js atau artikel.js).

   Identitas URL artikel: query string ?slug=... pada
   /artikel/detail.html — lihat catatan "KEPUTUSAN URL" di
   laporan akhir C03 untuk alasan pemilihan pola ini.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     util kecil (disalin dari main.js / artikel.js agar halaman
     ini tetap berdiri sendiri)
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
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
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

  /* ---------------------------------------------------------
     identitas artikel dari URL
     --------------------------------------------------------- */

  function ambilSlugDariURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug") || "";
  }

  // Kompatibilitas: cocokkan berdasarkan slug bila ada,
  // fallback ke id kalau data lama belum memiliki slug.
  function cariArtikel(daftarArtikel, pengenal) {
    if (!pengenal) return null;
    return (
      daftarArtikel.find((a) => a.slug === pengenal) ||
      daftarArtikel.find((a) => a.id === pengenal) ||
      null
    );
  }

  /* ---------------------------------------------------------
     tampilkan salah satu keadaan (loading/not-found/error/artikel)
     --------------------------------------------------------- */

  function tampilkanKeadaan(nama) {
    const semua = {
      loading: document.getElementById("stateLoading"),
      notFound: document.getElementById("stateNotFound"),
      error: document.getElementById("stateError"),
      artikel: document.getElementById("stateArticle"),
    };
    Object.keys(semua).forEach((key) => {
      const el = semua[key];
      if (!el) return;
      el.hidden = key !== nama;
    });
  }

  /* ---------------------------------------------------------
     render artikel
     --------------------------------------------------------- */

  function renderArtikel(artikel) {
    document.title = `${artikel.judul} — Artikel JAZMI`;
    const metaDesc = document.getElementById("pageDescription");
    if (metaDesc && artikel.ringkasan) {
      metaDesc.setAttribute("content", artikel.ringkasan);
    }

    const kategoriEl = document.getElementById("articleCategory");
    if (kategoriEl) {
      kategoriEl.textContent = artikel.kategori || "Artikel";
    }

    const judulEl = document.getElementById("articleTitle");
    if (judulEl) judulEl.textContent = artikel.judul;

    const tanggalEl = document.getElementById("articleDate");
    if (tanggalEl) {
      tanggalEl.textContent = artikel.tanggal
        ? formatTanggalIndonesia(artikel.tanggal)
        : "";
    }

    const bodyEl = document.getElementById("articleBody");
    if (bodyEl) {
      const paragraf = Array.isArray(artikel.isi) && artikel.isi.length
        ? artikel.isi
        : (artikel.ringkasan ? [artikel.ringkasan] : []);

      if (paragraf.length) {
        bodyEl.innerHTML = paragraf
          .map((p) => `<p>${escapeHTML(p)}</p>`)
          .join("");
      } else {
        bodyEl.innerHTML = `<p class="data-empty-note">Isi artikel belum tersedia.</p>`;
      }
    }
  }

  function renderArtikelTerkait(artikelSaatIni, semuaArtikel) {
    const section = document.getElementById("relatedSection");
    const list = document.getElementById("relatedList");
    if (!section || !list) return;

    const terkait = semuaArtikel
      .filter((a) => a.id !== artikelSaatIni.id && a.kategori === artikelSaatIni.kategori)
      .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
      .slice(0, 3);

    if (!terkait.length) {
      section.hidden = true;
      return;
    }

    list.innerHTML = terkait.map((a) => `
      <li class="article-item">
        <span class="article-date">${escapeHTML(formatTanggalIndonesia(a.tanggal))}</span>
        <div class="article-body">
          <a class="article-title" href="${escapeHTML(a.tautan || ("detail.html?slug=" + encodeURIComponent(a.slug || a.id)))}">${escapeHTML(a.judul)}</a>
          ${a.kategori ? `<span class="article-category">${escapeHTML(a.kategori)}</span>` : ""}
        </div>
      </li>
    `).join("");

    section.hidden = false;
  }

  /* ---------------------------------------------------------
     navigasi mobile (disalin dari main.js / artikel.js)
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

  async function muatArtikelDetail() {
    tampilkanKeadaan("loading");

    let data;
    try {
      data = await ambilData("../data/articles.json");
    } catch (err) {
      console.error("[JAZMI] Gagal memuat data Artikel Detail:", err);
      tampilkanKeadaan("error");
      return;
    }

    const semuaArtikel = data.artikel || [];
    const pengenal = ambilSlugDariURL();
    const artikel = cariArtikel(semuaArtikel, pengenal);

    if (!artikel) {
      tampilkanKeadaan("notFound");
      return;
    }

    renderArtikel(artikel);
    renderArtikelTerkait(artikel, semuaArtikel);
    tampilkanKeadaan("artikel");
  }

  function init() {
    initNavigasiMobile();
    muatArtikelDetail();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
