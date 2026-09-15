/* =========================================================================
   ToTo — il ConverToTore
   Ottimizzazione batch di immagini e video, 100% client-side.
   Immagini  -> Canvas API (resize + ricodifica WebP / AVIF / fallback)
   Video     -> FFmpeg.wasm (ricodifica H.264 / VP9 locale, nessun upload)
   Archivio  -> JSZip
   ========================================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------
     1. Preset di conversione
     ------------------------------------------------------------------- */

  const IMAGE_PRESETS = {
    "img-hero": { label: "Hero Banner", maxWidth: 1920, quality: 0.80, suffix: "hero" },
    "img-blog": { label: "Blog / Content", maxWidth: 1200, quality: 0.75, suffix: "blog" },
    "img-card": { label: "Card / Thumbnail", maxWidth: 600, quality: 0.75, suffix: "card" },
  };

  const VIDEO_PRESETS = {
    "vid-bg": { label: "Video Background", suffix: "bg" },
    "vid-content": { label: "Video Contenuto / Demo", suffix: "content" },
  };

  const DEFAULT_IMAGE_PRESET = "img-blog";
  const DEFAULT_VIDEO_PRESET = "vid-content";

  /* ---------------------------------------------------------------------
     2. Stato applicazione
     ------------------------------------------------------------------- */

  const state = {
    files: [],                 // elementi in coda (vedi makeQueueItem)
    avifSupported: null,       // null = non ancora verificato
    generateFallback: false,
    bgResolution: "720",
    ffmpegLoaded: false,
    activeVideoItem: null,     // usato dal listener di progress di ffmpeg
    activeVariantIndex: 0,
    activeVariantCount: 1,
  };

  let idCounter = 0;
  let ffmpegInstance = null;
  let ffmpegLoadingPromise = null;
  let ffmpegProgressBound = false;

  /* ---------------------------------------------------------------------
     3. Riferimenti DOM
     ------------------------------------------------------------------- */

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const browseBtn = document.getElementById("browseBtn");

  const globalPresetSelect = document.getElementById("globalPreset");
  const bgResolutionSelect = document.getElementById("bgResolution");
  const fallbackToggle = document.getElementById("fallbackToggle");
  const applyAllBtn = document.getElementById("applyAllBtn");

  const emptyQueue = document.getElementById("emptyQueue");
  const queueList = document.getElementById("queueList");
  const queueCount = document.getElementById("queueCount");
  const queueActions = document.getElementById("queueActions");
  const startBtn = document.getElementById("startBtn");
  const clearBtn = document.getElementById("clearBtn");
  const ffmpegStatus = document.getElementById("ffmpegStatus");

  const resultsSection = document.getElementById("resultsSection");
  const resultsBody = document.getElementById("resultsBody");
  const totalSavings = document.getElementById("totalSavings");
  const downloadZipBtn = document.getElementById("downloadZipBtn");

  const avifStatusChip = document.getElementById("avifStatusChip");
  const rowTemplate = document.getElementById("queueRowTemplate");

  /* ---------------------------------------------------------------------
     4. Utility
     ------------------------------------------------------------------- */

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function extOf(name) {
    const m = /\.[^.]+$/.exec(name || "");
    return m ? m[0].toLowerCase() : "";
  }

  function stripExt(name) {
    return (name || "file").replace(/\.[^.]+$/, "");
  }

  function detectKind(file) {
    if (file.type && file.type.startsWith("image/")) return "image";
    if (file.type && file.type.startsWith("video/")) return "video";
    const ext = extOf(file.name);
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return "image";
    if ([".mp4", ".mov", ".m4v", ".webm"].includes(ext)) return "video";
    return null;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function showSkipNote(names) {
    let note = document.getElementById("skipNote");
    if (!note) {
      note = document.createElement("p");
      note.id = "skipNote";
      note.className = "text-xs text-alert mt-2";
      dropzone.insertAdjacentElement("afterend", note);
    }
    note.textContent = `File ignorati (formato non supportato): ${names.join(", ")}`;
    clearTimeout(note._timer);
    note._timer = setTimeout(() => note.remove(), 6000);
  }

  function detectAvifSupport() {
    return new Promise((resolve) => {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      if (!c.toBlob) { resolve(false); return; }
      try {
        c.toBlob((blob) => resolve(!!blob && blob.type === "image/avif"), "image/avif");
      } catch (e) {
        resolve(false);
      }
    });
  }

  /* ---------------------------------------------------------------------
     5. Gestione coda: aggiunta file, stato per riga, rendering
     ------------------------------------------------------------------- */

  function makeQueueItem(file, kind) {
    return {
      id: ++idCounter,
      file,
      kind,
      preset: kind === "image" ? DEFAULT_IMAGE_PRESET : DEFAULT_VIDEO_PRESET,
      status: "pending", // pending | processing | done | error
      originalSize: file.size,
      outputs: [],
      finalSize: null,
      errorMsg: "",
      thumbUrl: null,
      _el: null,
    };
  }

  function handleFiles(fileList) {
    const skipped = [];
    Array.from(fileList).forEach((file) => {
      const kind = detectKind(file);
      if (!kind) { skipped.push(file.name); return; }
      const item = makeQueueItem(file, kind);
      state.files.push(item);
      renderQueueRow(item);
    });
    if (skipped.length) showSkipNote(skipped);
    refreshQueueChrome();
  }

  function populatePresetSelect(select, kind, selected) {
    select.innerHTML = "";
    const map = kind === "image" ? IMAGE_PRESETS : VIDEO_PRESETS;
    Object.entries(map).forEach(([key, p]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = p.label;
      if (key === selected) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderQueueRow(item) {
    const frag = rowTemplate.content.cloneNode(true);
    const li = frag.querySelector("[data-row]");
    const icon = frag.querySelector("[data-icon]");
    const nameEl = frag.querySelector("[data-name]");
    const metaEl = frag.querySelector("[data-meta]");
    const presetSelect = frag.querySelector("[data-preset-select]");
    const statusPill = frag.querySelector("[data-status]");
    const progressTrack = frag.querySelector("[data-progress-track]");
    const progressFill = frag.querySelector("[data-progress-fill]");

    nameEl.textContent = item.file.name;
    metaEl.textContent = `${item.kind === "image" ? "Immagine" : "Video"} · ${formatBytes(item.originalSize)}`;

    if (item.kind === "image") {
      const url = URL.createObjectURL(item.file);
      item.thumbUrl = url;
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      icon.appendChild(img);
    } else {
      icon.textContent = extOf(item.file.name).replace(".", "") || "VID";
    }

    populatePresetSelect(presetSelect, item.kind, item.preset);
    presetSelect.addEventListener("change", () => { item.preset = presetSelect.value; });

    queueList.appendChild(frag);
    const liEl = queueList.lastElementChild;

    item._el = { li: liEl, statusPill, progressTrack, progressFill };
    setStatus(item, "pending");
  }

  function setStatus(item, status, message) {
    item.status = status;
    if (!item._el) return;
    const labels = {
      pending: "In coda",
      processing: "In elaborazione",
      done: "Completato",
      error: message || "Errore",
    };
    item._el.statusPill.textContent = labels[status] || status;
    item._el.statusPill.setAttribute("data-state", status);
    if (status === "processing") {
      item._el.progressTrack.classList.add("visible");
    }
  }

  function updateProgress(item, ratio) {
    if (!item._el) return;
    const pct = Math.max(0, Math.min(1, ratio)) * 100;
    item._el.progressFill.style.width = `${pct.toFixed(1)}%`;
  }

  function refreshQueueChrome() {
    const has = state.files.length > 0;
    emptyQueue.classList.toggle("hidden", has);
    queueList.classList.toggle("hidden", !has);
    queueActions.style.display = has ? "flex" : "none";
    queueCount.textContent = `${state.files.length} file`;
  }

  function clearQueue() {
    state.files.forEach((item) => {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      (item.outputs || []).forEach((o) => { if (o.url) URL.revokeObjectURL(o.url); });
    });
    state.files = [];
    queueList.innerHTML = "";
    resultsBody.innerHTML = "";
    resultsSection.style.display = "none";
    refreshQueueChrome();
  }

  /* ---------------------------------------------------------------------
     6. Controlli globali
     ------------------------------------------------------------------- */

  function applyPresetToAll() {
    const value = globalPresetSelect.value;
    const kind = value.startsWith("img") ? "image" : "video";
    state.files
      .filter((item) => item.kind === kind)
      .forEach((item) => {
        item.preset = value;
        if (item._el) {
          const select = item._el.li.querySelector("[data-preset-select]");
          select.value = value;
        }
      });
  }

  /* ---------------------------------------------------------------------
     7. Pipeline immagini — Canvas API
     ------------------------------------------------------------------- */

  function computeTargetSize(w, h, maxWidth) {
    if (w <= maxWidth) return { width: w, height: h };
    const ratio = maxWidth / w;
    return { width: maxWidth, height: Math.max(1, Math.round(h * ratio)) };
  }

  async function loadBitmapOrImage(file) {
    if (window.createImageBitmap) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (e) {
        // ricade sul percorso <img>
      }
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
      img._objectUrl = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      try {
        canvas.toBlob((blob) => resolve(blob), type, quality);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function makeOutput(blob, name, format) {
    return { blob, name, format, size: blob.size, url: null };
  }

  async function processImageFile(item) {
    const preset = IMAGE_PRESETS[item.preset];
    const source = await loadBitmapOrImage(item.file);
    const srcW = source.width || source.naturalWidth;
    const srcH = source.height || source.naturalHeight;
    const { width, height } = computeTargetSize(srcW, srcH, preset.maxWidth);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    // Il contesto 2D di canvas opera nativamente in sRGB.
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, width, height);

    if (source.close) source.close();
    if (source._objectUrl) URL.revokeObjectURL(source._objectUrl);

    const base = stripExt(item.file.name);
    const outputs = [];

    updateProgress(item, 0.25);
    const webpBlob = await canvasToBlob(canvas, "image/webp", preset.quality);
    if (webpBlob) outputs.push(makeOutput(webpBlob, `${base}-${preset.suffix}.webp`, "webp"));

    updateProgress(item, 0.55);
    if (state.avifSupported) {
      const avifBlob = await canvasToBlob(canvas, "image/avif", preset.quality);
      if (avifBlob) outputs.push(makeOutput(avifBlob, `${base}-${preset.suffix}.avif`, "avif"));
    }

    updateProgress(item, 0.8);
    if (state.generateFallback) {
      const isPng = /png/i.test(item.file.type) || extOf(item.file.name) === ".png";
      const fbType = isPng ? "image/png" : "image/jpeg";
      const fbBlob = await canvasToBlob(canvas, fbType, isPng ? undefined : preset.quality);
      if (fbBlob) outputs.push(makeOutput(fbBlob, `${base}-${preset.suffix}.${isPng ? "png" : "jpg"}`, isPng ? "png" : "jpg"));
    }

    updateProgress(item, 1);
    if (outputs.length === 0) throw new Error("Nessun formato di output supportato da questo browser");
    return outputs;
  }

  /* ---------------------------------------------------------------------
     8. Pipeline video — FFmpeg.wasm
     ------------------------------------------------------------------- */

  function setFFmpegStatusText(text) {
    ffmpegStatus.textContent = text;
  }

  async function ensureFFmpeg() {
    if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
    if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

    ffmpegLoadingPromise = (async () => {
      if (typeof FFmpegWASM === "undefined" || typeof FFmpegUtil === "undefined") {
        throw new Error("Motore video non disponibile: verifica la connessione e ricarica la pagina.");
      }
      const { FFmpeg } = FFmpegWASM;
      const { toBlobURL } = FFmpegUtil;
      const ffmpeg = new FFmpeg();

      setFFmpegStatusText("Caricamento motore video (una tantum)…");
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      if (!ffmpegProgressBound) {
        ffmpeg.on("progress", ({ progress }) => {
          if (!state.activeVideoItem) return;
          const p = Number.isFinite(progress) ? progress : 0;
          const overall = (state.activeVariantIndex + Math.max(0, Math.min(1, p))) / state.activeVariantCount;
          updateProgress(state.activeVideoItem, overall);
        });
        ffmpegProgressBound = true;
      }

      setFFmpegStatusText("Motore video pronto.");
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();

    return ffmpegLoadingPromise;
  }

  function kbits(bitrateStr, multiplier) {
    const n = parseInt(bitrateStr, 10);
    return `${Math.round(n * multiplier)}k`;
  }

  function buildVideoVariants(presetKey, bgResolution) {
    if (presetKey === "vid-bg") {
      const res = bgResolution === "1080" ? 1080 : 720;
      const bitrate = res === 1080 ? "1800k" : "1000k";
      return [
        {
          format: "mp4", ext: "mp4", mime: "video/mp4",
          args: ["-vf", `scale=-2:${res}`, "-r", "30", "-an",
            "-c:v", "libx264", "-preset", "veryfast",
            "-b:v", bitrate, "-maxrate", bitrate, "-bufsize", kbits(bitrate, 2),
            "-movflags", "+faststart"],
        },
        {
          format: "webm", ext: "webm", mime: "video/webm",
          args: ["-vf", `scale=-2:${res}`, "-r", "30", "-an",
            "-c:v", "libvpx-vp9", "-b:v", bitrate,
            "-deadline", "realtime", "-cpu-used", "5", "-row-mt", "1"],
        },
      ];
    }
    // vid-content
    return [
      {
        format: "mp4", ext: "mp4", mime: "video/mp4",
        args: ["-vf", "scale=-2:1080", "-r", "30",
          "-c:v", "libx264", "-preset", "veryfast",
          "-b:v", "3M", "-maxrate", "3M", "-bufsize", "6M",
          "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"],
      },
      {
        format: "webm", ext: "webm", mime: "video/webm",
        args: ["-vf", "scale=-2:1080", "-r", "30",
          "-c:v", "libvpx-vp9", "-b:v", "3M",
          "-deadline", "realtime", "-cpu-used", "5", "-row-mt", "1",
          "-c:a", "libopus", "-b:a", "128k"],
      },
    ];
  }

  async function processVideoFile(item) {
    const ffmpeg = await ensureFFmpeg();
    const { fetchFile } = FFmpegUtil;

    const inExt = extOf(item.file.name) || ".mp4";
    const inputName = `in_${item.id}${inExt}`;
    const base = stripExt(item.file.name);
    const preset = VIDEO_PRESETS[item.preset];

    await ffmpeg.writeFile(inputName, await fetchFile(item.file));

    const variants = buildVideoVariants(item.preset, state.bgResolution);
    state.activeVideoItem = item;
    state.activeVariantCount = variants.length;

    const outputs = [];
    try {
      for (let i = 0; i < variants.length; i++) {
        state.activeVariantIndex = i;
        const v = variants[i];
        const outName = `out_${item.id}_${v.format}.${v.ext}`;
        await ffmpeg.exec(["-i", inputName, ...v.args, outName]);
        const data = await ffmpeg.readFile(outName);
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        const blob = new Blob([bytes.slice()], { type: v.mime });
        outputs.push(makeOutput(blob, `${base}-${preset.suffix}.${v.ext}`, v.format));
        await ffmpeg.deleteFile(outName);
      }
    } finally {
      state.activeVideoItem = null;
      try { await ffmpeg.deleteFile(inputName); } catch (e) { /* noop */ }
    }

    if (outputs.length === 0) throw new Error("Codifica video non riuscita");
    return outputs;
  }

  /* ---------------------------------------------------------------------
     9. Orchestrazione coda
     ------------------------------------------------------------------- */

  async function startProcessing() {
    const pending = state.files.filter((f) => f.status === "pending" || f.status === "error");
    if (pending.length === 0) return;

    startBtn.disabled = true;
    startBtn.textContent = "Elaborazione…";

    for (const item of pending) {
      setStatus(item, "processing");
      updateProgress(item, 0);
      try {
        const outputs = item.kind === "image"
          ? await processImageFile(item)
          : await processVideoFile(item);

        item.outputs = outputs;
        item.finalSize = pickPrimarySize(item, outputs);
        setStatus(item, "done");
        updateProgress(item, 1);
        addResultRow(item);
        recomputeTotals();
      } catch (err) {
        console.error(err);
        setStatus(item, "error", err && err.message ? err.message : "Errore");
      }
    }

    startBtn.disabled = false;
    startBtn.textContent = "Avvia conversione";
  }

  function pickPrimarySize(item, outputs) {
    const preferred = item.kind === "image" ? "webp" : "mp4";
    const match = outputs.find((o) => o.format === preferred);
    return (match || outputs[0]).size;
  }

  /* ---------------------------------------------------------------------
     10. Risultati e riepilogo risparmio
     ------------------------------------------------------------------- */

  function addResultRow(item) {
    const tr = document.createElement("tr");

    const savingsPct = item.originalSize > 0
      ? Math.round((1 - item.finalSize / item.originalSize) * 100)
      : 0;

    const pillsHtml = item.outputs.map((o) => {
      o.url = URL.createObjectURL(o.blob);
      return `<span class="format-pill">${o.format} · ${formatBytes(o.size)} <a href="${o.url}" download="${o.name}">↓</a></span>`;
    }).join("");

    const primary = item.outputs.find((o) => o.format === (item.kind === "image" ? "webp" : "mp4")) || item.outputs[0];

    tr.innerHTML = `
      <td class="max-w-[220px]"><p class="truncate">${item.file.name}</p><p class="text-mute mono">${item.kind === "image" ? "immagine" : "video"}</p></td>
      <td class="mono">${formatBytes(item.originalSize)}</td>
      <td>${pillsHtml}</td>
      <td class="mono">${formatBytes(item.finalSize)}</td>
      <td class="mono" style="color:${savingsPct >= 0 ? "var(--leaf)" : "var(--alert)"}">${savingsPct >= 0 ? "-" : "+"}${Math.abs(savingsPct)}%</td>
      <td><button class="btn-ghost" style="padding:6px 10px;font-size:12px" data-download-primary>Scarica</button></td>
    `;

    tr.querySelector("[data-download-primary]").addEventListener("click", () => {
      triggerDownload(primary.blob, primary.name);
    });

    resultsBody.appendChild(tr);
    resultsSection.style.display = "block";
  }

  function recomputeTotals() {
    const done = state.files.filter((f) => f.status === "done");
    const totalOriginal = done.reduce((s, f) => s + f.originalSize, 0);
    const totalFinal = done.reduce((s, f) => s + f.finalSize, 0);
    const pct = totalOriginal > 0 ? Math.round((1 - totalFinal / totalOriginal) * 100) : 0;
    totalSavings.textContent = `${pct >= 0 ? "-" : "+"}${Math.abs(pct)}%`;
  }

  /* ---------------------------------------------------------------------
     11. Export ZIP
     ------------------------------------------------------------------- */

  async function downloadAllZip() {
    const done = state.files.filter((f) => f.status === "done");
    if (done.length === 0) return;

    downloadZipBtn.disabled = true;
    const originalLabel = downloadZipBtn.textContent;
    downloadZipBtn.textContent = "Creazione archivio…";

    try {
      const zip = new JSZip();
      done.forEach((item) => {
        item.outputs.forEach((o) => zip.file(o.name, o.blob));
      });
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, "toto-convertore-output.zip");
    } catch (e) {
      console.error(e);
      alert("Impossibile creare l'archivio ZIP. Controlla la console per i dettagli.");
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.textContent = originalLabel;
    }
  }

  /* ---------------------------------------------------------------------
     12. Collegamento eventi
     ------------------------------------------------------------------- */

  dropzone.addEventListener("click", () => fileInput.click());
  browseBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("drag-active"); });
  });
  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("drag-active"); });
  });
  dropzone.addEventListener("drop", (e) => { handleFiles(e.dataTransfer.files); });

  fileInput.addEventListener("change", (e) => { handleFiles(e.target.files); fileInput.value = ""; });

  applyAllBtn.addEventListener("click", applyPresetToAll);
  fallbackToggle.addEventListener("change", () => { state.generateFallback = fallbackToggle.checked; });
  bgResolutionSelect.addEventListener("change", () => { state.bgResolution = bgResolutionSelect.value; });

  startBtn.addEventListener("click", startProcessing);
  clearBtn.addEventListener("click", clearQueue);
  downloadZipBtn.addEventListener("click", downloadAllZip);

  /* ---------------------------------------------------------------------
     13. Inizializzazione
     ------------------------------------------------------------------- */

  refreshQueueChrome();
  setFFmpegStatusText("Motore video: caricato al bisogno");

  detectAvifSupport().then((supported) => {
    state.avifSupported = supported;
    avifStatusChip.classList.remove("hidden");
    avifStatusChip.innerHTML = supported
      ? '<i class="dot dot-leaf"></i>AVIF supportato in questo browser'
      : '<i class="dot dot-mute"></i>AVIF non supportato qui — verrà generato solo WebP';
  });
})();
