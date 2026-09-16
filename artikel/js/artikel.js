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
  // "Astronomi" sengaja dihapus dari daftar filter (bukan kategori
  // resmi — kesalahan lama pada data demo, lihat data/articles.json;
  // artikel dengan kategori itu tetap tampil di bawah "Semua",
  // hanya tombol filternya yang tidak dimunculkan).
  // "Syair" ditambahkan di akhir — sumbernya BUKAN data/articles.json,
  // melainkan digabung saat memuat dari dien/data/penjelasan-syair.json
  // (lihat muatArsipSyair()), karena Artikel Syair adalah model
  // tersendiri yang tidak pernah masuk /dien/artikel/.
  const KATEGORI_URUTAN = ["Semua", "Agama", "Kesehatan", "Sains", "Pendidikan", "Syair"];

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

  // Kunci pengurutan artikel: utamakan tanggal asli bila ada (makin baru
  // makin besar). Kalau artikel belum diberi tanggal publikasi resmi
  // (field "tanggal" kosong/null), pakai field "urutan" (angka manual,
  // makin besar = makin baru) sebagai cadangan, ditambah offset jauh ke
  // depan supaya konten yang memang belum bertanggal tetap tampil sebagai
  // yang terbaru dibanding data demo/placeholder lama. Dipakai di semua
  // halaman yang mengurutkan artikel — lihat catatan skema di
  // data/articles.json._catatan.
  const URUTAN_OFFSET = new Date("2099-01-01T00:00:00").getTime();
  function kunciUrutanArtikel(a) {
    if (a && a.tanggal) {
      const t = new Date(a.tanggal + "T00:00:00").getTime();
      if (!isNaN(t)) return t;
    }
    if (a && typeof a.urutan === "number") return URUTAN_OFFSET + a.urutan;
    return 0;
  }

  // Label waktu/rubrik yang ditampilkan di kartu artikel: tanggal asli bila
  // ada, kalau tidak pakai nama seri sebagai gantinya (bukan tanggal palsu).
  function labelWaktuArtikel(a) {
    if (a && a.tanggal) return formatTanggalIndonesia(a.tanggal);
    if (a && a.seri) return a.seri;
    return "";
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
      .sort((a, b) => kunciUrutanArtikel(b) - kunciUrutanArtikel(a));
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
        <span class="article-date">${escapeHTML(labelWaktuArtikel(a))}</span>
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
     arsip Syair — digabung dari dien/data/penjelasan-syair.json,
     BUKAN dari data/articles.json. Hanya entri bertanggal SUDAH
     BERLALU (bukan hari ini) yang dianggap artikel terbit; lihat
     aturan yang sama di dien/syair.js (renderArtikelSyair) dan
     dien/syair-artikel.js. Kegagalan memuat file ini dianggap
     wajar ("belum ada Syair") — tidak boleh menggagalkan seluruh
     halaman Artikel.
     --------------------------------------------------------- */

  function tanggalHariIniISO() {
    const s = new Date();
    const bulan = String(s.getMonth() + 1).padStart(2, "0");
    const tgl = String(s.getDate()).padStart(2, "0");
    return `${s.getFullYear()}-${bulan}-${tgl}`;
  }

  async function muatArsipSyair() {
    try {
      const res = await fetch("../dien/data/penjelasan-syair.json", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      const daftar = Array.isArray(data.penjelasan) ? data.penjelasan : [];
      const hariIni = tanggalHariIniISO();

      return daftar
        .filter((p) => p && typeof p.tanggal === "string" && p.tanggal < hariIni)
        .map((p) => ({
          id: `syair-${p.tanggal}`,
          judul: p.judul || "Penjelasan Bait",
          tanggal: p.tanggal,
          kategori: "Syair",
          ringkasan: p.ringkasan || (Array.isArray(p.isi) ? p.isi[0] : "") || "",
          tautan: `../dien/syair-artikel.html?tanggal=${encodeURIComponent(p.tanggal)}`
        }));
    } catch (e) {
      console.error("[JAZMI] Gagal memuat arsip Syair:", e);
      return [];
    }
  }

  /* ---------------------------------------------------------
     muat data
     --------------------------------------------------------- */

  async function muatArtikelIndex() {
    const list = document.getElementById("articleIndexList");

    try {
      const data = await ambilData("../data/articles.json");
      const arsipSyair = await muatArsipSyair();
      semuaArtikel = (data.artikel || []).concat(arsipSyair);

      if (!semuaArtikel.length) {
        tampilkanPesanKosong(list, "Belum ada artikel untuk ditampilkan.");
        return;
      }

      // Deep-link kategori dari halaman ranah (mis. /artikel/?kategori=Kesehatan)
      const paramKategori = new URLSearchParams(window.location.search).get("kategori");
      if (paramKategori && semuaArtikel.some((a) => a.kategori === paramKategori)) {
        kategoriAktif = paramKategori;
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
