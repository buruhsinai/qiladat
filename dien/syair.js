/* =========================================================
   JAZMI — Dien: Syair (C06-B)
   syair.js
   Vanilla JavaScript, berdiri sendiri (tidak memuat main.js/
   dien.js) — mengikuti konvensi js/main.js, dien/dien.js,
   dien/pondok.js, dan dien/rangkuman.js.

   SUMBER DATA RUNTIME (sesuai SYAIR_EDITORIAL_CONTRACT.md):
     syair-bank/*.json        → satu-satunya sumber konten bait
                                 (teksArab, terjemahan, penyair,
                                 tag, dst). TIDAK PERNAH disalin
                                 ke tempat lain oleh skrip ini.
     syair-editorial/pilihan.json → hanya pointer (baitId,
                                 kitabId, urutan, statusEditorial).
                                 OPSIONAL — file ini belum ada
                                 pada tahap produksi ini; kalau
                                 gagal dimuat (404/dsb), halaman
                                 tetap berjalan dengan empty state
                                 yang jujur, BUKAN error.
     data/syair.json TIDAK dipakai di sini — itu jalur demo lama
     milik HOME (js/main.js), tetap terpisah sesuai C01 OPEN #3.

   CATATAN KETERBATASAN (dependency, dicatat apa adanya):
     Belum ada file manifest yang mendaftar seluruh
     syair-bank/kitab-*.json yang ada. Daftar KITAB_FILES di
     bawah karena itu di-hardcode dari 2 dataset pilot yang
     benar-benar tersedia saat ini. Begitu ada kitab baru masuk
     Bank, daftar ini perlu diperbarui manual sampai ada
     mekanisme manifest — ini bukan sesuatu yang dapat
     diselesaikan sendiri oleh C06 (di luar scope halaman ini).
   ========================================================= */

(function () {
  "use strict";

  // Dependency yang sudah diketahui (lihat catatan di atas).
  const KITAB_FILES = [
    "../syair-bank/kitab-almusid-adabalmasjid.json",
    "../syair-bank/kitab-manair-alisad.json"
  ];
  const PILIHAN_PATH = "../syair-editorial/pilihan.json";

  /* ---------------------------------------------------------
     0. util kecil (sama pola dengan js/main.js & dien/*.js)
     --------------------------------------------------------- */

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  async function ambilData(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Gagal memuat ${path} (status ${res.status})`);
    }
    return res.json();
  }

  // Untuk file yang MEMANG opsional (pilihan.json belum tentu
  // ada pada tahap ini) — kegagalan dianggap kondisi normal
  // ("belum tersedia"), bukan error yang mengganggu pengguna.
  async function ambilDataOpsional(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null; // termasuk 404 — wajar, bukan error
      return await res.json();
    } catch (e) {
      // Kegagalan jaringan pun diperlakukan sebagai "belum ada
      // data editorial" — halaman tidak boleh rusak karenanya.
      return null;
    }
  }

  function kartuStatus(pesan, tag) {
    return `
      <div class="syair-status-card">
        ${tag ? `<span class="syair-status-tag">${escapeHTML(tag)}</span>` : ""}
        <p>${escapeHTML(pesan)}</p>
      </div>
    `;
  }

  function tampilkanStatus(container, pesan, tag) {
    if (!container) return;
    container.innerHTML = kartuStatus(pesan, tag);
  }

  /* ---------------------------------------------------------
     1. MUAT BANK SYAIR — gabungkan seluruh file kitab jadi
        satu indeks in-memory (kitab/penyair/tag/series/bait).
        Ini murni pembacaan; tidak pernah menulis balik ke
        syair-bank/.
     --------------------------------------------------------- */

  function indeksKosong() {
    return {
      kitabById: new Map(),
      penyairById: new Map(),
      tagById: new Map(),
      seriesById: new Map(),
      baitById: new Map(),
      baitList: []
    };
  }

  async function muatBankSyair() {
    const idx = indeksKosong();
    const hasil = await Promise.allSettled(KITAB_FILES.map(ambilData));

    let adaFileGagal = false;
    hasil.forEach((r, i) => {
      if (r.status !== "fulfilled") {
        adaFileGagal = true;
        console.error(`[JAZMI] Gagal memuat Bank Syair: ${KITAB_FILES[i]}`, r.reason);
        return;
      }
      const data = r.value;
      (data.kitab || []).forEach((k) => idx.kitabById.set(k.id, k));
      (data.penyair || []).forEach((p) => idx.penyairById.set(p.id, p));
      (data.tag || []).forEach((t) => idx.tagById.set(t.id, t));
      (data.series || []).forEach((s) => idx.seriesById.set(s.id, s));
      (data.bait || []).forEach((b) => {
        idx.baitById.set(b.id, b);
        idx.baitList.push(b);
      });
    });

    idx.adaFileGagal = adaFileGagal;
    return idx;
  }

  function baitDipublikasikan(bait) {
    return !!bait && bait.status === "dipublikasikan";
  }

  /* ---------------------------------------------------------
     2. LAPISAN EDITORIAL — muat pilihan.json (opsional) dan
        terapkan gate ganda: statusEditorial "aktif" DAN
        bait.status "dipublikasikan" saat ini (SYAIR_EDITORIAL_
        CONTRACT.md bagian 5). Tidak pernah menulis ke
        pilihan.json dari sini.
     --------------------------------------------------------- */

  function resolvePilihanAktif(pilihanData, idx) {
    if (!pilihanData || !Array.isArray(pilihanData.pilihan)) {
      return { lolos: [], entryTotal: 0 };
    }

    const entries = pilihanData.pilihan;
    const dipakaiBaitId = new Set();
    const lolos = [];

    entries
      .filter((e) => e && e.statusEditorial === "aktif")
      .forEach((entry) => {
        const bait = idx.baitById.get(entry.baitId);

        // Gate 1: baitId harus benar-benar ada di Bank.
        if (!bait) {
          console.info(`[JAZMI] Syair Pilihan: baitId "${entry.baitId}" tidak ditemukan di Bank — dilewati.`);
          return;
        }
        // Gate 2: kitabId cache pada entry harus cocok dengan
        // kitabId asli bait (bukan cache basi/salah).
        if (entry.kitabId !== bait.kitabId) {
          console.info(`[JAZMI] Syair Pilihan: kitabId entry "${entry.id}" tidak cocok dengan bait sebenarnya — dilewati.`);
          return;
        }
        // Gate 3: status Bank saat ini harus "dipublikasikan".
        if (!baitDipublikasikan(bait)) {
          return; // wajar (siap/ditinjau) — bukan kondisi untuk di-log sebagai kejanggalan
        }
        // Jaga-jaga: satu bait tidak boleh dobel dalam rotasi aktif.
        if (dipakaiBaitId.has(bait.id)) {
          console.info(`[JAZMI] Syair Pilihan: baitId "${bait.id}" muncul lebih dari sekali di antara entry aktif — duplikat dilewati.`);
          return;
        }
        dipakaiBaitId.add(bait.id);

        lolos.push({
          entry,
          bait,
          kitab: idx.kitabById.get(bait.kitabId) || null,
          penyair: idx.penyairById.get(bait.penyairId) || null
        });
      });

    // Urutan manusia (field `urutan`), BUKAN recommendationScore.
    lolos.sort((a, b) => (a.entry.urutan || 0) - (b.entry.urutan || 0));

    return { lolos, entryTotal: entries.length };
  }

  /* ---------------------------------------------------------
     3. RENDER KARTU BAIT (dipakai Syair Pilihan & Bait Hari Ini)
     --------------------------------------------------------- */

  function labelTagUntukBait(bait, idx) {
    return (bait.tagIds || [])
      .map((tid) => idx.tagById.get(tid))
      .filter(Boolean)
      .map((t) => `<span class="bait-card-tag">${escapeHTML(t.nama)}</span>`)
      .join("");
  }

  function renderKartuBait(item, idx, opts) {
    const { bait, kitab, penyair, entry } = item;
    const domId = `bait-detail-${escapeHTML(bait.id)}`;
    const terjemahanHTML = bait.terjemahan
      ? `<p class="bait-card-terjemahan">${escapeHTML(bait.terjemahan)}</p>`
      : `<p class="bait-card-terjemahan is-kosong">Terjemahan belum tersedia untuk bait ini.</p>`;

    const metaBagian = [];
    if (penyair) metaBagian.push(escapeHTML(penyair.namaLatin || penyair.namaArab || ""));
    if (kitab) metaBagian.push(escapeHTML(kitab.judulLatin || kitab.judulArab || ""));
    const metaHTML = metaBagian.filter(Boolean).join(' <span class="sep">·</span> ');

    const alasan = entry && entry.alasanPemilihan ? escapeHTML(entry.alasanPemilihan) : "";

    return `
      <article class="bait-card" data-bait-id="${escapeHTML(bait.id)}">
        <blockquote class="bait-card-arab" lang="ar">${escapeHTML(bait.teksArab)}</blockquote>
        ${terjemahanHTML}
        ${metaHTML ? `<p class="bait-card-meta">${metaHTML}</p>` : ""}
        ${labelTagUntukBait(bait, idx) ? `<div class="bait-card-tags">${labelTagUntukBait(bait, idx)}</div>` : ""}
        <button type="button" class="bait-card-toggle" aria-expanded="false" aria-controls="${domId}">Detail bait</button>
        <dl class="bait-card-detail" id="${domId}" hidden>
          ${kitab ? `<dt>Kitab</dt><dd>${escapeHTML(kitab.judulArab || "")} — ${escapeHTML(kitab.judulLatin || "")}</dd>` : ""}
          ${penyair ? `<dt>Penyair</dt><dd>${escapeHTML(penyair.namaLatin || "")}</dd>` : ""}
          ${bait.jenis ? `<dt>Jenis</dt><dd>${escapeHTML(bait.jenis === "syahid" ? "Syahid (kutipan)" : "Matan")}</dd>` : ""}
          ${alasan ? `<dt>Catatan Editorial</dt><dd>${alasan}</dd>` : ""}
        </dl>
      </article>
    `;
  }

  function initTogglesDetailBait(container) {
    if (!container) return;
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".bait-card-toggle");
      if (!btn || !container.contains(btn)) return;
      const target = document.getElementById(btn.getAttribute("aria-controls"));
      if (!target) return;
      const terbuka = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!terbuka));
      target.hidden = terbuka;
      btn.textContent = terbuka ? "Detail bait" : "Tutup detail";
    });
  }

  /* ---------------------------------------------------------
     4. SYAIR PILIHAN
     --------------------------------------------------------- */

  function renderSyairPilihan(lolos, idx, pilihanTersedia) {
    const container = document.getElementById("syairPilihanList");
    if (!container) return;

    if (!lolos.length) {
      const pesan = pilihanTersedia
        ? "Belum ada Syair Pilihan yang dipublikasikan saat ini."
        : "Belum ada Syair Pilihan yang dipublikasikan saat ini.";
      tampilkanStatus(container, pesan, "Segera hadir");
      return;
    }

    container.innerHTML = lolos.map((item) => renderKartuBait(item, idx)).join("");
    initTogglesDetailBait(container);
  }

  /* ---------------------------------------------------------
     5. BAIT HARI INI — subset deterministik dari Syair Pilihan.
        Algoritma SAMA PERSIS polanya dengan js/main.js
        (pilihBaitHariIni): berbasis tanggal LOKAL perangkat,
        bukan acak, bukan skor.
     --------------------------------------------------------- */

  function pilihBaitHariIniDariHimpunan(himpunan) {
    if (!himpunan.length) return null;
    const sekarang = new Date();
    const hariLokal = Math.floor(
      Date.UTC(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate()) / 86400000
    );
    const indeks = hariLokal % himpunan.length;
    return himpunan[indeks];
  }

  function renderBaitHariIni(lolos, idx) {
    const container = document.getElementById("baitHariIniWrap");
    if (!container) return;

    const terpilih = pilihBaitHariIniDariHimpunan(lolos);
    if (!terpilih) {
      tampilkanStatus(
        container,
        "Belum ada Bait Hari Ini — menunggu Syair Pilihan yang dipublikasikan.",
        "Segera hadir"
      );
      return;
    }

    container.innerHTML = renderKartuBait(terpilih, idx);
    initTogglesDetailBait(container);
  }

  /* ---------------------------------------------------------
     6. JELAJAHI SYAIR — Kitab / Penyair / Tag / Series.
        Gate: BAIT.status === "dipublikasikan" (BUKAN
        KITAB.status — sesuai C01-SY-07). Independen dari
        pilihan.json.
     --------------------------------------------------------- */

  function baitPublikDariBank(idx) {
    return idx.baitList.filter(baitDipublikasikan);
  }

  function hitungJelajahi(idx) {
    const baitPublik = baitPublikDariBank(idx);

    const kitabMap = new Map(); // kitabId -> jumlah bait publik
    const penyairMap = new Map(); // penyairId -> jumlah bait publik
    const tagMap = new Map(); // tagId -> jumlah bait publik
    const seriesMap = new Map(); // seriesId -> jumlah bait publik

    baitPublik.forEach((b) => {
      kitabMap.set(b.kitabId, (kitabMap.get(b.kitabId) || 0) + 1);
      if (b.penyairId) penyairMap.set(b.penyairId, (penyairMap.get(b.penyairId) || 0) + 1);
      (b.tagIds || []).forEach((tid) => tagMap.set(tid, (tagMap.get(tid) || 0) + 1));
      (b.seriesIds || []).forEach((sid) => seriesMap.set(sid, (seriesMap.get(sid) || 0) + 1));
    });

    return { baitPublik, kitabMap, penyairMap, tagMap, seriesMap };
  }

  function renderPanelKitab(ringkasan, idx) {
    const el = document.getElementById("jelajahiPanelKitab");
    if (!el) return;
    const entries = [...ringkasan.kitabMap.entries()];
    if (!entries.length) {
      tampilkanStatus(el, "Belum ada kitab dengan bait yang dipublikasikan.", "Segera hadir");
      return;
    }
    el.innerHTML = `<div class="jelajahi-grid">${entries.map(([kitabId, jumlah]) => {
      const k = idx.kitabById.get(kitabId);
      if (!k) return "";
      return `
        <div class="jelajahi-item">
          <p class="jelajahi-item-arab">${escapeHTML(k.judulArab || "")}</p>
          <h3 class="jelajahi-item-title">${escapeHTML(k.judulLatin || k.judulArab || "")}</h3>
          <p class="jelajahi-item-count">${jumlah} bait dipublikasikan</p>
        </div>
      `;
    }).join("")}</div>`;
  }

  function renderPanelPenyair(ringkasan, idx) {
    const el = document.getElementById("jelajahiPanelPenyair");
    if (!el) return;
    const entries = [...ringkasan.penyairMap.entries()];
    if (!entries.length) {
      tampilkanStatus(el, "Belum ada penyair dengan bait yang dipublikasikan.", "Segera hadir");
      return;
    }
    el.innerHTML = `<div class="jelajahi-grid">${entries.map(([penyairId, jumlah]) => {
      const p = idx.penyairById.get(penyairId);
      if (!p) return "";
      return `
        <div class="jelajahi-item">
          <h3 class="jelajahi-item-title">${escapeHTML(p.namaLatin || p.namaArab || "")}</h3>
          <p class="jelajahi-item-count">${jumlah} bait dipublikasikan</p>
        </div>
      `;
    }).join("")}</div>`;
  }

  function renderPanelTag(ringkasan, idx) {
    const el = document.getElementById("jelajahiPanelTag");
    if (!el) return;
    const entries = [...ringkasan.tagMap.entries()];
    if (!entries.length) {
      tampilkanStatus(el, "Belum ada tag dari bait yang dipublikasikan.", "Segera hadir");
      return;
    }
    el.innerHTML = `<div class="jelajahi-grid">${entries.map(([tagId, jumlah]) => {
      const t = idx.tagById.get(tagId);
      if (!t) return "";
      return `
        <div class="jelajahi-item">
          <h3 class="jelajahi-item-title">${escapeHTML(t.nama)}</h3>
          <p class="jelajahi-item-count">${jumlah} bait</p>
        </div>
      `;
    }).join("")}</div>`;
  }

  function renderPanelSeries(ringkasan, idx) {
    const el = document.getElementById("jelajahiPanelSeries");
    if (!el) return;
    const entries = [...ringkasan.seriesMap.entries()];
    if (!entries.length) {
      tampilkanStatus(el, "Belum ada Series yang terisi pada Bank Syair saat ini.", "Belum tersedia");
      return;
    }
    el.innerHTML = `<div class="jelajahi-grid">${entries.map(([seriesId, jumlah]) => {
      const s = idx.seriesById.get(seriesId);
      if (!s) return "";
      return `
        <div class="jelajahi-item">
          <h3 class="jelajahi-item-title">${escapeHTML(s.nama)}</h3>
          <p class="jelajahi-item-count">${jumlah} bait</p>
        </div>
      `;
    }).join("")}</div>`;
  }

  function initTabJelajahi() {
    const tabs = document.querySelectorAll(".jelajahi-tab");
    const panels = document.querySelectorAll(".jelajahi-panel");
    if (!tabs.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.setAttribute("aria-selected", "false"));
        tab.setAttribute("aria-selected", "true");
        const target = tab.getAttribute("aria-controls");
        panels.forEach((p) => {
          p.hidden = p.id !== target;
        });
      });
    });
  }

  /* ---------------------------------------------------------
     7. Navigasi mobile (pola sama dengan dien/pondok.js,
        dien/rangkuman.js)
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
     8. Reveal on scroll (pola sama dengan js/main.js dan
        dien/*.js, menghormati prefers-reduced-motion)
     --------------------------------------------------------- */

  function initRevealOnScroll() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = document.querySelectorAll(".identity, .section");

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
     init
     --------------------------------------------------------- */

  async function init() {
    initNavigasiMobile();
    initRevealOnScroll();
    initTabJelajahi();

    const idx = await muatBankSyair();

    if (idx.adaFileGagal && !idx.baitList.length) {
      // Seluruh Bank gagal dimuat — tampilkan pesan graceful di
      // blok-blok utama, jangan biarkan halaman terlihat kosong
      // tanpa penjelasan.
      const pesanGagal = "Syair belum dapat dimuat saat ini. Silakan coba muat ulang halaman.";
      ["baitHariIniWrap", "syairPilihanList", "jelajahiPanelKitab", "jelajahiPanelPenyair", "jelajahiPanelTag", "jelajahiPanelSeries"]
        .forEach((id) => tampilkanStatus(document.getElementById(id), pesanGagal));
      return;
    }

    // Jelajahi — independen dari pilihan.json, berbasis gate BAIT publik.
    const ringkasan = hitungJelajahi(idx);
    renderPanelKitab(ringkasan, idx);
    renderPanelPenyair(ringkasan, idx);
    renderPanelTag(ringkasan, idx);
    renderPanelSeries(ringkasan, idx);

    // Syair Pilihan & Bait Hari Ini — butuh pilihan.json (opsional).
    const pilihanData = await ambilDataOpsional(PILIHAN_PATH);
    const pilihanTersedia = pilihanData !== null;
    if (!pilihanTersedia) {
      console.info("[JAZMI] syair-editorial/pilihan.json belum tersedia — menampilkan empty state Syair Pilihan.");
    }
    const { lolos } = resolvePilihanAktif(pilihanData, idx);

    renderSyairPilihan(lolos, idx, pilihanTersedia);
    renderBaitHariIni(lolos, idx);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Diekspos hanya untuk keperluan pengujian logika terisolasi
  // (lihat laporan testing) — tidak dipakai runtime halaman.
  if (typeof window !== "undefined") {
    window.__syairTestHooks = { resolvePilihanAktif, hitungJelajahi, pilihBaitHariIniDariHimpunan, baitDipublikasikan };
  }
})();
