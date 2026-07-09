window.addEventListener("DOMContentLoaded", () => {
 
  let sessionData = sessionStorage.getItem("disasterSession");

  // Build021 Web公開対応：
  // Cloudflare Pages等で fixed.html を新しいタブで開いた場合、
  // sessionStorage が引き継がれず「災害情報が見つかりません」となることがある。
  // エリア選択時に localStorage へ退避した作業状態を fallback として復元する。
  if (!sessionData) {
    try {
      sessionData = localStorage.getItem("disasterSession");
      if (sessionData) sessionStorage.setItem("disasterSession", sessionData);
    } catch (error) {
      console.warn("G-Link作業状態の復元に失敗しました。", error);
    }
  }

  if (!sessionData) {
    alert("災害情報が見つかりません。起動画面からエリアを確定し直してください。");
    window.location.href = "index.html";
    return;
  }
 
  const session = JSON.parse(sessionData);

  // Build017 保存センター復元安定化：
  // 保存センター経由で戻る場合、bounds が Leaflet形式（_southWest/_northEast）ではなく
  // 保存ファイル形式（southWest/northEast）になっていることがある。
  // そのまま初期表示処理で _southWest を参照すると fixed.js が途中停止し、
  // 復元処理まで到達できないため、起動直後に両形式へ対応させる。
  function normalizePlainPointForStartup(point) {
    if (!point) return null;
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function normalizePlainBoundsForStartup(bounds) {
    if (!bounds) return null;
    const sw = normalizePlainPointForStartup(bounds._southWest || bounds.southWest);
    const ne = normalizePlainPointForStartup(bounds._northEast || bounds.northEast);
    if (!sw || !ne) return null;
    return { southWest: sw, northEast: ne };
  }

  const startupBoundsPlain = normalizePlainBoundsForStartup(session.bounds);
  if (startupBoundsPlain) {
    session.bounds = {
      _southWest: { ...startupBoundsPlain.southWest },
      _northEast: { ...startupBoundsPlain.northEast },
      southWest: { ...startupBoundsPlain.southWest },
      northEast: { ...startupBoundsPlain.northEast }
    };
  }
 
  const mapLayers = {
    pale: { url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", maxZoom: 18 },
    std: { url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", maxZoom: 18 },
    photo: { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", maxZoom: 18 },
    relief: { url: "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png", maxZoom: 15 },
    hillshade: { url: "https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png", maxZoom: 16 }
  };
 
  const headerDateTime = document.getElementById("headerDateTime");
  const gridOverlay = document.getElementById("gridOverlay");
  const cursorLatDisplay = document.getElementById("cursorLatDisplay");
  const cursorLngDisplay = document.getElementById("cursorLngDisplay");
  const cursorGridDisplay = document.getElementById("cursorGridDisplay");
 
  const gridSearchInput = document.getElementById("gridSearchInput");
  const gridSearchBtn = document.getElementById("gridSearchBtn");
  const gridLineColor = document.getElementById("gridLineColor");
  const gridLineOpacity = document.getElementById("gridLineOpacity");
  const gridLineOpacityValue = document.getElementById("gridLineOpacityValue");
  const gridLineWeight = document.getElementById("gridLineWeight");
  const gridLineWeightValue = document.getElementById("gridLineWeightValue");
  const resetGridLineStyle = document.getElementById("resetGridLineStyle");
  const gridLineStatusText = document.getElementById("gridLineStatusText");
  const openGridSettingBtn = document.getElementById("openGridSettingBtn");
  const openMapTypeSettingBtn = document.getElementById("openMapTypeSettingBtn");
  const openCoordinateSettingBtn = document.getElementById("openCoordinateSettingBtn");
  const gridSettingSection = document.getElementById("gridSettingSection");
  const mapTypeSettingSection = document.getElementById("mapTypeSettingSection");
  const coordinateSettingSection = document.getElementById("coordinateSettingSection");
  const fixedMapType = document.getElementById("fixedMapType");
  const mapTypeStatusText = document.getElementById("mapTypeStatusText");
  const coordinateTypeSelect = document.getElementById("coordinateTypeSelect");
  const coordinateTypeStatusText = document.getElementById("coordinateTypeStatusText");
  const coordSearchInput = document.getElementById("coordSearchInput");
  const coordSearchBtn = document.getElementById("coordSearchBtn");
  const addressSearchInput = document.getElementById("addressSearchInput");
  const addressSearchBtn = document.getElementById("addressSearchBtn");
  const incidentSearchInput = document.getElementById("incidentSearchInput");
  const incidentSearchBtn = document.getElementById("incidentSearchBtn");
  const shareUrlInput = document.getElementById("shareUrlInput");
  const copyShareUrlBtn = document.getElementById("copyShareUrlBtn");
  const refreshShareQrBtn = document.getElementById("refreshShareQrBtn");
  const saveShareQrBtn = document.getElementById("saveShareQrBtn");
  const openViewerBtn = document.getElementById("openViewerBtn");
  const shareQrCode = document.getElementById("shareQrCode");
  const shareCopyStatus = document.getElementById("shareCopyStatus");
  const gpxTextInput = document.getElementById("gpxTextInput");
  const trackColor = document.getElementById("trackColor");
  const trackWeight = document.getElementById("trackWeight");
  const trackWeightValue = document.getElementById("trackWeightValue");
  const applyGpxTrackBtn = document.getElementById("applyGpxTrackBtn");
  const clearGpxTrackBtn = document.getElementById("clearGpxTrackBtn");
  const trackStatusText = document.getElementById("trackStatusText");
  const trackColorPresets = document.querySelectorAll(".trackColorPreset");
 
  const drawType = document.getElementById("drawType");
  const drawColor = document.getElementById("drawColor");
  const colorPresets = document.querySelectorAll(".colorPreset");
  const lineWeight = document.getElementById("lineWeight");
  const lineWeightValue = document.getElementById("lineWeightValue");
  const lineStyle = document.getElementById("lineStyle");
  const lineOpacity = document.getElementById("lineOpacity");
  const lineOpacityValue = document.getElementById("lineOpacityValue");
  const fillMode = document.getElementById("fillMode");
  const clearDrawingsBtn = document.getElementById("clearDrawingsBtn");
  const drawStatusText = document.getElementById("drawStatusText");
 
  const shapeEditPanel = document.getElementById("shapeEditPanel");
  const shapeEditColor = document.getElementById("shapeEditColor");
  const shapeEditWeight = document.getElementById("shapeEditWeight");
  const shapeEditWeightValue = document.getElementById("shapeEditWeightValue");
  const shapeEditStyle = document.getElementById("shapeEditStyle");
  const shapeEditOpacity = document.getElementById("shapeEditOpacity");
  const shapeEditOpacityValue = document.getElementById("shapeEditOpacityValue");
  const shapeEditFillMode = document.getElementById("shapeEditFillMode");
  const saveShapeEdit = document.getElementById("saveShapeEdit");
  const copyShapeEdit = document.getElementById("copyShapeEdit");
  const duplicateShapeEdit = document.getElementById("duplicateShapeEdit");
  const deleteShapeEdit = document.getElementById("deleteShapeEdit");
  const closeShapeEdit = document.getElementById("closeShapeEdit");
 
  const editPanel = document.getElementById("editPanel");
  const pinType = document.getElementById("pinType");
  const pinLatLng = document.getElementById("pinLatLng");
  const gridNo = document.getElementById("gridNo");
  const incidentNo = document.getElementById("incidentNo");
  const summary = document.getElementById("summary");
  const units = document.getElementById("units");
  const injuredCount = document.getElementById("injuredCount");
  const attachment = document.getElementById("attachment");
  const attachmentInfo = document.getElementById("attachmentInfo");
  const attachmentPreview = document.getElementById("attachmentPreview");
  const savePin = document.getElementById("savePin");
  const closePanel = document.getElementById("closePanel");
 
  const toolPanel = document.getElementById("toolPanel");
  const panelTitle = document.getElementById("panelTitle");
  const closeToolPanel = document.getElementById("closeToolPanel");
  const toolButtons = document.querySelectorAll(".toolBtn");
  const openSaveCenterBtn = document.getElementById("openSaveCenterBtn");
  const panelContents = document.querySelectorAll(".panelContent");
  const activityHistoryList = document.getElementById("activityHistoryList");
 
  const pinContextMenu = document.getElementById("pinContextMenu");
  const completePinBtn = document.getElementById("completePinBtn");
  const deletePinBtn = document.getElementById("deletePinBtn");
  const cancelPinMenuBtn = document.getElementById("cancelPinMenuBtn");
 
  const historyContextMenu = document.getElementById("historyContextMenu");
  const editHistoryBtn = document.getElementById("editHistoryBtn");
  const cancelHistoryCaseBtn = document.getElementById("cancelHistoryCaseBtn");
  const closeHistoryMenuBtn = document.getElementById("closeHistoryMenuBtn");
 
  const historyEditPanel = document.getElementById("historyEditPanel");
  const historyEditType = document.getElementById("historyEditType");
  const historyEditAwareness = document.getElementById("historyEditAwareness");
  const historyEditCompleted = document.getElementById("historyEditCompleted");
  const historyEditGridNo = document.getElementById("historyEditGridNo");
  const historyEditIncidentNo = document.getElementById("historyEditIncidentNo");
  const historyEditSummary = document.getElementById("historyEditSummary");
  const historyEditUnits = document.getElementById("historyEditUnits");
  const historyEditInjured = document.getElementById("historyEditInjured");
  const saveHistoryEdit = document.getElementById("saveHistoryEdit");
  const closeHistoryEdit = document.getElementById("closeHistoryEdit");
   const measureModeBtn = document.getElementById("measureModeBtn");
  const measureModeEndBtn = document.getElementById("measureModeEndBtn");
  const measureDrawType = document.getElementById("measureDrawType");
  const measureLineColor = document.getElementById("measureLineColor");
  const measureFillColor = document.getElementById("measureFillColor");
  const measureLinePresets = document.querySelectorAll(".measureLinePreset");
  const measureFillPresets = document.querySelectorAll(".measureFillPreset");
  const measureOpacity = document.getElementById("measureOpacity");
  const measureOpacityValue = document.getElementById("measureOpacityValue");
  const measureWeight = document.getElementById("measureWeight");
  const measureWeightValue = document.getElementById("measureWeightValue");
  const measureStatusText = document.getElementById("measureStatusText");
  const clearLastMeasureBtn = document.getElementById("clearLastMeasureBtn");
  const clearAllMeasureBtn = document.getElementById("clearAllMeasureBtn");
  const measureList = document.getElementById("measureList");
  const measureTotalAreaM2 = document.getElementById("measureTotalAreaM2");
  const measureTotalAreaHa = document.getElementById("measureTotalAreaHa");
  const measureTotalGridCount = document.getElementById("measureTotalGridCount");
  const measureGridAreaM2 = document.getElementById("measureGridAreaM2");
  const measureGridAreaHa = document.getElementById("measureGridAreaHa");
  const measureGridSpan = document.getElementById("measureGridSpan");
  const measureShapeCount = document.getElementById("measureShapeCount");
  const measureIndividualCards = document.getElementById("measureIndividualCards");
  const measureSummaryBanner = document.getElementById("measureSummaryBanner");
 
 
 
  const drawSettings = {
    type: "none",
    color: "#e60000",
    weight: 4,
    style: "solid",
    opacity: 1,
    fillMode: "none"
  };
 
  const measureSettings = {
    active: false,
    type: "none",
    lineColor: "#7e22ce",
    fillColor: "#a855f7",
    opacity: 0.35,
    weight: 3
  };
 
  const defaultGridLineSettings = {
    color: "#888888",
    opacity: 0.5,
    weight: 1
  };
 
  let gridLineSettings = loadGridLineSettings();
 
  let fixedBounds = null;
  let displayBounds = null;
 
  let lineStartPoint = null;
  let linePreview = null;
  let polylinePoints = [];
  let polylinePreview = null;
  let polylineClickTimer = null;
  let shapeStartPoint = null;
  let shapePreview = null;
  let freehandDrawing = false;
  let freehandPoints = [];
  let freehandLine = null;
 
  let measurePolylinePoints = [];
  let measurePolylinePreview = null;
  let measurePolylineClickTimer = null;
  let measureFreehandDrawing = false;
  let measureFreehandPoints = [];
  let measureFreehandLine = null;
  let measurements = [];
  let measureSerial = 1;
 
  let pins = [];
  let selectedPin = null;
  let contextTargetPin = null;
  let selectedHistoryItem = null;
  let pendingAttachment = null;
  let activityHistory = [];
  let lastCursorLatLng = null;
  const coordinateTypeLabels = {
    dms: "緯度・経度（60進法）",
    decimal: "緯度・経度（10進法）"
  };
  let coordinateType = loadCoordinateType();
 
  let drawings = [];
  let tracks = [];
  let trackSerial = 1;
  let selectedShape = null;
  let copiedShapeData = null;
  let pasteMode = false;
  let dragShapeState = null;
 
  const map = L.map("map", {
    zoomControl: false,
    dragging: true,
    touchZoom: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    attributionControl: true
  });
 
  const selectedMapType = session.mapType || "pale";
  const selectedLayer = mapLayers[selectedMapType] || mapLayers.pale;
 
  let baseTileLayer = L.tileLayer(selectedLayer.url, {
    maxZoom: selectedLayer.maxZoom,
    minZoom: 2,
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
    crossOrigin: true
  }).addTo(map);
 
  const gridLayer = L.layerGroup().addTo(map);
  const trackLayer = L.layerGroup().addTo(map);
  const drawingLayer = L.layerGroup().addTo(map);
  const measureLayer = L.layerGroup().addTo(map);
  const pinLayer = L.layerGroup().addTo(map);
  const searchHighlightLayer = L.layerGroup().addTo(map);
  const coordSearchLayer = L.layerGroup().addTo(map);
  const incidentSearchLayer = L.layerGroup().addTo(map);
 
 
  function loadCoordinateType() {
    // Build022.8: 起動時のデフォルトは必ず60進法に戻す。
    // 画面内の設定で10進法へ切替えた場合のみ、その場で反映する。
    const fromSession = session.coordinateType;
    const value = fromSession || "dms";
    return value === "decimal" ? "decimal" : "dms";
  }
 
  function saveCoordinateType() {
    localStorage.setItem("gLinkCoordinateType", coordinateType);
    session.coordinateType = coordinateType;
    try {
      const raw = sessionStorage.getItem("disasterSession");
      if (raw) {
        const stored = JSON.parse(raw);
        stored.coordinateType = coordinateType;
        sessionStorage.setItem("disasterSession", JSON.stringify(stored));
      }
    } catch (error) {
      console.warn("座標種類の保存に失敗しました。", error);
    }
  }
 
  function decimalToDmsParts(value) {
    const absolute = Math.abs(Number(value));
    let degrees = Math.floor(absolute);
    let minutesFloat = (absolute - degrees) * 60;
    let minutes = Math.floor(minutesFloat);
    let seconds = (minutesFloat - minutes) * 60;
 
    seconds = Math.round(seconds * 100) / 100;
    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
    }
    if (minutes >= 60) {
      minutes = 0;
      degrees += 1;
    }
 
    return { degrees, minutes, seconds };
  }
 
  function formatDms(value, axis) {
    if (!Number.isFinite(Number(value))) return "-";
    const parts = decimalToDmsParts(value);
    const suffix = axis === "lat" ? (Number(value) >= 0 ? "N" : "S") : (Number(value) >= 0 ? "E" : "W");
    return `${parts.degrees}°${String(parts.minutes).padStart(2, "0")}′${parts.seconds.toFixed(2).padStart(5, "0")}″${suffix}`;
  }
 
  function formatDecimal(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return Number(value).toFixed(6);
  }
 
  function formatCoordinateValue(value, axis) {
    return coordinateType === "decimal" ? formatDecimal(value) : formatDms(value, axis);
  }
 
  function formatLatLngPair(lat, lng) {
    return `${formatCoordinateValue(lat, "lat")}, ${formatCoordinateValue(lng, "lng")}`;
  }
 
  function normalizeCoordinateInputText(value) {
    return String(value || "")
      .replace(/[，、]/g, ",")
      .replace(/[°º˚]/g, "度")
      .replace(/[′’']/g, "分")
      .replace(/[″”\"]/g, "秒")
      .replace(/北緯/g, "N")
      .replace(/南緯/g, "S")
      .replace(/東経/g, "E")
      .replace(/西経/g, "W")
      .replace(/北/g, "N")
      .replace(/南/g, "S")
      .replace(/東/g, "E")
      .replace(/西/g, "W")
      .replace(/\s+/g, " ")
      .trim();
  }
 
  function parseSingleCoordinate(text, axis) {
    const raw = normalizeCoordinateInputText(text);
    if (!raw) return null;
 
    const upper = raw.toUpperCase();
    const directionMatch = upper.match(/[NSEW]/);
    const direction = directionMatch ? directionMatch[0] : "";
    const numberMatches = upper.match(/[+-]?\d+(?:\.\d+)?/g);
    if (!numberMatches || numberMatches.length === 0) return null;
 
    let value;
    const hasDmsSymbol = /度|分|秒/.test(upper);
    const looksDms = hasDmsSymbol || numberMatches.length >= 3;
 
    if (looksDms) {
      const degreesRaw = Number(numberMatches[0]);
      const minutes = Number(numberMatches[1] || 0);
      const seconds = Number(numberMatches[2] || 0);
      if (![degreesRaw, minutes, seconds].every(Number.isFinite)) return null;
      if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
      const sign = degreesRaw < 0 || direction === "S" || direction === "W" ? -1 : 1;
      value = sign * (Math.abs(degreesRaw) + minutes / 60 + seconds / 3600);
    } else {
      value = Number(numberMatches[0]);
      if (!Number.isFinite(value)) return null;
      if (direction === "S" || direction === "W") value = -Math.abs(value);
      if (direction === "N" || direction === "E") value = Math.abs(value);
    }
 
    const limit = axis === "lat" ? 90 : 180;
    if (value < -limit || value > limit) return null;
    return value;
  }
 
  function parseLatLngInput(value) {
    const normalized = normalizeCoordinateInputText(value);
    if (!normalized) return null;
 
    if (normalized.includes(",")) {
      const parts = normalized.split(",").map(v => v.trim()).filter(Boolean);
      if (parts.length !== 2) return null;
      const lat = parseSingleCoordinate(parts[0], "lat");
      const lng = parseSingleCoordinate(parts[1], "lng");
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
 
    const numbers = normalized.match(/[+-]?\d+(?:\.\d+)?/g);
    if (!numbers) return null;
 
    if (numbers.length === 2) {
      const lat = parseSingleCoordinate(numbers[0], "lat");
      const lng = parseSingleCoordinate(numbers[1], "lng");
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
 
    if (numbers.length >= 6) {
      const lat = parseSingleCoordinate(numbers.slice(0, 3).join("度") + "秒", "lat");
      const lng = parseSingleCoordinate(numbers.slice(3, 6).join("度") + "秒", "lng");
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
 
    return null;
  }
 
  function updateCoordinateTypeControls() {
    if (coordinateTypeSelect) coordinateTypeSelect.value = coordinateType;
    if (coordinateTypeStatusText) coordinateTypeStatusText.textContent = coordinateTypeLabels[coordinateType] || coordinateTypeLabels.dms;
  }
 
  function refreshCoordinateDisplays() {
    updateCoordinateTypeControls();
    saveCoordinateType();
    if (lastCursorLatLng) updateCursorInfo(lastCursorLatLng);
    pins.forEach(refreshPin);
    if (selectedPin && selectedPin.data && editPanel && editPanel.style.display !== "none") {
      updatePinLatLngField(selectedPin.data);
    }
    renderActivityHistory();
  }
 
  function setupCoordinateTypeSettingEvents() {
    updateCoordinateTypeControls();
    if (!coordinateTypeSelect) return;
    coordinateTypeSelect.addEventListener("change", () => {
      coordinateType = coordinateTypeSelect.value === "decimal" ? "decimal" : "dms";
      refreshCoordinateDisplays();
    });
  }
 
  function updatePinLatLngField(data) {
    if (!pinLatLng || !data) return;
    pinLatLng.value = formatLatLngPair(data.lat, data.lng);
  }
 
  function getFormattedNowForHeader() {
    const now = new Date();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function startLiveHeaderClock() {
    if (!headerDateTime) return;
    let lastSavedMinute = "";
    const tick = () => {
      const nextValue = getFormattedNowForHeader();
      headerDateTime.value = nextValue;
      headerDateTime.setAttribute("readonly", "readonly");
      const currentMinute = nextValue.replace(/秒.*/, "");
      if (currentMinute !== lastSavedMinute) {
        lastSavedMinute = currentMinute;
        saveSharedHeader({ dateTime: nextValue, coordinateType });
      }
      updateTitleBarHeightForHeader();
      updateFixedHeaderDiagnostic();
    };
    tick();
    window.setInterval(tick, 1000);
  }
 
 
  const HEADER_STORAGE_KEY = "gLink_header";
 
  function loadSharedHeader() {
    const fallback = {
      dateTime: getFormattedNowForHeader(),
      disasterName: "",
      createdUnit: "",
      coordinateType: coordinateType || "dms"
    };
 
    try {
      const raw = sessionStorage.getItem(HEADER_STORAGE_KEY) || localStorage.getItem(HEADER_STORAGE_KEY);
      const fromStorage = raw ? JSON.parse(raw) : {};
      const fromSession = session.header || {};
      return {
        ...fallback,
        ...fromStorage,
        ...fromSession,
        dateTime: fromSession.dateTime || fromStorage.dateTime || fallback.dateTime,
        disasterName: fromSession.disasterName || fromStorage.disasterName || "",
        createdUnit: fromSession.createdUnit || fromStorage.createdUnit || "",
        coordinateType: fromSession.coordinateType || fromStorage.coordinateType || fallback.coordinateType
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
      coordinateType: patch.coordinateType ?? current.coordinateType ?? coordinateType ?? "dms",
      updatedAt: new Date().toISOString()
    };
 
    session.header = {
      dateTime: next.dateTime,
      disasterName: next.disasterName,
      createdUnit: next.createdUnit,
      coordinateType: next.coordinateType
    };
 
    sessionStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(next));
 
    try {
      const raw = sessionStorage.getItem("disasterSession");
      if (raw) {
        const stored = JSON.parse(raw);
        stored.header = session.header;
        stored.coordinateType = next.coordinateType;
        sessionStorage.setItem("disasterSession", JSON.stringify(stored));
      }
    } catch (error) {
      console.warn("災害セッションへヘッダー情報を反映できませんでした。", error);
    }
 
    return next;
  }
 
  function getCurrentHeaderFromScreen() {
    return {
      dateTime: headerDateTime ? headerDateTime.value : "",
      disasterName: document.getElementById("disasterName")?.value || "",
      createdUnit: document.getElementById("createdUnit")?.value || "",
      coordinateType
    };
  }
 
  function applySharedHeaderToScreen() {
    const header = loadSharedHeader();
    const disasterNameInput = document.getElementById("disasterName");
    const createdUnitInput = document.getElementById("createdUnit");
 
    if (headerDateTime) headerDateTime.value = header.dateTime || getFormattedNowForHeader();
    if (disasterNameInput) disasterNameInput.value = header.disasterName || "";
    if (createdUnitInput) createdUnitInput.value = header.createdUnit || "";
 
    saveSharedHeader({
      dateTime: headerDateTime ? headerDateTime.value : header.dateTime,
      disasterName: disasterNameInput ? disasterNameInput.value : header.disasterName,
      createdUnit: createdUnitInput ? createdUnitInput.value : header.createdUnit,
      coordinateType
    });
  }
 
  function syncHeaderFromScreen() {
    saveSharedHeader(getCurrentHeaderFromScreen());
  }


  function updateTitleBarHeightForHeader() {
    const titleBar = document.getElementById("titleBar");
    if (!titleBar) return;
    const height = Math.ceil(titleBar.getBoundingClientRect().height || 74);
    document.documentElement.style.setProperty("--fixed-titlebar-height", `${height}px`);
    if (typeof map !== "undefined" && map && typeof map.invalidateSize === "function") {
      window.setTimeout(() => map.invalidateSize(), 0);
    }
  }

  function updateFixedHeaderDiagnostic() {
    const body = document.getElementById("fixedHeaderDiagnosticBody");
    if (!body) return;
    const titleBar = document.getElementById("titleBar");
    const titleMain = document.querySelector(".titleMain");
    const headerFields = document.querySelector(".headerFields");
    const disasterNameInput = document.getElementById("disasterName");
    const createdUnitInput = document.getElementById("createdUnit");
    const currentInfoPanel = document.getElementById("currentInfoPanel");
    const fields = [headerDateTime, disasterNameInput, createdUnitInput].filter(Boolean);
    const line = (name, el) => {
      if (!el) return `${name}：取得不可`;
      return `${name}：表示幅 ${Math.round(el.getBoundingClientRect().width)}px / 内容幅 ${Math.round(el.scrollWidth)}px / 文字数 ${(el.value || el.textContent || "").length}`;
    };
    const titleRect = titleBar ? titleBar.getBoundingClientRect() : null;
    const fieldsStyle = headerFields ? getComputedStyle(headerFields) : null;
    body.innerHTML = [
      `Build：022.9 ヘッダー全項目被り防止・小画面2段表示`,
      `画面幅：${window.innerWidth}px`,
      `タイトルバー高さ：${titleRect ? Math.round(titleRect.height) : "取得不可"}px`,
      `ヘッダー列：${fieldsStyle ? fieldsStyle.gridTemplateColumns : "取得不可"}`,
      `項目間隔：${fieldsStyle ? fieldsStyle.columnGap : "取得不可"}`,
      `グリッド線色：${gridLineSettings.color}`,
      `座標形式：${coordinateType === "dms" ? "60進法" : "10進法"}`,
      line("タイトル", titleMain),
      line("年月日", headerDateTime),
      line("災害名", disasterNameInput),
      line("作成部隊", createdUnitInput),
      line("座標・グリッド", currentInfoPanel),
      `ヘッダー配置：${window.innerWidth <= 1080 ? "小画面2段" : "標準2段"}`,
      `時刻更新：${headerDateTime && headerDateTime.readOnly ? "ON" : "要確認"}`,
      `切れ判定：${fields.some(el => el.scrollWidth > el.clientWidth + 2) ? "要確認" : "正常"}`
    ].join("<br>");
  }

  function fitHeaderInputWidth(input) {
    if (!input) return;
    input.style.width = "";
    input.style.maxWidth = "";
    input.style.fontSize = "";
    input.style.letterSpacing = "";
  }

  function adjustHeaderFieldsNoWrap() {
    [headerDateTime, document.getElementById("disasterName"), document.getElementById("createdUnit")].forEach(fitHeaderInputWidth);
    updateTitleBarHeightForHeader();
    updateFixedHeaderDiagnostic();
  }
 
  function getDateKeyFromTimestamp(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
 
  function getDateLabelFromTimestamp(timestamp) {
    const d = new Date(timestamp);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
  }
 
  function getDateTimeLabelFromTimestamp(timestamp) {
    const d = new Date(timestamp);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
 
  applySharedHeaderToScreen();
  startLiveHeaderClock();
  adjustHeaderFieldsNoWrap();
  window.addEventListener("resize", adjustHeaderFieldsNoWrap);
 
  const panelNames = {
    searchPanel: "検索",
    editToolPanel: "編集",
    measurePanel: "計測",
    trackPanel: "軌跡",
    historyPanel: "活動履歴",
    settingPanel: "設定",
    sharePanel: "共有"
  };
 
 
  [document.getElementById("disasterName"), document.getElementById("createdUnit")].forEach(input => {
    if (!input) return;
    input.addEventListener("input", () => { syncHeaderFromScreen(); adjustHeaderFieldsNoWrap(); });
    input.addEventListener("change", () => { syncHeaderFromScreen(); adjustHeaderFieldsNoWrap(); });
  });
 
  const mapLayerLabels = {
    pale: "淡色地図",
    std: "標準地図",
    photo: "写真",
    relief: "色別標高図",
    hillshade: "陰影起伏図"
  };
 
  function setSettingSection(sectionName) {
    const isMap = sectionName === "map";
    const isCoordinate = sectionName === "coordinate";
    const isGrid = !isMap && !isCoordinate;
    if (openGridSettingBtn) openGridSettingBtn.classList.toggle("active", isGrid);
    if (openMapTypeSettingBtn) openMapTypeSettingBtn.classList.toggle("active", isMap);
    if (openCoordinateSettingBtn) openCoordinateSettingBtn.classList.toggle("active", isCoordinate);
    if (gridSettingSection) gridSettingSection.classList.toggle("active", isGrid);
    if (mapTypeSettingSection) mapTypeSettingSection.classList.toggle("active", isMap);
    if (coordinateSettingSection) coordinateSettingSection.classList.toggle("active", isCoordinate);
  }
 
  function changeBaseMap(type) {
    const nextType = mapLayers[type] ? type : "pale";
    const nextLayer = mapLayers[nextType];
 
    if (baseTileLayer) {
      map.removeLayer(baseTileLayer);
    }
 
    baseTileLayer = L.tileLayer(nextLayer.url, {
      maxZoom: nextLayer.maxZoom,
      minZoom: 2,
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
      crossOrigin: true
    }).addTo(map);
    baseTileLayer.bringToBack();
 
    session.mapType = nextType;
    if (fixedMapType) fixedMapType.value = nextType;
    if (mapTypeStatusText) mapTypeStatusText.textContent = mapLayerLabels[nextType] || nextType;
 
    try {
      const raw = sessionStorage.getItem("disasterSession");
      if (raw) {
        const stored = JSON.parse(raw);
        stored.mapType = nextType;
        sessionStorage.setItem("disasterSession", JSON.stringify(stored));
      }
    } catch (error) {
      console.warn("地図種類の保存に失敗しました。", error);
    }
  }
 
  function setupSettingMenuEvents() {
    if (openGridSettingBtn) {
      openGridSettingBtn.addEventListener("click", () => setSettingSection("grid"));
    }
    if (openMapTypeSettingBtn) {
      openMapTypeSettingBtn.addEventListener("click", () => setSettingSection("map"));
    }
    if (openCoordinateSettingBtn) {
      openCoordinateSettingBtn.addEventListener("click", () => setSettingSection("coordinate"));
    }
    if (fixedMapType) {
      fixedMapType.value = session.mapType || "pale";
      fixedMapType.addEventListener("change", () => changeBaseMap(fixedMapType.value));
    }
    changeBaseMap(session.mapType || "pale");
    setupCoordinateTypeSettingEvents();
    setSettingSection("grid");
  }
 
  function cancelDrawMode() {
    drawSettings.type = "none";
    drawType.value = "none";
    resetDrawingState();
    updateDrawStatus();
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
      let binary = "";
      if (typeof TextEncoder === "function") {
        const bytes = new TextEncoder().encode(json);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
        }
      } else {
        binary = unescape(encodeURIComponent(json));
      }
      const base64 = btoa(binary);
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch (error) {
      console.warn("Viewer用データの生成に失敗しました。", error);
      return "";
    }
  }

  function encodeViewerPayloadPortable(data) {
    // Build023.6 Viewer共有エンジン刷新：
    // Cloudflare Pages公開環境では CompressionStream / DecompressionStream の対応差により、
    // #z=... の復号に失敗する端末がある。
    // 無料版Viewerでは端末互換性を最優先し、UTF-8 JSONをBase64URL化した #data=... 方式へ統一する。
    return { mode: "data", value: encodeViewerPayload(data) };
  }

  function compactPoint(point) {
    if (!point || typeof point.lat !== "number" || typeof point.lng !== "number") return null;
    return [Number(point.lat.toFixed(7)), Number(point.lng.toFixed(7))];
  }

  function compactBounds(bounds) {
    if (!bounds || !bounds.southWest || !bounds.northEast) return null;
    return [compactPoint(bounds.southWest), compactPoint(bounds.northEast)];
  }

  function compactText(value, max = 160) {
    const text = String(value ?? "");
    return text.length > max ? text.slice(0, max) : text;
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
      b: "Build023.6",
      t: data.sharedAt || new Date().toISOString(),
      n: "現場閲覧モードは閲覧専用です。リアルタイム同期は行いません。",
      c: data.coordinateType || "dms",
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
    // Build021 Web公開対応：
    // fixed.html のURL形式に依存せず、常に同じ階層の viewer.html を指す。
    // これにより Cloudflare Pages上でも Viewer URL が fixed.html へ戻る事故を防ぐ。
    try {
      const url = new URL("viewer.html", window.location.href);
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch (error) {
      return "viewer.html";
    }
  }

  function stripAttachmentForViewer(pin) {
    const copy = { ...(pin || {}) };
    delete copy.attachmentDataUrl;
    delete copy.attachment;
    delete copy.attachmentPreview;
    delete copy.attachmentInfo;
    return copy;
  }

  function buildViewerShareData() {
    const savedBounds = plainBoundsFromAnyBounds(fixedBounds) || plainBoundsFromAnyBounds(session.bounds);
    const mapReady = !!(map && map._loaded);
    const currentCenter = mapReady ? map.getCenter() : session.center;
    const currentZoom = mapReady ? map.getZoom() : session.zoom;
    const savedCenter = plainCenterFromAnyCenter(currentCenter) || plainCenterFromAnyCenter(session.center);
    const currentMapType = session.mapType || (fixedMapType ? fixedMapType.value : "pale");

    // Build017 QR読取安定化：
    // Viewer用URLへ保存するデータを閲覧に必要な最小構成へ圧縮する。
    // 写真のDataURL等を含めるとURLが長大化し、QRコードの読取不能原因になるため除外する。
    return {
      appName: "G-Link Standard",
      format: "glink-viewer",
      version: "1.6",
      build: "Build023.6",
      viewerMode: true,
      sharedAt: new Date().toISOString(),
      notice: "現場閲覧モードは閲覧専用です。リアルタイム同期は行いません。",
      coordinateType,
      header: saveSharedHeader(getCurrentHeaderFromScreen()),
      session: {
        bounds: savedBounds,
        center: savedCenter,
        zoom: currentZoom,
        mapType: currentMapType,
        gridSize: session.gridSize || 0,
        coordinateType
      },
      mapType: currentMapType,
      gridSize: session.gridSize || 0,
      bounds: savedBounds,
      gridLineSettings: { ...gridLineSettings },
      pins: serializePins().map(stripAttachmentForViewer),
      drawings: serializeDrawings(),
      tracks: serializeTracks(),
      measurements: serializeMeasurements(),
      activityHistory: activityHistory.map(item => ({ ...item }))
    };
  }

  async function getCurrentShareUrl() {
    const compact = compactViewerData(buildViewerShareData());
    const encoded = encodeViewerPayloadPortable(compact);
    if (!encoded.value) return getViewerBaseUrl();
    try {
      // 同一端末・同一ブラウザでViewerを開く場合の保険として、直近データをlocalStorageにも退避する。
      // 別端末共有ではURL内の #data=... を使用するため、外部DBや専用サーバーは不要。
      localStorage.setItem("glinkViewerLastData", JSON.stringify(compact));
    } catch (error) {
      console.warn("Viewer用データの一時保存に失敗しました。", error);
    }
    return `${getViewerBaseUrl()}#${encoded.mode}=${encoded.value}`;
  }

  function setShareStatus(message, isError = false) {
    if (!shareCopyStatus) return;
    shareCopyStatus.textContent = message || "";
    shareCopyStatus.style.color = isError ? "#b91c1c" : "#166534";
    if (message) {
      window.setTimeout(() => {
        if (shareCopyStatus && shareCopyStatus.textContent === message) {
          shareCopyStatus.textContent = "";
        }
      }, 2500);
    }
  }

  function renderShareQr(url) {
    if (!shareQrCode) return;
    shareQrCode.innerHTML = "";

    if (!url) {
      shareQrCode.innerHTML = '<div class="shareQrFallback">共有URLを取得できませんでした。</div>';
      return;
    }

    if (typeof QRCode === "function") {
      try {
        new QRCode(shareQrCode, {
          text: url,
          width: 216,
          height: 216,
          colorDark: "#111111",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.L
        });
        return;
      } catch (error) {
        console.warn("QRコード生成に失敗しました。", error);
      }
    }

    shareQrCode.innerHTML = '<div class="shareQrFallback">QRコード生成ライブラリを読み込めませんでした。ネットワーク接続を確認してください。URLコピーは利用できます。</div>';
  }

  async function updateSharePanel() {
    if (shareUrlInput) shareUrlInput.value = "共有URLを生成中です...";
    const url = await getCurrentShareUrl();
    if (shareUrlInput) {
      shareUrlInput.value = url;
    }
    renderShareQr(url);
    if (url.length > 2200) {
      setShareStatus("共有データ量が多いため、QRが読みにくい場合があります。URLコピーでの共有も併用してください。", true);
    }
  }

  function fallbackCopyText(text) {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    temp.setSelectionRange(0, temp.value.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(temp);
    return ok;
  }

  async function copyShareUrl() {
    let url = shareUrlInput ? shareUrlInput.value : "";
    if (!url || url === "共有URLを生成中です...") url = await getCurrentShareUrl();
    if (!url) {
      setShareStatus("コピーするURLがありません。", true);
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setShareStatus("共有URLをコピーしました。", false);
        return;
      }
    } catch (error) {
      console.warn("Clipboard APIでのコピーに失敗しました。", error);
    }

    if (fallbackCopyText(url)) {
      setShareStatus("共有URLをコピーしました。", false);
    } else {
      setShareStatus("自動コピーできませんでした。URLを選択して手動でコピーしてください。", true);
      if (shareUrlInput) shareUrlInput.select();
    }
  }

  function sanitizeFileNamePart(value) {
    return String(value || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 40);
  }

  function buildQrFileName() {
    const disaster = sanitizeFileNamePart(disasterName ? disasterName.value : "");
    const unit = sanitizeFileNamePart(createdUnit ? createdUnit.value : "");
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const parts = [disaster, unit, "共有QR", stamp].filter(Boolean);
    return `${parts.join("_") || `G-Link_共有QR_${stamp}`}.png`;
  }

  function getShareQrDataUrl() {
    if (!shareQrCode) return "";
    const canvas = shareQrCode.querySelector("canvas");
    if (canvas && typeof canvas.toDataURL === "function") {
      try {
        return canvas.toDataURL("image/png");
      } catch (error) {
        console.warn("QRコード画像の取得に失敗しました。", error);
      }
    }

    const image = shareQrCode.querySelector("img");
    if (image && image.src) {
      return image.src;
    }

    return "";
  }


  async function openViewerPreview() {
    let url = shareUrlInput ? shareUrlInput.value : "";
    if (!url || url === "共有URLを生成中です...") {
      url = await getCurrentShareUrl();
      if (shareUrlInput) shareUrlInput.value = url;
      renderShareQr(url);
    }
    if (!url) {
      setShareStatus("Viewerを開くURLがありません。", true);
      return;
    }
    const viewerWindow = window.open(url, "_blank", "noopener");
    if (!viewerWindow) {
      setShareStatus("Viewerを開けませんでした。ポップアップブロックを許可してください。", true);
    }
  }

  async function saveShareQrImage() {
    let url = shareUrlInput ? shareUrlInput.value : "";
    if (!url || url === "共有URLを生成中です...") url = await getCurrentShareUrl();
    if (!url) {
      setShareStatus("保存するQRコードのURLがありません。", true);
      return;
    }

    if (!shareQrCode || !shareQrCode.querySelector("canvas, img")) {
      renderShareQr(url);
    }

    const dataUrl = getShareQrDataUrl();
    if (!dataUrl) {
      setShareStatus("QR画像を保存できませんでした。QRコードを更新してから再度お試しください。", true);
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = buildQrFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShareStatus("QR画像を保存しました。", false);
  }

  function setupSharePanelEvents() {
    if (copyShareUrlBtn) {
      copyShareUrlBtn.addEventListener("click", copyShareUrl);
    }
    if (refreshShareQrBtn) {
      refreshShareQrBtn.addEventListener("click", async () => {
        await updateSharePanel();
        setShareStatus("URL・QRコードを更新しました。", false);
      });
    }
    if (saveShareQrBtn) {
      saveShareQrBtn.addEventListener("click", saveShareQrImage);
    }
    if (openViewerBtn) {
      openViewerBtn.addEventListener("click", openViewerPreview);
    }
    if (shareUrlInput) {
      shareUrlInput.addEventListener("focus", () => shareUrlInput.select());
      shareUrlInput.addEventListener("click", () => shareUrlInput.select());
    }
    // Build017修正：起動直後は地図の中心・ズームが未確定のため、
    // 共有URL生成（buildGlinkData）を実行しない。
    // 共有パネルを開いた時、または更新ボタンを押した時に生成する。
  }

  function openToolPanel(panelId) {
    if (panelId !== "editToolPanel") {
      cancelDrawMode();
    }
 
    if (panelId !== "measurePanel" && typeof setMeasureMode === "function") {
      setMeasureMode(false);
    }
 
    panelContents.forEach(panel => panel.classList.remove("active"));
    toolButtons.forEach(btn => btn.classList.remove("active"));
 
    const targetPanel = document.getElementById(panelId);
    if (targetPanel) targetPanel.classList.add("active");
 
    const targetButton = document.querySelector(`.toolBtn[data-panel="${panelId}"]`);
    if (targetButton) targetButton.classList.add("active");
 
    panelTitle.textContent = panelNames[panelId] || "ツール";
    toolPanel.style.display = "block";

    if (panelId === "sharePanel") {
      updateSharePanel();
    }
  }
 
  function closeToolPanelFunc() {
    cancelDrawMode();
    toolPanel.style.display = "none";
    toolButtons.forEach(btn => btn.classList.remove("active"));
    panelContents.forEach(panel => panel.classList.remove("active"));
  }
 
  async function captureMapPreviewImage() {
    // Version1.6.1 Build006
    // 保存センターでは地図・グリッドを再計算せず、指揮本部モードで見えている
    // 「グリッド図の完成形」を1枚のPNGとして渡す。
    // html2canvasで地図タイルのみを取得し、その後に指揮本部モードと同じ座標から
    // グリッド線・赤ラベルをCanvasへ直接描画することで、保存センター側のズレを根本的に防止する。
    if (typeof html2canvas !== "function") return null;
 
    const target = document.getElementById("mapContainer");
    const overlay = document.getElementById("gridOverlay");
    if (!target || !overlay || !map) return null;
 
    const info = getGridInfo();
    if (!info) return null;
 
    // 現在の地図サイズ・グリッドを最新化してから取得する。
    try {
      map.invalidateSize(false);
      drawGridLines();
      drawGridOverlay();
    } catch (error) {
      console.warn("グリッド図の更新に失敗しました。", error);
    }
 
    await new Promise(resolve => setTimeout(resolve, 250));
 
    const edgeCells = Array.from(overlay.querySelectorAll(".edgeCell"));
    if (!edgeCells.length) return null;
 
    function getCropRect() {
      const targetRect = target.getBoundingClientRect();
      let minLeft = Infinity;
      let minTop = Infinity;
      let maxRight = -Infinity;
      let maxBottom = -Infinity;
 
      edgeCells.forEach(cell => {
        const rect = cell.getBoundingClientRect();
        minLeft = Math.min(minLeft, rect.left - targetRect.left);
        minTop = Math.min(minTop, rect.top - targetRect.top);
        maxRight = Math.max(maxRight, rect.right - targetRect.left);
        maxBottom = Math.max(maxBottom, rect.bottom - targetRect.top);
      });
 
      if (!Number.isFinite(minLeft) || !Number.isFinite(minTop) || !Number.isFinite(maxRight) || !Number.isFinite(maxBottom)) {
        return null;
      }
 
      // はみ出し防止を優先し、赤ラベル外周の内外を含めた範囲だけを切り出す。
      // 余白は0に近くし、線欠け防止分のみ1px残す。
      const padding = 1;
      const x = Math.max(0, Math.floor(minLeft - padding));
      const y = Math.max(0, Math.floor(minTop - padding));
      const right = Math.min(targetRect.width, Math.ceil(maxRight + padding));
      const bottom = Math.min(targetRect.height, Math.ceil(maxBottom + padding));
 
      return {
        x,
        y,
        width: Math.max(1, right - x),
        height: Math.max(1, bottom - y)
      };
    }
 
    function hideGridForBaseCapture() {
      const restoreItems = [];
 
      // 赤ラベルは後でCanvasへ正確に描くため、ベース取得時は非表示にする。
      restoreItems.push({
        restore: () => { overlay.style.visibility = overlay.dataset._oldVisibility || ""; delete overlay.dataset._oldVisibility; }
      });
      overlay.dataset._oldVisibility = overlay.style.visibility || "";
      overlay.style.visibility = "hidden";
 
      // グリッド線も後でCanvasへ正確に描くため、ベース取得時は非表示にする。
      if (gridLayer && typeof gridLayer.eachLayer === "function") {
        gridLayer.eachLayer(layer => {
          if (!layer || typeof layer.setStyle !== "function") return;
          const old = {
            opacity: layer.options?.opacity,
            fillOpacity: layer.options?.fillOpacity
          };
          restoreItems.push({
            restore: () => layer.setStyle({ opacity: old.opacity ?? gridLineSettings.opacity, fillOpacity: old.fillOpacity ?? 0 })
          });
          layer.setStyle({ opacity: 0, fillOpacity: 0 });
        });
      }
 
      // ピンはhtml2canvas任せにすると色が暗く見える場合があるため、
      // ベース取得時は非表示にし、後段で指揮本部モードと同じ色をCanvasへ直接焼き込む。
      if (pinLayer && typeof pinLayer.eachLayer === "function") {
        pinLayer.eachLayer(layer => {
          const el = layer && typeof layer.getElement === "function" ? layer.getElement() : null;
          if (!el) return;
          const oldVisibility = el.style.visibility || "";
          restoreItems.push({ restore: () => { el.style.visibility = oldVisibility; } });
          el.style.visibility = "hidden";
        });
      }
 
      // Build016 保存センター最終修正
      // 編集図形・計測図形はSVGのDOM取得に任せると、保存センターのプレビューで
      // 欠落・ズレが出る場合があるため、ベース取得時は非表示にしてCanvasへ手描きする。
      [drawingLayer, measureLayer].forEach(layerGroup => {
        if (!layerGroup || typeof layerGroup.eachLayer !== "function") return;
        layerGroup.eachLayer(layer => {
          if (!layer) return;
          if (typeof layer.setStyle === "function") {
            const old = {
              opacity: layer.options?.opacity,
              fillOpacity: layer.options?.fillOpacity
            };
            restoreItems.push({
              restore: () => layer.setStyle({
                opacity: old.opacity ?? 1,
                fillOpacity: old.fillOpacity ?? 0
              })
            });
            layer.setStyle({ opacity: 0, fillOpacity: 0 });
          }
          if (typeof layer.eachLayer === "function") {
            layer.eachLayer(child => {
              if (child && typeof child.setStyle === "function") {
                const old = { opacity: child.options?.opacity, fillOpacity: child.options?.fillOpacity };
                restoreItems.push({
                  restore: () => child.setStyle({ opacity: old.opacity ?? 1, fillOpacity: old.fillOpacity ?? 0 })
                });
                child.setStyle({ opacity: 0, fillOpacity: 0 });
              }
              const childEl = child && typeof child.getElement === "function" ? child.getElement() : null;
              if (childEl) {
                const oldVisibility = childEl.style.visibility || "";
                restoreItems.push({ restore: () => { childEl.style.visibility = oldVisibility; } });
                childEl.style.visibility = "hidden";
              }
            });
          }
          const el = typeof layer.getElement === "function" ? layer.getElement() : null;
          if (el) {
            const oldVisibility = el.style.visibility || "";
            restoreItems.push({ restore: () => { el.style.visibility = oldVisibility; } });
            el.style.visibility = "hidden";
          }
        });
      });
 
      return () => restoreItems.reverse().forEach(item => item.restore());
    }
 
    function mapPoint(lat, lng, crop) {
      const p = map.latLngToContainerPoint([lat, lng]);
      return { x: p.x - crop.x, y: p.y - crop.y };
    }
 
    function drawManualGridLines(ctx, crop) {
      const options = getGridLineOptions();
      const south = info.southLine - info.latStep;
      const north = info.northLine + info.latStep;
      const west = info.westLine - info.lngStep;
      const east = info.eastLine + info.lngStep;
 
      ctx.save();
      ctx.strokeStyle = options.color || "#888888";
      ctx.globalAlpha = Number.isFinite(options.opacity) ? options.opacity : 0.5;
      ctx.lineWidth = Number(options.weight || 1);
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
 
      for (let lng = info.westLine; lng <= info.eastLine + info.lngStep / 1000; lng += info.lngStep) {
        const p1 = mapPoint(south, lng, crop);
        const p2 = mapPoint(north, lng, crop);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
 
      for (let lat = info.southLine; lat <= info.northLine + info.latStep / 1000; lat += info.latStep) {
        const p1 = mapPoint(lat, west, crop);
        const p2 = mapPoint(lat, east, crop);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
 
      ctx.restore();
    }
 
    function drawManualEdgeCells(ctx, crop) {
      function rectFromPoints(p1, p2) {
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        return { x, y, w, h };
      }
 
      function drawCellByLatLng(lat1, lng1, lat2, lng2, text, blank) {
        const p1 = mapPoint(lat1, lng1, crop);
        const p2 = mapPoint(lat2, lng2, crop);
        const r = rectFromPoints(p1, p2);
        if (r.w <= 0 || r.h <= 0) return;
 
        ctx.save();
        ctx.fillStyle = "rgba(220, 38, 38, 0.92)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, Math.max(0, r.w - 1), Math.max(0, r.h - 1));
 
        if (!blank && text) {
          const labelText = String(text);
          const baseSize = Math.min(r.w * 0.52, r.h * 0.62);
          const adjustedSize = labelText.length >= 2 ? baseSize * 0.86 : baseSize;
          const fontSize = Math.max(8, Math.min(30, adjustedSize));
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(0,0,0,0.45)";
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 1;
          ctx.shadowBlur = 2;
          ctx.fillStyle = "#ffffff";
          ctx.fillText(labelText, r.x + r.w / 2, r.y + r.h / 2);
        }
        ctx.restore();
      }
 
      const colCount = Math.round((info.eastLine - info.westLine) / info.lngStep);
      const rowCount = Math.round((info.northLine - info.southLine) / info.latStep);
 
      // 四隅
      drawCellByLatLng(info.northLine + info.latStep, info.westLine - info.lngStep, info.northLine, info.westLine, "", true);
      drawCellByLatLng(info.northLine + info.latStep, info.eastLine, info.northLine, info.eastLine + info.lngStep, "", true);
      drawCellByLatLng(info.southLine, info.westLine - info.lngStep, info.southLine - info.latStep, info.westLine, "", true);
      drawCellByLatLng(info.southLine, info.eastLine, info.southLine - info.latStep, info.eastLine + info.lngStep, "", true);
 
      // 上下アルファベット
      for (let i = 0; i < colCount; i++) {
        const lng1 = info.westLine + info.lngStep * i;
        const lng2 = info.westLine + info.lngStep * (i + 1);
        const label = getColumnName(i);
        drawCellByLatLng(info.northLine + info.latStep, lng1, info.northLine, lng2, label, false);
        drawCellByLatLng(info.southLine, lng1, info.southLine - info.latStep, lng2, label, false);
      }
 
      // 左右数字
      for (let i = 0; i < rowCount; i++) {
        const lat1 = info.northLine - info.latStep * i;
        const lat2 = info.northLine - info.latStep * (i + 1);
        const label = String(i + 1);
        drawCellByLatLng(lat1, info.westLine - info.lngStep, lat2, info.westLine, label, false);
        drawCellByLatLng(lat1, info.eastLine, lat2, info.eastLine + info.lngStep, label, false);
      }
    }
 
    function drawManualPins(ctx, crop) {
      if (!Array.isArray(pins) || !pins.length) return;
 
      pins.forEach((pin, index) => {
        if (!pin || !pin.data) return;
        const lat = Number(pin.data.lat);
        const lng = Number(pin.data.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
 
        const p = mapPoint(lat, lng, crop);
        const radius = 13;
        if (p.x < -radius || p.y < -radius || p.x > crop.width + radius || p.y > crop.height + radius) return;
 
        const normalizedType = normalizePinType(pin.data.type);
        const fill = pin.data.completed ? pinColors.completed : (pinColors[normalizedType] || pinColors.fire);
        const number = String(index + 1);
        const fontSize = number.length >= 3 ? 9 : (number.length >= 2 ? 10 : 12);
 
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 7;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();
 
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
 
        ctx.font = `900 ${fontSize}px Arial, "Yu Gothic", "Meiryo", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 2;
        ctx.fillText(number, p.x, p.y + 0.5);
        ctx.restore();
      });
    }
 
    function getCanvasPoints(points, crop) {
      if (!Array.isArray(points)) return [];
      return points
        .map(point => {
          if (!point) return null;
          const lat = Number(point.lat);
          const lng = Number(point.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return mapPoint(lat, lng, crop);
        })
        .filter(Boolean);
    }
 
    function applyCanvasLineStyle(ctx, meta = {}, fallbackColor = "#0066ff") {
      ctx.strokeStyle = meta.color || meta.lineColor || fallbackColor;
      ctx.lineWidth = Math.max(1, Number(meta.weight || 3));
      ctx.globalAlpha = Number.isFinite(Number(meta.opacity)) ? Number(meta.opacity) : 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const style = meta.style || "solid";
      if (style === "dash") ctx.setLineDash([10, 8]);
      else if (style === "dot") ctx.setLineDash([2, 8]);
      else ctx.setLineDash([]);
    }
 
    function strokeCanvasPath(ctx, points, close = false) {
      if (!points || points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      if (close) ctx.closePath();
      ctx.stroke();
    }
 
    function fillCanvasPath(ctx, points, meta = {}, fallbackColor = "#0066ff") {
      if (!points || points.length < 3) return;
      const fillMode = meta.fillMode || "none";
      const fillOpacity = fillMode === "semi" ? 0.25 : Number(meta.fillOpacity ?? meta.opacity ?? 0);
      if (fillMode !== "semi" && fillOpacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fillOpacity));
      ctx.fillStyle = meta.fillColor || meta.color || meta.lineColor || fallbackColor;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
 
    function metersToPixelsAtLat(meters, lat) {
      const zoom = map.getZoom();
      const metersPerPixel = 40075016.686 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom + 8);
      if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return meters;
      return meters / metersPerPixel;
    }
 
    function drawCanvasArrowHead(ctx, start, end, color) {
      if (!start || !end) return;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const size = 16;
      ctx.save();
      ctx.fillStyle = color || "#0066ff";
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
 
    function normalizeShapeLatLngs(latlngs) {
      if (!Array.isArray(latlngs)) return [];
      if (latlngs.length && Array.isArray(latlngs[0])) return normalizeShapeLatLngs(latlngs[0]);
      return latlngs;
    }
 
    function drawManualDrawings(ctx, crop) {
      const shapeList = typeof serializeDrawings === "function" ? serializeDrawings() : [];
      shapeList.forEach(shape => {
        if (!shape || !shape.meta) return;
        const meta = shape.meta;
        ctx.save();
        applyCanvasLineStyle(ctx, meta, "#0066ff");
 
        if (meta.type === "circle" && shape.circleCenter && Number.isFinite(Number(shape.radius))) {
          const center = mapPoint(Number(shape.circleCenter.lat), Number(shape.circleCenter.lng), crop);
          const radiusPx = metersToPixelsAtLat(Number(shape.radius), Number(shape.circleCenter.lat));
          if (center.x + radiusPx < 0 || center.y + radiusPx < 0 || center.x - radiusPx > crop.width || center.y - radiusPx > crop.height) {
            ctx.restore();
            return;
          }
          if (meta.fillMode === "semi") {
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = meta.color || "#0066ff";
            ctx.beginPath();
            ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
            ctx.fill();
            applyCanvasLineStyle(ctx, meta, "#0066ff");
          }
          ctx.beginPath();
          ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          return;
        }
 
        if (meta.type === "arrow" && shape.arrowStart && shape.arrowEnd) {
          const start = mapPoint(Number(shape.arrowStart.lat), Number(shape.arrowStart.lng), crop);
          const end = mapPoint(Number(shape.arrowEnd.lat), Number(shape.arrowEnd.lng), crop);
          strokeCanvasPath(ctx, [start, end], false);
          drawCanvasArrowHead(ctx, start, end, meta.color || "#0066ff");
          ctx.restore();
          return;
        }
 
        const latlngs = normalizeShapeLatLngs(shape.latlngs);
        const points = getCanvasPoints(latlngs, crop);
        if (points.length < 2) {
          ctx.restore();
          return;
        }
        const closed = meta.type === "polygon" || meta.type === "rectangle" || meta.fillMode === "semi";
        fillCanvasPath(ctx, points, meta, "#0066ff");
        applyCanvasLineStyle(ctx, meta, "#0066ff");
        strokeCanvasPath(ctx, points, closed);
        ctx.restore();
      });
    }
 
    function drawManualMeasurements(ctx, crop) {
      if (!Array.isArray(measurements) || !measurements.length) return;
      measurements.forEach((item, index) => {
        const style = item.style || {};
        const points = getCanvasPoints(item.points || [], crop);
        if (points.length < 3) return;
 
        ctx.save();
        fillCanvasPath(ctx, points, {
          fillColor: style.fillColor || style.lineColor || "#a855f7",
          fillOpacity: Number(style.opacity ?? 0.35)
        }, "#a855f7");
        applyCanvasLineStyle(ctx, {
          lineColor: style.lineColor || "#7e22ce",
          weight: Number(style.weight || 3),
          opacity: 0.95,
          style: "solid"
        }, "#7e22ce");
        strokeCanvasPath(ctx, points, true);
        ctx.restore();
 
        const centerLatLng = getPolygonCenter(item.points || []);
        if (centerLatLng) {
          const p = mapPoint(centerLatLng.lat, centerLatLng.lng, crop);
          ctx.save();
          ctx.fillStyle = "#7e22ce";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.font = "bold 13px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(String(item.number || index + 1), p.x, p.y + 0.5);
          ctx.restore();
        }
      });
    }
 
    const crop = getCropRect();
    if (!crop) return null;
 
    let restore = null;
    try {
      restore = hideGridForBaseCapture();
      await new Promise(resolve => setTimeout(resolve, 80));
 
      const fullCanvas = await html2canvas(target, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scale: 1,
        logging: false,
        ignoreElements: element => element && element.classList && element.classList.contains("leaflet-control-attribution")
      });
 
      if (typeof restore === "function") restore();
      restore = null;
 
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = crop.width;
      cropCanvas.height = crop.height;
      const ctx = cropCanvas.getContext("2d");
      if (!ctx) return null;
 
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, crop.width, crop.height);
      ctx.drawImage(fullCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
 
      // Build016: 編集図形・計測図形も、指揮本部モードの座標からCanvasへ直接焼き込む。
      drawManualDrawings(ctx, crop);
      drawManualMeasurements(ctx, crop);
 
      // グリッド線と赤ラベルは、保存センター側で再描画しない前提で、ここで完成画像として焼き込む。
      drawManualGridLines(ctx, crop);
      drawManualEdgeCells(ctx, crop);
      drawManualPins(ctx, crop);
 
      return cropCanvas.toDataURL("image/png");
    } catch (error) {
      if (typeof restore === "function") restore();
      console.warn("保存センター用のグリッド図PNGを作成できませんでした。", error);
      return null;
    }
  }
 
  async function captureCommandCenterPreviewImage() {
    // Version1.6.3 Build010
    // .glinkファイル保存用は、印刷・画像保存用の切り出し範囲ではなく、
    // 指揮本部モードで実際に表示している地図全体を確認できるプレビュー画像にする。
    if (typeof html2canvas !== "function") return null;
 
    const target = document.getElementById("mapContainer");
    if (!target || !map) return null;
 
    try {
      map.invalidateSize(false);
      drawGridLines();
      drawGridOverlay();
    } catch (error) {
      console.warn("指揮本部モード全体プレビューの更新に失敗しました。", error);
    }
 
    await new Promise(resolve => setTimeout(resolve, 250));
 
    try {
      const canvas = await html2canvas(target, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scale: 1,
        logging: false,
        ignoreElements: element => element && element.classList && element.classList.contains("leaflet-control-attribution")
      });
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.warn("保存センター用の指揮本部モード全体プレビューを作成できませんでした。", error);
      return null;
    }
  }
 
  async function openSaveCenter() {
    cancelDrawMode();
    if (typeof setMeasureMode === "function") {
      setMeasureMode(false);
    }

    // Build018：保存センターは新しいタブで開く。
    // 指揮本部モード本体を再読み込みしないため、作業中の地図・ピン・活動履歴・計測状態をそのまま維持できる。
    // 注意：ポップアップブロックを避けるため、クリック直後に先に空タブを開いてからデータ作成を行う。
    const saveCenterWindow = window.open("about:blank", "_blank");
    if (!saveCenterWindow) {
      alert("保存センターの新しいタブを開けませんでした。ブラウザのポップアップブロックを許可してから再度お試しください。");
      return;
    }

    try {
      saveCenterWindow.document.write("<!doctype html><html><head><meta charset='utf-8'><title>保存センター準備中</title></head><body style='font-family:sans-serif;padding:24px;'>保存センターを準備しています...</body></html>");
      saveCenterWindow.document.close();
    } catch (error) {
      // 別タブの初期表示に失敗しても保存センター表示自体には影響しない。
    }

    // 保存センターでプレビューやファイル名へ反映できるよう、
    // 指揮本部モードの現在状態を保存センター専用データとして一時保存する。
    // 作業復元用データには使わないため、容量の大きい画像を含めても指揮本部モード本体は壊れない。
    try {
      const saveCenterData = buildGlinkData();
      const previewImage = await captureMapPreviewImage();
      if (previewImage) saveCenterData.mapPreviewImage = previewImage;
      const commandCenterPreviewImage = await captureCommandCenterPreviewImage();
      if (commandCenterPreviewImage) saveCenterData.commandCenterPreviewImage = commandCenterPreviewImage;
      const saveCenterJson = JSON.stringify(saveCenterData);
      localStorage.setItem("gLink_saveCenterData", saveCenterJson);
      sessionStorage.setItem("gLink_saveCenterData", saveCenterJson);

      if (saveCenterData.session) {
        const sessionForSaveCenter = { ...saveCenterData.session };
        const normalizedBounds = normalizePlainBoundsForStartup(saveCenterData.session.bounds || saveCenterData.bounds);
        if (normalizedBounds) {
          sessionForSaveCenter.bounds = {
            _southWest: { ...normalizedBounds.southWest },
            _northEast: { ...normalizedBounds.northEast },
            southWest: { ...normalizedBounds.southWest },
            northEast: { ...normalizedBounds.northEast }
          };
        }
        sessionStorage.setItem("disasterSession", JSON.stringify(sessionForSaveCenter));
      }

      saveCenterWindow.location.href = "save.html";
    } catch (error) {
      console.warn("保存センター用データの作成に失敗しました。", error);
      try { saveCenterWindow.close(); } catch (closeError) {}
      alert("保存センター用データの作成に失敗しました。もう一度お試しください。");
    }
  }
 

  if (trackWeight) trackWeight.addEventListener("input", updateTrackStatus);
  if (trackColor) trackColor.addEventListener("input", () => {
    trackColorPresets.forEach(btn => btn.classList.toggle("active", btn.dataset.color === trackColor.value));
    updateTrackStatus();
  });
  trackColorPresets.forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color || "#facc15";
      if (trackColor) trackColor.value = color;
      trackColorPresets.forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
      updateTrackStatus();
    });
  });
  if (applyGpxTrackBtn) applyGpxTrackBtn.addEventListener("click", applyGpxTrack);
  if (clearGpxTrackBtn) clearGpxTrackBtn.addEventListener("click", () => {
    if (!tracks.length || confirm("表示中の軌跡をすべて削除しますか？")) clearGpxTracks();
  });
  updateTrackStatus();

  toolButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.id === "openSaveCenterBtn") {
        openSaveCenter();
        return;
      }
      if (btn.dataset.panel) {
        openToolPanel(btn.dataset.panel);
      }
    });
  });
 
  closeToolPanel.addEventListener("click", closeToolPanelFunc);
 
  updateGridLineSettingControls();
  setupGridLineSettingEvents();
  setupSettingMenuEvents();
  setupMeasureEvents();
  setupSharePanelEvents();
 
  map.on("mousemove", e => updateCursorInfo(e.latlng));
  map.on("mouseout", clearCursorInfo);
 
  if (session.bounds) {
    const normalizedStartupBounds = normalizePlainBoundsForStartup(session.bounds);
    if (normalizedStartupBounds) {
      const southWest = L.latLng(normalizedStartupBounds.southWest.lat, normalizedStartupBounds.southWest.lng);
      const northEast = L.latLng(normalizedStartupBounds.northEast.lat, normalizedStartupBounds.northEast.lng);
      fixedBounds = L.latLngBounds(southWest, northEast);
    }

    if (!fixedBounds) {
      console.warn("固定表示範囲を復元できなかったため、初期位置で表示します。", session.bounds);
      map.setView([35.6749, 139.7509], 13);
    } else {
 
    setTimeout(() => {
      map.invalidateSize();
 
      const info = getGridInfo();
 
      if (info) {
        displayBounds = L.latLngBounds(
          [info.southLine - info.latStep, info.westLine - info.lngStep],
          [info.northLine + info.latStep, info.eastLine + info.lngStep]
        );
      } else {
        displayBounds = fixedBounds;
      }
 
      map.fitBounds(displayBounds, { padding: [0, 0], animate: false });
 
      const initialZoom = map.getZoom();
      map.setMinZoom(initialZoom);
      map.setMaxZoom(18);
      map.setMaxBounds(displayBounds.pad(0.15));
      map.options.maxBoundsViscosity = 1.0;
 
      drawGridLines();
      drawGridOverlay();
    }, 100);
    }
  } else {
    map.setView([35.6749, 139.7509], 13);
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
 
  function getColumnIndex(name) {
    let index = 0;
    for (let i = 0; i < name.length; i++) {
      index = index * 26 + (name.charCodeAt(i) - 64);
    }
    return index - 1;
  }
 
  function getGridInfo() {
    if (!fixedBounds || !session.gridSize || session.gridSize === 0) return null;
 
    const meterPerLat = 111320;
    const baseLat = fixedBounds.getCenter().lat;
    const latStep = session.gridSize / meterPerLat;
    const lngStep = session.gridSize / (111320 * Math.cos(baseLat * Math.PI / 180));
 
    return {
      latStep,
      lngStep,
      westLine: Math.floor(fixedBounds.getWest() / lngStep) * lngStep,
      eastLine: Math.ceil(fixedBounds.getEast() / lngStep) * lngStep,
      southLine: Math.floor(fixedBounds.getSouth() / latStep) * latStep,
      northLine: Math.ceil(fixedBounds.getNorth() / latStep) * latStep
    };
  }
 
   function getGridNumber(latlng) {
    const info = getGridInfo();
    if (!info || !latlng) return "";
 
    const colCount = Math.round((info.eastLine - info.westLine) / info.lngStep);
    const rowCount = Math.round((info.northLine - info.southLine) / info.latStep);
    if (colCount <= 0 || rowCount <= 0) return "";
 
    // 表示されている赤いグリッド図の範囲を基準に判定する。
    // 従来の fixedBounds.contains() では、右端列・最下段行の一部が固定範囲外扱いとなり、
    // グリッド番号の自動表示・ピンへの自動反映が空欄になる場合があった。
    const epsilonLat = info.latStep * 1e-9;
    const epsilonLng = info.lngStep * 1e-9;
    const inLng = latlng.lng >= info.westLine - epsilonLng && latlng.lng <= info.eastLine + epsilonLng;
    const inLat = latlng.lat <= info.northLine + epsilonLat && latlng.lat >= info.southLine - epsilonLat;
    if (!inLng || !inLat) return "";
 
    let colIndex = Math.floor((latlng.lng - info.westLine) / info.lngStep);
    let rowIndex = Math.floor((info.northLine - latlng.lat) / info.latStep);
 
    // 東端線・南端線ちょうどに乗った場合は、ひとつ外側ではなく最後の列・行に丸める。
    colIndex = Math.min(Math.max(colIndex, 0), colCount - 1);
    rowIndex = Math.min(Math.max(rowIndex, 0), rowCount - 1);
 
    return getColumnName(colIndex) + "-" + (rowIndex + 1);
  }
 
  function setCoordinateDisplayLine(element, label, value) {
    if (!element) return;
    element.innerHTML = `<span class="coordLabelText">${label}：</span><span class="coordNumberText">${value || ""}</span>`;
  }
 
  function updateCursorInfo(latlng) {
    if (!latlng || !cursorLatDisplay || !cursorLngDisplay || !cursorGridDisplay) return;
 
    lastCursorLatLng = latlng;
    setCoordinateDisplayLine(cursorLatDisplay, "緯度", formatCoordinateValue(latlng.lat, "lat"));
    setCoordinateDisplayLine(cursorLngDisplay, "経度", formatCoordinateValue(latlng.lng, "lng"));
    cursorGridDisplay.textContent = getGridNumber(latlng) || "";
  }
 
  function clearCursorInfo() {
    lastCursorLatLng = null;
    setCoordinateDisplayLine(cursorLatDisplay, "緯度", "");
    setCoordinateDisplayLine(cursorLngDisplay, "経度", "");
    if (cursorGridDisplay) cursorGridDisplay.textContent = "";
  }
 
  function loadGridLineSettings() {
    try {
      const saved = localStorage.getItem("fireGridLineSettings");
      if (!saved) return { ...defaultGridLineSettings };
 
      const parsed = JSON.parse(saved);
      const savedColor = String(parsed.color || "").toLowerCase();
      const redLikeColors = new Set(["#ff0000", "#f00", "#e60000", "red"]);
      const safeColor = redLikeColors.has(savedColor) ? defaultGridLineSettings.color : (parsed.color || defaultGridLineSettings.color);
      return {
        color: safeColor,
        opacity: Number.isFinite(Number(parsed.opacity)) ? Number(parsed.opacity) : defaultGridLineSettings.opacity,
        weight: Number.isFinite(Number(parsed.weight)) ? Number(parsed.weight) : defaultGridLineSettings.weight
      };
    } catch (e) {
      return { ...defaultGridLineSettings };
    }
  }
 
  function saveGridLineSettings() {
    localStorage.setItem("fireGridLineSettings", JSON.stringify(gridLineSettings));
  }
 
  function updateGridLineSettingControls() {
    if (!gridLineColor || !gridLineOpacity || !gridLineWeight) return;
 
    gridLineColor.value = gridLineSettings.color;
    gridLineOpacity.value = Math.round(gridLineSettings.opacity * 100);
    gridLineOpacityValue.textContent = gridLineOpacity.value;
    gridLineWeight.value = gridLineSettings.weight;
    gridLineWeightValue.textContent = gridLineSettings.weight;
    gridLineStatusText.textContent = `色 ${gridLineSettings.color}・濃さ${gridLineOpacity.value}%・太さ${gridLineSettings.weight}`;
  }
 
  function getGridLineOptions() {
    return {
      color: gridLineSettings.color,
      weight: gridLineSettings.weight,
      opacity: gridLineSettings.opacity,
      interactive: false
    };
  }
 
  function applyGridLineSettings() {
    saveGridLineSettings();
    updateGridLineSettingControls();
    drawGridLines();
    drawGridOverlay();
  }
 
  function setupGridLineSettingEvents() {
    if (!gridLineColor || !gridLineOpacity || !gridLineWeight) return;
 
    gridLineColor.addEventListener("input", () => {
      gridLineSettings.color = gridLineColor.value;
      applyGridLineSettings();
    });
 
    gridLineOpacity.addEventListener("input", () => {
      gridLineSettings.opacity = Number(gridLineOpacity.value) / 100;
      applyGridLineSettings();
    });
 
    gridLineWeight.addEventListener("input", () => {
      gridLineSettings.weight = Number(gridLineWeight.value);
      applyGridLineSettings();
    });
 
    if (resetGridLineStyle) {
      resetGridLineStyle.addEventListener("click", () => {
        gridLineSettings = { ...defaultGridLineSettings };
        applyGridLineSettings();
      });
    }
  }
 
  function drawGridLines() {
    gridLayer.clearLayers();
    const info = getGridInfo();
    if (!info) return;
 
    const south = info.southLine - info.latStep;
    const north = info.northLine + info.latStep;
    const west = info.westLine - info.lngStep;
    const east = info.eastLine + info.lngStep;
    const gridLineOptions = getGridLineOptions();
 
    for (let lng = info.westLine; lng <= info.eastLine; lng += info.lngStep) {
      gridLayer.addLayer(L.polyline([[south, lng], [north, lng]], gridLineOptions));
    }
 
    for (let lat = info.southLine; lat <= info.northLine; lat += info.latStep) {
      gridLayer.addLayer(L.polyline([[lat, west], [lat, east]], gridLineOptions));
    }
  }
 
  function drawGridOverlay() {
    gridOverlay.innerHTML = "";
    const info = getGridInfo();
    if (!info) return;
 
    function point(lat, lng) {
      return map.latLngToContainerPoint([lat, lng]);
    }
 
    function addCell(x1, y1, x2, y2, text, isBlank) {
      const cell = document.createElement("div");
      cell.className = "edgeCell" + (isBlank ? " blank" : "");
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      const labelText = text || "";
      const baseSize = Math.min(width * 0.52, height * 0.62);
      const adjustedSize = String(labelText).length >= 2 ? baseSize * 0.86 : baseSize;
      const fontSize = Math.max(8, Math.min(30, adjustedSize));
      cell.textContent = labelText;
      cell.style.left = Math.min(x1, x2) + "px";
      cell.style.top = Math.min(y1, y2) + "px";
      cell.style.width = width + "px";
      cell.style.height = height + "px";
      cell.style.fontSize = fontSize + "px";
      cell.style.lineHeight = "1";
      gridOverlay.appendChild(cell);
    }
 
    const colCount = Math.round((info.eastLine - info.westLine) / info.lngStep);
    const rowCount = Math.round((info.northLine - info.southLine) / info.latStep);
 
    addCell(point(info.northLine + info.latStep, info.westLine - info.lngStep).x, point(info.northLine + info.latStep, info.westLine - info.lngStep).y, point(info.northLine, info.westLine).x, point(info.northLine, info.westLine).y, "", true);
    addCell(point(info.northLine + info.latStep, info.eastLine).x, point(info.northLine + info.latStep, info.eastLine).y, point(info.northLine, info.eastLine + info.lngStep).x, point(info.northLine, info.eastLine + info.lngStep).y, "", true);
    addCell(point(info.southLine, info.westLine - info.lngStep).x, point(info.southLine, info.westLine - info.lngStep).y, point(info.southLine - info.latStep, info.westLine).x, point(info.southLine - info.latStep, info.westLine).y, "", true);
    addCell(point(info.southLine, info.eastLine).x, point(info.southLine, info.eastLine).y, point(info.southLine - info.latStep, info.eastLine + info.lngStep).x, point(info.southLine - info.latStep, info.eastLine + info.lngStep).y, "", true);
 
    for (let i = 0; i < colCount; i++) {
      const lng1 = info.westLine + info.lngStep * i;
      const lng2 = info.westLine + info.lngStep * (i + 1);
      const label = getColumnName(i);
      addCell(point(info.northLine + info.latStep, lng1).x, point(info.northLine + info.latStep, lng1).y, point(info.northLine, lng2).x, point(info.northLine, lng2).y, label, false);
      addCell(point(info.southLine, lng1).x, point(info.southLine, lng1).y, point(info.southLine - info.latStep, lng2).x, point(info.southLine - info.latStep, lng2).y, label, false);
    }
 
    for (let i = 0; i < rowCount; i++) {
      const lat1 = info.northLine - info.latStep * i;
      const lat2 = info.northLine - info.latStep * (i + 1);
      const label = String(i + 1);
      addCell(point(lat1, info.westLine - info.lngStep).x, point(lat1, info.westLine - info.lngStep).y, point(lat2, info.westLine).x, point(lat2, info.westLine).y, label, false);
      addCell(point(lat1, info.eastLine).x, point(lat1, info.eastLine).y, point(lat2, info.eastLine + info.lngStep).x, point(lat2, info.eastLine + info.lngStep).y, label, false);
    }
  }
 
  function dashArrayFromStyle(style) {
    if (style === "dash") return "10,8";
    if (style === "dot") return "2,8";
    return null;
  }
 
  function getLineOptions() {
    return {
      color: drawSettings.color,
      weight: drawSettings.weight,
      opacity: drawSettings.opacity,
      dashArray: dashArrayFromStyle(drawSettings.style)
    };
  }
 
  function getShapeOptions() {
    return {
      ...getLineOptions(),
      fill: drawSettings.fillMode === "semi",
      fillColor: drawSettings.color,
      fillOpacity: drawSettings.fillMode === "semi" ? 0.25 : 0
    };
  }
 
  function makeMeta(type) {
    return {
      id: Date.now() + "_" + Math.random().toString(16).slice(2),
      type,
      color: drawSettings.color,
      weight: drawSettings.weight,
      style: drawSettings.style,
      opacity: drawSettings.opacity,
      fillMode: drawSettings.fillMode
    };
  }
 
  function getCloseToleranceMeters() {
    const grid = Number(session.gridSize || 0);
    return Math.max(5, grid * 0.04);
  }
 
  function isClosedShape(points) {
    if (!points || points.length < 3) return false;
    return map.distance(points[0], points[points.length - 1]) <= getCloseToleranceMeters();
  }
 
  function cloneLatLng(latlng) {
    return L.latLng(latlng.lat, latlng.lng);
  }
 
  function cloneLatLngs(latlngs) {
    if (!Array.isArray(latlngs)) return latlngs;
    return latlngs.map(item => Array.isArray(item) ? cloneLatLngs(item) : cloneLatLng(item));
  }
 
  function offsetLatLng(latlng, dLat, dLng) {
    return L.latLng(latlng.lat + dLat, latlng.lng + dLng);
  }
 
  function offsetLatLngs(latlngs, dLat, dLng) {
    if (!Array.isArray(latlngs)) return latlngs;
    return latlngs.map(item => Array.isArray(item) ? offsetLatLngs(item, dLat, dLng) : offsetLatLng(item, dLat, dLng));
  }
 
  function getLayerCenter(layer) {
    if (!layer) return map.getCenter();
 
    if (layer._fireGridArrowLine && layer._fireGridArrowLine.getBounds) {
      return layer._fireGridArrowLine.getBounds().getCenter();
    }
 
    if (layer.getLatLng) {
      return layer.getLatLng();
    }
 
    if (layer.getBounds) {
      return layer.getBounds().getCenter();
    }
 
    if (layer.getLatLngs) {
      const temp = L.polyline(layer.getLatLngs());
      return temp.getBounds().getCenter();
    }
 
    return map.getCenter();
  }
 
  function cloneMeta(meta) {
    return {
      id: Date.now() + "_" + Math.random().toString(16).slice(2),
      type: meta.type,
      color: meta.color,
      weight: meta.weight,
      style: meta.style,
      opacity: meta.opacity,
      fillMode: meta.fillMode
    };
  }
 
  function getShapeData(layer) {
    if (!layer || !layer._fireGridMeta) return null;
 
    const meta = cloneMeta(layer._fireGridMeta);
    const center = getLayerCenter(layer);
 
    if (meta.type === "circle" && layer.getLatLng) {
      return {
        meta,
        center: cloneLatLng(center),
        circleCenter: cloneLatLng(layer.getLatLng()),
        radius: layer.getRadius()
      };
    }
 
    if (meta.type === "arrow" && layer._fireGridArrowLine) {
      const latlngs = layer._fireGridArrowLine.getLatLngs();
      return {
        meta,
        center: cloneLatLng(center),
        arrowStart: cloneLatLng(latlngs[0]),
        arrowEnd: cloneLatLng(latlngs[1])
      };
    }
 
    if (layer.getLatLngs) {
      return {
        meta,
        center: cloneLatLng(center),
        latlngs: cloneLatLngs(layer.getLatLngs())
      };
    }
 
    return null;
  }
 
  function getPastedMeta(originalMeta) {
    const meta = cloneMeta(originalMeta);
    meta.id = Date.now() + "_" + Math.random().toString(16).slice(2);
    return meta;
  }
 
  function styleOptionsFromMeta(meta) {
    return {
      color: meta.color,
      weight: meta.weight,
      opacity: meta.opacity,
      dashArray: dashArrayFromStyle(meta.style),
      fill: meta.fillMode === "semi",
      fillColor: meta.color,
      fillOpacity: meta.fillMode === "semi" ? 0.25 : 0
    };
  }
 
  function createShapeFromData(data, targetLatLng = null, duplicateOffset = false) {
    if (!data || !data.meta) return null;
 
    const meta = getPastedMeta(data.meta);
    let dLat = 0;
    let dLng = 0;
 
    if (targetLatLng && data.center) {
      dLat = targetLatLng.lat - data.center.lat;
      dLng = targetLatLng.lng - data.center.lng;
    } else if (duplicateOffset) {
      const center = data.center || map.getCenter();
      const p1 = map.latLngToLayerPoint(center);
      const p2 = L.point(p1.x + 36, p1.y + 36);
      const moved = map.layerPointToLatLng(p2);
      dLat = moved.lat - center.lat;
      dLng = moved.lng - center.lng;
    }
 
    let layer = null;
 
    if (meta.type === "circle") {
      const center = offsetLatLng(data.circleCenter, dLat, dLng);
      layer = L.circle(center, {
        ...styleOptionsFromMeta(meta),
        radius: data.radius
      });
      finishDrawingLayer(layer, meta);
      return layer;
    }
 
    if (meta.type === "arrow") {
      const start = offsetLatLng(data.arrowStart, dLat, dLng);
      const end = offsetLatLng(data.arrowEnd, dLat, dLng);
      const angle = getBearingDegrees(start, end);
      const line = L.polyline([start, end], styleOptionsFromMeta(meta));
      const arrowHead = createArrowHead(end, angle, meta.color);
      const group = L.layerGroup([line, arrowHead]);
 
      group._fireGridMeta = meta;
      group._fireGridArrowLine = line;
      group._fireGridArrowHead = arrowHead;
      group._fireGridArrowAngle = angle;
 
      attachShapeEvents(group, meta, group);
      attachShapeEvents(line, meta, group);
      attachShapeEvents(arrowHead, meta, group);
 
      drawingLayer.addLayer(group);
      drawings.push({ id: meta.id, layer: group, meta });
      return group;
    }
 
    const latlngs = offsetLatLngs(data.latlngs, dLat, dLng);
 
    if (meta.type === "polygon" || meta.type === "rectangle") {
      layer = L.polygon(latlngs, styleOptionsFromMeta(meta));
    } else {
      layer = L.polyline(latlngs, styleOptionsFromMeta(meta));
    }
 
    finishDrawingLayer(layer, meta);
    return layer;
  }
 
  function copySelectedShape() {
    if (!selectedShape) {
      alert("コピーする図形を右クリックで選択してください。");
      return;
    }
 
    copiedShapeData = getShapeData(selectedShape);
    pasteMode = !!copiedShapeData;
    shapeEditPanel.style.display = "none";
    clearSelectedShapeStyle();
 
    if (pasteMode) {
      drawStatusText.textContent = "図形をコピーしました。貼り付けたい位置を地図上でクリックしてください。";
    }
  }
 
  function duplicateSelectedShape() {
    if (!selectedShape) return;
 
    const data = getShapeData(selectedShape);
    const newLayer = createShapeFromData(data, null, true);
 
    if (newLayer) {
      shapeEditPanel.style.display = "none";
      selectShape(newLayer);
    }
  }
 
  function pasteCopiedShape(latlng = null) {
    if (!copiedShapeData) return false;
 
    const newLayer = createShapeFromData(copiedShapeData, latlng, !latlng);
 
    if (newLayer) {
      pasteMode = false;
      selectShape(newLayer);
      updateDrawStatus();
      return true;
    }
 
    return false;
  }
 
  function moveLayerByDelta(layer, dLat, dLng) {
    if (!layer) return;
 
    if (layer._fireGridArrowLine && layer._fireGridArrowHead) {
      const latlngs = offsetLatLngs(layer._fireGridArrowLine.getLatLngs(), dLat, dLng);
      layer._fireGridArrowLine.setLatLngs(latlngs);
      layer._fireGridArrowHead.setLatLng(offsetLatLng(layer._fireGridArrowHead.getLatLng(), dLat, dLng));
      return;
    }
 
    if (layer instanceof L.Circle && layer.getLatLng) {
      layer.setLatLng(offsetLatLng(layer.getLatLng(), dLat, dLng));
      return;
    }
 
    if (layer.setLatLngs && layer.getLatLngs) {
      layer.setLatLngs(offsetLatLngs(layer.getLatLngs(), dLat, dLng));
    }
  }
 
  function startShapeDrag(layer, e) {
    if (drawSettings.type !== "none") return;
 
    const originalEvent = e.originalEvent;
    if (originalEvent && originalEvent.button !== 0) return;
 
    if (originalEvent) {
      originalEvent.preventDefault();
      originalEvent.stopPropagation();
      if (originalEvent.stopImmediatePropagation) {
        originalEvent.stopImmediatePropagation();
      }
    }
 
    window.fireGridSuppressNextClick = true;
 
    const startLatLng = originalEvent
      ? map.mouseEventToLatLng(originalEvent)
      : e.latlng;
 
    dragShapeState = {
      layer,
      lastLatLng: startLatLng,
      moved: false,
      suppressNextMapClick: true
    };
 
    map.dragging.disable();
 
    const mapEl = map.getContainer();
    if (mapEl) {
      mapEl.classList.add("shape-dragging");
    }
 
    document.addEventListener("mousemove", handleDocumentShapeDrag, true);
    document.addEventListener("mouseup", handleDocumentShapeDragEnd, true);
  }
 
  function handleDocumentShapeDrag(event) {
    if (!dragShapeState) return;
 
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
    }
 
    const latlng = map.mouseEventToLatLng(event);
    updateShapeDrag(latlng);
  }
 
  function handleDocumentShapeDragEnd(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
    }
 
    finishShapeDrag();
  }
 
  function updateShapeDrag(latlng) {
    if (!dragShapeState) return;
 
    const last = dragShapeState.lastLatLng;
    const dLat = latlng.lat - last.lat;
    const dLng = latlng.lng - last.lng;
 
    moveLayerByDelta(dragShapeState.layer, dLat, dLng);
 
    dragShapeState.lastLatLng = latlng;
    dragShapeState.moved = true;
  }
 
  function finishShapeDrag() {
    document.removeEventListener("mousemove", handleDocumentShapeDrag, true);
    document.removeEventListener("mouseup", handleDocumentShapeDragEnd, true);
 
    if (!dragShapeState) return;
 
    const layer = dragShapeState.layer;
    const wasMoved = dragShapeState.moved;
 
    dragShapeState = null;
    map.dragging.enable();
 
    const mapEl = map.getContainer();
    if (mapEl) {
      mapEl.classList.remove("shape-dragging");
      mapEl.classList.remove("shape-hover");
    }
 
    if (layer) {
      selectShape(layer);
    }
 
    window.fireGridSuppressNextClick = true;
    setTimeout(() => {
      window.fireGridSuppressNextClick = false;
    }, wasMoved ? 350 : 250);
  }
 
  function applyStyleToLayer(layer, meta) {
    const styleOptions = {
      color: meta.color,
      weight: meta.weight,
      opacity: meta.opacity,
      dashArray: dashArrayFromStyle(meta.style),
      fill: meta.fillMode === "semi",
      fillColor: meta.color,
      fillOpacity: meta.fillMode === "semi" ? 0.25 : 0
    };
 
    if (layer.setStyle) {
      layer.setStyle(styleOptions);
    }
 
    if (layer._fireGridArrowLine && layer._fireGridArrowLine.setStyle) {
      layer._fireGridArrowLine.setStyle(styleOptions);
    }
 
    if (layer._fireGridArrowHead) {
      const latlng = layer._fireGridArrowHead.getLatLng();
      const angle = layer._fireGridArrowAngle || 0;
      layer.removeLayer(layer._fireGridArrowHead);
      const newHead = createArrowHead(latlng, angle, meta.color);
      layer._fireGridArrowHead = newHead;
      layer.addLayer(newHead);
      attachShapeEvents(newHead, meta, layer);
    }
  }
 
  function clearSelectedShapeStyle() {
    if (!selectedShape) return;
    const meta = selectedShape._fireGridMeta;
    if (meta) applyStyleToLayer(selectedShape, meta);
    selectedShape = null;
  }
 
  function selectShape(layer) {
    clearSelectedShapeStyle();
    selectedShape = layer;
    const meta = layer._fireGridMeta;
    if (!meta) return;
 
    if (layer.setStyle) {
      layer.setStyle({
        color: "#2563eb",
        weight: Math.max((meta.weight || 4) + 3, 6),
        opacity: 1
      });
    }
 
    if (layer._fireGridArrowLine && layer._fireGridArrowLine.setStyle) {
      layer._fireGridArrowLine.setStyle({
        color: "#2563eb",
        weight: Math.max((meta.weight || 4) + 3, 6),
        opacity: 1
      });
    }
 
    shapeEditColor.value = meta.color;
    shapeEditWeight.value = meta.weight;
    shapeEditWeightValue.textContent = meta.weight;
    shapeEditStyle.value = meta.style;
    shapeEditOpacity.value = Math.round(meta.opacity * 100);
    shapeEditOpacityValue.textContent = Math.round(meta.opacity * 100);
    shapeEditFillMode.value = meta.fillMode;
 
    shapeEditPanel.style.display = "block";
  }
 
  function attachShapeEvents(layer, meta, targetLayer = layer) {
    layer.off("click");
    layer.off("mousedown");
    layer.off("mouseover");
    layer.off("mouseout");
    layer.off("contextmenu");
 
    layer.on("mouseover", () => {
      const mapEl = map.getContainer();
      if (mapEl) {
        mapEl.classList.add("shape-hover");
      }
    });
 
    layer.on("mouseout", () => {
      const mapEl = map.getContainer();
      if (mapEl) {
        mapEl.classList.remove("shape-hover");
      }
    });
 
    layer.on("click", (e) => {
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        if (e.originalEvent.stopImmediatePropagation) {
          e.originalEvent.stopImmediatePropagation();
        }
      }
 
      window.fireGridSuppressNextClick = true;
      setTimeout(() => {
        window.fireGridSuppressNextClick = false;
      }, 250);
    });
 
    layer.on("mousedown", (e) => {
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        if (e.originalEvent.stopImmediatePropagation) {
          e.originalEvent.stopImmediatePropagation();
        }
      }
 
      window.fireGridSuppressNextClick = true;
      startShapeDrag(targetLayer, e);
    });
 
    layer.on("contextmenu", (e) => {
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        if (e.originalEvent.stopImmediatePropagation) {
          e.originalEvent.stopImmediatePropagation();
        }
      }
 
      window.fireGridSuppressNextClick = true;
      selectShape(targetLayer);
    });
  }
  
   function finishDrawingLayer(layer, meta) {
    layer._fireGridMeta = meta;
    applyStyleToLayer(layer, meta);
    attachShapeEvents(layer, meta, layer);
    drawingLayer.addLayer(layer);
    drawings.push({ id: meta.id, layer, meta });
  }
 
  function resetDrawingState() {
    lineStartPoint = null;
    polylinePoints = [];
    shapeStartPoint = null;
    freehandDrawing = false;
    freehandPoints = [];
 
    if (polylineClickTimer) {
      clearTimeout(polylineClickTimer);
      polylineClickTimer = null;
    }
 
    if (linePreview) {
      map.removeLayer(linePreview);
      linePreview = null;
    }
 
    if (polylinePreview) {
      map.removeLayer(polylinePreview);
      polylinePreview = null;
    }
 
    if (shapePreview) {
      map.removeLayer(shapePreview);
      shapePreview = null;
    }
 
    if (freehandLine) {
      map.removeLayer(freehandLine);
      freehandLine = null;
    }
 
    map.dragging.enable();
  }
 
  function getDistanceMeters(a, b) {
    return map.distance(a, b);
  }
 
  function formatNumber(value, digits = 0) {
    const num = Number(value) || 0;
    return num.toLocaleString("ja-JP", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }
 
  function getMeasureStyleOptions(target = null) {
    const style = target?.style || target || {};
    return {
      color: style.lineColor || measureSettings.lineColor,
      weight: Number(style.weight || measureSettings.weight),
      opacity: 1,
      fill: true,
      fillColor: style.fillColor || measureSettings.fillColor,
      fillOpacity: Number(style.opacity ?? measureSettings.opacity),
      interactive: true
    };
  }
 
  function getMeasureStyleSnapshot() {
    return {
      lineColor: measureSettings.lineColor,
      fillColor: measureSettings.fillColor,
      opacity: measureSettings.opacity,
      weight: measureSettings.weight
    };
  }
 
  function getMeasurementDisplayName(item) {
    const name = (item?.name || "").trim();
    return name || "名称未設定";
  }
 
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
 
  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
 
  function applyMeasurementStyle(item) {
    if (!item || !item.layer) return;
    item.layer.setStyle(getMeasureStyleOptions(item));
  }
 
  function updateMeasureStatus() {
    if (!measureStatusText) return;
    const typeLabel = {
      none: "未選択",
      polyline: "折れ線（面積）",
      freehand: "フリーハンド（面積）"
    }[measureSettings.type] || "未選択";
 
    measureStatusText.textContent = measureSettings.active
      ? `${typeLabel}・線${measureSettings.lineColor}・塗り${measureSettings.fillColor}・透明度${Math.round(measureSettings.opacity * 100)}%・太さ${measureSettings.weight}`
      : "計測モード停止中";
  }
 
  function setMeasureMode(active) {
    measureSettings.active = active;
 
    if (measureModeBtn) measureModeBtn.classList.toggle("active", active);
 
    if (active) {
      cancelDrawMode();
      drawSettings.type = "none";
      drawType.value = "none";
      shapeEditPanel.style.display = "none";
      if (measureSettings.type === "polyline") map.doubleClickZoom.disable();
    } else {
      resetMeasureDrawingState();
      measureSettings.type = "none";
      if (measureDrawType) measureDrawType.value = "none";
      map.doubleClickZoom.enable();
      map.dragging.enable();
    }
 
    updateMeasureStatus();
  }
 
  function resetMeasureDrawingState() {
    measurePolylinePoints = [];
    measureFreehandDrawing = false;
    measureFreehandPoints = [];
 
    if (measurePolylineClickTimer) {
      clearTimeout(measurePolylineClickTimer);
      measurePolylineClickTimer = null;
    }
 
    if (measurePolylinePreview) {
      map.removeLayer(measurePolylinePreview);
      measurePolylinePreview = null;
    }
 
    if (measureFreehandLine) {
      map.removeLayer(measureFreehandLine);
      measureFreehandLine = null;
    }
  }
 
  function normalizePolygonPoints(points) {
    if (!points || points.length < 3) return [];
    const cleaned = points.filter(Boolean);
    if (cleaned.length < 3) return [];
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (first.lat !== last.lat || first.lng !== last.lng) {
      cleaned.push(first);
    }
    return cleaned;
  }
 
  function calculatePolygonAreaM2(points) {
    const latlngs = normalizePolygonPoints(points);
    if (latlngs.length < 4) return 0;
 
    const refLat = latlngs.reduce((sum, pnt) => sum + pnt.lat, 0) / latlngs.length;
    const meterPerLat = 111320;
    const meterPerLng = 111320 * Math.cos(refLat * Math.PI / 180);
 
    let area = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
      const x1 = latlngs[i].lng * meterPerLng;
      const y1 = latlngs[i].lat * meterPerLat;
      const x2 = latlngs[i + 1].lng * meterPerLng;
      const y2 = latlngs[i + 1].lat * meterPerLat;
      area += x1 * y2 - x2 * y1;
    }
 
    return Math.abs(area / 2);
  }
 
  function pointInPolygon(latlng, polygonPoints) {
    const pts = normalizePolygonPoints(polygonPoints);
    if (pts.length < 4) return false;
 
    const x = latlng.lng;
    const y = latlng.lat;
    let inside = false;
 
    for (let i = 0, j = pts.length - 2; i < pts.length - 1; j = i++) {
      const xi = pts[i].lng;
      const yi = pts[i].lat;
      const xj = pts[j].lng;
      const yj = pts[j].lat;
 
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
 
    return inside;
  }
 
  function orientation(a, b, c) {
    const value = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
    if (Math.abs(value) < 1e-12) return 0;
    return value > 0 ? 1 : 2;
  }
 
  function onSegment(a, b, c) {
    return b.lng <= Math.max(a.lng, c.lng) + 1e-12 &&
      b.lng + 1e-12 >= Math.min(a.lng, c.lng) &&
      b.lat <= Math.max(a.lat, c.lat) + 1e-12 &&
      b.lat + 1e-12 >= Math.min(a.lat, c.lat);
  }
 
  function segmentsIntersect(p1, q1, p2, q2) {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);
 
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;
    return false;
  }
 
  function polygonIntersectsCell(polygonPoints, cellCorners) {
    const pts = normalizePolygonPoints(polygonPoints);
    if (pts.length < 4) return false;
 
    const center = L.latLng(
      (cellCorners[0].lat + cellCorners[2].lat) / 2,
      (cellCorners[0].lng + cellCorners[2].lng) / 2
    );
 
    if (pointInPolygon(center, pts)) return true;
    if (cellCorners.some(corner => pointInPolygon(corner, pts))) return true;
    if (pts.slice(0, -1).some(pnt =>
      pnt.lat <= Math.max(cellCorners[0].lat, cellCorners[2].lat) &&
      pnt.lat >= Math.min(cellCorners[0].lat, cellCorners[2].lat) &&
      pnt.lng >= Math.min(cellCorners[0].lng, cellCorners[2].lng) &&
      pnt.lng <= Math.max(cellCorners[0].lng, cellCorners[2].lng)
    )) return true;
 
    const cellEdges = [
      [cellCorners[0], cellCorners[1]],
      [cellCorners[1], cellCorners[2]],
      [cellCorners[2], cellCorners[3]],
      [cellCorners[3], cellCorners[0]]
    ];
 
    for (let i = 0; i < pts.length - 1; i++) {
      for (const edge of cellEdges) {
        if (segmentsIntersect(pts[i], pts[i + 1], edge[0], edge[1])) return true;
      }
    }
 
    return false;
  }
 
  function calculateGridRange(points) {
    const info = getGridInfo();
    if (!info || !points || points.length < 3) {
      return { cells: [], gridCount: 0, areaM2: 0, areaHa: 0, colSpan: 0, rowSpan: 0 };
    }
 
    const colCount = Math.round((info.eastLine - info.westLine) / info.lngStep);
    const rowCount = Math.round((info.northLine - info.southLine) / info.latStep);
    const cells = [];
 
    for (let row = 0; row < rowCount; row++) {
      const north = info.northLine - info.latStep * row;
      const south = info.northLine - info.latStep * (row + 1);
 
      for (let col = 0; col < colCount; col++) {
        const west = info.westLine + info.lngStep * col;
        const east = info.westLine + info.lngStep * (col + 1);
        const corners = [
          L.latLng(north, west),
          L.latLng(north, east),
          L.latLng(south, east),
          L.latLng(south, west)
        ];
 
        if (polygonIntersectsCell(points, corners)) {
          cells.push({ row, col, key: `${col}_${row}` });
        }
      }
    }
 
    const gridSize = Number(session.gridSize || 100);
    const areaM2 = cells.length * gridSize * gridSize;
    const cols = cells.map(cell => cell.col);
    const rows = cells.map(cell => cell.row);
    const colSpan = cols.length ? Math.max(...cols) - Math.min(...cols) + 1 : 0;
    const rowSpan = rows.length ? Math.max(...rows) - Math.min(...rows) + 1 : 0;
 
    return {
      cells,
      gridCount: cells.length,
      areaM2,
      areaHa: areaM2 / 10000,
      colSpan,
      rowSpan
    };
  }
 
  function getLatLngsFromLayer(layer) {
    if (!layer || !layer.getLatLngs) return [];
    const latlngs = layer.getLatLngs();
    if (Array.isArray(latlngs[0])) return latlngs[0];
    return latlngs;
  }
 
  function getPolygonCenter(points) {
    const pts = points.slice(0, -1).length ? points.slice(0, -1) : points;
    const lat = pts.reduce((sum, pnt) => sum + pnt.lat, 0) / pts.length;
    const lng = pts.reduce((sum, pnt) => sum + pnt.lng, 0) / pts.length;
    return L.latLng(lat, lng);
  }
 
  function createMeasureNumberMarker(number, latlng) {
    return L.marker(latlng, {
      interactive: false,
      icon: L.divIcon({
        className: "",
        html: `<div class="measureNumberLabel">${number}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    });
  }
 
  function refreshMeasurementStats(measurement) {
    const points = getLatLngsFromLayer(measurement.layer);
    const normalized = normalizePolygonPoints(points);
    measurement.points = normalized;
    measurement.areaM2 = calculatePolygonAreaM2(normalized);
    measurement.areaHa = measurement.areaM2 / 10000;
    measurement.gridRange = calculateGridRange(normalized);
 
    if (measurement.labelMarker) {
      measurement.labelMarker.setLatLng(getPolygonCenter(normalized));
    }
 
    measurement.layer.bindTooltip(
      `${measurement.number} ${escapeHtml(getMeasurementDisplayName(measurement))}<br>` +
      `面積：${formatNumber(measurement.areaM2)}㎡ / ${formatNumber(measurement.areaHa, 3)}ha<br>` +
      `範囲：${measurement.gridRange.gridCount}グリッド / ${formatNumber(measurement.gridRange.areaM2)}㎡ / ${formatNumber(measurement.gridRange.areaHa, 3)}ha`,
      { sticky: true }
    );
  }
 
  function refreshAllMeasurementStats() {
    measurements.forEach(refreshMeasurementStats);
    updateMeasureSummaryBanner();
    renderMeasureList();
  }
 
 
  function setMeasureNumberMarkerIcon(marker, number) {
    if (!marker) return;
    marker.setIcon(L.divIcon({
      className: "",
      html: `<div class="measureNumberLabel">${number}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    }));
  }
 
  function renumberMeasurements() {
    measurements.forEach((item, index) => {
      item.number = index + 1;
      setMeasureNumberMarkerIcon(item.labelMarker, item.number);
      refreshMeasurementStats(item);
    });
    measureSerial = measurements.length + 1;
  }
 
  function updateMeasureSummaryBanner() {
    const hasMeasurements = measurements.length > 0;
    if (measureSummaryBanner) {
      measureSummaryBanner.classList.toggle("is-hidden", !hasMeasurements);
      measureSummaryBanner.setAttribute("aria-hidden", hasMeasurements ? "false" : "true");
    }
 
    const totalAreaM2 = measurements.reduce((sum, item) => sum + (item.areaM2 || 0), 0);
    const uniqueCells = new Map();
 
    measurements.forEach(item => {
      (item.gridRange?.cells || []).forEach(cell => uniqueCells.set(cell.key, cell));
    });
 
    const gridSize = Number(session.gridSize || 100);
    const totalGridAreaM2 = uniqueCells.size * gridSize * gridSize;
    const cells = Array.from(uniqueCells.values());
    const cols = cells.map(cell => cell.col);
    const rows = cells.map(cell => cell.row);
    const colSpan = cols.length ? Math.max(...cols) - Math.min(...cols) + 1 : 0;
    const rowSpan = rows.length ? Math.max(...rows) - Math.min(...rows) + 1 : 0;
 
    if (measureTotalAreaM2) measureTotalAreaM2.textContent = formatNumber(totalAreaM2);
    if (measureTotalAreaHa) measureTotalAreaHa.textContent = formatNumber(totalAreaM2 / 10000, 3);
    if (measureTotalGridCount) measureTotalGridCount.textContent = formatNumber(uniqueCells.size);
    if (measureGridAreaM2) measureGridAreaM2.textContent = formatNumber(totalGridAreaM2);
    if (measureGridAreaHa) measureGridAreaHa.textContent = formatNumber(totalGridAreaM2 / 10000, 3);
    if (measureGridSpan) measureGridSpan.textContent = `横${colSpan} × 縦${rowSpan}`;
    if (measureShapeCount) measureShapeCount.textContent = formatNumber(measurements.length);
  }
 
  function renderMeasureList() {
    if (!measureList) return;
 
    if (!measurements.length) {
      measureList.innerHTML = `<p class="emptyMeasure">計測図形はありません。</p>`;
      if (measureIndividualCards) {
        measureIndividualCards.innerHTML = `<div class="measureIndividualEmpty">計測図形はありません。</div>`;
      }
      return;
    }
 
    const listHtml = measurements.map(item => `
      <div class="measureListItem">
        <div class="measureListItemHeader">
          <span>${item.number} ${escapeHtml(getMeasurementDisplayName(item))}</span>
          <button type="button" data-measure-delete="${item.id}">削除</button>
        </div>
        <label class="measureNameEditLabel">名称
          <input class="measureNameInput" type="text" value="${escapeAttr(getMeasurementDisplayName(item))}" data-measure-name="${item.id}" placeholder="名称未設定">
        </label>
        <div class="measureMiniStyleRow">
          <label>線 <input type="color" value="${escapeAttr(item.style.lineColor)}" data-measure-line-color="${item.id}"></label>
          <label>塗 <input type="color" value="${escapeAttr(item.style.fillColor)}" data-measure-fill-color="${item.id}"></label>
        </div>
        <div class="measureMiniStyleRow">
          <label>透明度 <input type="range" min="5" max="80" value="${Math.round(item.style.opacity * 100)}" data-measure-opacity="${item.id}"></label>
          <label>線幅 <input type="range" min="1" max="10" value="${item.style.weight}" data-measure-weight="${item.id}"></label>
        </div>
        <div>面積：<strong>${formatNumber(item.areaM2)}㎡</strong> / <strong>${formatNumber(item.areaHa, 3)}ha</strong></div>
        <div>範囲：<strong>${formatNumber(item.gridRange.gridCount)}グリッド</strong></div>
        <div>概算：${formatNumber(item.gridRange.areaM2)}㎡ / ${formatNumber(item.gridRange.areaHa, 3)}ha</div>
        <div>グリッド：横${item.gridRange.colSpan} × 縦${item.gridRange.rowSpan}</div>
      </div>
    `).join("");
 
    measureList.innerHTML = listHtml;
 
    if (measureIndividualCards) {
      measureIndividualCards.innerHTML = measurements.map(item => `
        <div class="measureIndividualCard" style="--measure-card-color:${escapeAttr(item.style.lineColor)};">
          <div class="measureIndividualCardHeader">
            <span>${item.number} ${escapeHtml(getMeasurementDisplayName(item))}</span>
            <span>${item.type === "freehand" ? "フリーハンド" : "折れ線"}</span>
          </div>
          <div class="measureIndividualCardBody">
            <div>面積：${formatNumber(item.areaM2)}㎡</div>
            <div>面積：${formatNumber(item.areaHa, 3)}ha</div>
            <div>範囲：${formatNumber(item.gridRange.gridCount)}グリッド</div>
            <div>概算：${formatNumber(item.gridRange.areaM2)}㎡</div>
            <div>概算：${formatNumber(item.gridRange.areaHa, 3)}ha</div>
            <div>グリッド：横${item.gridRange.colSpan} × 縦${item.gridRange.rowSpan}</div>
          </div>
        </div>
      `).join("");
    }
 
    bindMeasureListEvents();
  }
 
 
  function updateMeasurementName(id, name) {
    const item = measurements.find(entry => entry.id === id);
    if (!item) return;
    item.name = (name || "").trim() || "名称未設定";
    refreshMeasurementStats(item);
    renderMeasureList();
  }
 
  function updateMeasurementStyle(id, patch) {
    const item = measurements.find(entry => entry.id === id);
    if (!item) return;
    item.style = { ...item.style, ...patch };
    applyMeasurementStyle(item);
    refreshMeasurementStats(item);
    renderMeasureList();
  }
 
  function bindMeasureListEvents() {
    if (!measureList) return;
 
    measureList.querySelectorAll("[data-measure-delete]").forEach(btn => {
      btn.addEventListener("click", () => deleteMeasurement(btn.dataset.measureDelete));
    });
 
    measureList.querySelectorAll("[data-measure-name]").forEach(input => {
      input.addEventListener("change", () => updateMeasurementName(input.dataset.measureName, input.value));
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") input.blur();
      });
    });
 
    measureList.querySelectorAll("[data-measure-line-color]").forEach(input => {
      input.addEventListener("input", () => updateMeasurementStyle(input.dataset.measureLineColor, { lineColor: input.value }));
    });
 
    measureList.querySelectorAll("[data-measure-fill-color]").forEach(input => {
      input.addEventListener("input", () => updateMeasurementStyle(input.dataset.measureFillColor, { fillColor: input.value }));
    });
 
    measureList.querySelectorAll("[data-measure-opacity]").forEach(input => {
      input.addEventListener("input", () => updateMeasurementStyle(input.dataset.measureOpacity, { opacity: Number(input.value) / 100 }));
    });
 
    measureList.querySelectorAll("[data-measure-weight]").forEach(input => {
      input.addEventListener("input", () => updateMeasurementStyle(input.dataset.measureWeight, { weight: Number(input.value) }));
    });
  }
 
  function addMeasurement(points, sourceType) {
    const normalized = normalizePolygonPoints(points);
    if (normalized.length < 4) {
      alert("面積を算出するには、3点以上で範囲を囲ってください。");
      return;
    }
 
    const style = getMeasureStyleSnapshot();
    const layer = L.polygon(normalized, getMeasureStyleOptions(style)).addTo(measureLayer);
    const number = measurements.length + 1;
    const id = Date.now() + "_" + Math.random().toString(16).slice(2);
    const labelMarker = createMeasureNumberMarker(number, getPolygonCenter(normalized)).addTo(measureLayer);
 
    const measurement = {
      id,
      number,
      name: "名称未設定",
      type: sourceType,
      style,
      layer,
      labelMarker,
      points: normalized,
      areaM2: 0,
      areaHa: 0,
      gridRange: { cells: [], gridCount: 0, areaM2: 0, areaHa: 0, colSpan: 0, rowSpan: 0 }
    };
 
    layer._fireGridMeasurementId = id;
    layer.on("contextmenu", e => {
      if (e.originalEvent) e.originalEvent.preventDefault();
      deleteMeasurement(id);
    });
 
    measurements.push(measurement);
    refreshMeasurementStats(measurement);
    updateMeasureSummaryBanner();
    renderMeasureList();
  }
 
  function deleteMeasurement(id) {
    const target = measurements.find(item => item.id === id);
    if (!target) return;
 
    measureLayer.removeLayer(target.layer);
    if (target.labelMarker) measureLayer.removeLayer(target.labelMarker);
    measurements = measurements.filter(item => item.id !== id);
    renumberMeasurements();
    updateMeasureSummaryBanner();
    renderMeasureList();
  }
 
  function clearLastMeasurement() {
    const target = measurements[measurements.length - 1];
    if (target) deleteMeasurement(target.id);
  }
 
  function clearAllMeasurements() {
    if (!measurements.length) return;
    const result = confirm("計測図形をすべて削除しますか？");
    if (!result) return;
    measureLayer.clearLayers();
    measurements = [];
    measureSerial = 1;
    updateMeasureSummaryBanner();
    renderMeasureList();
  }
 
  function applyMeasureStyleToAll() {
    // 上部の計測設定は、次に作成する計測図形の初期設定として使用します。
    // 作成済みの図形は個別カードで名称・線色・塗り・透明度・線幅を編集します。
    updateMeasureStatus();
  }
 
  function getMeasurePreviewOptions() {
    return {
      color: measureSettings.lineColor,
      weight: measureSettings.weight,
      opacity: 1,
      fill: true,
      fillColor: measureSettings.fillColor,
      fillOpacity: Math.max(measureSettings.opacity * 0.55, 0.10),
      interactive: false
    };
  }
 
  function drawMeasurePolylinePreview(extraLatLng) {
    if (measurePolylinePreview) {
      map.removeLayer(measurePolylinePreview);
      measurePolylinePreview = null;
    }
 
    const previewPoints = extraLatLng ? [...measurePolylinePoints, extraLatLng] : [...measurePolylinePoints];
    if (previewPoints.length < 1) return;
 
    if (previewPoints.length < 3) {
      measurePolylinePreview = L.polyline(previewPoints, getMeasurePreviewOptions()).addTo(map);
    } else {
      measurePolylinePreview = L.polygon(normalizePolygonPoints(previewPoints), getMeasurePreviewOptions()).addTo(map);
    }
  }
 
  function handleMeasurePolylineClick(latlng) {
    measurePolylinePoints.push(latlng);
    drawMeasurePolylinePreview();
  }
 
  function finishMeasurePolyline() {
    if (measurePolylineClickTimer) {
      clearTimeout(measurePolylineClickTimer);
      measurePolylineClickTimer = null;
    }
 
    if (measurePolylinePoints.length >= 3) {
      addMeasurement(measurePolylinePoints, "polyline");
    }
 
    resetMeasureDrawingState();
  }
 
  function startMeasureFreehand(latlng) {
    measureFreehandDrawing = true;
    measureFreehandPoints = [latlng];
    map.dragging.disable();
    measureFreehandLine = L.polyline(measureFreehandPoints, getMeasurePreviewOptions()).addTo(map);
  }
 
  function continueMeasureFreehand(latlng) {
    if (!measureFreehandDrawing || !measureFreehandLine) return;
    measureFreehandPoints.push(latlng);
 
    if (measureFreehandPoints.length < 3) {
      measureFreehandLine.setLatLngs(measureFreehandPoints);
    } else {
      const closedPoints = normalizePolygonPoints(measureFreehandPoints);
      if (measureFreehandLine instanceof L.Polygon) {
        measureFreehandLine.setLatLngs(closedPoints);
      } else {
        map.removeLayer(measureFreehandLine);
        measureFreehandLine = L.polygon(closedPoints, getMeasurePreviewOptions()).addTo(map);
      }
    }
  }
 
  function finishMeasureFreehand() {
    if (!measureFreehandDrawing) return;
 
    map.dragging.enable();
 
    if (measureFreehandLine) {
      map.removeLayer(measureFreehandLine);
      measureFreehandLine = null;
    }
 
    if (measureFreehandPoints.length >= 3) {
      addMeasurement(measureFreehandPoints, "freehand");
    }
 
    measureFreehandDrawing = false;
    measureFreehandPoints = [];
  }
 
  function setupMeasureEvents() {
    if (!measureModeBtn) return;
 
    measureModeBtn.addEventListener("click", () => setMeasureMode(true));
    measureModeEndBtn.addEventListener("click", () => setMeasureMode(false));
 
    if (measureDrawType) {
      measureDrawType.addEventListener("change", () => {
        measureSettings.type = measureDrawType.value;
        resetMeasureDrawingState();
        window.fireGridSuppressNextClick = false;
 
        if (measureSettings.type !== "none") {
          setMeasureMode(true);
        }
 
        if (measureSettings.active && measureSettings.type === "polyline") {
          map.doubleClickZoom.disable();
        } else if (measureSettings.type !== "polyline") {
          map.doubleClickZoom.enable();
        }
 
        updateMeasureStatus();
      });
    }
 
    measureLinePresets.forEach(btn => {
      btn.addEventListener("click", () => {
        measureLinePresets.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        measureSettings.lineColor = btn.dataset.color;
        measureLineColor.value = measureSettings.lineColor;
        applyMeasureStyleToAll();
      });
    });
 
    measureFillPresets.forEach(btn => {
      btn.addEventListener("click", () => {
        measureFillPresets.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        measureSettings.fillColor = btn.dataset.color;
        measureFillColor.value = measureSettings.fillColor;
        applyMeasureStyleToAll();
      });
    });
 
    measureLineColor.addEventListener("input", () => {
      measureSettings.lineColor = measureLineColor.value;
      measureLinePresets.forEach(b => b.classList.remove("active"));
      applyMeasureStyleToAll();
    });
 
    measureFillColor.addEventListener("input", () => {
      measureSettings.fillColor = measureFillColor.value;
      measureFillPresets.forEach(b => b.classList.remove("active"));
      applyMeasureStyleToAll();
    });
 
    measureOpacity.addEventListener("input", () => {
      measureSettings.opacity = Number(measureOpacity.value) / 100;
      measureOpacityValue.textContent = measureOpacity.value;
      applyMeasureStyleToAll();
    });
 
    measureWeight.addEventListener("input", () => {
      measureSettings.weight = Number(measureWeight.value);
      measureWeightValue.textContent = measureSettings.weight;
      applyMeasureStyleToAll();
    });
 
    clearLastMeasureBtn.addEventListener("click", clearLastMeasurement);
    clearAllMeasureBtn.addEventListener("click", clearAllMeasurements);
 
    updateMeasureStatus();
    updateMeasureSummaryBanner();
    renderMeasureList();
  }
 
  function getBearingDegrees(a, b) {
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
 
  function createArrowHead(latlng, angle, color) {
    return L.marker(latlng, {
      interactive: true,
      icon: L.divIcon({
        className: "",
        html: `
          <div style="
            width:0;
            height:0;
            border-left:9px solid transparent;
            border-right:9px solid transparent;
            border-bottom:18px solid ${color};
            transform: rotate(${angle}deg);
            transform-origin:center center;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    });
  }
 
  function handleLineDrawing(latlng) {
    if (!lineStartPoint) {
      lineStartPoint = latlng;
      return;
    }
 
    const line = L.polyline([lineStartPoint, latlng], getLineOptions());
    finishDrawingLayer(line, makeMeta("line"));
    resetDrawingState();
  }
 
  function handlePolylineDrawing(latlng) {
    polylinePoints.push(latlng);
 
    if (polylinePreview) map.removeLayer(polylinePreview);
 
    polylinePreview = L.polyline(polylinePoints, {
      ...getLineOptions(),
      opacity: Math.max(drawSettings.opacity * 0.55, 0.25)
    }).addTo(map);
  }
 
  function finishPolylineDrawing() {
    if (polylineClickTimer) {
      clearTimeout(polylineClickTimer);
      polylineClickTimer = null;
    }
 
    if (polylinePoints.length < 2) {
      resetDrawingState();
      return;
    }
 
    let layer;
    let meta;
 
    if (drawSettings.fillMode === "semi" && isClosedShape(polylinePoints)) {
      const closedPoints = [...polylinePoints];
      closedPoints[closedPoints.length - 1] = closedPoints[0];
      layer = L.polygon(closedPoints, getShapeOptions());
      meta = makeMeta("polygon");
    } else {
      layer = L.polyline(polylinePoints, getLineOptions());
      meta = makeMeta("polyline");
    }
 
    finishDrawingLayer(layer, meta);
    resetDrawingState();
  }
 
  function handleRectangleDrawing(latlng) {
    if (!shapeStartPoint) {
      shapeStartPoint = latlng;
      return;
    }
 
    const rect = L.rectangle(L.latLngBounds(shapeStartPoint, latlng), getShapeOptions());
    finishDrawingLayer(rect, makeMeta("rectangle"));
    resetDrawingState();
  }
 
  function handleCircleDrawing(latlng) {
    if (!shapeStartPoint) {
      shapeStartPoint = latlng;
      return;
    }
 
    const circle = L.circle(shapeStartPoint, {
      ...getShapeOptions(),
      radius: getDistanceMeters(shapeStartPoint, latlng)
    });
 
    finishDrawingLayer(circle, makeMeta("circle"));
    resetDrawingState();
  }
 
  function handleArrowDrawing(latlng) {
    if (!shapeStartPoint) {
      shapeStartPoint = latlng;
      return;
    }
 
    const angle = getBearingDegrees(shapeStartPoint, latlng);
    const line = L.polyline([shapeStartPoint, latlng], getLineOptions());
    const arrowHead = createArrowHead(latlng, angle, drawSettings.color);
    const group = L.layerGroup([line, arrowHead]);
 
    const meta = makeMeta("arrow");
    group._fireGridMeta = meta;
    group._fireGridArrowLine = line;
    group._fireGridArrowHead = arrowHead;
    group._fireGridArrowAngle = angle;
 
    attachShapeEvents(group, meta, group);
    attachShapeEvents(line, meta, group);
    attachShapeEvents(arrowHead, meta, group);
 
    drawingLayer.addLayer(group);
    drawings.push({ id: meta.id, layer: group, meta });
    resetDrawingState();
  }
 
  function startFreehand(latlng) {
    freehandDrawing = true;
    freehandPoints = [latlng];
    map.dragging.disable();
    freehandLine = L.polyline(freehandPoints, getLineOptions()).addTo(map);
  }
 
  function continueFreehand(latlng) {
    if (!freehandDrawing || !freehandLine) return;
    freehandPoints.push(latlng);
    freehandLine.setLatLngs(freehandPoints);
  }
 
  function finishFreehand() {
    if (!freehandDrawing) return;
 
    map.dragging.enable();
 
    if (freehandLine) {
      map.removeLayer(freehandLine);
      freehandLine = null;
    }
 
    if (freehandPoints.length >= 2) {
      let layer;
      let meta;
 
      if (drawSettings.fillMode === "semi" && isClosedShape(freehandPoints)) {
        const closedPoints = [...freehandPoints, freehandPoints[0]];
        layer = L.polygon(closedPoints, getShapeOptions());
        meta = makeMeta("polygon");
      } else {
        layer = L.polyline(freehandPoints, getLineOptions());
        meta = makeMeta("freehand");
      }
 
      finishDrawingLayer(layer, meta);
    }
 
    freehandDrawing = false;
    freehandPoints = [];
  }
 
  map.on("mousemove", (e) => {
    if (measureSettings.active && measureSettings.type === "polyline" && measurePolylinePoints.length > 0) {
      drawMeasurePolylinePreview(e.latlng);
      return;
    }
 
    if (measureSettings.active && measureSettings.type === "freehand" && measureFreehandDrawing) {
      continueMeasureFreehand(e.latlng);
      return;
    }
 
    if (dragShapeState) {
      updateShapeDrag(e.latlng);
      return;
    }
 
    if (drawSettings.type === "line" && lineStartPoint) {
      if (linePreview) map.removeLayer(linePreview);
      linePreview = L.polyline([lineStartPoint, e.latlng], {
        ...getLineOptions(),
        opacity: Math.max(drawSettings.opacity * 0.55, 0.25)
      }).addTo(map);
    }
 
    if (drawSettings.type === "polyline" && polylinePoints.length > 0) {
      if (polylinePreview) map.removeLayer(polylinePreview);
      polylinePreview = L.polyline([...polylinePoints, e.latlng], {
        ...getLineOptions(),
        opacity: Math.max(drawSettings.opacity * 0.55, 0.25)
      }).addTo(map);
    }
 
    if ((drawSettings.type === "rectangle" || drawSettings.type === "circle" || drawSettings.type === "arrow") && shapeStartPoint) {
      if (shapePreview) map.removeLayer(shapePreview);
 
      if (drawSettings.type === "rectangle") {
        shapePreview = L.rectangle(L.latLngBounds(shapeStartPoint, e.latlng), {
          ...getShapeOptions(),
          opacity: Math.max(drawSettings.opacity * 0.55, 0.25)
        }).addTo(map);
      }
 
      if (drawSettings.type === "circle") {
        shapePreview = L.circle(shapeStartPoint, {
          ...getShapeOptions(),
          radius: getDistanceMeters(shapeStartPoint, e.latlng),
          opacity: Math.max(drawSettings.opacity * 0.55, 0.25)
        }).addTo(map);
      }
 
      if (drawSettings.type === "arrow") {
        shapePreview = L.polyline([shapeStartPoint, e.latlng], {
          ...getLineOptions(),
          opacity: Math.max(drawSettings.opacity * 0.55, 0.25)
        }).addTo(map);
      }
    }
 
    if (drawSettings.type === "freehand" && freehandDrawing) {
      continueFreehand(e.latlng);
    }
  });
  
   map.on("mousedown", (e) => {
    if (measureSettings.active && measureSettings.type === "freehand") {
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
      }
      startMeasureFreehand(e.latlng);
      return;
    }
 
    if (drawSettings.type === "freehand") {
      startFreehand(e.latlng);
    }
  });
 
  map.on("mouseup", () => {
    if (measureSettings.active && measureSettings.type === "freehand") {
      finishMeasureFreehand();
      return;
    }
 
    if (dragShapeState) {
      finishShapeDrag();
      return;
    }
 
    if (drawSettings.type === "freehand") {
      finishFreehand();
    }
  });
 
  map.on("dblclick", (e) => {
    if (measureSettings.active && measureSettings.type === "polyline") {
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
      }
      finishMeasurePolyline();
      return;
    }
 
    if (drawSettings.type === "polyline") {
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
      }
      finishPolylineDrawing();
    }
  });
 
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
 
    if (e.key === "Escape") {
      pasteMode = false;
      cancelDrawMode();
      setMeasureMode(false);
      return;
    }
 
    if (e.ctrlKey && key === "c" && selectedShape) {
      e.preventDefault();
      copiedShapeData = getShapeData(selectedShape);
      pasteMode = false;
      return;
    }
 
    if (e.ctrlKey && key === "v" && copiedShapeData) {
      e.preventDefault();
      pasteCopiedShape(null);
      return;
    }
 
    if ((e.key === "Delete" || e.key === "Backspace") && selectedShape) {
      e.preventDefault();
      drawingLayer.removeLayer(selectedShape);
      drawings = drawings.filter(d => d.layer !== selectedShape);
      selectedShape = null;
      shapeEditPanel.style.display = "none";
    }
  });
 
  function updateDrawStatus() {
    const typeLabel = {
      none: "未選択",
      line: "直線",
      polyline: "折れ線",
      rectangle: "四角形",
      circle: "円",
      arrow: "矢印",
      freehand: "フリーハンド"
    }[drawSettings.type] || "未選択";
 
    const styleLabel = {
      solid: "実線",
      dash: "破線",
      dot: "点線"
    }[drawSettings.style] || "実線";
 
    const fillLabel = drawSettings.fillMode === "semi" ? "塗りつぶし半透明" : "塗りつぶしなし";
 
    drawStatusText.textContent =
      `${typeLabel}・色${drawSettings.color}・太さ${drawSettings.weight}・${styleLabel}・透明度${Math.round(drawSettings.opacity * 100)}%・${fillLabel}`;
  }
 
  drawType.addEventListener("change", () => {
    drawSettings.type = drawType.value;
    resetDrawingState();
 
    if (drawSettings.type === "polyline") {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
 
    updateDrawStatus();
  });
 
  colorPresets.forEach(btn => {
    btn.addEventListener("click", () => {
      colorPresets.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      drawSettings.color = btn.dataset.color;
      drawColor.value = drawSettings.color;
      updateDrawStatus();
    });
  });
 
  drawColor.addEventListener("input", () => {
    drawSettings.color = drawColor.value;
    colorPresets.forEach(b => b.classList.remove("active"));
    updateDrawStatus();
  });
 
  lineWeight.addEventListener("input", () => {
    drawSettings.weight = parseInt(lineWeight.value, 10);
    lineWeightValue.textContent = drawSettings.weight;
    updateDrawStatus();
  });
 
  lineStyle.addEventListener("change", () => {
    drawSettings.style = lineStyle.value;
    updateDrawStatus();
  });
 
  lineOpacity.addEventListener("input", () => {
    drawSettings.opacity = parseInt(lineOpacity.value, 10) / 100;
    lineOpacityValue.textContent = lineOpacity.value;
    updateDrawStatus();
  });
 
  fillMode.addEventListener("change", () => {
    drawSettings.fillMode = fillMode.value;
    updateDrawStatus();
  });
 
  clearDrawingsBtn.addEventListener("click", () => {
    const result = confirm("描画図形をすべて削除しますか？");
    if (!result) return;
 
    drawingLayer.clearLayers();
    drawings = [];
    selectedShape = null;
    shapeEditPanel.style.display = "none";
    resetDrawingState();
  });
 
  shapeEditWeight.addEventListener("input", () => {
    shapeEditWeightValue.textContent = shapeEditWeight.value;
  });
 
  shapeEditOpacity.addEventListener("input", () => {
    shapeEditOpacityValue.textContent = shapeEditOpacity.value;
  });
 
  copyShapeEdit.addEventListener("click", copySelectedShape);
 
  duplicateShapeEdit.addEventListener("click", duplicateSelectedShape);
 
  saveShapeEdit.addEventListener("click", () => {
    if (!selectedShape || !selectedShape._fireGridMeta) return;
 
    const meta = selectedShape._fireGridMeta;
    meta.color = shapeEditColor.value;
    meta.weight = parseInt(shapeEditWeight.value, 10);
    meta.style = shapeEditStyle.value;
    meta.opacity = parseInt(shapeEditOpacity.value, 10) / 100;
    meta.fillMode = shapeEditFillMode.value;
 
    applyStyleToLayer(selectedShape, meta);
 
    const item = drawings.find(d => d.layer === selectedShape);
    if (item) item.meta = meta;
 
    shapeEditPanel.style.display = "none";
    clearSelectedShapeStyle();
  });
 
  deleteShapeEdit.addEventListener("click", () => {
    if (!selectedShape) return;
 
    const result = confirm("この図形を削除しますか？");
    if (!result) return;
 
    drawingLayer.removeLayer(selectedShape);
    drawings = drawings.filter(d => d.layer !== selectedShape);
    selectedShape = null;
    shapeEditPanel.style.display = "none";
  });
 
  closeShapeEdit.addEventListener("click", () => {
    shapeEditPanel.style.display = "none";
    clearSelectedShapeStyle();
  });
 
  updateDrawStatus();
 
  function searchGrid() {
    const value = gridSearchInput.value.trim().toUpperCase();
 
    if (!value) {
      alert("グリッド番号を入力してください。");
      return;
    }
 
    const match = value.match(/^([A-Z]+)\s*-\s*(\d+)$/);
    if (!match) {
      alert("グリッド番号は A-3 のように入力してください。");
      return;
    }
 
    const info = getGridInfo();
    if (!info) {
      alert("グリッド情報がありません。");
      return;
    }
 
    const colIndex = getColumnIndex(match[1]);
    const rowIndex = parseInt(match[2], 10) - 1;
    const colCount = Math.round((info.eastLine - info.westLine) / info.lngStep);
    const rowCount = Math.round((info.northLine - info.southLine) / info.latStep);
 
    if (colIndex < 0 || rowIndex < 0 || colIndex >= colCount || rowIndex >= rowCount) {
      alert("指定されたグリッド番号は表示範囲外です。");
      return;
    }
 
    const west = info.westLine + info.lngStep * colIndex;
    const east = info.westLine + info.lngStep * (colIndex + 1);
    const north = info.northLine - info.latStep * rowIndex;
    const south = info.northLine - info.latStep * (rowIndex + 1);
    const bounds = L.latLngBounds([south, west], [north, east]);
 
    map.fitBounds(bounds, { padding: [80, 80], animate: true });
    searchHighlightLayer.clearLayers();
 
    const rect = L.rectangle(bounds, {
      color: "#facc15",
      weight: 4,
      opacity: 1,
      fillColor: "#facc15",
      fillOpacity: 0.28,
      className: "gridHighlight"
    }).addTo(searchHighlightLayer);
 
    rect.bindPopup(`検索結果：${match[1]}-${rowIndex + 1}`).openPopup();
    setTimeout(() => searchHighlightLayer.clearLayers(), 5000);
  }
 
  function createBlinkMarker(latlng, layer, colorClass, popupHtml, duration) {
    layer.clearLayers();
 
    const blinkIcon = L.divIcon({
      className: "",
      html: `<div class="blinkMarker ${colorClass || ""}"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
 
    const marker = L.marker(latlng, { icon: blinkIcon }).addTo(layer);
    if (popupHtml) marker.bindPopup(popupHtml).openPopup();
    setTimeout(() => layer.clearLayers(), duration || 7000);
    return marker;
  }
 
  function searchCoordinate() {
    const value = coordSearchInput.value.trim();
 
    if (!value) {
      alert("座標を入力してください。");
      return;
    }
 
    const parsed = parseLatLngInput(value);
    if (!parsed) {
      alert("座標の形式を確認してください。\n例：39°04′12.34″N, 141°42′34.56″E\n例：39.070094, 141.709600");
      return;
    }
 
    const { lat, lng } = parsed;
 
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("緯度・経度の範囲が正しくありません。");
      return;
    }
 
    const latlng = L.latLng(lat, lng);
 
    if (fixedBounds && !fixedBounds.contains(latlng)) {
      const result = confirm("この座標は確定範囲外です。移動しますか？");
      if (!result) return;
    }
 
    map.setView(latlng, Math.max(map.getZoom(), 16), { animate: true });
 
    createBlinkMarker(
      latlng,
      coordSearchLayer,
      "",
      `座標検索<br>緯度：${formatCoordinateValue(lat, "lat")}<br>経度：${formatCoordinateValue(lng, "lng")}`,
      7000
    );
  }


  async function searchAddress() {
    const value = addressSearchInput ? addressSearchInput.value.trim() : "";

    if (!value) {
      alert("住所を入力してください。");
      return;
    }

    try {
      const url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + encodeURIComponent(value);
      const response = await fetch(url);
      if (!response.ok) throw new Error("address search failed");
      const results = await response.json();
      const first = Array.isArray(results) ? results[0] : null;
      const coordinates = first && first.geometry && first.geometry.coordinates;

      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        alert("該当する住所が見つかりませんでした。");
        return;
      }

      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        alert("住所検索結果の座標を取得できませんでした。");
        return;
      }

      const latlng = L.latLng(lat, lng);

      if (fixedBounds && !fixedBounds.contains(latlng)) {
        const result = confirm("この住所は確定範囲外です。移動しますか？");
        if (!result) return;
      }

      map.setView(latlng, Math.max(map.getZoom(), 16), { animate: true });

      const label = first.properties && first.properties.title ? first.properties.title : value;
      createBlinkMarker(
        latlng,
        coordSearchLayer,
        "blue",
        `住所検索<br>${escapeHtml(label)}<br>緯度：${formatCoordinateValue(lat, "lat")}<br>経度：${formatCoordinateValue(lng, "lng")}`,
        7000
      );
    } catch (error) {
      console.warn("住所検索に失敗しました。", error);
      alert("住所検索に失敗しました。通信状況を確認してください。");
    }
  }
  
   function searchIncident() {
    const keyword = incidentSearchInput.value.trim();
 
    if (!keyword) {
      alert("災害番号を入力してください。");
      return;
    }
 
    const normalizedKeyword = keyword.replace(/\s+/g, "").toLowerCase();
 
    const foundPin = pins.find(pin => {
      const no = (pin.data.incidentNo || "").replace(/\s+/g, "").toLowerCase();
      return no === normalizedKeyword;
    });
 
    if (!foundPin) {
      alert("該当する災害番号のピンが見つかりませんでした。");
      return;
    }
 
    const latlng = foundPin.getLatLng();
 
    map.setView(latlng, Math.max(map.getZoom(), 17), { animate: true });
    foundPin.openPopup();
 
    createBlinkMarker(
      latlng,
      incidentSearchLayer,
      "blue",
      `災害番号検索<br>${foundPin.data.incidentNo || "-"}`,
      7000
    );
  }
 
  gridSearchBtn.addEventListener("click", searchGrid);
  coordSearchBtn.addEventListener("click", searchCoordinate);
  if (addressSearchBtn) addressSearchBtn.addEventListener("click", searchAddress);
  incidentSearchBtn.addEventListener("click", searchIncident);
 
  gridSearchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchGrid();
  });
 
  coordSearchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchCoordinate();
  });
 
  if (addressSearchInput) {
    addressSearchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") searchAddress();
    });
  }
 
  incidentSearchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchIncident();
  });
 
  map.on("zoomend moveend", () => {
    drawGridLines();
    drawGridOverlay();
    refreshAllMeasurementStats();
    hidePinContextMenu();
    hideHistoryContextMenu();
  });
 
  window.addEventListener("resize", () => {
    setTimeout(() => {
      map.invalidateSize();
      drawGridLines();
      drawGridOverlay();
    }, 100);
  });
 
  const pinColors = {
    fire: "#e60000",
    rescue: "#ff7a00",
    emergency: "#0066ff",
    completed: "#000000"
  };
 
  const pinLabels = {
    fire: "火災",
    rescue: "救助",
    emergency: "救急"
  };
 
  function normalizePinType(type) {
    return pinLabels[type] ? type : "fire";
  }
 
  function findPinById(id) {
    return pins.find(pin => pin.data.id === id) || null;
  }
 
  function getPinDisplayNumber(pinOrData) {
    const data = pinOrData && pinOrData.data ? pinOrData.data : pinOrData;
    if (!data) return "";
 
    const index = pins.findIndex(pin => pin && pin.data && pin.data.id === data.id);
    if (index >= 0) return String(index + 1);
 
    return String(pins.length + 1);
  }
 
  function createIcon(type, completed = false, number = "") {
    const normalizedType = normalizePinType(type);
    const color = completed ? pinColors.completed : (pinColors[normalizedType] || pinColors.fire);
    const label = String(number || "");
    const fontSize = label.length >= 3 ? 9 : (label.length >= 2 ? 10 : 12);
 
    return L.divIcon({
      className: completed ? "numberedPinIcon completedPinIcon" : "numberedPinIcon",
      html: `
        <div class="numberedPinMarker" style="background:${color};font-size:${fontSize}px;">
          ${escapeHtml(label)}
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14]
    });
  }
 
  function makePopup(data) {
    const statusText = data.completed ? "【活動完了】<br>" : "";
    const attachmentText = data.attachmentName ? `<br>添付：${data.attachmentName}` : "";
    const imageHtml = data.attachmentDataUrl ? `<br><img src="${data.attachmentDataUrl}" style="width:180px;margin-top:6px;border-radius:4px;">` : "";
 
    return `
      ${statusText}
      <b>${pinLabels[normalizePinType(data.type)] || "火災"}</b><br>
      覚知日時：${data.awarenessLabel || "-"}<br>
      完了日時：${data.completedLabel || "-"}<br>
      座標：${formatLatLngPair(data.lat, data.lng)}<br>
      グリッド番号：${data.gridNo || "-"}<br>
      災害番号：${data.incidentNo || "-"}<br>
      概要：${data.summary || "-"}<br>
      出動部隊：${data.units || "-"}<br>
      傷病者人数：${data.injured || 0}
      ${attachmentText}
      ${imageHtml}
    `;
  }
 
  function refreshPin(pin) {
    if (!pin) return;
    pin.setIcon(createIcon(pin.data.type, pin.data.completed, getPinDisplayNumber(pin)));
    pin.bindPopup(makePopup(pin.data));
  }
 
  function openEditPanel(pin) {
    selectedPin = pin;
    const data = pin.data;
    pendingAttachment = null;
 
    data.type = normalizePinType(data.type);
    pinType.value = data.type;
    updatePinLatLngField(data);
    gridNo.value = data.gridNo || "";
    incidentNo.value = data.incidentNo || "";
    summary.value = data.summary || "";
    units.value = data.units || "";
    injuredCount.value = data.injured || 0;
    attachment.value = "";
 
    attachmentInfo.textContent = data.attachmentName ? "添付済み：" + data.attachmentName : "添付なし";
 
    if (data.attachmentDataUrl) {
      attachmentPreview.src = data.attachmentDataUrl;
      attachmentPreview.style.display = "block";
    } else {
      attachmentPreview.removeAttribute("src");
      attachmentPreview.style.display = "none";
    }
 
    editPanel.style.display = "block";
  }
 
  function showPinContextMenu(pin, originalEvent) {
    contextTargetPin = pin;
    pinContextMenu.style.left = originalEvent.clientX + "px";
    pinContextMenu.style.top = originalEvent.clientY + "px";
    pinContextMenu.style.display = "block";
    hideHistoryContextMenu();
  }
 
  function hidePinContextMenu() {
    pinContextMenu.style.display = "none";
    contextTargetPin = null;
  }
 
  function showHistoryContextMenu(item, event) {
    selectedHistoryItem = item;
    historyContextMenu.style.left = event.clientX + "px";
    historyContextMenu.style.top = event.clientY + "px";
    historyContextMenu.style.display = "block";
    hidePinContextMenu();
  }
 
  function hideHistoryContextMenu() {
    historyContextMenu.style.display = "none";
    selectedHistoryItem = null;
  }
 
  function makeHistoryItemFromPin(pin) {
    return {
      id: pin.data.id,
      dateKey: getDateKeyFromTimestamp(pin.data.completedTimestamp),
      dateLabel: getDateLabelFromTimestamp(pin.data.completedTimestamp),
      type: normalizePinType(pin.data.type),
      typeLabel: pinLabels[normalizePinType(pin.data.type)] || "火災",
      awarenessTimestamp: pin.data.awarenessTimestamp,
      awarenessLabel: pin.data.awarenessLabel,
      completedTimestamp: pin.data.completedTimestamp,
      completedLabel: pin.data.completedLabel,
      pinNo: getPinDisplayNumber(pin),
      gridNo: pin.data.gridNo,
      lat: pin.data.lat,
      lng: pin.data.lng,
      incidentNo: pin.data.incidentNo,
      summary: pin.data.summary,
      units: pin.data.units,
      injured: pin.data.injured
    };
  }
 
  function updateHistoryItemFromPin(pin) {
    const item = activityHistory.find(h => h.id === pin.data.id);
    if (!item) return;
 
    item.type = pin.data.type;
    item.typeLabel = pinLabels[pin.data.type] || "未分類";
    item.awarenessLabel = pin.data.awarenessLabel;
    item.completedLabel = pin.data.completedLabel;
    item.pinNo = getPinDisplayNumber(pin);
    item.gridNo = pin.data.gridNo;
    item.lat = pin.data.lat;
    item.lng = pin.data.lng;
    item.incidentNo = pin.data.incidentNo;
    item.summary = pin.data.summary;
    item.units = pin.data.units;
    item.injured = pin.data.injured;
  }

  function getHistoryPinNo(item) {
    if (!item) return "-";
    const pin = findPinById(item.id);
    if (pin) return getPinDisplayNumber(pin);
    return item.pinNo || "-";
  }

  function getHistorySortTimestamp(item) {
    const completed = Number(item && item.completedTimestamp);
    if (Number.isFinite(completed) && completed > 0) return completed;

    const awareness = Number(item && item.awarenessTimestamp);
    if (Number.isFinite(awareness) && awareness > 0) return awareness;

    const pinNo = Number(getHistoryPinNo(item));
    if (Number.isFinite(pinNo) && pinNo > 0) return pinNo;

    return 0;
  }

  function sortActivityHistoryChronological(list) {
    return (Array.isArray(list) ? list : []).slice().sort((a, b) => {
      const timeDiff = getHistorySortTimestamp(a) - getHistorySortTimestamp(b);
      if (timeDiff !== 0) return timeDiff;

      const pinNoDiff = Number(getHistoryPinNo(a)) - Number(getHistoryPinNo(b));
      if (Number.isFinite(pinNoDiff) && pinNoDiff !== 0) return pinNoDiff;

      return String(a && a.id || "").localeCompare(String(b && b.id || ""));
    });
  }
 
  function renderActivityHistory() {
    activityHistoryList.innerHTML = "";
 
    if (activityHistory.length === 0) {
      activityHistoryList.innerHTML = `<p class="emptyHistory">活動完了した事案はありません。</p>`;
      return;
    }
 
    const grouped = {};
    activityHistory.forEach(item => {
      if (!grouped[item.dateKey]) grouped[item.dateKey] = { dateLabel: item.dateLabel, items: [] };
      grouped[item.dateKey].items.push(item);
    });
 
    Object.keys(grouped).sort().forEach(dateKey => {
      const group = grouped[dateKey];
      group.items = sortActivityHistoryChronological(group.items);
 
      const groupDiv = document.createElement("div");
      groupDiv.className = "historyDateGroup";
 
      const headerBtn = document.createElement("button");
      headerBtn.className = "historyDateHeader";
      headerBtn.type = "button";
 
      const titleSpan = document.createElement("span");
      titleSpan.className = "historyDateTitle";
      titleSpan.textContent = "▼ " + group.dateLabel;
 
      const countSpan = document.createElement("span");
      countSpan.className = "historyDateCount";
      countSpan.textContent = group.items.length + "件";
 
      headerBtn.appendChild(titleSpan);
      headerBtn.appendChild(countSpan);
 
      const bodyDiv = document.createElement("div");
      bodyDiv.className = "historyDateBody";
 
      headerBtn.addEventListener("click", () => {
        bodyDiv.classList.toggle("collapsed");
        titleSpan.textContent = (bodyDiv.classList.contains("collapsed") ? "▶ " : "▼ ") + group.dateLabel;
      });
 
      group.items.forEach(item => {
        const div = document.createElement("div");
        div.className = "historyItem";
        const coordinateText = (typeof item.lat === "number" && typeof item.lng === "number") ? formatLatLngPair(item.lat, item.lng) : "-";
        div.innerHTML = `<b>№${getHistoryPinNo(item)}　${item.typeLabel}　${item.gridNo || "-"}</b><div class="historyTime">覚知：${item.awarenessLabel || "-"}<br>完了：${item.completedLabel || "-"}</div><div class="historyMeta">座標：${coordinateText}<br>災害番号：${item.incidentNo || "-"}<br>概要：${item.summary || "-"}<br>出動部隊：${item.units || "-"}<br>傷病者人数：${item.injured || 0}</div>`;
 
        div.addEventListener("click", e => {
          e.stopPropagation();
          showHistoryContextMenu(item, e);
        });
 
        bodyDiv.appendChild(div);
      });
 
      groupDiv.appendChild(headerBtn);
      groupDiv.appendChild(bodyDiv);
      activityHistoryList.appendChild(groupDiv);
    });
  }
 
  function completePin(pin) {
    if (!pin || pin.data.completed) return;
 
    const completedTimestamp = Date.now();
    pin.data.completed = true;
    pin.data.completedTimestamp = completedTimestamp;
    pin.data.completedLabel = getDateTimeLabelFromTimestamp(completedTimestamp);
 
    activityHistory.push(makeHistoryItemFromPin(pin));
    refreshPin(pin);
    renderActivityHistory();
    openToolPanel("historyPanel");
 
    if (selectedPin === pin) {
      editPanel.style.display = "none";
      selectedPin = null;
    }
  }
 
  function deletePin(pin) {
    if (!pin) return;
 
    pinLayer.removeLayer(pin);
    pins = pins.filter(p => p !== pin);
    activityHistory = activityHistory.filter(item => item.id !== pin.data.id);
    pins.forEach(refreshPin);
    renderActivityHistory();
 
    if (selectedPin === pin) {
      selectedPin = null;
      editPanel.style.display = "none";
    }
  }
 
  completePinBtn.addEventListener("click", () => {
    completePin(contextTargetPin);
    hidePinContextMenu();
  });
 
  deletePinBtn.addEventListener("click", () => {
    deletePin(contextTargetPin);
    hidePinContextMenu();
  });
 
  cancelPinMenuBtn.addEventListener("click", hidePinContextMenu);
    function openHistoryEditPanel(item) {
    if (!item) return;
 
    selectedHistoryItem = item;
 
    historyEditType.value = item.type || "fire";
    historyEditAwareness.value = item.awarenessLabel || "";
    historyEditCompleted.value = item.completedLabel || "";
    historyEditGridNo.value = item.gridNo || "";
    historyEditIncidentNo.value = item.incidentNo || "";
    historyEditSummary.value = item.summary || "";
    historyEditUnits.value = item.units || "";
    historyEditInjured.value = item.injured || 0;
 
    historyEditPanel.style.display = "block";
  }
 
  function saveHistoryEditFunc() {
    if (!selectedHistoryItem) return;
 
    const pin = findPinById(selectedHistoryItem.id);
 
    selectedHistoryItem.type = historyEditType.value;
    selectedHistoryItem.type = normalizePinType(historyEditType.value);
    selectedHistoryItem.typeLabel = pinLabels[selectedHistoryItem.type] || "火災";
    selectedHistoryItem.awarenessLabel = historyEditAwareness.value;
    selectedHistoryItem.completedLabel = historyEditCompleted.value;
    selectedHistoryItem.gridNo = historyEditGridNo.value;
    selectedHistoryItem.incidentNo = historyEditIncidentNo.value;
    selectedHistoryItem.summary = historyEditSummary.value;
    selectedHistoryItem.units = historyEditUnits.value;
    selectedHistoryItem.injured = parseInt(historyEditInjured.value, 10) || 0;
 
    if (pin) {
      pin.data.type = selectedHistoryItem.type;
      pin.data.awarenessLabel = selectedHistoryItem.awarenessLabel;
      pin.data.completedLabel = selectedHistoryItem.completedLabel;
      pin.data.gridNo = selectedHistoryItem.gridNo;
      pin.data.incidentNo = selectedHistoryItem.incidentNo;
      pin.data.summary = selectedHistoryItem.summary;
      pin.data.units = selectedHistoryItem.units;
      pin.data.injured = selectedHistoryItem.injured;
      refreshPin(pin);
    }
 
    renderActivityHistory();
    historyEditPanel.style.display = "none";
    hideHistoryContextMenu();
  }
 
  function cancelHistoryCase(item) {
    if (!item) return;
 
    const result = confirm("この事案の活動完了を取り消しますか？\n地図上のピンは活動中の状態に戻ります。");
    if (!result) return;
 
    const pin = findPinById(item.id);
 
    if (pin) {
      pin.data.completed = false;
      pin.data.completedTimestamp = null;
      pin.data.completedLabel = "";
      refreshPin(pin);
    }
 
    activityHistory = activityHistory.filter(h => h.id !== item.id);
    renderActivityHistory();
    hideHistoryContextMenu();
    historyEditPanel.style.display = "none";
  }
 
  editHistoryBtn.addEventListener("click", (e) => {
    if (e) e.stopPropagation();
 
    if (selectedHistoryItem) {
      openHistoryEditPanel(selectedHistoryItem);
    }
 
    hideHistoryContextMenu();
  });
 
  cancelHistoryCaseBtn.addEventListener("click", (e) => {
    if (e) e.stopPropagation();
 
    if (selectedHistoryItem) {
      cancelHistoryCase(selectedHistoryItem);
    }
  });
 
  closeHistoryMenuBtn.addEventListener("click", (e) => {
    if (e) e.stopPropagation();
    hideHistoryContextMenu();
  });
 
  saveHistoryEdit.addEventListener("click", saveHistoryEditFunc);
 
  closeHistoryEdit.addEventListener("click", () => {
    historyEditPanel.style.display = "none";
  });
  
  document.addEventListener("click", e => {
    if (!pinContextMenu.contains(e.target) && !historyContextMenu.contains(e.target)) {
      hidePinContextMenu();
      hideHistoryContextMenu();
    }
  });
 
  function addPin(latlng) {
    const awarenessTimestamp = Date.now();
 
    const data = {
      id: awarenessTimestamp,
      type: "fire",
      lat: latlng.lat,
      lng: latlng.lng,
      gridNo: getGridNumber(latlng),
      incidentNo: "",
      summary: "",
      units: "",
      injured: 0,
      attachmentName: "",
      attachmentDataUrl: "",
      completed: false,
      awarenessTimestamp,
      awarenessLabel: getDateTimeLabelFromTimestamp(awarenessTimestamp),
      completedTimestamp: null,
      completedLabel: ""
    };
 
    const marker = L.marker(latlng, { icon: createIcon(data.type, data.completed, pins.length + 1) }).addTo(pinLayer);
    marker.data = data;
    refreshPin(marker);
 
    marker.on("click", () => {
      if (!marker.data.completed) openEditPanel(marker);
      else marker.openPopup();
    });
 
    marker.on("contextmenu", e => {
      if (e.originalEvent) e.originalEvent.preventDefault();
      showPinContextMenu(marker, e.originalEvent);
    });
 
    pins.push(marker);
    openEditPanel(marker);
  }
 
  map.on("click", e => {
    if (window.fireGridSuppressNextClick) {
      window.fireGridSuppressNextClick = false;
      return;
    }
 
    if (dragShapeState) {
      return;
    }
 
    if (measureSettings.active) {
      if (measureSettings.type === "polyline") {
        if (measurePolylineClickTimer) return;
        measurePolylineClickTimer = setTimeout(() => {
          handleMeasurePolylineClick(e.latlng);
          measurePolylineClickTimer = null;
        }, 220);
        return;
      }
      return;
    }
 
    if (pasteMode && copiedShapeData) {
      pasteCopiedShape(e.latlng);
      return;
    }
 
    if (drawSettings.type === "polyline") {
      if (polylineClickTimer) return;
      polylineClickTimer = setTimeout(() => {
        handlePolylineDrawing(e.latlng);
        polylineClickTimer = null;
      }, 220);
      return;
    }
 
    if (drawSettings.type === "line") return handleLineDrawing(e.latlng);
    if (drawSettings.type === "rectangle") return handleRectangleDrawing(e.latlng);
    if (drawSettings.type === "circle") return handleCircleDrawing(e.latlng);
    if (drawSettings.type === "arrow") return handleArrowDrawing(e.latlng);
    if (drawSettings.type !== "none") return;
 
    addPin(e.latlng);
  });
 
  attachment.addEventListener("change", () => {
    const file = attachment.files[0];
 
    if (!file) {
      pendingAttachment = null;
      return;
    }
 
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      attachment.value = "";
      pendingAttachment = null;
      return;
    }
 
    const reader = new FileReader();
 
    reader.onload = () => {
      pendingAttachment = { name: file.name, dataUrl: reader.result };
      attachmentInfo.textContent = "選択中：" + file.name;
      attachmentPreview.src = reader.result;
      attachmentPreview.style.display = "block";
    };
 
    reader.readAsDataURL(file);
  });
 
  savePin.addEventListener("click", () => {
    if (!selectedPin) return;
 
    selectedPin.data.type = normalizePinType(pinType.value);
    selectedPin.data.gridNo = gridNo.value;
    selectedPin.data.incidentNo = incidentNo.value;
    selectedPin.data.summary = summary.value;
    selectedPin.data.units = units.value;
    selectedPin.data.injured = parseInt(injuredCount.value) || 0;
 
    if (pendingAttachment) {
      selectedPin.data.attachmentName = pendingAttachment.name;
      selectedPin.data.attachmentDataUrl = pendingAttachment.dataUrl;
    }
 
    if (selectedPin.data.completed) {
      updateHistoryItemFromPin(selectedPin);
      renderActivityHistory();
    }
 
    refreshPin(selectedPin);
    selectedPin.openPopup();
    editPanel.style.display = "none";
  });
 
  closePanel.addEventListener("click", () => {
    editPanel.style.display = "none";
  });
 
 
  function latLngToPlain(latlng) {
    return { lat: latlng.lat, lng: latlng.lng };
  }
 
  function plainToLatLng(point) {
    return L.latLng(point.lat, point.lng);
  }
 

  function getTrackStyle() {
    return {
      color: (trackColor && trackColor.value) || "#facc15",
      weight: trackWeight ? Number(trackWeight.value || 5) : 5,
      opacity: 1
    };
  }

  function updateTrackStatus() {
    if (trackWeightValue && trackWeight) trackWeightValue.textContent = String(trackWeight.value || 5);
    if (!trackStatusText) return;
    if (!tracks.length) {
      trackStatusText.textContent = "未読込";
      return;
    }
    const totalPoints = tracks.reduce((sum, item) => sum + (Array.isArray(item.points) ? item.points.length : 0), 0);
    trackStatusText.textContent = `${tracks.length}件・${totalPoints}点・色 ${(trackColor && trackColor.value) || "#facc15"}・太さ ${trackWeight ? trackWeight.value : 5}`;
  }

  function parseGpxText(text) {
    const source = String(text || "").trim();
    if (!source) throw new Error("GPXデータが入力されていません。");
    const doc = new DOMParser().parseFromString(source, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("GPXデータの形式を確認してください。");
    const segments = [];
    const trksegs = Array.from(doc.getElementsByTagName("trkseg"));
    if (trksegs.length) {
      trksegs.forEach(seg => {
        const pts = Array.from(seg.getElementsByTagName("trkpt")).map(node => ({
          lat: Number(node.getAttribute("lat")),
          lng: Number(node.getAttribute("lon"))
        })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        if (pts.length >= 2) segments.push(pts);
      });
    }
    if (!segments.length) {
      const pts = Array.from(doc.getElementsByTagName("rtept")).map(node => ({
        lat: Number(node.getAttribute("lat")),
        lng: Number(node.getAttribute("lon"))
      })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (pts.length >= 2) segments.push(pts);
    }
    if (!segments.length) throw new Error("trkpt または rtept が2点以上あるGPXデータを貼り付けてください。");
    return segments;
  }

  function renderTrackItem(item) {
    if (!item || !Array.isArray(item.points) || item.points.length < 2) return null;
    const layer = L.polyline(item.points.map(p => [p.lat, p.lng]), {
      color: item.color || "#facc15",
      weight: Number(item.weight || 5),
      opacity: Number(item.opacity ?? 1),
      interactive: true
    }).addTo(trackLayer);
    layer.bindTooltip(item.name || "GPX軌跡");
    item.layer = layer;
    return layer;
  }

  function applyGpxTrack() {
    try {
      const segments = parseGpxText(gpxTextInput ? gpxTextInput.value : "");
      const style = getTrackStyle();
      const created = [];
      segments.forEach(points => {
        const item = {
          id: `track_${Date.now()}_${trackSerial++}`,
          name: `GPX軌跡${trackSerial - 1}`,
          color: style.color,
          weight: style.weight,
          opacity: style.opacity,
          points
        };
        tracks.push(item);
        renderTrackItem(item);
        created.push(item);
      });
      updateTrackStatus();
      const bounds = L.latLngBounds(created.flatMap(item => item.points.map(p => [p.lat, p.lng])));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    } catch (error) {
      alert(error.message || "GPX軌跡の読み込みに失敗しました。");
    }
  }

  function clearGpxTracks() {
    trackLayer.clearLayers();
    tracks = [];
    updateTrackStatus();
  }

  function serializeTracks() {
    return tracks.map(item => ({
      id: item.id,
      name: item.name || "GPX軌跡",
      color: item.color || "#facc15",
      weight: Number(item.weight || 5),
      opacity: Number(item.opacity ?? 1),
      points: (item.points || []).map(latLngToPlain)
    })).filter(item => item.points.length >= 2);
  }

  function restoreTracks(list) {
    trackLayer.clearLayers();
    tracks = [];
    (Array.isArray(list) ? list : []).forEach(item => {
      const points = (item.points || []).map(p => ({ lat: Number(p.lat), lng: Number(p.lng) })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (points.length < 2) return;
      const restored = {
        id: item.id || `track_${Date.now()}_${trackSerial++}`,
        name: item.name || "GPX軌跡",
        color: item.color || "#facc15",
        weight: Number(item.weight || 5),
        opacity: Number(item.opacity ?? 1),
        points
      };
      tracks.push(restored);
      renderTrackItem(restored);
    });
    updateTrackStatus();
  }

  function serializeMeasurements() {
    return measurements.map(item => ({
      id: item.id,
      number: item.number,
      name: item.name || "名称未設定",
      type: item.type,
      style: item.style,
      points: (item.points || []).map(latLngToPlain),
      areaM2: item.areaM2 || 0,
      areaHa: item.areaHa || 0,
      gridRange: item.gridRange || null
    }));
  }
 
  function serializeDrawings() {
    return drawings.map(item => getShapeData(item.layer)).filter(Boolean);
  }
 
  function serializePins() {
    return pins.map(marker => ({ ...marker.data }));
  }
 
  function plainBoundsFromAnyBounds(boundsLike) {
    if (!boundsLike) return null;
 
    if (typeof boundsLike.getSouthWest === "function" && typeof boundsLike.getNorthEast === "function") {
      return {
        southWest: latLngToPlain(boundsLike.getSouthWest()),
        northEast: latLngToPlain(boundsLike.getNorthEast())
      };
    }
 
    if (boundsLike._southWest && boundsLike._northEast) {
      return {
        southWest: { lat: Number(boundsLike._southWest.lat), lng: Number(boundsLike._southWest.lng) },
        northEast: { lat: Number(boundsLike._northEast.lat), lng: Number(boundsLike._northEast.lng) }
      };
    }
 
    if (boundsLike.southWest && boundsLike.northEast) {
      return {
        southWest: { lat: Number(boundsLike.southWest.lat), lng: Number(boundsLike.southWest.lng) },
        northEast: { lat: Number(boundsLike.northEast.lat), lng: Number(boundsLike.northEast.lng) }
      };
    }
 
    return null;
  }
 
  function plainCenterFromAnyCenter(centerLike) {
    if (!centerLike) return null;
    if (typeof centerLike.lat === "number" && typeof centerLike.lng === "number") {
      return { lat: centerLike.lat, lng: centerLike.lng };
    }
    return null;
  }
 
  function buildGlinkData() {
    const savedBounds = plainBoundsFromAnyBounds(fixedBounds) || plainBoundsFromAnyBounds(session.bounds);
    const mapReady = !!(map && map._loaded);
    const currentCenter = mapReady ? map.getCenter() : session.center;
    const currentZoom = mapReady ? map.getZoom() : session.zoom;
    const savedCenter = plainCenterFromAnyCenter(currentCenter) || plainCenterFromAnyCenter(session.center);
    return {
      appName: "G-Link〈災害情報共有システム〉",
      format: "glink",
      version: "1.6.4",
      build: "Build023.6",
      savedAt: new Date().toISOString(),
      coordinateType,
      header: saveSharedHeader(getCurrentHeaderFromScreen()),
      session: {
        ...session,
        bounds: savedBounds,
        center: savedCenter,
        zoom: currentZoom,
        mapType: session.mapType || (fixedMapType ? fixedMapType.value : "pale"),
        gridSize: session.gridSize || 0,
        coordinateType
      },
      mapType: session.mapType || (fixedMapType ? fixedMapType.value : "pale"),
      gridSize: session.gridSize || 0,
      bounds: savedBounds,
      gridLineSettings: { ...gridLineSettings },
      pinLegend: [
        ...Object.keys(pinLabels).map(key => ({
          type: key,
          label: pinLabels[key],
          color: pinColors[key] || pinColors.fire
        })),
        { type: "completed", label: "活動完了", color: pinColors.completed }
      ],
      activityHistoryFields: [
        "№",
        "種別",
        "グリッド番号",
        "座標",
        "覚知日時",
        "完了日時",
        "災害番号",
        "概要",
        "出動部隊",
        "傷病者人数"
      ],
      pins: serializePins(),
      drawings: serializeDrawings(),
      tracks: serializeTracks(),
      measurements: serializeMeasurements(),
      activityHistory: activityHistory.map(item => ({ ...item }))
    };
  }
 
  function safeFileName(name) {
    return String(name || "G-Link保存データ")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "G-Link保存データ";
  }
 
  function downloadBlob(filename, mimeType, text) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
 
  function saveGlinkFile() {
    const data = buildGlinkData();
    const baseName = safeFileName(data.header.disasterName || "G-Link保存データ");
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    downloadBlob(`${stamp}_${baseName}.glink`, "application/json;charset=utf-8", JSON.stringify(data, null, 2));
  }
 
  function createPinFromData(data) {
    if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") return null;
    const marker = L.marker([data.lat, data.lng], { icon: createIcon(data.type, data.completed, pins.length + 1) }).addTo(pinLayer);
    marker.data = { ...data };
    refreshPin(marker);
    marker.on("click", () => {
      if (!marker.data.completed) openEditPanel(marker);
      else marker.openPopup();
    });
    marker.on("contextmenu", e => {
      if (e.originalEvent) e.originalEvent.preventDefault();
      showPinContextMenu(marker, e.originalEvent);
    });
    pins.push(marker);
    return marker;
  }
 
  function restoreMeasurements(savedMeasurements) {
    measureLayer.clearLayers();
    measurements = [];
    (savedMeasurements || []).forEach(saved => {
      const points = (saved.points || []).map(plainToLatLng);
      if (points.length < 3) return;
      const style = saved.style || getMeasureStyleSnapshot();
      const number = measurements.length + 1;
      const id = saved.id || (Date.now() + "_" + Math.random().toString(16).slice(2));
      const layer = L.polygon(points, getMeasureStyleOptions(style)).addTo(measureLayer);
      const labelMarker = createMeasureNumberMarker(number, getPolygonCenter(points)).addTo(measureLayer);
      const measurement = {
        id,
        number,
        name: saved.name || "名称未設定",
        type: saved.type || "polygon",
        style,
        layer,
        labelMarker,
        points,
        areaM2: 0,
        areaHa: 0,
        gridRange: { cells: [], gridCount: 0, areaM2: 0, areaHa: 0, colSpan: 0, rowSpan: 0 }
      };
      layer._fireGridMeasurementId = id;
      layer.on("contextmenu", e => {
        if (e.originalEvent) e.originalEvent.preventDefault();
        deleteMeasurement(id);
      });
      measurements.push(measurement);
      refreshMeasurementStats(measurement);
    });
    renumberMeasurements();
  }
 
  function loadGlinkData(data, options = {}) {
    if (!data || data.format !== "glink") {
      alert("G-Link保存ファイル（.glink）として認識できませんでした。");
      return;
    }
 
    if (data.header) {
      if (headerDateTime) headerDateTime.value = data.header.dateTime || headerDateTime.value;
      const disasterNameInput = document.getElementById("disasterName");
      const createdUnitInput = document.getElementById("createdUnit");
      if (disasterNameInput) disasterNameInput.value = data.header.disasterName || "";
      if (createdUnitInput) createdUnitInput.value = data.header.createdUnit || "";
      adjustHeaderFieldsNoWrap();
      saveSharedHeader(getCurrentHeaderFromScreen());
    }
 
    if (data.session) {
      Object.assign(session, data.session);
      const normalizedDataBounds = normalizePlainBoundsForStartup(data.session.bounds || data.bounds);
      if (normalizedDataBounds) {
        const restoredBounds = L.latLngBounds(
          plainToLatLng(normalizedDataBounds.southWest),
          plainToLatLng(normalizedDataBounds.northEast)
        );
        session.bounds = {
          _southWest: { ...normalizedDataBounds.southWest },
          _northEast: { ...normalizedDataBounds.northEast },
          southWest: { ...normalizedDataBounds.southWest },
          northEast: { ...normalizedDataBounds.northEast }
        };
        fixedBounds = restoredBounds;
        displayBounds = restoredBounds;
        map.fitBounds(restoredBounds, { padding: [0, 0] });
      }
      if (data.session.center) session.center = plainToLatLng(data.session.center);
    }
 
    if (data.coordinateType || data.session?.coordinateType) {
      coordinateType = (data.coordinateType || data.session.coordinateType) === "decimal" ? "decimal" : "dms";
      refreshCoordinateDisplays();
    }
 
    if (data.gridLineSettings) {
      gridLineSettings = { ...gridLineSettings, ...data.gridLineSettings };
      applyGridLineSettingsToControls();
      drawGridLines();
      drawGridOverlay();
    }
 
    pinLayer.clearLayers();
    pins = [];
    (data.pins || []).forEach(createPinFromData);
 
    drawingLayer.clearLayers();
    drawings = [];
    (data.drawings || []).forEach(item => createShapeFromData(item));

    restoreTracks(data.tracks || []);
 
    restoreMeasurements(data.measurements || []);
 
    activityHistory = Array.isArray(data.activityHistory) ? data.activityHistory.map(item => ({ ...item })) : [];
    renderActivityHistory();
    updateMeasureSummaryBanner();
    renderMeasureList();
    if (!options.silent) alert("G-Link保存ファイルを読み込みました。");
  }
 
  function openGlinkFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadGlinkData(JSON.parse(reader.result));
      } catch (error) {
        console.error(error);
        alert("ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file, "utf-8");
  }
 
  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
 
  function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
    downloadBlob(filename, "text/csv;charset=utf-8", "\ufeff" + csv);
  }
 
  function exportActivityHistoryCsv() {
    const rows = [["No", "№", "種別", "覚知日時", "完了日時", "グリッド", "座標", "災害番号", "概要", "出動部隊", "傷病者人数"]];
    sortActivityHistoryChronological(activityHistory).forEach((item, index) => {
      const coordinateText = (typeof item.lat === "number" && typeof item.lng === "number") ? formatLatLngPair(item.lat, item.lng) : "";
      rows.push([
        index + 1,
        getHistoryPinNo(item),
        typeLabel(normalizePinType(item.type)),
        item.awarenessLabel || "",
        item.completedLabel || "",
        item.gridNo || "",
        coordinateText,
        item.incidentNo || "",
        item.summary || "",
        item.units || "",
        item.injured ?? 0
      ]);
    });
    downloadCsv("G-Link_活動履歴.csv", rows);
  }
 
  function exportMeasurementCsv() {
    const rows = [["No", "名称", "面積㎡", "面積ha", "範囲グリッド数", "範囲㎡", "範囲ha", "線色", "塗りつぶし色", "透明度", "線幅"]];
    measurements.forEach(item => {
      rows.push([
        item.number,
        getMeasurementDisplayName(item),
        Math.round(item.areaM2 || 0),
        (item.areaHa || 0).toFixed(3),
        item.gridRange?.gridCount || 0,
        Math.round(item.gridRange?.areaM2 || 0),
        (item.gridRange?.areaHa || 0).toFixed(3),
        item.style?.lineColor || "",
        item.style?.fillColor || "",
        Math.round((item.style?.opacity ?? 0) * 100) + "%",
        item.style?.weight || ""
      ]);
    });
    downloadCsv("G-Link_計測図形.csv", rows);
  }
 
 
  function restoreWorkingDataAfterSaveCenter() {
    const shouldRestore = sessionStorage.getItem("gLink_returnFromSaveCenter") === "1" || localStorage.getItem("gLink_returnFromSaveCenter") === "1";
    if (!shouldRestore) return false;
    sessionStorage.removeItem("gLink_returnFromSaveCenter");
    localStorage.removeItem("gLink_returnFromSaveCenter");
    try {
      const raw = sessionStorage.getItem("gLink_workingData")
        || sessionStorage.getItem("gLink_returnBackupData")
        || localStorage.getItem("gLink_workingData")
        || localStorage.getItem("gLink_returnBackupData")
        || sessionStorage.getItem("gLink_saveCenterData")
        || localStorage.getItem("gLink_saveCenterData");
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.format !== "glink") return false;
      loadGlinkData(data, { silent: true });
      if (data.session) {
        const sessionForReturn = { ...data.session };
        const normalizedBounds = normalizePlainBoundsForStartup(data.session.bounds || data.bounds);
        if (normalizedBounds) {
          sessionForReturn.bounds = {
            _southWest: { ...normalizedBounds.southWest },
            _northEast: { ...normalizedBounds.northEast },
            southWest: { ...normalizedBounds.southWest },
            northEast: { ...normalizedBounds.northEast }
          };
        }
        sessionStorage.setItem("disasterSession", JSON.stringify(sessionForReturn));
      }
      window.setTimeout(() => {
        map.invalidateSize();
        if (fixedBounds) map.fitBounds(fixedBounds, { padding: [0, 0], animate: false });
        drawGridLines();
        drawGridOverlay();
      }, 150);
      return true;
    } catch (error) {
      console.warn("保存センターから戻った作業状態を復元できませんでした。", error);
      return false;
    }
  }

  if (!restoreWorkingDataAfterSaveCenter()) {
    renderActivityHistory();
  }
 


  /* Build023.1: 指揮本部ヘッダー自動折返し判定修正・白枠幅最適化 */
  function calculateHeaderInputCh(value, minCh, maxCh) {
    const text = String(value || "").trim();
    const count = Array.from(text).length;
    return Math.max(minCh, Math.min(maxCh, Math.ceil(count * 1.05 + 3)));
  }

  function setHeaderAdaptiveInputWidths() {
    const disasterNameInput = document.getElementById("disasterName");
    const createdUnitInput = document.getElementById("createdUnit");
    const root = document.documentElement;

    const disasterCh = calculateHeaderInputCh(disasterNameInput ? disasterNameInput.value : "", 8, 28);
    const unitCh = calculateHeaderInputCh(createdUnitInput ? createdUnitInput.value : "", 9, 30);

    root.style.setProperty("--header-disaster-input-w-0231", `${disasterCh}em`);
    root.style.setProperty("--header-unit-input-w-0231", `${unitCh}em`);
  }

  function applyHeaderWrapMode0231() {
    const titleBar = document.getElementById("titleBar");
    const headerFields = document.querySelector(".headerFields");
    if (!titleBar || !headerFields) return;

    titleBar.classList.remove("headerCompact0231");
    // レイアウト反映後に実際の横幅を確認し、収まらない場合だけ折返しを許可する。
    const overflow = headerFields.scrollWidth > headerFields.clientWidth + 2;
    if (overflow || window.innerWidth <= 760) {
      titleBar.classList.add("headerCompact0231");
    }
  }

  function updateTitleBarHeightForHeader() {
    const titleBar = document.getElementById("titleBar");
    if (!titleBar) return;
    const height = Math.ceil(titleBar.getBoundingClientRect().height || 74);
    document.documentElement.style.setProperty("--fixed-titlebar-height", `${height}px`);
    if (typeof map !== "undefined" && map && typeof map.invalidateSize === "function") {
      window.setTimeout(() => map.invalidateSize(), 0);
    }
  }

  function updateFixedHeaderDiagnostic() {
    const body = document.getElementById("fixedHeaderDiagnosticBody");
    if (!body) return;
    const titleBar = document.getElementById("titleBar");
    const titleMain = document.querySelector(".titleMain");
    const headerFields = document.querySelector(".headerFields");
    const disasterNameInput = document.getElementById("disasterName");
    const createdUnitInput = document.getElementById("createdUnit");
    const currentInfoPanel = document.getElementById("currentInfoPanel");
    const fields = [headerDateTime, disasterNameInput, createdUnitInput].filter(Boolean);
    const line = (name, el) => {
      if (!el) return `${name}：取得不可`;
      return `${name}：表示幅 ${Math.round(el.getBoundingClientRect().width)}px / 内容幅 ${Math.round(el.scrollWidth)}px / 文字数 ${(el.value || el.textContent || "").length}`;
    };
    const titleRect = titleBar ? titleBar.getBoundingClientRect() : null;
    const fieldsStyle = headerFields ? getComputedStyle(headerFields) : null;
    const overflow = headerFields ? headerFields.scrollWidth > headerFields.clientWidth + 2 : false;
    body.innerHTML = [
      `Build：023.1 指揮本部ヘッダー自動折返し判定・白枠幅最適化`,
      `画面幅：${window.innerWidth}px`,
      `タイトルバー高さ：${titleRect ? Math.round(titleRect.height) : "取得不可"}px`,
      `ヘッダー表示幅：${headerFields ? Math.round(headerFields.clientWidth) : "取得不可"}px`,
      `ヘッダー内容幅：${headerFields ? Math.round(headerFields.scrollWidth) : "取得不可"}px`,
      `折返し判定：${titleBar && titleBar.classList.contains("headerCompact0231") ? "2段許可" : "1段優先"}`,
      `実測オーバー：${overflow ? "あり" : "なし"}`,
      `項目間隔：${fieldsStyle ? fieldsStyle.columnGap : "取得不可"}`,
      `グリッド線色：${gridLineSettings.color}`,
      `座標形式：${coordinateType === "dms" ? "60進法" : "10進法"}`,
      line("タイトル", titleMain),
      line("年月日", headerDateTime),
      line("災害名", disasterNameInput),
      line("作成部隊", createdUnitInput),
      line("座標・グリッド", currentInfoPanel),
      `切れ判定：${fields.some(el => el.scrollWidth > el.clientWidth + 2) ? "要確認" : "正常"}`
    ].join("<br>");
  }

  function fitHeaderInputWidth(input) {
    if (!input) return;
    input.style.width = "";
    input.style.maxWidth = "";
    input.style.fontSize = "";
    input.style.letterSpacing = "";
  }

  function adjustHeaderFieldsNoWrap() {
    [headerDateTime, document.getElementById("disasterName"), document.getElementById("createdUnit")].forEach(fitHeaderInputWidth);
    setHeaderAdaptiveInputWidths();
    window.requestAnimationFrame(() => {
      applyHeaderWrapMode0231();
      updateTitleBarHeightForHeader();
      updateFixedHeaderDiagnostic();
    });
  }

  [document.getElementById("disasterName"), document.getElementById("createdUnit")].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", adjustHeaderFieldsNoWrap);
    el.addEventListener("change", adjustHeaderFieldsNoWrap);
  });
  window.addEventListener("resize", adjustHeaderFieldsNoWrap);
  window.addEventListener("orientationchange", adjustHeaderFieldsNoWrap);
  window.setTimeout(adjustHeaderFieldsNoWrap, 0);
  window.setTimeout(adjustHeaderFieldsNoWrap, 250);




  /* Build023.2: 指揮本部ヘッダー実測判定方式
     flex-wrap任せを廃止し、年月日・災害名・作成部隊・座標・グリッド番号の合計必要幅で
     1段／2段をG-Link側が明示的に判定する。 */
  function measureHeaderItemWidth0232(el) {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.ceil(rect.width || el.scrollWidth || 0);
  }

  function calculateHeaderInputCh0232(value, minCh, maxCh) {
    const text = String(value || "").trim();
    const count = Array.from(text).length;
    return Math.max(minCh, Math.min(maxCh, Math.ceil(count * 1.05 + 3)));
  }

  function setHeaderAdaptiveInputWidths0232() {
    const root = document.documentElement;
    const disasterEl = document.getElementById("disasterName");
    const unitEl = document.getElementById("createdUnit");
    const disasterCh = calculateHeaderInputCh0232(disasterEl ? disasterEl.value : "", 8, 28);
    const unitCh = calculateHeaderInputCh0232(unitEl ? unitEl.value : "", 9, 30);
    root.style.setProperty("--header-disaster-input-w-0232", `${disasterCh}em`);
    root.style.setProperty("--header-unit-input-w-0232", `${unitCh}em`);
  }

  function applyHeaderLayoutMode0232() {
    const titleBar = document.getElementById("titleBar");
    const titleMain = document.querySelector(".titleMain");
    const headerFields = document.querySelector(".headerFields");
    const currentInfoPanel = document.getElementById("currentInfoPanel");
    if (!titleBar || !titleMain || !headerFields || !currentInfoPanel) return;

    titleBar.classList.remove("headerCompact0231", "headerCompact0232");

    // まず必ず1段候補で実測する。
    const barWidth = Math.floor(titleBar.clientWidth || window.innerWidth || 0);
    const cs = getComputedStyle(titleBar);
    const gap = parseFloat(cs.columnGap || cs.gap || "14") || 14;
    const titleWidth = measureHeaderItemWidth0232(titleMain);
    const fieldsWidth = Math.ceil(headerFields.scrollWidth || measureHeaderItemWidth0232(headerFields));
    const infoWidth = Math.ceil(currentInfoPanel.scrollWidth || measureHeaderItemWidth0232(currentInfoPanel));
    const neededWidth = titleWidth + fieldsWidth + infoWidth + gap * 2 + 100; // 左ツールバー余白込みの安全幅

    if (window.innerWidth <= 760 || neededWidth > barWidth) {
      titleBar.classList.add("headerCompact0232");
    }
  }

  function updateTitleBarHeightForHeader() {
    const titleBar = document.getElementById("titleBar");
    if (!titleBar) return;
    const height = Math.ceil(titleBar.getBoundingClientRect().height || 74);
    document.documentElement.style.setProperty("--fixed-titlebar-height", `${height}px`);
    if (typeof map !== "undefined" && map && typeof map.invalidateSize === "function") {
      window.setTimeout(() => map.invalidateSize(), 0);
    }
  }

  function updateFixedHeaderDiagnostic() {
    const body = document.getElementById("fixedHeaderDiagnosticBody");
    if (!body) return;
    const titleBar = document.getElementById("titleBar");
    const titleMain = document.querySelector(".titleMain");
    const headerFields = document.querySelector(".headerFields");
    const currentInfoPanel = document.getElementById("currentInfoPanel");
    const disasterEl = document.getElementById("disasterName");
    const unitEl = document.getElementById("createdUnit");
    const fields = [headerDateTime, disasterEl, unitEl].filter(Boolean);
    const line = (name, el) => {
      if (!el) return `${name}：取得不可`;
      return `${name}：表示幅 ${Math.round(el.getBoundingClientRect().width)}px / 内容幅 ${Math.round(el.scrollWidth)}px / 文字数 ${(el.value || el.textContent || "").length}`;
    };
    const barWidth = titleBar ? Math.round(titleBar.clientWidth) : 0;
    const titleWidth = measureHeaderItemWidth0232(titleMain);
    const fieldsWidth = headerFields ? Math.ceil(headerFields.scrollWidth) : 0;
    const infoWidth = currentInfoPanel ? Math.ceil(currentInfoPanel.scrollWidth) : 0;
    const gap = titleBar ? (parseFloat(getComputedStyle(titleBar).columnGap || "14") || 14) : 14;
    const needed = titleWidth + fieldsWidth + infoWidth + gap * 2 + 100;
    body.innerHTML = [
      `Build：023.2 指揮本部ヘッダー実測判定方式`,
      `画面幅：${window.innerWidth}px`,
      `タイトルバー表示幅：${barWidth}px`,
      `必要幅（タイトル＋3項目＋座標＋グリッド）：${Math.round(needed)}px`,
      `表示モード：${titleBar && titleBar.classList.contains("headerCompact0232") ? "2段" : "1段"}`,
      `判定：${needed <= barWidth ? "1段で収まる" : "2段が必要"}`,
      line("年月日", headerDateTime),
      line("災害名", disasterEl),
      line("作成部隊", unitEl),
      line("座標", currentInfoPanel),
      `切れ判定：${fields.some(el => el.scrollWidth > el.clientWidth + 2) ? "要確認" : "正常"}`,
      `座標形式：${coordinateType === "dms" ? "60進法" : "10進法"}`,
      `座標欄：ラベル余白最小・数値右揃え`,
      `ヘッダー配置：左寄せ`,
      `グリッド線色：${gridLineSettings.color}`
    ].join("<br>");
  }

  function adjustHeaderFieldsNoWrap() {
    [headerDateTime, document.getElementById("disasterName"), document.getElementById("createdUnit")].forEach(fitHeaderInputWidth);
    setHeaderAdaptiveInputWidths0232();
    window.requestAnimationFrame(() => {
      applyHeaderLayoutMode0232();
      updateTitleBarHeightForHeader();
      updateFixedHeaderDiagnostic();
    });
  }

  window.addEventListener("resize", adjustHeaderFieldsNoWrap);
  window.addEventListener("orientationchange", adjustHeaderFieldsNoWrap);
  window.setTimeout(adjustHeaderFieldsNoWrap, 0);
  window.setTimeout(adjustHeaderFieldsNoWrap, 250);
  window.setTimeout(adjustHeaderFieldsNoWrap, 1000);



  /* Build023.3: 指揮本部ヘッダー 1段固定・全体比例縮小方式
     2段折返しの判定を廃止し、ヘッダー情報全体を scale() で縮小して必ず1段に収める。 */
  function calculateHeaderInputCh0233(value, minCh, maxCh) {
    const text = String(value || "").trim();
    const count = Array.from(text).length;
    return Math.max(minCh, Math.min(maxCh, Math.ceil(count * 1.05 + 3)));
  }

  function setHeaderAdaptiveInputWidths0233() {
    const root = document.documentElement;
    const disasterEl = document.getElementById("disasterName");
    const unitEl = document.getElementById("createdUnit");
    const disasterCh = calculateHeaderInputCh0233(disasterEl ? disasterEl.value : "", 8, 28);
    const unitCh = calculateHeaderInputCh0233(unitEl ? unitEl.value : "", 9, 30);
    root.style.setProperty("--header-disaster-input-w-0233", `${disasterCh}em`);
    root.style.setProperty("--header-unit-input-w-0233", `${unitCh}em`);
  }

  function applyHeaderScaleLayout0233() {
    const root = document.documentElement;
    const titleBar = document.getElementById("titleBar");
    const titleMain = document.querySelector(".titleMain");
    const headerDataWrap = document.getElementById("headerDataWrap");
    if (!titleBar || !titleMain || !headerDataWrap) return;

    titleBar.classList.remove("headerCompact0231", "headerCompact0232");

    // いったん原寸で必要幅を計測する。
    root.style.setProperty("--header-scale-0233", "1");
    headerDataWrap.style.transform = "scale(1)";

    const barWidth = Math.floor(titleBar.clientWidth || window.innerWidth || 0);
    const titleRect = titleMain.getBoundingClientRect();
    const titleWidth = Math.ceil(titleRect.width || 330);
    const titleGap = parseFloat(getComputedStyle(titleBar).columnGap || getComputedStyle(titleBar).gap || "14") || 14;
    const dataWidth = Math.ceil(headerDataWrap.scrollWidth || headerDataWrap.getBoundingClientRect().width || 0);
    const safeMargin = 18;
    const available = Math.max(180, barWidth - titleWidth - titleGap - safeMargin);
    const scale = Math.max(0.42, Math.min(1, available / Math.max(1, dataWidth)));

    root.style.setProperty("--header-scale-0233", String(scale));
    updateTitleBarHeightForHeader();
  }

  function updateFixedHeaderDiagnostic() {
    const body = document.getElementById("fixedHeaderDiagnosticBody");
    if (!body) return;
    const titleBar = document.getElementById("titleBar");
    const titleMain = document.querySelector(".titleMain");
    const headerDataWrap = document.getElementById("headerDataWrap");
    const disasterEl = document.getElementById("disasterName");
    const unitEl = document.getElementById("createdUnit");
    const scaleText = getComputedStyle(document.documentElement).getPropertyValue("--header-scale-0233").trim() || "1";
    const scale = Number(scaleText) || 1;
    const line = (name, el) => {
      if (!el) return `${name}：取得不可`;
      return `${name}：表示幅 ${Math.round(el.getBoundingClientRect().width)}px / 内容幅 ${Math.round(el.scrollWidth)}px / 文字数 ${(el.value || el.textContent || "").length}`;
    };
    const barWidth = titleBar ? Math.round(titleBar.clientWidth) : 0;
    const titleWidth = titleMain ? Math.round(titleMain.getBoundingClientRect().width) : 0;
    const dataRawWidth = headerDataWrap ? Math.round(headerDataWrap.scrollWidth) : 0;
    const dataScaledWidth = Math.round(dataRawWidth * scale);
    body.innerHTML = [
      `Build：023.4 指揮本部ヘッダー左寄せ・座標表示最終調整`,
      `画面幅：${window.innerWidth}px`,
      `タイトルバー表示幅：${barWidth}px`,
      `タイトル幅：${titleWidth}px`,
      `ヘッダー情報原寸幅：${dataRawWidth}px`,
      `ヘッダー情報縮小後幅：${dataScaledWidth}px`,
      `縮小率：${Math.round(scale * 100)}%`,
      `表示モード：1段固定`,
      line("年月日", headerDateTime),
      line("災害名", disasterEl),
      line("作成部隊", unitEl),
      line("座標・グリッド", headerDataWrap),
      `座標形式：${coordinateType === "dms" ? "60進法" : "10進法"}`,
      `座標欄：ラベル余白最小・数値右揃え`,
      `ヘッダー配置：左寄せ`,
      `グリッド線色：${gridLineSettings.color}`
    ].join("<br>");
  }

  function adjustHeaderFieldsNoWrap() {
    [headerDateTime, document.getElementById("disasterName"), document.getElementById("createdUnit")].forEach(fitHeaderInputWidth);
    setHeaderAdaptiveInputWidths0233();
    window.requestAnimationFrame(() => {
      applyHeaderScaleLayout0233();
      updateFixedHeaderDiagnostic();
    });
  }

  [document.getElementById("disasterName"), document.getElementById("createdUnit")].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", adjustHeaderFieldsNoWrap);
    el.addEventListener("change", adjustHeaderFieldsNoWrap);
  });
  window.addEventListener("resize", adjustHeaderFieldsNoWrap);
  window.addEventListener("orientationchange", adjustHeaderFieldsNoWrap);
  window.setTimeout(adjustHeaderFieldsNoWrap, 0);
  window.setTimeout(adjustHeaderFieldsNoWrap, 250);
  window.setTimeout(adjustHeaderFieldsNoWrap, 1000);

  console.log("固定表示モード：G-Link Standard Version1.6 Build018");
  console.log(session);
 
});
