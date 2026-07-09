window.addEventListener("DOMContentLoaded", () => {
  const GLINK_RESTORE_DIAG_KEY = "gLink_restoreDiagnostics";

  function glinkDiagStorageSnapshot() {
    const keys = [
      "disasterSession",
      "gLink_pendingRestoreData",
      "gLink_workingData",
      "gLink_returnBackupData",
      "gLink_returnFromSaveCenter",
      "gLink_saveCenterData",
      "gLink_header",
      "gLink_launcherHeader"
    ];
    const snapshot = {};
    keys.forEach(key => {
      let sessionBytes = 0;
      let localBytes = 0;
      try { sessionBytes = (sessionStorage.getItem(key) || "").length; } catch (e) {}
      try { localBytes = (localStorage.getItem(key) || "").length; } catch (e) {}
      snapshot[key] = { sessionBytes, localBytes };
    });
    return snapshot;
  }

  function glinkDiagSummarizeData(data) {
    return {
      format: data?.format || "",
      build: data?.build || "",
      savedAt: data?.savedAt || "",
      hasSession: !!data?.session,
      mapType: data?.session?.mapType || data?.mapType || "",
      center: data?.session?.center || null,
      zoom: data?.session?.zoom ?? null,
      pins: Array.isArray(data?.pins) ? data.pins.length : 0,
      drawings: Array.isArray(data?.drawings) ? data.drawings.length : 0,
      tracks: Array.isArray(data?.tracks) ? data.tracks.length : 0,
      measurements: Array.isArray(data?.measurements) ? data.measurements.length : 0,
      activityHistory: Array.isArray(data?.activityHistory) ? data.activityHistory.length : 0
    };
  }

  function glinkDiagLog(event, details = {}) {
    const entry = {
      time: new Date().toLocaleString("ja-JP", { hour12: false }),
      page: "save.html",
      build: "Build025.6-DIAG",
      event,
      details
    };
    try {
      const raw = sessionStorage.getItem(GLINK_RESTORE_DIAG_KEY) || localStorage.getItem(GLINK_RESTORE_DIAG_KEY) || "[]";
      const list = JSON.parse(raw);
      list.push(entry);
      const json = JSON.stringify(list.slice(-80));
      sessionStorage.setItem(GLINK_RESTORE_DIAG_KEY, json);
      localStorage.setItem(GLINK_RESTORE_DIAG_KEY, json);
    } catch (error) {}
    try { console.info("[G-Link Restore]", entry); } catch (error) {}
  }
  function glinkDiagInstallPanel() {
    if (document.getElementById("gLinkRestoreDiagPanel")) return;
    const panel = document.createElement("div");
    panel.id = "gLinkRestoreDiagPanel";
    panel.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:999999;background:rgba(17,24,39,.92);color:#fff;border:2px solid #facc15;border-radius:10px;padding:10px 12px;font:12px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:360px;";
    panel.innerHTML = '<div style="font-weight:700;margin-bottom:6px;">G-Link 保存診断 Build025.6</div><div id="gLinkRestoreDiagSummary" style="margin-bottom:8px;color:#fde68a;">診断ログを記録中</div><button id="gLinkRestoreDiagCopy" type="button" style="background:#facc15;color:#111827;border:0;border-radius:6px;padding:6px 10px;font-weight:700;cursor:pointer;">診断ログをコピー</button><button id="gLinkRestoreDiagHide" type="button" style="margin-left:6px;background:#374151;color:#fff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;">隠す</button>';
    document.body.appendChild(panel);
    const copyBtn = document.getElementById("gLinkRestoreDiagCopy");
    const hideBtn = document.getElementById("gLinkRestoreDiagHide");
    if (copyBtn) copyBtn.addEventListener("click", async () => {
      const raw = sessionStorage.getItem(GLINK_RESTORE_DIAG_KEY) || localStorage.getItem(GLINK_RESTORE_DIAG_KEY) || "[]";
      try { await navigator.clipboard.writeText(raw); } catch (e) {
        const ta = document.createElement("textarea"); ta.value = raw; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }
      const summary = document.getElementById("gLinkRestoreDiagSummary");
      if (summary) summary.textContent = "コピーしました。この内容を貼り付けてください。";
    });
    if (hideBtn) hideBtn.addEventListener("click", () => panel.remove());
  }

  function glinkDiagUpdatePanel(message) {
    try { glinkDiagInstallPanel(); const s = document.getElementById("gLinkRestoreDiagSummary"); if (s) s.textContent = message; } catch(e) {}
  }
  const menuButtons = document.querySelectorAll(".sideMenuItem[data-mode]");
  const screenTitle = document.getElementById("screenTitle");
  const screenLead = document.getElementById("screenLead");
  const previewTitle = document.getElementById("previewTitle");
  const settingsTitle = document.getElementById("settingsTitle");
  const primarySaveBtn = document.getElementById("primarySaveBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const closeBtn = document.getElementById("closeBtn");
  const titleInput = document.getElementById("titleInput");
  const createdUnitInput = document.getElementById("createdUnitInput");
  const paperSizeSelect = document.getElementById("paperSize");
  const orientationInputs = document.querySelectorAll('input[name="orientation"]');
  const zoomSelect = document.getElementById("zoomSelect");
 
  const includeHeader = document.getElementById("includeHeader");
  const includeHeaderSection = document.getElementById("includeHeaderSection");
  const includeLegend = document.getElementById("includeLegend");
  const includeMeasurements = document.getElementById("includeMeasurements");
  const includeHistory = document.getElementById("includeHistory");
  const displayItemOptions = document.getElementById("displayItemOptions");
  const csvExportOptions = document.getElementById("csvExportOptions");
  const csvIncludeHistory = document.getElementById("csvIncludeHistory");
  const csvIncludeMeasurements = document.getElementById("csvIncludeMeasurements");
 
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageIndicator = document.getElementById("pageIndicator");
  const mapPage = document.getElementById("mapPage");
  const infoPage = document.getElementById("infoPage");
  const glinkNoPreviewPanel = document.getElementById("glinkNoPreviewPanel");
  const previewCanvas = document.getElementById("previewCanvas");
  const liveMapPreview = document.getElementById("liveMapPreview");
  const mapPreviewImage = document.getElementById("mapPreviewImage");
  const mapPreviewFallback = document.getElementById("mapPreviewFallback");
 
  const headerDatePreview = document.getElementById("headerDatePreview");
  const headerDisasterPreview = document.getElementById("headerDisasterPreview");
  const headerUnitPreview = document.getElementById("headerUnitPreview");
  const mapHeaderDatePreview = document.getElementById("mapHeaderDatePreview");
  const mapHeaderDisasterPreview = document.getElementById("mapHeaderDisasterPreview");
  const mapHeaderUnitPreview = document.getElementById("mapHeaderUnitPreview");
  const mapHeaderGridPreview = document.getElementById("mapHeaderGridPreview");
  const headerGridPreview = document.getElementById("headerGridPreview");
  const settingDatePreview = document.getElementById("settingDatePreview");
  const settingDisasterPreview = document.getElementById("settingDisasterPreview");
  const settingUnitPreview = document.getElementById("settingUnitPreview");
  const settingGridPreview = document.getElementById("settingGridPreview");
  const infoPageTitle = document.getElementById("infoPageTitle");
  const legendPreviewList = document.getElementById("legendPreviewList");
  const measurementPreviewRows = document.getElementById("measurementPreviewRows");
  const historyPreviewRows = document.getElementById("historyPreviewRows");
  const pageThumbs = document.querySelectorAll(".pageThumb[data-page]");
  const glinkLoadBtn = document.getElementById("glinkLoadBtn");
  const glinkLoadInput = document.getElementById("glinkLoadInput");
 
  const HEADER_STORAGE_KEY = "gLink_header";
 
  const saveCenterData = loadSaveCenterData();
  glinkDiagLog("save.js loaded", { href: location.href, saveCenterSummary: glinkDiagSummarizeData(saveCenterData), storage: glinkDiagStorageSnapshot() });
  let currentMode = "glink";
  let currentPage = 1;
  let previewMap = null;
  let previewTileLayer = null;
  let previewFeatureLayer = null;
  let previewGridLayer = null;
 
  const modes = {
    glink: {
      title: "保存センター - ファイル保存",
      lead: "G-Link専用保存ファイル（.glink）として、ピン・図形・計測・GPX軌跡などの編集状態を保存します。",
      previewTitle: "保存内容確認（.glink）",
      settingsTitle: "ファイル保存・読込設定",
      saveLabel: "💾 .glinkを保存",
      extension: "glink"
    },
    pdf: {
      title: "保存センター - PDF保存プレビュー",
      lead: "1ページ目はグリッド付き地図のみ、2ページ目以降に選択した情報を反映します。",
      previewTitle: "PDFプレビュー（地図全面＋情報ページ）",
      settingsTitle: "PDF設定",
      saveLabel: "💾 PDFを保存",
      extension: "pdf"
    },
    png: {
      title: "保存センター - PNG保存プレビュー",
      lead: "指揮本部モードの地図画面を画像として保存します。",
      previewTitle: "PNGプレビュー（地図全面）",
      settingsTitle: "PNG設定",
      saveLabel: "🖼 PNGを保存",
      extension: "png"
    },
    csv: {
      title: "保存センター - CSV出力",
      lead: "活動履歴・計測図形のうち、チェックしたものをCSV形式で出力します。",
      previewTitle: "CSVプレビュー",
      settingsTitle: "CSV設定",
      saveLabel: "📊 CSVを保存",
      extension: "csv"
    }
  };
 
  const mapLayers = {
    pale: { url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", maxZoom: 18 },
    std: { url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", maxZoom: 18 },
    photo: { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", maxZoom: 18 },
    relief: { url: "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png", maxZoom: 15 },
    hillshade: { url: "https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png", maxZoom: 16 }
  };
 
  function getFormattedNowForHeader() {
    const now = new Date();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}） ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}　現在`;
  }
 
  function loadSharedHeader() {
    const fallback = {
      dateTime: getFormattedNowForHeader(),
      disasterName: "",
      createdUnit: "",
      coordinateType: "dms"
    };
 
    try {
      const raw = sessionStorage.getItem(HEADER_STORAGE_KEY) || localStorage.getItem(HEADER_STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        ...fallback,
        ...parsed,
        dateTime: parsed.dateTime || fallback.dateTime,
        disasterName: parsed.disasterName || "",
        createdUnit: parsed.createdUnit || "",
        coordinateType: parsed.coordinateType || fallback.coordinateType
      };
    } catch (error) {
      console.warn("共通ヘッダー情報を読み込めませんでした。", error);
      return fallback;
    }
  }
 
  function saveSharedHeader(patch = {}) {
    const current = loadSharedHeader();
    const next = {
      ...current,
      ...patch,
      dateTime: patch.dateTime ?? current.dateTime ?? getFormattedNowForHeader(),
      disasterName: patch.disasterName ?? current.disasterName ?? "",
      createdUnit: patch.createdUnit ?? current.createdUnit ?? "",
      coordinateType: patch.coordinateType ?? current.coordinateType ?? "dms",
      updatedAt: new Date().toISOString()
    };
 
    sessionStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(next));
 
    try {
      const rawSession = sessionStorage.getItem("disasterSession");
      if (rawSession) {
        const storedSession = JSON.parse(rawSession);
        storedSession.header = {
          dateTime: next.dateTime,
          disasterName: next.disasterName,
          createdUnit: next.createdUnit,
          coordinateType: next.coordinateType
        };
        sessionStorage.setItem("disasterSession", JSON.stringify(storedSession));
      }
    } catch (error) {
      console.warn("災害セッションへヘッダー情報を反映できませんでした。", error);
    }
 
    saveCenterData.header = {
      ...(saveCenterData.header || {}),
      dateTime: next.dateTime,
      disasterName: next.disasterName,
      createdUnit: next.createdUnit,
      coordinateType: next.coordinateType
    };
 
    try {
      const saveCenterJson = JSON.stringify(saveCenterData);
      sessionStorage.setItem("gLink_saveCenterData", saveCenterJson);
      localStorage.setItem("gLink_saveCenterData", saveCenterJson);
      // 保存センターで災害名・作成部隊を修正した場合も、
      // 指揮本部モードへ戻った際に同じ作業状態として復元できるよう退避データにも反映する。
      sessionStorage.setItem("gLink_workingData", saveCenterJson);
      localStorage.setItem("gLink_workingData", saveCenterJson);
      sessionStorage.setItem("gLink_returnBackupData", saveCenterJson);
      localStorage.setItem("gLink_returnBackupData", saveCenterJson);
    } catch (error) {
      console.warn("保存センター用データへヘッダー情報を反映できませんでした。", error);
    }
 
    return next;
  }
 
  function loadSaveCenterData() {
    try {
      const raw = sessionStorage.getItem("gLink_saveCenterData") || localStorage.getItem("gLink_saveCenterData");
      if (raw) {
        const parsed = JSON.parse(raw) || {};
        const sharedHeader = loadSharedHeader();
        const existingHeader = parsed.header || {};
        parsed.header = {
          ...sharedHeader,
          ...existingHeader,
          dateTime: existingHeader.dateTime || sharedHeader.dateTime,
          disasterName: existingHeader.disasterName || sharedHeader.disasterName,
          createdUnit: existingHeader.createdUnit || sharedHeader.createdUnit,
          coordinateType: existingHeader.coordinateType || sharedHeader.coordinateType
        };
        return parsed;
      }
 
      // 保存センターを直接開いた場合の最低限のフォールバック。
      const sessionRaw = sessionStorage.getItem("disasterSession");
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        return {
          format: "glink",
          version: "1.6.0",
          header: { ...loadSharedHeader(), ...(session.header || {}) },
          session: {
            ...session,
            bounds: normalizeBoundsObject(session.bounds),
            center: normalizePointObject(session.center)
          },
          mapType: session.mapType || "pale",
          gridSize: session.gridSize || 0,
          pins: [],
          drawings: [],
          measurements: [],
          activityHistory: []
        };
      }
 
      return {};
    } catch (error) {
      console.warn("保存センター用データを読み込めませんでした。", error);
      return {};
    }
  }
 
  function normalizePointObject(point) {
    if (!point) return null;
    if (typeof point.lat === "number" && typeof point.lng === "number") return { lat: point.lat, lng: point.lng };
    return null;
  }
 
  function normalizeBoundsObject(bounds) {
    if (!bounds) return null;
    if (bounds.southWest && bounds.northEast) return bounds;
    if (bounds._southWest && bounds._northEast) {
      return {
        southWest: { lat: Number(bounds._southWest.lat), lng: Number(bounds._southWest.lng) },
        northEast: { lat: Number(bounds._northEast.lat), lng: Number(bounds._northEast.lng) }
      };
    }
    return null;
  }
 
  function getHeader() {
    const sharedHeader = loadSharedHeader();
    const header = saveCenterData.header || {};
    return {
      ...sharedHeader,
      ...header,
      dateTime: header.dateTime || sharedHeader.dateTime || "",
      disasterName: header.disasterName || sharedHeader.disasterName || "",
      createdUnit: header.createdUnit || sharedHeader.createdUnit || "",
      coordinateType: header.coordinateType || sharedHeader.coordinateType || "dms"
    };
  }
 
 
  function getSelectedPaperSizeKey() {
    const text = paperSizeSelect ? String(paperSizeSelect.value || paperSizeSelect.options?.[paperSizeSelect.selectedIndex]?.text || "") : "A3";
    const match = text.match(/A[0-4]/i);
    return match ? match[0].toUpperCase() : "A3";
  }
 
  function getSelectedOrientationKey() {
    const checked = Array.from(orientationInputs || []).find(input => input.checked);
    const labelText = checked?.closest("label")?.textContent || "";
    return labelText.includes("縦") ? "portrait" : "landscape";
  }
 
  function getPaperSizeMm() {
    const paperSizes = {
      A0: { width: 841, height: 1189 },
      A1: { width: 594, height: 841 },
      A2: { width: 420, height: 594 },
      A3: { width: 297, height: 420 },
      A4: { width: 210, height: 297 }
    };
    const base = paperSizes[getSelectedPaperSizeKey()] || paperSizes.A3;
    const orientation = getSelectedOrientationKey();
    if (orientation === "landscape") return { width: base.height, height: base.width, orientation };
    return { width: base.width, height: base.height, orientation };
  }
 
  function applyPaperPreviewRatio() {
    if (!mapPage || !previewCanvas) return;
 
    // Version1.6.3 Build012
    // PDF保存・PNG保存の白背面を、選択中の用紙サイズと向きの比率で表示する。
    // 保存対象画像そのものは変更せず、保存センター上のプレビュー表示だけを調整する。
    const size = getPaperSizeMm();
    const ratio = size.width / size.height;
    mapPage.style.setProperty("--paper-preview-ratio", `${size.width} / ${size.height}`);
 
    if (currentMode === "csv") return;
 
    const canvasRect = previewCanvas.getBoundingClientRect();
    const maxW = Math.max(320, canvasRect.width - 28);
    const maxH = Math.max(320, canvasRect.height - 28);
    const maxPaperW = 1120;
    let targetW = Math.min(maxW, maxPaperW);
    let targetH = targetW / ratio;
 
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * ratio;
    }
 
    mapPage.style.width = `${Math.floor(targetW)}px`;
    mapPage.style.height = `${Math.floor(targetH)}px`;
  }
 
   function safeFileName(name) {
    return String(name || "G-Link保存データ")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "G-Link保存データ";
  }
 
  function makeTimestampForUrlFile() {
    const now = new Date();
    return now.getFullYear().toString()
      + "-"
      + String(now.getMonth() + 1).padStart(2, "0")
      + "-"
      + String(now.getDate()).padStart(2, "0")
      + "_"
      + String(now.getHours()).padStart(2, "0")
      + "-"
      + String(now.getMinutes()).padStart(2, "0");
  }

  function makeDefaultFileName(extension) {
    const header = getHeader();
    if (extension === "glink") {
      const projectName = safeFileName(titleInput.value || header.disasterName || "G-Link〈災害情報共有システム〉（固定表示モード）");
      return `${projectName}_${makeTimestampForUrlFile()}.glink`;
    }

    const disasterName = safeFileName(titleInput.value || header.disasterName || "G-Link");
    const createdUnit = safeFileName((createdUnitInput ? createdUnitInput.value : header.createdUnit) || "");
    const now = new Date();
    const stamp = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, "0")
      + String(now.getDate()).padStart(2, "0")
      + "_"
      + String(now.getHours()).padStart(2, "0")
      + String(now.getMinutes()).padStart(2, "0");
 
    const typeLabels = {
      glink: "G-Link",
      url: "G-Link",
      pdf: "PDF",
      png: "PNG",
      csv: "CSV"
    };
    const typeLabel = typeLabels[extension] || String(extension || "保存").toUpperCase();
    const parts = createdUnit ? [disasterName, createdUnit, typeLabel, stamp] : [disasterName, typeLabel, stamp];
    return `${parts.join("_")}.${extension}`;
  }
 
  function getSaveOptions() {
    return {
      paperSize: getSelectedPaperSizeKey(),
      orientation: getSelectedOrientationKey(),
      quality: document.getElementById("qualitySelect")?.value || "標準（300dpi）",
      includeHeader: !!includeHeader?.checked,
      includeHeaderSection: !!includeHeaderSection?.checked,
      includeLegend: !!includeLegend?.checked,
      includeMeasurements: !!includeMeasurements?.checked,
      includeHistory: !!includeHistory?.checked,
      csvIncludeHistory: !!csvIncludeHistory?.checked,
      csvIncludeMeasurements: !!csvIncludeMeasurements?.checked
    };
  }
 
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function formatDecimalCoordinate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(6) : "";
  }

  function toDmsParts(value) {
    const absolute = Math.abs(Number(value));
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;
    return { degrees, minutes, seconds };
  }

  function formatDmsCoordinate(value, axis) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    const parts = toDmsParts(number);
    const suffix = axis === "lat" ? (number >= 0 ? "N" : "S") : (number >= 0 ? "E" : "W");
    return `${parts.degrees}度${parts.minutes}分${parts.seconds.toFixed(2)}秒${suffix}`;
  }

  function formatLatLngPair(lat, lng) {
    const header = getHeader();
    if (header.coordinateType === "decimal") {
      return `${formatDecimalCoordinate(lat)}, ${formatDecimalCoordinate(lng)}`;
    }
    return `${formatDmsCoordinate(lat, "lat")}, ${formatDmsCoordinate(lng, "lng")}`;
  }

  function getHistoryPinNo(item, index) {
    return item && item.pinNo ? item.pinNo : String(index + 1);
  }

  function getHistorySortTimestamp(item, index) {
    const completed = Number(item && item.completedTimestamp);
    if (Number.isFinite(completed) && completed > 0) return completed;

    const awareness = Number(item && item.awarenessTimestamp);
    if (Number.isFinite(awareness) && awareness > 0) return awareness;

    const pinNo = Number(item && item.pinNo);
    if (Number.isFinite(pinNo) && pinNo > 0) return pinNo;

    return Number.isFinite(index) ? index : 0;
  }

  function sortActivityHistoryChronological(list) {
    return (Array.isArray(list) ? list : []).slice().sort((a, b) => {
      const timeDiff = getHistorySortTimestamp(a) - getHistorySortTimestamp(b);
      if (timeDiff !== 0) return timeDiff;

      const pinNoDiff = Number(a && a.pinNo) - Number(b && b.pinNo);
      if (Number.isFinite(pinNoDiff) && pinNoDiff !== 0) return pinNoDiff;

      return String(a && a.id || "").localeCompare(String(b && b.id || ""));
    });
  }
 
  function getSessionBounds() {
    const bounds = normalizeBoundsObject(saveCenterData.session?.bounds || saveCenterData.bounds);
    const sw = bounds?.southWest;
    const ne = bounds?.northEast;
    if (!sw || !ne) return null;
    if (![sw.lat, sw.lng, ne.lat, ne.lng].every(v => Number.isFinite(v))) return null;
    return [[sw.lat, sw.lng], [ne.lat, ne.lng]];
  }
 
  function getMapType() {
    return saveCenterData.session?.mapType || saveCenterData.mapType || "pale";
  }
 
  function getGridSizeText() {
    const grid = Number(saveCenterData.session?.gridSize || saveCenterData.gridSize || 0);
    return grid > 0 ? `${grid}m` : "なし";
  }
 
  function getCurrentPreviewImageSource() {
    // Version1.6.3 Build013
    // .glinkファイル保存は編集データ保存のため、プレビュー画像を表示しない。
    if (currentMode === "glink") return "";
    return saveCenterData.mapPreviewImage || "";
  }
 
  function reflectMapPreviewImage() {
    applyPaperPreviewRatio();
    // Version1.6.3 Build010
    // PDF・PNGは従来どおり印刷/画像保存用の切り出しプレビューを使用し、
    // .glinkファイル保存だけは編集再開を前提に指揮本部モード全体プレビューを表示する。
    const imageSource = getCurrentPreviewImageSource();
 
    if (imageSource) {
      mapPreviewImage.src = imageSource;
      mapPreviewImage.classList.add("is-visible");
      mapPreviewImage.classList.remove("is-hidden");
      liveMapPreview.classList.remove("is-visible");
      liveMapPreview.innerHTML = "";
      mapPreviewFallback.classList.add("is-hidden");
      return;
    }
 
    mapPreviewImage.removeAttribute("src");
    mapPreviewImage.classList.remove("is-visible");
    mapPreviewImage.classList.add("is-hidden");
    liveMapPreview.classList.remove("is-visible");
    liveMapPreview.innerHTML = "";
    mapPreviewFallback.classList.remove("is-hidden");
  }
 
  function buildLiveMapPreview() {
    // Version1.6.1 Build006
    // 保存センター側でのLeaflet再描画は廃止。
    // 指揮本部モードから渡された完成PNGのみを使用する。
    return false;
  }
 
  function drawPreviewGridOverlay() {
    // Version1.6.1 Build006
    // グリッド線・番号は指揮本部モード側でPNGに焼き込むため、保存センターでは描画しない。
    return;
  }
 
  function getPreviewGridInfo(fixedBounds, gridSize) {
    if (!fixedBounds || !gridSize || gridSize === 0) return null;
 
    const meterPerLat = 111320;
    const baseLat = fixedBounds.getCenter().lat;
    const latStep = gridSize / meterPerLat;
    const lngStep = gridSize / (111320 * Math.cos(baseLat * Math.PI / 180));
 
    return {
      latStep,
      lngStep,
      westLine: Math.floor(fixedBounds.getWest() / lngStep) * lngStep,
      eastLine: Math.ceil(fixedBounds.getEast() / lngStep) * lngStep,
      southLine: Math.floor(fixedBounds.getSouth() / latStep) * latStep,
      northLine: Math.ceil(fixedBounds.getNorth() / latStep) * latStep
    };
  }
 
  function getPreviewGridLineOptions() {
    const defaults = { color: "#888888", opacity: 0.5, weight: 1 };
    let settings = { ...defaults };
 
    try {
      const saved = localStorage.getItem("fireGridLineSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        settings = {
          color: parsed.color || defaults.color,
          opacity: Number.isFinite(Number(parsed.opacity)) ? Number(parsed.opacity) : defaults.opacity,
          weight: Number.isFinite(Number(parsed.weight)) ? Number(parsed.weight) : defaults.weight
        };
      }
    } catch (e) {
      settings = { ...defaults };
    }
 
    return {
      color: settings.color,
      weight: settings.weight,
      opacity: settings.opacity,
      interactive: false
    };
  }
 
  function getColumnName(index) {
    let name = "";
    let n = index;
    while (n >= 0) {
      name = String.fromCharCode((n % 26) + 65) + name;
      n = Math.floor(n / 26) - 1;
    }
    return name;
  }
 
  function labelCell(text) {
    const el = document.createElement("div");
    el.textContent = text;
    return el;
  }
 
  function toLatLng(point) {
    if (!point || typeof point.lat !== "number" || typeof point.lng !== "number") return null;
    return [point.lat, point.lng];
  }
 
  function normalizeLatLngArray(value) {
    if (!Array.isArray(value)) return [];
    if (value.length && value[0] && typeof value[0].lat === "number") {
      return value.map(toLatLng).filter(Boolean);
    }
    if (value.length && Array.isArray(value[0])) {
      return normalizeLatLngArray(value[0]);
    }
    return [];
  }
 
  function drawPreviewFeatures() {
    if (!previewMap || !previewFeatureLayer) return;
    previewFeatureLayer.clearLayers();
 
    const pinColors = {
      fire: "#e60000",
      rescue: "#ff7a00",
      emergency: "#0066ff",
      completed: "#000000"
    };
 
    (Array.isArray(saveCenterData.tracks) ? saveCenterData.tracks : []).forEach(item => {
      const pts = normalizeLatLngArray(item.points);
      if (pts.length < 2) return;
      L.polyline(pts, {
        color: item.color || "#facc15",
        weight: Number(item.weight || 5),
        opacity: Number(item.opacity ?? 1)
      }).addTo(previewFeatureLayer);
    });

    (Array.isArray(saveCenterData.measurements) ? saveCenterData.measurements : []).forEach(item => {
      const pts = normalizeLatLngArray(item.points);
      if (pts.length < 3) return;
      const style = item.style || {};
      L.polygon(pts, {
        color: style.lineColor || style.color || "#7e22ce",
        weight: Number(style.weight || 3),
        opacity: 0.95,
        fillColor: style.fillColor || style.lineColor || "#a855f7",
        fillOpacity: Number(style.opacity ?? 0.35)
      }).addTo(previewFeatureLayer);
    });
 
    (Array.isArray(saveCenterData.drawings) ? saveCenterData.drawings : []).forEach(item => {
      const meta = item.meta || {};
      const color = meta.color || "#0066ff";
      const opt = { color, weight: Number(meta.weight || 4), opacity: Number(meta.opacity || 1), fillColor: color, fillOpacity: meta.fillMode === "semi" ? 0.25 : 0 };
      if (item.circleCenter && typeof item.radius === "number") {
        const c = toLatLng(item.circleCenter);
        if (c) L.circle(c, { ...opt, radius: item.radius }).addTo(previewFeatureLayer);
        return;
      }
      if (item.arrowStart && item.arrowEnd) {
        const s = toLatLng(item.arrowStart);
        const e = toLatLng(item.arrowEnd);
        if (s && e) L.polyline([s, e], opt).addTo(previewFeatureLayer);
        return;
      }
      const pts = normalizeLatLngArray(item.latlngs);
      if (pts.length >= 2) {
        if (meta.type === "rectangle" || meta.type === "circle") L.polygon(pts, opt).addTo(previewFeatureLayer);
        else L.polyline(pts, opt).addTo(previewFeatureLayer);
      }
    });
 
    (Array.isArray(saveCenterData.pins) ? saveCenterData.pins : []).forEach((pin, index) => {
      if (typeof pin.lat !== "number" || typeof pin.lng !== "number") return;
      const color = pin.completed ? pinColors.completed : (pinColors[pin.type] || "#e60000");
      const number = String(index + 1);
      const fontSize = number.length >= 3 ? 9 : (number.length >= 2 ? 10 : 12);
      L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
          className: pin.completed ? "previewNumberedPin completed" : "previewNumberedPin",
          html: `<div style="background-color:${escapeHtml(color)};font-size:${fontSize}px;">${escapeHtml(number)}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        })
      }).addTo(previewFeatureLayer);
    });
  }
 

  function shrinkInlineTextToFit(element, maxSize = 14, minSize = 8) {
    if (!element) return;
    element.style.fontSize = `${maxSize}px`;
    element.style.letterSpacing = "0";

    const availableWidth = Math.max(0, element.clientWidth - 2);
    if (!availableWidth) return;

    let size = maxSize;
    while (size > minSize && element.scrollWidth > availableWidth) {
      size -= 0.5;
      element.style.fontSize = `${size}px`;
    }

    if (element.scrollWidth > availableWidth) {
      element.style.letterSpacing = "-0.6px";
    }
  }

  function adjustMapPrintHeaderNoWrap() {
    [mapHeaderDatePreview, mapHeaderDisasterPreview, mapHeaderUnitPreview, mapHeaderGridPreview].forEach(el => shrinkInlineTextToFit(el, 10.5, 7));
  }

  function reflectHeaderInfo() {
    const header = getHeader();
    const disasterName = header.disasterName || "";
    const dateTime = header.dateTime || "-";
    const createdUnit = header.createdUnit || "-";
    const gridSizeText = getGridSizeText();
 
    titleInput.value = disasterName;
    if (createdUnitInput) createdUnitInput.value = createdUnit === "-" ? "" : createdUnit;
    infoPageTitle.textContent = disasterName || "保存情報";
 
    headerDatePreview.textContent = dateTime || "-";
    headerDisasterPreview.textContent = disasterName || "-";
    headerUnitPreview.textContent = createdUnit || "-";
    if (headerGridPreview) headerGridPreview.textContent = gridSizeText;
 
    if (mapHeaderDatePreview) mapHeaderDatePreview.textContent = dateTime || "-";
    if (mapHeaderDisasterPreview) mapHeaderDisasterPreview.textContent = disasterName || "-";
    if (mapHeaderUnitPreview) mapHeaderUnitPreview.textContent = createdUnit || "-";
    if (mapHeaderGridPreview) mapHeaderGridPreview.textContent = gridSizeText;
 
    settingDatePreview.textContent = dateTime || "-";
    settingDisasterPreview.textContent = disasterName || "-";
    settingUnitPreview.textContent = createdUnit || "-";
    if (settingGridPreview) settingGridPreview.textContent = gridSizeText;
    adjustMapPrintHeaderNoWrap();
  }
 
  function reflectLegend() {
    const fallback = [
      { label: "火災", color: "#e60000" },
      { label: "救助", color: "#ff7a00" },
      { label: "救急", color: "#0066ff" },
      { label: "活動完了", color: "#000000" }
    ];
 
    const allowedTypes = new Set(["fire", "rescue", "emergency", "completed"]);
    const sourceLegend = Array.isArray(saveCenterData.pinLegend) && saveCenterData.pinLegend.length
      ? saveCenterData.pinLegend
      : fallback;
    const legend = sourceLegend.filter(item => allowedTypes.has(item.type) || ["火災", "救助", "救急", "活動完了"].includes(item.label));
 
    legendPreviewList.innerHTML = (legend.length ? legend : fallback).map(item => {
      const color = item.color || "#111111";
      const label = item.label || item.type || "未分類";
      return `<div><span class="legendCircle" style="background:${escapeHtml(color)};"></span>${escapeHtml(label)}</div>`;
    }).join("");
  }
 
  function reflectMeasurementRows() {
    const list = Array.isArray(saveCenterData.measurements) ? saveCenterData.measurements : [];
    if (!list.length) {
      measurementPreviewRows.innerHTML = `<tr><td colspan="5">計測図形はありません。</td></tr>`;
      return;
    }
 
    measurementPreviewRows.innerHTML = list.map((item, index) => {
      const areaM2 = Math.round(Number(item.areaM2 || 0)).toLocaleString("ja-JP");
      const areaHa = Number(item.areaHa || 0).toFixed(3);
      const gridCount = item.gridRange?.gridCount || 0;
      return `<tr><td>${index + 1}</td><td>${escapeHtml(item.name || "名称未設定")}</td><td>${areaM2}</td><td>${areaHa}</td><td>${gridCount}グリッド</td></tr>`;
    }).join("");
  }
 
  function reflectHistoryRows() {
    const list = sortActivityHistoryChronological(saveCenterData.activityHistory);
    if (!list.length) {
      historyPreviewRows.innerHTML = `<tr><td colspan="10">活動履歴はありません。</td></tr>`;
      return;
    }
 
    historyPreviewRows.innerHTML = list.slice(0, 20).map((item, index) => {
      const coordinateText = (typeof item.lat === "number" && typeof item.lng === "number") ? formatLatLngPair(item.lat, item.lng) : "-";
      return `<tr>
        <td>${escapeHtml(getHistoryPinNo(item, index))}</td>
        <td>${escapeHtml(item.typeLabel || item.type || "-")}</td>
        <td>${escapeHtml(item.gridNo || "-")}</td>
        <td>${escapeHtml(coordinateText)}</td>
        <td>${escapeHtml(item.awarenessLabel || "-")}</td>
        <td>${escapeHtml(item.completedLabel || "-")}</td>
        <td>${escapeHtml(item.incidentNo || "-")}</td>
        <td>${escapeHtml(item.summary || "-")}</td>
        <td>${escapeHtml(item.units || "-")}</td>
        <td>${escapeHtml(item.injured ?? 0)}</td>
      </tr>`;
    }).join("");
  }
 
  function updateInfoSections() {
    const isCsv = currentMode === "csv";
    document.body.classList.toggle("csvMode", isCsv);
    displayItemOptions.classList.toggle("hidden", isCsv);
    csvExportOptions.classList.toggle("hidden", !isCsv);
 
    if (mapPrintHeader) {
      mapPrintHeader.style.display = includeHeader.checked ? "grid" : "none";
    }
 
    const visibility = isCsv ? {
      header: false,
      legend: false,
      measurements: csvIncludeMeasurements.checked,
      history: csvIncludeHistory.checked
    } : {
      header: includeHeaderSection.checked,
      legend: includeLegend.checked,
      measurements: includeMeasurements.checked,
      history: includeHistory.checked
    };
 
    document.querySelectorAll(".infoSection[data-section]").forEach(section => {
      const key = section.dataset.section;
      section.style.display = visibility[key] ? "block" : "none";
    });
 
    if (isCsv) {
      infoPageTitle.textContent = "CSVプレビュー";
      pageIndicator.textContent = "1 / 1";
    } else {
      infoPageTitle.textContent = titleInput.value || getHeader().disasterName || "保存情報";
      pageIndicator.textContent = currentPage + " / 2";
    }
  }
 
  function updatePageThumbs() {
    pageThumbs.forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.page) === currentPage);
    });
  }
 
  function showPage(pageNo) {
    if (currentMode === "csv") {
      currentPage = 2;
      mapPage.classList.add("hidden");
      infoPage.classList.remove("hidden");
      pageIndicator.textContent = "1 / 1";
      updatePageThumbs();
      return;
    }
    currentPage = Math.max(1, Math.min(2, pageNo));
    mapPage.classList.toggle("hidden", currentPage !== 1);
    infoPage.classList.toggle("hidden", currentPage !== 2);
    pageIndicator.textContent = currentPage + " / 2";
    updatePageThumbs();
    if (currentPage === 1 && previewMap) {
      setTimeout(() => {
        previewMap.invalidateSize();
        applyPaperPreviewRatio();
      }, 80);
    }
  }
 
  function setMode(mode) {
    currentMode = mode;
    const data = modes[mode] || modes.glink;
    menuButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
 
    screenTitle.textContent = data.title;
    screenLead.textContent = data.lead;
    previewTitle.textContent = data.previewTitle;
    settingsTitle.textContent = data.settingsTitle;
    primarySaveBtn.textContent = data.saveLabel;
    document.body.classList.toggle("glinkPreviewMode", false);
    document.body.classList.toggle("glinkFileMode", mode === "glink");
    if (glinkNoPreviewPanel) glinkNoPreviewPanel.classList.toggle("hidden", mode !== "glink");
    if (glinkLoadBtn) glinkLoadBtn.classList.toggle("hidden", mode !== "glink");
    if (previewCanvas) previewCanvas.classList.toggle("hidden", mode === "glink");
    applyPaperPreviewRatio();
    reflectMapPreviewImage();
 
    if (mode === "csv") {
      showPage(2);
    } else {
      showPage(1);
    }
    updateInfoSections();
  }
 
  function makeCsvText() {
    const rows = [];
 
    if (csvIncludeHistory.checked) {
      rows.push(["活動履歴"]);
      rows.push(["№", "種別", "グリッド番号", "座標", "覚知日時", "完了日時", "災害番号", "概要", "出動部隊", "傷病者人数"]);
      const list = sortActivityHistoryChronological(saveCenterData.activityHistory);
      list.forEach((item, index) => rows.push([
        getHistoryPinNo(item, index),
        item.typeLabel || item.type || "",
        item.gridNo || "",
        (typeof item.lat === "number" && typeof item.lng === "number") ? formatLatLngPair(item.lat, item.lng) : "",
        item.awarenessLabel || "",
        item.completedLabel || "",
        item.incidentNo || "",
        item.summary || "",
        item.units || "",
        item.injured ?? 0
      ]));
      rows.push([]);
    }
 
    if (csvIncludeMeasurements.checked) {
      rows.push(["計測図形"]);
      rows.push(["No", "名称", "面積㎡", "面積ha", "グリッド数"]);
      const list = Array.isArray(saveCenterData.measurements) ? saveCenterData.measurements : [];
      list.forEach((item, index) => rows.push([
        index + 1,
        item.name || "名称未設定",
        Math.round(Number(item.areaM2 || 0)),
        Number(item.areaHa || 0).toFixed(3),
        item.gridRange?.gridCount || 0
      ]));
    }
 
    if (!rows.length) rows.push(["出力対象が選択されていません。"]);
    return rowsToCsv(rows);
  }
 
  function rowsToCsv(rows) {
    return rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  }
 
  function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(",");
    const mime = (header.match(/data:(.*?);base64/) || [])[1] || "image/png";
    const binary = atob(base64 || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
 
  async function saveBlobWithPicker(blob, suggestedName) {
    // Version1.6.4 Build016
    // File System Access APIのMIME/拡張子判定で失敗する環境があるため、
    // まず安全なaccept設定で保存を試し、失敗時は必ず通常ダウンロードへ切り替える。
    const ext = String(suggestedName.split(".").pop() || "dat").toLowerCase();
    const acceptMap = {
      url: { "text/plain": [".url"] },
      glink: { "application/octet-stream": [".glink"] },
      pdf: { "application/pdf": [".pdf"] },
      png: { "image/png": [".png"] },
      csv: { "text/csv": [".csv"] },
      zip: { "application/zip": [".zip"] }
    };
 
    if (window.showSaveFilePicker && window.isSecureContext) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: "G-Link output", accept: acceptMap[ext] || { "application/octet-stream": [`.${ext}`] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        alert("保存しました。");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
        console.warn("保存先選択に失敗したため、通常ダウンロードに切り替えます。", err);
      }
    }
 
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
    alert("保存を開始しました。ブラウザのダウンロード欄を確認してください。");
  }
 
  function getCaptureScale() {
    const qualityText = document.getElementById("qualitySelect")?.value || "";
    return qualityText.includes("600") ? 3 : 2;
  }
 
  function temporarilyShowForCapture(element, callback) {
    const previous = {
      display: element.style.display,
      visibility: element.style.visibility,
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      zIndex: element.style.zIndex
    };
    const wasHidden = element.classList.contains("hidden") || getComputedStyle(element).display === "none";
    if (wasHidden) element.classList.remove("hidden");
    element.style.visibility = "visible";
    element.style.position = "relative";
    element.style.left = "0";
    element.style.top = "0";
    element.style.zIndex = "1";
 
    return Promise.resolve(callback()).finally(() => {
      if (wasHidden) element.classList.add("hidden");
      element.style.display = previous.display;
      element.style.visibility = previous.visibility;
      element.style.position = previous.position;
      element.style.left = previous.left;
      element.style.top = previous.top;
      element.style.zIndex = previous.zIndex;
    });
  }
 
  async function capturePreviewElement(element) {
    if (typeof html2canvas !== "function") {
      throw new Error("html2canvasが読み込まれていません。");
    }
    applyPaperPreviewRatio();
    updateInfoSections();
    await new Promise(resolve => setTimeout(resolve, 80));
    return temporarilyShowForCapture(element, async () => {
      return await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: getCaptureScale(),
        useCORS: true,
        allowTaint: false,
        logging: false,
        ignoreElements: el => el && el.classList && el.classList.contains("leaflet-control-attribution")
      });
    });
  }
 
  async function createPngBlobFromPreview() {
    const canvas = await capturePreviewElement(mapPage);
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), "image/png"));
  }
 
  function hasPdfInfoPage() {
    return !!(includeHeaderSection.checked || includeLegend.checked || includeMeasurements.checked || includeHistory.checked);
  }
 
  async function createPdfBlobFromPreview() {
    const jsPdfNamespace = window.jspdf || window.jsPDF;
    const JsPDF = jsPdfNamespace?.jsPDF || jsPdfNamespace;
    if (!JsPDF) throw new Error("jsPDFが読み込まれていません。");
 
    const paper = getPaperSizeMm();
    const pdf = new JsPDF({
      orientation: paper.orientation === "portrait" ? "p" : "l",
      unit: "mm",
      format: getSelectedPaperSizeKey().toLowerCase(),
      compress: true
    });
 
    const mapCanvas = await capturePreviewElement(mapPage);
    pdf.addImage(mapCanvas.toDataURL("image/png"), "PNG", 0, 0, paper.width, paper.height, undefined, "FAST");
 
    if (hasPdfInfoPage()) {
      pdf.addPage(getSelectedPaperSizeKey().toLowerCase(), paper.orientation === "portrait" ? "p" : "l");
      const infoCanvas = await capturePreviewElement(infoPage);
      const ratio = Math.min(paper.width / infoCanvas.width, paper.height / infoCanvas.height);
      const drawW = infoCanvas.width * ratio;
      const drawH = infoCanvas.height * ratio;
      const x = (paper.width - drawW) / 2;
      const y = 0;
      pdf.addImage(infoCanvas.toDataURL("image/png"), "PNG", x, y, drawW, drawH, undefined, "FAST");
    }
 
    return pdf.output("blob");
  }
 

  function toBase64UrlFromBytes(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function encodeViewerPayload(data) {
    try {
      const json = JSON.stringify(data || {});
      if (typeof TextEncoder === "function") {
        return toBase64UrlFromBytes(new TextEncoder().encode(json));
      }
      const base64 = btoa(unescape(encodeURIComponent(json)));
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch (error) {
      console.warn("Viewer用URLデータの生成に失敗しました。", error);
      return "";
    }
  }

  function compactPoint(point) {
    if (!point || typeof point.lat !== "number" || typeof point.lng !== "number") return null;
    return [Number(point.lat.toFixed(7)), Number(point.lng.toFixed(7))];
  }

  function compactBounds(bounds) {
    if (!bounds) return null;
    const sw = bounds.southWest || bounds._southWest;
    const ne = bounds.northEast || bounds._northEast;
    if (!sw || !ne) return null;
    return [compactPoint(sw), compactPoint(ne)];
  }

  function compactText(value, max = 160) {
    const text = String(value ?? "");
    return text.length > max ? text.slice(0, max) : text;
  }

  function stripAttachmentForViewer(pin) {
    const copy = { ...(pin || {}) };
    delete copy.attachmentDataUrl;
    delete copy.attachment;
    delete copy.attachmentPreview;
    delete copy.attachmentInfo;
    return copy;
  }

  function compactPin(pin) {
    const p = stripAttachmentForViewer(pin || {});
    return [
      p.type || "fire",
      Number(Number(p.lat || 0).toFixed(7)),
      Number(Number(p.lng || 0).toFixed(7)),
      p.completed ? 1 : 0,
      p.number || p.pinNo || "",
      compactText(p.gridNo, 40),
      compactText(p.awarenessLabel, 40),
      compactText(p.completedLabel, 40),
      compactText(p.incidentNo, 60),
      compactText(p.summary, 180),
      compactText(p.units, 120),
      p.injured ?? 0
    ];
  }

  function compactLatLngArray(points) {
    return (points || []).map(compactPoint).filter(Boolean);
  }

  function compactDrawing(item) {
    const meta = item?.meta || {};
    return {
      m: {
        t: meta.type || "polyline",
        c: meta.color || "#e60000",
        w: meta.weight || 4,
        o: meta.opacity ?? 1,
        s: meta.style || "solid",
        f: meta.fillMode || "none"
      },
      l: Array.isArray(item?.latlngs) ? item.latlngs : null,
      cc: compactPoint(item?.circleCenter),
      r: item?.radius || null,
      as: compactPoint(item?.arrowStart),
      ae: compactPoint(item?.arrowEnd)
    };
  }

  function compactMeasurement(item) {
    return {
      n: compactText(item?.name || "名称未設定", 80),
      t: item?.type || "polygon",
      s: item?.style || {},
      p: compactLatLngArray(item?.points),
      a: Math.round(item?.areaM2 || 0),
      h: Number(Number(item?.areaHa || 0).toFixed(4)),
      g: item?.gridRange || null
    };
  }

  function compactHistory(item) {
    return [
      item?.pinNo || item?.number || "",
      item?.type || "fire",
      compactText(item?.gridNo, 40),
      typeof item?.lat === "number" ? Number(item.lat.toFixed(7)) : null,
      typeof item?.lng === "number" ? Number(item.lng.toFixed(7)) : null,
      compactText(item?.awarenessLabel, 40),
      compactText(item?.completedLabel, 40),
      compactText(item?.incidentNo, 60),
      compactText(item?.summary, 180),
      compactText(item?.units, 120),
      item?.injured ?? 0
    ];
  }

  function compactViewerData(data) {
    const bounds = data.bounds || data.session?.bounds || null;
    const center = data.session?.center || null;
    return {
      f: "gv2",
      v: "1.6",
      b: "Build025.3",
      t: data.sharedAt || data.savedAt || new Date().toISOString(),
      n: "現場閲覧モードは閲覧専用です。リアルタイム同期は行いません。",
      c: data.coordinateType || data.session?.coordinateType || "dms",
      h: [data.header?.dateTime || "", data.header?.disasterName || "", data.header?.createdUnit || ""],
      s: [compactBounds(bounds), compactPoint(center), data.session?.zoom || 13, data.mapType || data.session?.mapType || "pale", data.gridSize || data.session?.gridSize || 0],
      g: data.gridLineSettings || {},
      p: (data.pins || []).map(compactPin),
      d: (data.drawings || []).map(compactDrawing),
      x: (data.tracks || []).map(item => [compactText(item.name, 60), compactText(item.color || "#facc15", 12), Number(item.weight || 5), Number(item.opacity ?? 1), (item.points || []).map(compactPoint)]),
      m: (data.measurements || []).map(compactMeasurement),
      a: (data.activityHistory || []).map(compactHistory)
    };
  }

  function getViewerBaseUrl() {
    try {
      const url = new URL("viewer.html", window.location.href);
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch (error) {
      return "viewer.html";
    }
  }

  function buildViewerShareUrlFromSaveCenterData() {
    const payload = {
      ...saveCenterData,
      format: "glink-viewer",
      version: "1.6",
      build: "Build025.6-DIAG",
      viewerMode: true,
      sharedAt: new Date().toISOString(),
      notice: "現場閲覧モードは閲覧専用です。リアルタイム同期は行いません。",
      coordinateType: saveCenterData.coordinateType || saveCenterData.session?.coordinateType || "dms",
      header: saveSharedHeader({
        disasterName: titleInput.value,
        createdUnit: createdUnitInput ? createdUnitInput.value : getHeader().createdUnit
      })
    };
    delete payload.mapPreviewImage;
    delete payload.commandCenterPreviewImage;

    const compact = compactViewerData(payload);
    const encoded = encodeViewerPayload(compact);
    if (!encoded) return getViewerBaseUrl();

    try {
      localStorage.setItem("glinkViewerLastData", JSON.stringify(compact));
    } catch (error) {
      console.warn("Viewer用データの一時保存に失敗しました。", error);
    }
    return `${getViewerBaseUrl()}#data=${encoded}`;
  }

  function createInternetShortcutText(url) {
    return `[InternetShortcut]\r\nURL=${url}\r\n`;
  }

  function makeCrc32Table() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  }

  const zipCrc32Table = makeCrc32Table();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = zipCrc32Table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function writeU16(arr, value) {
    arr.push(value & 255, (value >>> 8) & 255);
  }

  function writeU32(arr, value) {
    arr.push(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
  }

  function getDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { dosTime, dosDate };
  }

  function createZipBlobSingleFile(fileName, text) {
    // Build024.2
    // ブラウザが .url 直接ダウンロードを危険ファイルとしてブロックするため、
    // .urlをZIP内に格納して保存する。外部ライブラリなしの無圧縮ZIP。
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(fileName);
    const dataBytes = encoder.encode(text);
    const crc = crc32(dataBytes);
    const { dosTime, dosDate } = getDosDateTime();
    const local = [];
    const central = [];

    writeU32(local, 0x04034b50);
    writeU16(local, 20);
    writeU16(local, 0x0800); // UTF-8 filename
    writeU16(local, 0);
    writeU16(local, dosTime);
    writeU16(local, dosDate);
    writeU32(local, crc);
    writeU32(local, dataBytes.length);
    writeU32(local, dataBytes.length);
    writeU16(local, nameBytes.length);
    writeU16(local, 0);
    local.push(...nameBytes, ...dataBytes);

    const centralOffset = local.length;
    writeU32(central, 0x02014b50);
    writeU16(central, 20);
    writeU16(central, 20);
    writeU16(central, 0x0800);
    writeU16(central, 0);
    writeU16(central, dosTime);
    writeU16(central, dosDate);
    writeU32(central, crc);
    writeU32(central, dataBytes.length);
    writeU32(central, dataBytes.length);
    writeU16(central, nameBytes.length);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, 0);
    writeU32(central, 0);
    central.push(...nameBytes);

    const end = [];
    writeU32(end, 0x06054b50);
    writeU16(end, 0);
    writeU16(end, 0);
    writeU16(end, 1);
    writeU16(end, 1);
    writeU32(end, central.length);
    writeU32(end, centralOffset);
    writeU16(end, 0);

    return new Blob([new Uint8Array(local), new Uint8Array(central), new Uint8Array(end)], { type: "application/zip" });
  }

  async function saveInternetShortcutZip(content, urlFileName) {
    const zipName = urlFileName.replace(/\.url$/i, ".zip");
    const blob = createZipBlobSingleFile(urlFileName, content);
    await saveBlobWithPicker(blob, zipName);
  }

  function createGlinkPayload() {
    glinkDiagLog("save createGlinkPayload start", { saveCenterSummary: glinkDiagSummarizeData(saveCenterData), storage: glinkDiagStorageSnapshot() });
    const header = saveSharedHeader({
      disasterName: titleInput.value,
      createdUnit: createdUnitInput ? createdUnitInput.value : getHeader().createdUnit
    });
    const payload = {
      ...saveCenterData,
      format: "glink",
      appName: "G-Link〈災害情報共有システム〉",
      version: "1.6",
      build: "Build025.6-DIAG",
      projectFile: true,
      source: "save-center-current-working-data",
      header,
      coordinateType: saveCenterData.coordinateType || saveCenterData.session?.coordinateType || header.coordinateType || "dms",
      mapType: saveCenterData.session?.mapType || saveCenterData.mapType || "pale",
      gridSize: saveCenterData.session?.gridSize ?? saveCenterData.gridSize ?? 0,
      saveSettings: getSaveOptions(),
      savedAt: new Date().toISOString(),
      projectDiagnostics: {
        build: "Build025.6-DIAG",
        saveCenterSummaryBeforePayload: glinkDiagSummarizeData(saveCenterData),
        storageBeforePayload: glinkDiagStorageSnapshot()
      }
    };
    // .glink は「編集状態の復元用」ファイルであり、画像プレビューは不要。
    // 写真地図・GPX・計測図形がある状態でプレビュー画像まで含めると、
    // 読込時に sessionStorage の容量制限へ到達し、指揮本部モードへ戻れなくなる。
    delete payload.mapPreviewImage;
    delete payload.commandCenterPreviewImage;
    delete payload.previewImage;
    delete payload.previewImages;
    payload.projectDiagnostics.payloadSummary = glinkDiagSummarizeData(payload);
    glinkDiagLog("save createGlinkPayload result", { summary: glinkDiagSummarizeData(payload), session: payload.session, projectDiagnostics: payload.projectDiagnostics });
    glinkDiagUpdatePanel(`保存予定: pin ${(payload.pins||[]).length}, 図形 ${(payload.drawings||[]).length}, 計測 ${(payload.measurements||[]).length}, GPX ${(payload.tracks||[]).length}`);
    return payload;
  }
 
  async function requestSave() {
    updateInfoSections();
    const mode = modes[currentMode] || modes.glink;
    const suggestedName = makeDefaultFileName(mode.extension);
 
    try {
      if (currentMode === "glink") {
        const payload = createGlinkPayload();
        glinkDiagLog("save requestSave glink", { suggestedName, summary: glinkDiagSummarizeData(payload), projectDiagnostics: payload.projectDiagnostics });
        glinkDiagUpdatePanel(`.glink保存実行: pin ${(payload.pins||[]).length}, 図形 ${(payload.drawings||[]).length}, 計測 ${(payload.measurements||[]).length}`);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
        await saveBlobWithPicker(blob, suggestedName);
        return;
      }
 
      if (currentMode === "png") {
        const pngBlob = await createPngBlobFromPreview();
        if (!pngBlob) throw new Error("PNGデータを作成できませんでした。");
        await saveBlobWithPicker(pngBlob, suggestedName);
        return;
      }
 
      if (currentMode === "csv") {
        const csvText = "\ufeff" + makeCsvText();
        await saveBlobWithPicker(new Blob([csvText], { type: "text/csv;charset=utf-8" }), suggestedName);
        return;
      }
 
      if (currentMode === "pdf") {
        const pdfBlob = await createPdfBlobFromPreview();
        await saveBlobWithPicker(pdfBlob, suggestedName);
        return;
      }
    } catch (error) {
      console.error("保存処理に失敗しました。", error);
      alert(`保存処理に失敗しました。\n${error.message || error}`);
    }
  }
 
  menuButtons.forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
  if (paperSizeSelect) paperSizeSelect.addEventListener("change", applyPaperPreviewRatio);
  orientationInputs.forEach(input => input.addEventListener("change", applyPaperPreviewRatio));
  if (zoomSelect) zoomSelect.addEventListener("change", applyPaperPreviewRatio);
  window.addEventListener("resize", applyPaperPreviewRatio);
  window.addEventListener("resize", adjustMapPrintHeaderNoWrap);
  [includeHeader, includeHeaderSection, includeLegend, includeMeasurements, includeHistory, csvIncludeHistory, csvIncludeMeasurements].forEach(input => {
    if (input) input.addEventListener("change", updateInfoSections);
  });
  function syncHeaderInputsFromSaveCenter() {
    const header = saveSharedHeader({
      disasterName: titleInput.value,
      createdUnit: createdUnitInput ? createdUnitInput.value : getHeader().createdUnit
    });
 
    infoPageTitle.textContent = header.disasterName || "保存情報";
    headerDisasterPreview.textContent = header.disasterName || "-";
    headerUnitPreview.textContent = header.createdUnit || "-";
    if (mapHeaderDisasterPreview) mapHeaderDisasterPreview.textContent = header.disasterName || "-";
    if (mapHeaderUnitPreview) mapHeaderUnitPreview.textContent = header.createdUnit || "-";
    settingDisasterPreview.textContent = header.disasterName || "-";
    settingUnitPreview.textContent = header.createdUnit || "-";
    adjustMapPrintHeaderNoWrap();
  }
 
  titleInput.addEventListener("input", syncHeaderInputsFromSaveCenter);
  if (createdUnitInput) createdUnitInput.addEventListener("input", syncHeaderInputsFromSaveCenter);
  prevPageBtn.addEventListener("click", () => showPage(currentPage - 1));
  nextPageBtn.addEventListener("click", () => showPage(currentPage + 1));
  pageThumbs.forEach(btn => btn.addEventListener("click", () => showPage(Number(btn.dataset.page || 1))));
  function closeSaveCenter() {
    // Build018：保存センターは新しいタブで開くため、戻る処理ではなくこのタブを閉じる。
    // 元の指揮本部モードは別タブで開いたままなので、作業状態はそのまま維持される。
    try {
      window.close();
    } catch (error) {
      console.warn("保存センタータブを閉じられませんでした。", error);
    }

    // ブラウザ仕様により、手動で開いたタブなどは window.close() で閉じられない場合がある。
    window.setTimeout(() => {
      if (!window.closed) {
        alert("保存センターを閉じられない場合は、このタブをブラウザの×ボタンで閉じてください。指揮本部モードは元のタブに残っています。");
      }
    }, 200);
  }

  primarySaveBtn.addEventListener("click", requestSave);
  cancelBtn.addEventListener("click", closeSaveCenter);
  closeBtn.addEventListener("click", closeSaveCenter);
 
  reflectHeaderInfo();
  reflectLegend();
  reflectMeasurementRows();
  reflectHistoryRows();
  applyPaperPreviewRatio();
  adjustMapPrintHeaderNoWrap();
  reflectMapPreviewImage();

  function sanitizeGlinkPayloadForRestore(data) {
    if (!data || typeof data !== "object") return data;
    const payload = { ...data };
    // Build024.3以前で保存した .glink に大容量プレビュー画像が含まれる場合があるため、
    // 読込時にも必ず除外してから指揮本部モードへ渡す。
    delete payload.mapPreviewImage;
    delete payload.commandCenterPreviewImage;
    delete payload.previewImage;
    delete payload.previewImages;
    payload.projectDiagnostics.payloadSummary = glinkDiagSummarizeData(payload);
    glinkDiagLog("save createGlinkPayload result", { summary: glinkDiagSummarizeData(payload), session: payload.session, projectDiagnostics: payload.projectDiagnostics });
    glinkDiagUpdatePanel(`保存予定: pin ${(payload.pins||[]).length}, 図形 ${(payload.drawings||[]).length}, 計測 ${(payload.measurements||[]).length}, GPX ${(payload.tracks||[]).length}`);
    return payload;
  }

  function clearProjectStorageBeforeRestore() {
    const keys = [
      "disasterSession",
      "gLink_workingData",
      "gLink_returnBackupData",
      "gLink_returnFromSaveCenter",
      "gLink_pendingRestoreData",
      "gLink_saveCenterData",
      "gLink_header",
      "gLink_launcherHeader",
      "glinkViewerLastData"
    ];
    const before = glinkDiagStorageSnapshot();
    keys.forEach(key => {
      try { sessionStorage.removeItem(key); } catch (e) {}
      try { localStorage.removeItem(key); } catch (e) {}
    });
    glinkDiagLog("save restore storage cleared", { before, after: glinkDiagStorageSnapshot() });
  }

  function openGlinkDataInFixed(data) {
    glinkDiagLog("save openGlinkDataInFixed called", { summary: glinkDiagSummarizeData(data) });
    if (!data || data.format !== "glink") {
      alert("G-Link保存ファイル（.glink）として認識できませんでした。");
      return;
    }
    const restoreData = sanitizeGlinkPayloadForRestore(data);
    try {
      clearProjectStorageBeforeRestore();
      const json = JSON.stringify(restoreData);
      glinkDiagLog("save restoreData sanitized", { summary: glinkDiagSummarizeData(restoreData), jsonLength: json.length });
      sessionStorage.setItem("gLink_pendingRestoreData", json);
      // Build025.3: .glink読込時はpendingRestoreDataを唯一の復元入口にする。
      // workingData等を同時に置くと、古い保存センターデータと混在して初期画面へ戻る原因になる。
      sessionStorage.setItem("gLink_returnFromSaveCenter", "1");
      localStorage.setItem("gLink_pendingRestoreData", json);
      localStorage.setItem("gLink_returnFromSaveCenter", "1");
      if (restoreData.session) {
        sessionStorage.setItem("disasterSession", JSON.stringify(restoreData.session));
        localStorage.setItem("disasterSession", JSON.stringify(restoreData.session));
      }
    } catch (error) {
      console.error(".glink読込データの一時保存に失敗しました。", error);
      alert(".glinkファイルの読込準備に失敗しました。プレビュー画像は除外しましたが、GPX軌跡や図形の点数が非常に多い可能性があります。");
      return;
    }
    glinkDiagLog("save redirect fixed restore", { storage: glinkDiagStorageSnapshot() });
    window.location.href = "fixed.html?restore=glink";
  }

  function readGlinkFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ""));
        openGlinkDataInFixed(data);
      } catch (error) {
        console.error(".glinkファイルの解析に失敗しました。", error);
        alert(".glinkファイルの読み込みに失敗しました。ファイル形式を確認してください。");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  if (glinkLoadBtn && glinkLoadInput) {
    glinkLoadBtn.addEventListener("click", () => glinkLoadInput.click());
    glinkLoadInput.addEventListener("change", () => {
      readGlinkFile(glinkLoadInput.files && glinkLoadInput.files[0]);
      glinkLoadInput.value = "";
    });
  }

  setMode("glink");
});
