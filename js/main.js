/* =========================================================
   JAZMI — HOME
   main.js
   Vanilla JavaScript. Tidak menggunakan framework.
   Mengisi elemen dinamis pada index.html menggunakan data
   dari folder /data. Tidak membuat ID/class baru di luar
   yang sudah tersedia di index.html dan style.css.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     0. util kecil
     --------------------------------------------------------- */

  // Batasi jumlah item yang ditampilkan per section (etalase,
  // bukan gudang — lihat MASTER HOMEPAGE & CONTENT ECOSYSTEM).
  const LIMIT = {
    artikel: 5,
    bahan: 3,
    visual: 6,
    video: 3,
    audio: 3
  };

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

  // Pesan wajar untuk section yang gagal memuat data, tanpa
  // merusak seluruh halaman.
  function tampilkanPesanKosong(container, pesan) {
    if (!container) return;
    container.innerHTML = `<p class="data-empty-note">${escapeHTML(pesan)}</p>`;
  }

  /* ---------------------------------------------------------
     1. BAIT SYAIR HARI INI
     --------------------------------------------------------- */

  function pilihBaitHariIni(daftarBait) {
    // Deterministik berdasarkan TANGGAL LOKAL perangkat pengunjung
    // (bukan UTC): tanggal lokal yang sama selalu menghasilkan
    // bait yang sama, dan bait berganti tepat saat tanggal lokal
    // berganti (misal 23:59 -> 00:01 di zona waktu pengunjung
    // mana pun). Tidak perlu server, tidak dikunci ke zona waktu
    // tertentu seperti WIB.
    const sekarang = new Date();
    // Date.UTC() di sini hanya dipakai sebagai kalkulator hari
    // yang stabil, dibangun dari komponen tanggal LOKAL
    // (getFullYear/getMonth/getDate) — bukan konversi ke UTC.
    const hariLokal = Math.floor(
      Date.UTC(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate()) / 86400000
    );
    const indeks = hariLokal % daftarBait.length;
    return daftarBait[indeks];
  }

  async function muatBaitHarian() {
    const elArab = document.getElementById("baitArab");
    const elTerjemahan = document.getElementById("baitTerjemahan");
    const elPenyair = document.getElementById("baitPenyair");
    const elSumber = document.getElementById("baitSumber");
    const elTautan = document.getElementById("baitTautan");

    try {
      const data = await ambilData("data/syair.json");
      const daftarBait = data.bait || [];
      if (!daftarBait.length) throw new Error("Data syair kosong.");

      const bait = pilihBaitHariIni(daftarBait);

      if (elArab) elArab.textContent = bait.arab || "";
      if (elTerjemahan) elTerjemahan.textContent = bait.terjemahan || "";
      if (elPenyair) elPenyair.textContent = bait.penyair || "";

      // Sumber bersifat opsional — sembunyikan pemisah jika tidak ada.
      const pemisah = document.querySelector(".bait-meta-sep");
      if (bait.sumber) {
        if (elSumber) elSumber.textContent = bait.sumber;
        if (pemisah) pemisah.style.display = "";
      } else {
        if (elSumber) elSumber.textContent = "";
        if (pemisah) pemisah.style.display = "none";
      }

      if (elTautan) elTautan.href = bait.tautanDetail || "#";
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Bait Syair Hari Ini:", err);
      if (elArab) elArab.textContent = "";
      if (elTerjemahan) {
        elTerjemahan.textContent = "Bait hari ini belum dapat dimuat. Silakan coba muat ulang halaman.";
      }
      if (elPenyair) elPenyair.textContent = "";
      if (elSumber) elSumber.textContent = "";
      if (elTautan) elTautan.style.display = "none";
    }
  }

  /* ---------------------------------------------------------
     2. ARTIKEL TERBARU
     --------------------------------------------------------- */

  async function muatArtikelTerbaru() {
    const list = document.getElementById("articleList");
    if (!list) return;

    try {
      const data = await ambilData("data/articles.json");
      let artikel = (data.artikel || []).slice();

      // Urutkan berdasarkan tanggal, terbaru di atas.
      artikel.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      artikel = artikel.slice(0, LIMIT.artikel);

      if (!artikel.length) {
        tampilkanPesanKosong(list, "Belum ada artikel untuk ditampilkan.");
        return;
      }

      list.innerHTML = artikel.map((a) => `
        <li class="article-item">
          <span class="article-date">${escapeHTML(formatTanggalIndonesia(a.tanggal))}</span>
          <div class="article-body">
            <a class="article-title" href="${escapeHTML(a.tautan || "#")}">${escapeHTML(a.judul)}</a>
            ${a.kategori ? `<span class="article-category">${escapeHTML(a.kategori)}</span>` : ""}
          </div>
        </li>
      `).join("");
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Artikel Terbaru:", err);
      tampilkanPesanKosong(list, "Artikel terbaru belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     3. KARYA VISUAL TERBARU (slider)
     --------------------------------------------------------- */

  async function muatKaryaVisual() {
    const slider = document.getElementById("visualSlider");
    if (!slider) return;

    try {
      const data = await ambilData("data/media.json");
      const visual = (data.visual || []).slice(0, LIMIT.visual);

      if (!visual.length) {
        tampilkanPesanKosong(slider, "Belum ada karya visual untuk ditampilkan.");
        return;
      }

      slider.innerHTML = visual.map((v) => {
        const tone = [1, 2, 3, 4].includes(v.thumbTone) ? v.thumbTone : 1;
        return `
          <a class="visual-card" href="${escapeHTML(v.tautan || "#")}">
            <div class="visual-thumb visual-thumb-${tone}">Contoh Visual</div>
            <p class="visual-caption">${escapeHTML(v.judul)}</p>
          </a>
        `;
      }).join("");
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Karya Visual Terbaru:", err);
      tampilkanPesanKosong(slider, "Karya visual belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     4. BAHAN TERBARU
     --------------------------------------------------------- */

  function labelTipeBahan(tipe) {
    const label = { rangkuman: "Rangkuman", modul: "Modul", pdf: "PDF" };
    return label[tipe] || tipe;
  }

  async function muatBahanTerbaru() {
    const list = document.getElementById("materialList");
    if (!list) return;

    try {
      const data = await ambilData("data/bahan.json");
      const bahan = (data.bahan || []).slice(0, LIMIT.bahan);

      if (!bahan.length) {
        tampilkanPesanKosong(list, "Belum ada bahan untuk ditampilkan.");
        return;
      }

      list.innerHTML = bahan.map((b) => `
        <li class="material-item">
          <span class="material-tag">${escapeHTML(labelTipeBahan(b.tipe))}</span>
          <span class="material-title">${escapeHTML(b.judul)}</span>
          <a class="material-link" href="${escapeHTML(b.tautan || "#")}">Buka</a>
        </li>
      `).join("");
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Bahan Terbaru:", err);
      tampilkanPesanKosong(list, "Bahan terbaru belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     5. KHUTBAH JUMAT TERBARU
     --------------------------------------------------------- */

  function buatTautanWhatsApp(pesan) {
    // Website hanya MEMBUKA WhatsApp dengan pesan yang sudah
    // disiapkan — tidak ada pesan yang dikirim secara otomatis.
    const teks = `${pesan}\n${window.location.href}`;
    return `https://wa.me/?text=${encodeURIComponent(teks)}`;
  }

  async function muatKhutbahTerbaru() {
    const card = document.getElementById("khutbahCard");
    if (!card) return;

    try {
      const data = await ambilData("data/khutbah.json");
      const daftar = data.khutbah || [];
      if (!daftar.length) throw new Error("Data khutbah kosong.");

      // Terbaru berdasarkan tanggal.
      daftar.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      const k = daftar[0];

      const tombolBaca = k.tautanBaca
        ? `<a class="chip-btn" href="${escapeHTML(k.tautanBaca)}">Baca</a>` : "";
      const tombolPdf = k.tautanPdf
        ? `<a class="chip-btn" href="${escapeHTML(k.tautanPdf)}">PDF</a>` : "";
      const tombolWa = k.pesanWhatsApp
        ? `<a class="chip-btn chip-btn-whatsapp" href="${escapeHTML(buatTautanWhatsApp(k.pesanWhatsApp))}" target="_blank" rel="noopener">Bagikan ke WhatsApp</a>`
        : "";

      card.innerHTML = `
        <h3 class="khutbah-title">${escapeHTML(k.judul)}</h3>
        <p class="khutbah-date">${escapeHTML(formatTanggalIndonesia(k.tanggal))}</p>
        <div class="khutbah-actions">
          ${tombolBaca}${tombolPdf}${tombolWa}
        </div>
      `;
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Khutbah Jumat Terbaru:", err);
      tampilkanPesanKosong(card, "Khutbah Jumat terbaru belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     6. KAJIAN & TAKLIM
     --------------------------------------------------------- */

  async function muatKajianTerbaru() {
    const card = document.getElementById("kajianCard");
    if (!card) return;

    try {
      const data = await ambilData("data/kajian.json");
      const daftar = data.kajian || [];
      if (!daftar.length) throw new Error("Data kajian kosong.");

      daftar.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
      const kj = daftar[0];
      const output = kj.output || {};

      const labelOutput = [
        ["rangkuman", "Rangkuman"],
        ["pdf", "PDF"],
        ["video", "Video"],
        ["audio", "Audio"]
      ];

      const outputHTML = labelOutput.map(([key, label]) => {
        const aktif = !!output[key];
        return `<span class="${aktif ? "" : "is-off"}">${escapeHTML(label)}</span>`;
      }).join("");

      card.innerHTML = `
        <h3 class="kajian-title">${escapeHTML(kj.judul)}</h3>
        <p class="kajian-date">${escapeHTML(formatTanggalIndonesia(kj.tanggal))}</p>
        <p class="kajian-desc">${escapeHTML(kj.deskripsi || "")}</p>
        <div class="kajian-outputs">${outputHTML}</div>
        <a class="chip-btn" href="${escapeHTML(kj.tautan || "#")}">Lihat Kajian</a>
      `;
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Kajian & Taklim:", err);
      tampilkanPesanKosong(card, "Kajian &amp; Taklim terbaru belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     7. VIDEO TERBARU
     --------------------------------------------------------- */

  const IKON_PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;

  async function muatVideoTerbaru() {
    const grid = document.getElementById("videoGrid");
    if (!grid) return;

    try {
      const data = await ambilData("data/media.json");
      const video = (data.video || []).slice(0, LIMIT.video);

      if (!video.length) {
        tampilkanPesanKosong(grid, "Belum ada video untuk ditampilkan.");
        return;
      }

      grid.innerHTML = video.map((v) => `
        <a class="video-card" href="${escapeHTML(v.tautanYoutube || "#")}" target="_blank" rel="noopener">
          <div class="video-thumb">
            <span class="video-play">${IKON_PLAY}</span>
          </div>
          <p class="video-title">${escapeHTML(v.judul)}</p>
        </a>
      `).join("");
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Video Terbaru:", err);
      tampilkanPesanKosong(grid, "Video terbaru belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     8. AUDIO TERBARU
     --------------------------------------------------------- */

  const TINGGI_BAR_AUDIO = ["40%", "70%", "100%", "55%", "30%"];

  function buatBarsAudio() {
    return TINGGI_BAR_AUDIO
      .map((tinggi) => `<span style="height:${tinggi}"></span>`)
      .join("");
  }

  async function muatAudioTerbaru() {
    const list = document.getElementById("audioList");
    if (!list) return;

    try {
      const data = await ambilData("data/media.json");
      const audio = (data.audio || []).slice(0, LIMIT.audio);

      if (!audio.length) {
        tampilkanPesanKosong(list, "Belum ada audio untuk ditampilkan.");
        return;
      }

      list.innerHTML = audio.map((a) => `
        <li class="audio-item">
          <a class="audio-play" href="${escapeHTML(a.tautanSoundcloud || "#")}" target="_blank" rel="noopener" aria-label="Dengarkan di SoundCloud">${IKON_PLAY}</a>
          <span class="audio-bars" aria-hidden="true">${buatBarsAudio()}</span>
          <span class="audio-title">${escapeHTML(a.judul)}</span>
        </li>
      `).join("");
    } catch (err) {
      console.error("[JAZMI] Gagal memuat Audio Terbaru:", err);
      tampilkanPesanKosong(list, "Audio terbaru belum dapat dimuat saat ini.");
    }
  }

  /* ---------------------------------------------------------
     9. NAVIGASI MOBILE
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
     10. REVEAL ON SCROLL (halus, menghormati prefers-reduced-motion)
     --------------------------------------------------------- */

  function initRevealOnScroll() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const target = document.querySelectorAll(
      ".identity, .bait-harian, .section, .explore"
    );

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

    // Setiap bagian dimuat independen — jika satu gagal,
    // bagian lain tetap tampil (lihat try/catch di masing-masing).
    muatBaitHarian();
    muatArtikelTerbaru();
    muatKaryaVisual();
    muatBahanTerbaru();
    muatKhutbahTerbaru();
    muatKajianTerbaru();
    muatVideoTerbaru();
    muatAudioTerbaru();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
