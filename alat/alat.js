/* =========================================================
   JAZMI — ALAT (menu baru)
   alat.js
   Pola nav mobile & reveal-on-scroll disalin PERSIS dari
   produk-global.js (kontrak 4.2 / 3.3). Pola fetch data +
   state loading/error/empty disalin dari pola yang sama
   (showState) yang dipakai produk-global.js.

   MODEL DATA (sesuai permintaan user — fleksibilitas tinggi):
   Seluruh isi & komposisi kategori Alat dibaca dari SATU file
   data/alat-manifest.json saat halaman dimuat. Memindahkan
   sebuah alat ke kategori lain, menambah, atau menghapus alat
   TIDAK memerlukan membangun ulang HTML apa pun -- cukup ubah
   entri di alat-manifest.json (dan pindahkan/tambah/hapus file
   HTML alatnya) langsung di repository (mis. GitHub). Jumlah
   total & jumlah per kategori dihitung ulang otomatis dari isi
   manifest setiap kali halaman dibuka, bukan angka yang
   ditulis tetap di HTML.

   Halaman kategori (/alat/<slug>/index.html) tidak perlu tahu
   namanya sendiri lewat teks yang ditulis manual -- slug-nya
   dideteksi otomatis dari URL, sehingga file index.html di
   SETIAP folder kategori bisa identik (template yang sama).
   ========================================================= */
(function () {
  "use strict";

  const MANIFEST_URL_DARI_ROOT_ALAT = "data/alat-manifest.json";

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

  function titleCaseDariSlug(slug) {
    return slug
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Mendeteksi slug kategori dari path URL, mis:
  // /alat/fisika/  atau /alat/fisika/index.html -> "fisika"
  // Mengembalikan null jika berada persis di /alat/ (halaman utama).
  function deteksiSlugKategoriDariPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("alat");
    if (i === -1) return null;
    const sisanya = parts.slice(i + 1).filter((p) => p !== "index.html");
    if (sisanya.length === 0) return null;
    return sisanya[0];
  }

  function showState(prefix, id) {
    ["Loading", "Error", "Empty"].forEach((s) => {
      const el = document.getElementById(prefix + "State" + s);
      if (el) el.hidden = "State" + s !== id;
    });
  }

  /* ---------------------------------------------------------
     1. NAVIGASI MOBILE (disalin persis dari produk-global.js)
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
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => tutupMenu()));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") tutupMenu(); });

    let lebarSebelumnya = window.innerWidth;
    window.addEventListener("resize", () => {
      const lebarSekarang = window.innerWidth;
      if (lebarSekarang >= 860 && lebarSebelumnya < 860) tutupMenu();
      lebarSebelumnya = lebarSekarang;
    });
  }

  /* ---------------------------------------------------------
     2. REVEAL ON SCROLL (disalin persis dari produk-global.js)
     --------------------------------------------------------- */

  function initRevealOnScroll() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = document.querySelectorAll(".domain-hero, .section");
    if (prefersReduced || !("IntersectionObserver" in window)) return;

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
     3. AMBIL MANIFEST (satu kali, dipakai kedua jenis halaman)
     --------------------------------------------------------- */

  function ambilManifest() {
    const slug = deteksiSlugKategoriDariPath();
    const url = slug ? "../" + MANIFEST_URL_DARI_ROOT_ALAT : MANIFEST_URL_DARI_ROOT_ALAT;
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error("Gagal memuat manifest: " + res.status);
      return res.json();
    });
  }

  // Mengelompokkan tools per kategori & menghitung jumlahnya,
  // menjaga urutan kategori_meta lalu menambahkan kategori baru
  // (yang muncul di tools tapi belum ada di kategori_meta) di akhir.
  function kelompokkanKategori(manifest) {
    const tools = manifest.tools || [];
    const meta = manifest.kategori_meta || [];

    const metaBySlug = {};
    meta.forEach((m) => { metaBySlug[m.slug] = m; });

    const jumlahPerSlug = {};
    tools.forEach((t) => {
      jumlahPerSlug[t.kategori] = (jumlahPerSlug[t.kategori] || 0) + 1;
    });

    const urutanSlug = [];
    meta.forEach((m) => { if (jumlahPerSlug[m.slug]) urutanSlug.push(m.slug); });
    Object.keys(jumlahPerSlug).sort().forEach((slug) => {
      if (urutanSlug.indexOf(slug) === -1) urutanSlug.push(slug);
    });

    return urutanSlug.map((slug) => ({
      slug: slug,
      nama: (metaBySlug[slug] && metaBySlug[slug].nama) || titleCaseDariSlug(slug),
      deskripsi: (metaBySlug[slug] && metaBySlug[slug].deskripsi) || "",
      jumlah: jumlahPerSlug[slug] || 0
    }));
  }

  /* ---------------------------------------------------------
     4. RENDER HALAMAN UTAMA ALAT (/alat/index.html)
     --------------------------------------------------------- */

  function renderHalamanUtamaAlat(manifest) {
    const totalEl = document.getElementById("statTotalAlat");
    const totalKategoriEl = document.getElementById("statTotalKategori");
    const grid = document.getElementById("kategoriGrid");
    if (!grid) return; // bukan halaman utama Alat

    showState("kategori", "StateLoading");

    const totalTools = (manifest.tools || []).length;
    const kelompok = kelompokkanKategori(manifest);

    if (totalEl) totalEl.textContent = totalTools;
    if (totalKategoriEl) totalKategoriEl.textContent = kelompok.length;

    if (totalTools === 0) {
      showState("kategori", "StateEmpty");
      return;
    }

    grid.innerHTML = kelompok.map((k) => (
      '<a class="kategori-card" href="/alat/' + encodeURIComponent(k.slug) + '/">' +
        '<div class="kategori-card-head">' +
          '<h3 class="kategori-card-title">' + escapeHTML(k.nama) + '</h3>' +
          '<span class="kategori-card-count">' + k.jumlah + ' alat</span>' +
        '</div>' +
        '<p class="kategori-card-desc">' + escapeHTML(k.deskripsi) + '</p>' +
        '<span class="kategori-card-link">Buka kategori →</span>' +
      '</a>'
    )).join("");

    grid.hidden = false;
    showState("kategori", "StateLoaded");
  }

  /* ---------------------------------------------------------
     5. RENDER HALAMAN KATEGORI (/alat/<slug>/index.html)
     --------------------------------------------------------- */

  function renderHalamanKategori(manifest, slug) {
    const daftar = document.getElementById("toolList");
    if (!daftar) return; // bukan halaman kategori

    showState("tool", "StateLoading");

    const meta = (manifest.kategori_meta || []).find((m) => m.slug === slug);
    const toolsKategori = (manifest.tools || []).filter((t) => t.kategori === slug);

    const namaEl = document.getElementById("kategoriNama");
    const descEl = document.getElementById("kategoriDeskripsi");
    const breadcrumbEl = document.getElementById("breadcrumbKategori");
    const jumlahEl = document.getElementById("statJumlahKategori");
    const titleTag = document.querySelector("title");

    const nama = (meta && meta.nama) || titleCaseDariSlug(slug);
    const deskripsi = (meta && meta.deskripsi) || "";

    if (namaEl) namaEl.textContent = nama;
    if (descEl) descEl.textContent = deskripsi;
    if (breadcrumbEl) breadcrumbEl.textContent = nama;
    if (jumlahEl) jumlahEl.textContent = toolsKategori.length;
    if (titleTag) titleTag.textContent = nama + " — Alat — JAZMI";

    if (toolsKategori.length === 0) {
      showState("tool", "StateEmpty");
      return;
    }

    daftar.innerHTML = toolsKategori
      .slice()
      .sort((a, b) => a.judul.localeCompare(b.judul, "id"))
      .map((t) => (
        '<li class="tool-item"><a href="' + encodeURI(t.file) + '">' + escapeHTML(t.judul) + '</a></li>'
      ))
      .join("");

    daftar.hidden = false;
    showState("tool", "StateLoaded");
  }

  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNavigasiMobile();
    initRevealOnScroll();

    const slug = deteksiSlugKategoriDariPath();

    ambilManifest()
      .then((manifest) => {
        if (slug) {
          renderHalamanKategori(manifest, slug);
        } else {
          renderHalamanUtamaAlat(manifest);
        }
      })
      .catch(() => {
        if (slug) showState("tool", "StateError");
        else showState("kategori", "StateError");
      });
  });
})();
