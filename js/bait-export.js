/* =========================================================
   JAZMI — HOME
   bait-export.js

   Fitur "Unduh sebagai gambar" untuk kartu Bait Syair Hari Ini.
   Alur:
   1. Klik "Unduh sebagai gambar" -> buka panel pilih latar
      (default: latar hari ini, dari JAZMI_pilihLatarHariIni di
      js/bait-panel.js). Tombol berubah jadi "Ambil gambar".
   2. Klik salah satu latar -> ganti kelas .bait-bg-N pada kartu
      secara langsung (pratinjau nyata, bukan simulasi).
   3. Klik "Ambil gambar" -> tangkap #baitCard apa adanya (rasio
      sesuai tampilan asli layar, sesuai arahan: "ikut tampilan
      asli layar") lewat html2canvas, lalu unduh sebagai JPG.

   Panel pilih latar & tombol berada DI LUAR #baitCard (lihat
   index.html), jadi tidak perlu disembunyikan saat snapshot.

   Bergantung pada html2canvas (dimuat via CDN di index.html,
   sebelum file ini) dan window.JAZMI_pilihLatarHariIni (dari
   js/bait-panel.js, dimuat sebelum file ini juga).
   ========================================================= */

(function () {
  "use strict";

  var JUMLAH_LATAR = 3;
  var WARNA_LATAR_HALAMAN = "#F6F1E4"; // var(--bg) di css/style.css

  function tandaiSwatchAktif(elPicker, nomor) {
    var swatches = elPicker.querySelectorAll(".bait-bg-swatch");
    swatches.forEach(function (sw) {
      var punya = sw.getAttribute("data-bg") === String(nomor);
      sw.classList.toggle("aktif", punya);
    });
  }

  function nomorLatarAktif(elCard) {
    for (var i = 1; i <= JUMLAH_LATAR; i++) {
      if (elCard.classList.contains("bait-bg-" + i)) return i;
    }
    return 1;
  }

  function gantiLatar(elCard, nomor) {
    for (var i = 1; i <= JUMLAH_LATAR; i++) {
      elCard.classList.remove("bait-bg-" + i);
    }
    elCard.classList.add("bait-bg-" + nomor);
  }

  async function ambilGambar(elCard, elBtn) {
    if (typeof html2canvas !== "function") {
      console.error("[JAZMI] html2canvas belum termuat.");
      return;
    }
    var labelAsli = elBtn.textContent;
    elBtn.disabled = true;
    elBtn.textContent = "Menyiapkan gambar…";
    try {
      var canvas = await html2canvas(elCard, {
        backgroundColor: WARNA_LATAR_HALAMAN,
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true
      });
      var dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      var tautanUnduh = document.createElement("a");
      var tanggal = new Date().toISOString().slice(0, 10);
      tautanUnduh.href = dataUrl;
      tautanUnduh.download = "jazmi-bait-syair-" + tanggal + ".jpg";
      document.body.appendChild(tautanUnduh);
      tautanUnduh.click();
      document.body.removeChild(tautanUnduh);
    } catch (err) {
      console.error("[JAZMI] Gagal membuat gambar kartu bait:", err);
      window.alert("Maaf, gambar gagal dibuat. Coba lagi sesaat lagi.");
    } finally {
      elBtn.disabled = false;
      elBtn.textContent = labelAsli;
    }
  }

  function pasangEventEkspor() {
    var elCard = document.getElementById("baitCard");
    var elBtn = document.getElementById("baitUnduhBtn");
    var elPicker = document.getElementById("baitBgPicker");
    if (!elCard || !elBtn || !elPicker) return;

    var panelTerbuka = false;

    elBtn.addEventListener("click", function () {
      if (!panelTerbuka) {
        // Buka panel, tandai latar hari ini sebagai aktif.
        if (typeof window.JAZMI_pilihLatarHariIni === "function") {
          window.JAZMI_pilihLatarHariIni();
        }
        tandaiSwatchAktif(elPicker, nomorLatarAktif(elCard));
        elPicker.classList.add("terbuka");
        elBtn.textContent = "Ambil gambar";
        panelTerbuka = true;
      } else {
        ambilGambar(elCard, elBtn);
      }
    });

    elPicker.querySelectorAll(".bait-bg-swatch").forEach(function (sw) {
      sw.addEventListener("click", function () {
        var nomor = parseInt(sw.getAttribute("data-bg"), 10);
        gantiLatar(elCard, nomor);
        tandaiSwatchAktif(elPicker, nomor);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pasangEventEkspor);
  } else {
    pasangEventEkspor();
  }
})();
