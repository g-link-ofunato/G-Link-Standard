window.addEventListener("DOMContentLoaded", () => {
 
  const mapLayers = {
    pale: {
      url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
      maxZoom: 18
    },
    std: {
      url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
      maxZoom: 18
    },
    photo: {
      url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
      maxZoom: 18
    },
    relief: {
      url: "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png",
      maxZoom: 15
    },
    hillshade: {
      url: "https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png",
      maxZoom: 16
    }
  };
 
  const map = L.map("map", {
    zoomControl: false
  }).setView([35.6749, 139.7509], 13);
 
  let currentBaseLayer = null;
  let searchMarker = null;
 
  function setBaseMap(type) {
    const layerInfo = mapLayers[type] || mapLayers.pale;
 
    if (currentBaseLayer) {
      map.removeLayer(currentBaseLayer);
    }
 
    currentBaseLayer = L.tileLayer(layerInfo.url, {
      maxZoom: layerInfo.maxZoom,
      minZoom: 2,
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    }).addTo(map);
 
    currentBaseLayer.bringToBack();
  }
 
  const settings = {
    scale: null,
    paper: "A3",
    orientation: "landscape",
    grid: 0,
    mapType: "pale"
  };
 
  let session = {
    locked: false,
    bounds: null,
    center: null,
    zoom: null,
    scale: null,
    scaleLabel: null,
    paper: null,
    orientation: null,
    gridSize: null,
    mapType: null,
    gridCache: null
  };
 
 
 
  const HEADER_STORAGE_KEY = "gLink_header";
 
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
 
  function saveSharedHeader(header) {
    const current = loadSharedHeader();
    const next = {
      ...current,
      ...header,
      updatedAt: new Date().toISOString()
    };
    sessionStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(next));
    return next;
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
      const lat = parseSingleCoordinate(`${numbers[0]}度${numbers[1]}分${numbers[2]}秒`, "lat");
      const lng = parseSingleCoordinate(`${numbers[3]}度${numbers[4]}分${numbers[5]}秒`, "lng");
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
 
    return null;
  }
 
  const frame = document.getElementById("printFrame");
  const currentScale = document.getElementById("currentScale");
 
  const paper = document.getElementById("paper");
  const orientation = document.getElementById("orientation");
  const grid = document.getElementById("grid");
  const mapType = document.getElementById("mapType");
 
  const searchBox = document.getElementById("searchBox");
  const searchBtn = document.getElementById("searchBtn");
  const commitBtn = document.getElementById("commitSessionBtn");
  const toolbar = document.getElementById("toolbar");
  const diagnosticBody = document.getElementById("areaDiagnosticBody");
 
  let gridLayer = null;
  let lastSearchMode = "住所・名称検索のみ";
  let lastSearchKeyword = "";
  let lastSearchResult = "未実行";

  function updateLayoutMetrics() {
    const toolbarHeight = toolbar ? Math.ceil(toolbar.getBoundingClientRect().height) : 82;
    document.documentElement.style.setProperty("--toolbar-height", toolbarHeight + "px");

    window.requestAnimationFrame(() => {
      map.invalidateSize(false);
      updatePrintFrame();
      updateDiagnostic();
    });
  }

  function updateDiagnostic() {
    if (!diagnosticBody) return;

    const toolbarHeight = toolbar ? Math.round(toolbar.getBoundingClientRect().height) : 0;
    const mapRect = map.getContainer().getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    diagnosticBody.innerHTML = [
      `サイズ選択：${paper ? paper.options[paper.selectedIndex]?.textContent + "（" + paper.value + "）" : "取得不可"}`,
      `赤枠内部サイズ：${frame ? (frame.dataset.paper || "未設定") + " / " + (frame.dataset.orientation || "未設定") : "取得不可"}`,
      `グリッド選択：${grid ? grid.value : "取得不可"}m`,
      `検索モード：${lastSearchMode}`,
      `検索語：${lastSearchKeyword || "未入力"}`,
      `検索結果：${lastSearchResult}`,
      `画面：${window.innerWidth} × ${window.innerHeight}px`,
      `ツールバー高さ：${toolbarHeight}px`,
      `地図領域：${Math.round(mapRect.width)} × ${Math.round(mapRect.height)}px`,
      `赤枠：${Math.round(frameRect.width)} × ${Math.round(frameRect.height)}px`
    ].join("<br>");
  }
 
  function roundScaleDenominator(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
 
    if (value < 10000) {
      return Math.round(value / 100) * 100;
    }
 
    if (value < 100000) {
      return Math.round(value / 1000) * 1000;
    }
 
    return Math.round(value / 10000) * 10000;
  }
 
  function calculateCurrentScale() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const latitudeRadians = center.lat * Math.PI / 180;
 
    const metersPerPixel =
      156543.03392 * Math.cos(latitudeRadians) / Math.pow(2, zoom);
 
    const assumedDpi = 96;
    const denominator = metersPerPixel * assumedDpi / 0.0254;
 
    return roundScaleDenominator(denominator);
  }
 
  function formatScaleLabel(denominator) {
    if (!denominator) {
      return "縮尺：約1/-";
    }
 
    return "縮尺：約1/" + denominator.toLocaleString("ja-JP");
  }
 
  function updateScaleDisplay() {
    const denominator = calculateCurrentScale();
    settings.scale = denominator;
 
    if (currentScale) {
      currentScale.textContent = formatScaleLabel(denominator);
    }
  }
 
  function updatePrintFrame() {
    const paperSize = {
      A0: { w: 1189, h: 841 },
      A1: { w: 841, h: 594 },
      A2: { w: 594, h: 420 },
      A3: { w: 420, h: 297 },
      A4: { w: 297, h: 210 }
    };

    const selectedPaper = paperSize[settings.paper] || paperSize.A3;
    let paperWidth = selectedPaper.w;
    let paperHeight = selectedPaper.h;

    if (settings.orientation === "portrait") {
      [paperWidth, paperHeight] = [paperHeight, paperWidth];
    }

    const mapRect = map.getContainer().getBoundingClientRect();
    const maxWidth = Math.max(180, mapRect.width * 0.9);
    const maxHeight = Math.max(140, mapRect.height * 0.86);
    const fitRatio = Math.min(maxWidth / paperWidth, maxHeight / paperHeight);

    const width = Math.round(paperWidth * fitRatio);
    const height = Math.round(paperHeight * fitRatio);

    frame.style.setProperty("--print-frame-width", width + "px");
    frame.style.setProperty("--print-frame-height", height + "px");
    frame.style.width = width + "px";
    frame.style.height = height + "px";
    frame.dataset.paper = settings.paper;
    frame.dataset.orientation = settings.orientation;

    updateDiagnostic();
  }
 
 
  async function searchLocation() {
    const keyword = searchBox.value.trim();
    lastSearchMode = "住所・名称検索のみ";
    lastSearchKeyword = keyword;
    lastSearchResult = "検索開始";
    updateDiagnostic();
 
    if (!keyword) {
      lastSearchResult = "未入力";
      updateDiagnostic();
      alert("検索する地名・施設名・住所を入力してください。");
      return;
    }
 
    try {
      const url =
        "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" +
        encodeURIComponent(keyword);
 
      const response = await fetch(url);
      const results = await response.json();
 
      if (!results || results.length === 0) {
        lastSearchResult = "該当なし";
        updateDiagnostic();
        alert("検索結果が見つかりませんでした。");
        return;
      }
 
      const result = results[0];
      const lng = result.geometry.coordinates[0];
      const lat = result.geometry.coordinates[1];
 
      map.setView([lat, lng], 15);
 
      if (searchMarker) {
        map.removeLayer(searchMarker);
      }
 
      searchMarker = L.marker([lat, lng]).addTo(map);
      searchMarker.bindPopup(result.properties.title || keyword).openPopup();

      lastSearchResult = result.properties.title || "検索成功";
      updateDiagnostic();
 
    } catch (error) {
      lastSearchResult = "エラー";
      updateDiagnostic();
      alert("検索中にエラーが発生しました。");
      console.error(error);
    }
  }
 
  searchBtn.addEventListener("click", searchLocation);
 
  searchBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchLocation();
    }
  });
 
  commitBtn.addEventListener("click", () => {
 
    updateScaleDisplay();
 
    const rect = frame.getBoundingClientRect();
    const mapRect = map.getContainer().getBoundingClientRect();
 
    const left = rect.left - mapRect.left;
    const top = rect.top - mapRect.top;
    const right = left + rect.width;
    const bottom = top + rect.height;
 
    const southWest = map.containerPointToLatLng([left, bottom]);
    const northEast = map.containerPointToLatLng([right, top]);
 
    session.bounds = L.latLngBounds(southWest, northEast);
 
    session.center = session.bounds.getCenter();
    session.zoom = map.getZoom();
 
    session.frameWidth = frame.offsetWidth;
    session.frameHeight = frame.offsetHeight;
 
    session.scale = settings.scale;
    session.scaleLabel = formatScaleLabel(settings.scale);
    session.paper = paper.value;
    session.orientation = orientation.value;
    session.gridSize = parseInt(grid.value, 10);
    session.mapType = mapType.value;
 
    session.locked = true;
    session.gridCache = generateGridCache();
    session.header = saveSharedHeader(loadSharedHeader());
 
    const result = confirm("災害エリアを確定しますか？");
 
    if (!result) {
      return;
    }
 
    const disasterSessionJson = JSON.stringify(session);
    sessionStorage.setItem("disasterSession", disasterSessionJson);
    // Build021 Web公開対応：
    // Cloudflare Pages等で fixed.html を新しいタブで開く場合、
    // ブラウザによって sessionStorage が新規タブへ引き継がれないことがある。
    // その対策として localStorage にも同じ作業状態を退避し、
    // fixed.html 側で fallback 復元できるようにする。
    try {
      localStorage.setItem("disasterSession", disasterSessionJson);
      localStorage.setItem("glinkLastSessionSavedAt", new Date().toISOString());
    } catch (error) {
      console.warn("G-Link作業状態のバックアップ保存に失敗しました。", error);
    }
 
    window.open("fixed.html", "_blank");
 
  });
 
  function generateGridCache() {
    if (session.gridSize === 0) {
      return [];
    }
 
    const meterPerLat = 111320;
    const baseLat = map.getCenter().lat;
 
    const latStep = session.gridSize / meterPerLat;
    const lngStep =
      session.gridSize /
      (111320 * Math.cos(baseLat * Math.PI / 180));
 
    const b = map.getBounds();
    const lines = [];
 
    const startLng =
      Math.floor(b.getWest() / lngStep) * lngStep;
 
    const startLat =
      Math.floor(b.getSouth() / latStep) * latStep;
 
    for (let lng = startLng; lng <= b.getEast(); lng += lngStep) {
      lines.push({
        coords: [
          [b.getSouth(), lng],
          [b.getNorth(), lng]
        ]
      });
    }
 
    for (let lat = startLat; lat <= b.getNorth(); lat += latStep) {
      lines.push({
        coords: [
          [lat, b.getWest()],
          [lat, b.getEast()]
        ]
      });
    }
 
    return lines;
  }
 
  function updateGrid() {
    if (settings.grid === 0) {
      if (gridLayer) {
        map.removeLayer(gridLayer);
      }
 
      gridLayer = null;
      return;
    }
 
    const meterPerLat = 111320;
    const baseLat = map.getCenter().lat;
 
    const latStep = settings.grid / meterPerLat;
    const lngStep =
      settings.grid /
      (111320 * Math.cos(baseLat * Math.PI / 180));
 
    if (gridLayer) {
      map.removeLayer(gridLayer);
    }
 
    gridLayer = L.layerGroup().addTo(map);
 
    const b = map.getBounds();
 
    const startLng =
      Math.floor(b.getWest() / lngStep) * lngStep;
 
    const startLat =
      Math.floor(b.getSouth() / latStep) * latStep;
 
    for (let lng = startLng; lng <= b.getEast(); lng += lngStep) {
      gridLayer.addLayer(
        L.polyline(
          [[b.getSouth(), lng], [b.getNorth(), lng]],
          {
            color: "#888",
            weight: 1,
            opacity: 0.5,
            interactive: false
          }
        )
      );
    }
 
    for (let lat = startLat; lat <= b.getNorth(); lat += latStep) {
      gridLayer.addLayer(
        L.polyline(
          [[lat, b.getWest()], [lat, b.getEast()]],
          {
            color: "#888",
            weight: 1,
            opacity: 0.5,
            interactive: false
          }
        )
      );
    }
  }
 
  function sync() {
    settings.paper = paper.value;
    settings.orientation = orientation.value;
    settings.grid = parseInt(grid.value, 10);
    settings.mapType = mapType.value;
 
    setBaseMap(settings.mapType);
    updateScaleDisplay();
    updatePrintFrame();
    updateGrid();
    updateDiagnostic();
  }
 
  paper.addEventListener("change", sync);
  orientation.addEventListener("change", sync);
  grid.addEventListener("change", sync);
  mapType.addEventListener("change", sync);

  if (window.ResizeObserver && toolbar) {
    const toolbarObserver = new ResizeObserver(updateLayoutMetrics);
    toolbarObserver.observe(toolbar);
  }

  window.addEventListener("resize", updateLayoutMetrics);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(updateLayoutMetrics, 250);
  });
 
  map.on("moveend zoomend", () => {
    updateScaleDisplay();
    updateGrid();
    updateDiagnostic();
  });
 
  setBaseMap(settings.mapType);
  updateLayoutMetrics();
  updateScaleDisplay();
  updatePrintFrame();
  updateGrid();
  updateDiagnostic();
 
});
