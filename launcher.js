(() => {
  "use strict";


  /* Build024.8 診断版: .glink保存・復元経路の見える化 */
  const GLINK_DIAG_BUILD = "Build024.7-DIAG";
  const GLINK_DIAG_KEY = "gLink_restoreDiagnostics";
  function glinkDiagSummarizeData(data) {
    if (!data || typeof data !== "object") return { exists: false };
    const session = data.session || {};
    const bounds = session.bounds || data.bounds || null;
    return {
      exists: true,
      format: data.format || "",
      build: data.build || "",
      version: data.version || "",
      savedAt: data.savedAt || "",
      headerDisasterName: data.header?.disasterName || "",
      headerCreatedUnit: data.header?.createdUnit || "",
      sessionMapType: session.mapType || data.mapType || "",
      sessionZoom: session.zoom ?? data.zoom ?? "",
      sessionCenter: session.center || data.center || null,
      hasBounds: !!bounds,
      pins: Array.isArray(data.pins) ? data.pins.length : 0,
      drawings: Array.isArray(data.drawings) ? data.drawings.length : 0,
      tracks: Array.isArray(data.tracks) ? data.tracks.length : 0,
      measurements: Array.isArray(data.measurements) ? data.measurements.length : 0,
      activityHistory: Array.isArray(data.activityHistory) ? data.activityHistory.length : 0,
      hasMapPreviewImage: !!data.mapPreviewImage,
      hasCommandCenterPreviewImage: !!data.commandCenterPreviewImage,
      jsonBytes: (() => { try { return new Blob([JSON.stringify(data)]).size; } catch(e) { return -1; } })()
    };
  }
  function glinkDiagLog(event, details = {}) {
    const row = {
      time: new Date().toLocaleString("ja-JP"),
      page: location.pathname.split("/").pop() || "launcher.html",
      event,
      details
    };
    try {
      const list = JSON.parse(localStorage.getItem(GLINK_DIAG_KEY) || "[]");
      list.push(row);
      localStorage.setItem(GLINK_DIAG_KEY, JSON.stringify(list.slice(-80)));
    } catch (e) {}
    try { console.log("[G-Link DIAG]", row); } catch (e) {}
    glinkDiagRender();
  }
  function glinkDiagHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  }
  function glinkDiagRender() {
    try {
      let panel = document.getElementById("gLinkDiagPanel");
      if (!panel) {
        panel = document.createElement("section");
        panel.id = "gLinkDiagPanel";
        panel.style.cssText = "position:fixed;right:12px;bottom:12px;width:430px;max-height:55vh;overflow:auto;z-index:999999;background:rgba(17,24,39,.94);color:#fff;border:3px solid #facc15;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.35);font:12px/1.45 system-ui,'Meiryo',sans-serif;padding:12px;";
        document.body.appendChild(panel);
      }
      const list = JSON.parse(localStorage.getItem(GLINK_DIAG_KEY) || "[]").slice(-18).reverse();
      panel.innerHTML = `<div style="font-weight:800;color:#facc15;font-size:14px;margin-bottom:6px;">G-Link 復元診断版 ${GLINK_DIAG_BUILD}</div>` +
        `<div style="margin-bottom:8px;">この黄色枠が見えれば、診断版のファイルを開いています。</div>` +
        `<button id="gLinkDiagCopy" type="button" style="margin-right:6px;">診断ログをコピー</button><button id="gLinkDiagClear" type="button">ログ消去</button>` +
        `<pre style="white-space:pre-wrap;margin:8px 0 0;">${glinkDiagHtml(JSON.stringify(list, null, 2))}</pre>`;
      document.getElementById("gLinkDiagCopy")?.addEventListener("click", () => navigator.clipboard?.writeText(localStorage.getItem(GLINK_DIAG_KEY) || "[]"));
      document.getElementById("gLinkDiagClear")?.addEventListener("click", () => { localStorage.removeItem(GLINK_DIAG_KEY); glinkDiagRender(); });
    } catch (e) {}
  }
  function glinkDiagStorageSnapshot() {
    const keys = ["disasterSession", "gLink_workingData", "gLink_returnBackupData", "gLink_returnFromSaveCenter", "gLink_pendingRestoreData", "gLink_saveCenterData", "gLink_header", "gLink_launcherHeader"];
    const out = {};
    keys.forEach(key => {
      const s = sessionStorage.getItem(key);
      const l = localStorage.getItem(key);
      out[key] = { sessionBytes: s ? s.length : 0, localBytes: l ? l.length : 0 };
    });
    return out;
  }


  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const STORAGE_KEY = "gLink_launcherHeader";

  const stage = document.getElementById("launcherStage");
  const form = document.getElementById("launcherForm");
  const disasterInput = document.getElementById("disasterName");
  const unitInput = document.getElementById("createdUnit");
  const glinkProjectButton = document.getElementById("glinkProjectButton");
  const glinkProjectInput = document.getElementById("glinkProjectInput");
  const glinkProjectStatus = document.getElementById("glinkProjectStatus");
  glinkDiagLog("launcher.js loaded", { href: location.href, storage: glinkDiagStorageSnapshot(), hasProjectButton: !!glinkProjectButton, hasProjectInput: !!glinkProjectInput, hasProjectStatus: !!glinkProjectStatus });

  function resizeStage() {
    if (!stage) return;

    const scale = Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT
    );

    stage.style.transform = `scale(${scale})`;
    document.body.style.width = `${window.innerWidth}px`;
    document.body.style.height = `${window.innerHeight}px`;
  }

  function getNowText() {
    const now = new Date();
    const week = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${y}年${m}月${d}日（${week}） ${hh}:${mm}　現在`;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function loadPreviousValues() {
    // Build014:
    // 起動ページでは前回入力値を自動復元せず、常に未入力状態で表示する。
    // placeholder の薄字例はHTML側でそのまま表示され、
    // 入力後の保存・反映処理は saveLauncherHeader() で従来どおり実行する。
    if (disasterInput) disasterInput.value = "";
    if (unitInput) unitInput.value = "";
  }

  function saveLauncherHeader(disasterName, createdUnit) {
    const payload = {
      disasterName,
      createdUnit,
      dateTime: getNowText(),
      coordinateType: "dms",
      startedAt: new Date().toISOString(),
      version: "1.6.3",
      build: "Build014"
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    sessionStorage.setItem("gLink_header", JSON.stringify({
      dateTime: payload.dateTime,
      disasterName: payload.disasterName,
      createdUnit: payload.createdUnit,
      coordinateType: payload.coordinateType
    }));

    localStorage.setItem("gLink_header", JSON.stringify({
      dateTime: payload.dateTime,
      disasterName: payload.disasterName,
      createdUnit: payload.createdUnit,
      coordinateType: payload.coordinateType
    }));
  }



  function sanitizeGlinkPayloadForRestore(data) {
    if (!data || typeof data !== "object") return data;
    const payload = { ...data };
    delete payload.mapPreviewImage;
    delete payload.commandCenterPreviewImage;
    delete payload.previewImage;
    delete payload.previewImages;
    return payload;
  }

  function openGlinkProject(data) {
    glinkDiagLog("launcher openGlinkProject called", { summary: glinkDiagSummarizeData(data) });
    if (!data || data.format !== "glink") {
      alert("G-Link保存ファイル（.glink）として認識できませんでした。");
      return;
    }
    const restoreData = sanitizeGlinkPayloadForRestore(data);
    try {
      const json = JSON.stringify(restoreData);
      glinkDiagLog("launcher restoreData sanitized", { summary: glinkDiagSummarizeData(restoreData), jsonLength: json.length });
      sessionStorage.setItem("gLink_workingData", json);
      sessionStorage.setItem("gLink_returnBackupData", json);
      sessionStorage.setItem("gLink_returnFromSaveCenter", "1");
      sessionStorage.setItem("gLink_pendingRestoreData", json);
      localStorage.setItem("gLink_pendingRestoreData", json);
      glinkDiagLog("launcher before storage write", { storage: glinkDiagStorageSnapshot() });
      if (restoreData.session) {
        sessionStorage.setItem("disasterSession", JSON.stringify(restoreData.session));
        localStorage.setItem("disasterSession", JSON.stringify(restoreData.session));
      }
      glinkDiagLog("launcher after storage write", { storage: glinkDiagStorageSnapshot() });
      if (restoreData.header) {
        const header = {
          dateTime: restoreData.header.dateTime || getNowText(),
          disasterName: restoreData.header.disasterName || "",
          createdUnit: restoreData.header.createdUnit || "",
          coordinateType: restoreData.coordinateType || restoreData.header.coordinateType || "dms"
        };
        sessionStorage.setItem("gLink_header", JSON.stringify(header));
        localStorage.setItem("gLink_header", JSON.stringify(header));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(header));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(header));
      }
    } catch (error) {
      console.error(".glink読込データの一時保存に失敗しました。", error);
      alert(".glinkファイルの読込準備に失敗しました。GPX軌跡や図形の点数が非常に多い可能性があります。");
      return;
    }
    glinkDiagLog("launcher redirect fixed restore", { storage: glinkDiagStorageSnapshot() });
    if (glinkProjectStatus) glinkProjectStatus.textContent = "読込完了。指揮本部モードを開きます。";
    window.location.href = "fixed.html?restore=glink&diag=1";
  }

  function readGlinkProjectFile(file) {
    if (!file) return;
    const reader = new FileReader();
    if (glinkProjectStatus) glinkProjectStatus.textContent = "読み込み中です…";
    reader.onload = () => {
      try {
        openGlinkProject(JSON.parse(String(reader.result || "")));
      } catch (error) {
        console.error(".glinkファイルの解析に失敗しました。", error);
        if (glinkProjectStatus) glinkProjectStatus.textContent = "読み込みに失敗しました。";
        alert(".glinkファイルの読み込みに失敗しました。ファイル形式を確認してください。");
      }
    };
    reader.onerror = () => {
      if (glinkProjectStatus) glinkProjectStatus.textContent = "読み込みに失敗しました。";
      alert(".glinkファイルを読み込めませんでした。");
    };
    reader.readAsText(file, "utf-8");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const disasterName = normalizeText(disasterInput.value);
    const createdUnit = normalizeText(unitInput.value);

    if (!disasterName) {
      disasterInput.focus();
      disasterInput.reportValidity();
      return;
    }

    if (!createdUnit) {
      unitInput.focus();
      unitInput.reportValidity();
      return;
    }

    saveLauncherHeader(disasterName, createdUnit);
    window.location.href = "area.html";
  }

  window.addEventListener("resize", resizeStage);
  window.addEventListener("orientationchange", resizeStage);

  document.addEventListener("DOMContentLoaded", () => {
    resizeStage();
    loadPreviousValues();
    glinkDiagLog("launcher DOMContentLoaded", { activePage: "launcher.html", hasProjectPanel: !!document.querySelector(".project-open-panel"), panelText: document.querySelector(".project-open-panel")?.textContent?.trim() || "", storage: glinkDiagStorageSnapshot() });
    disasterInput.focus();
  });

  if (glinkProjectButton && glinkProjectInput) {
    glinkProjectButton.addEventListener("click", () => glinkProjectInput.click());
    glinkProjectInput.addEventListener("change", () => {
      readGlinkProjectFile(glinkProjectInput.files && glinkProjectInput.files[0]);
      glinkProjectInput.value = "";
    });
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
})();

