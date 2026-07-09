window.addEventListener("DOMContentLoaded", async () => {
  const viewerError = document.getElementById("viewerError");
  const mapEl = document.getElementById("viewerMap");
  const viewerSearchToggleBtn = document.getElementById("viewerSearchToggleBtn");
  const viewerInfoToggleBtn = document.getElementById("viewerInfoToggleBtn");
  const viewerSearchPanel = document.getElementById("viewerSearchPanel");
  const viewerInfoPanel = document.getElementById("viewerInfoPanel");

  const mapLayers = {
    pale: { url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", maxZoom: 18 },
    std: { url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", maxZoom: 18 },
    photo: { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", maxZoom: 18 },
    relief: { url: "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png", maxZoom: 15 },
    hillshade: { url: "https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png", maxZoom: 16 }
  };

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

  const viewerDiag = {
    steps: [],
    error: ""
  };

  function diag(label, ok = true, detail = "") {
    const mark = ok ? "✓" : "✕";
    const line = `${mark} ${label}${detail ? "：" + detail : ""}`;
    viewerDiag.steps.push(line);
    try { console.log(`[G-Link Viewer] ${line}`); } catch (_) {}
    const logEl = document.getElementById("viewerDiagnosticLog");
    if (logEl) logEl.textContent = viewerDiag.steps.join("\n");
  }

  function showError(message = "指揮本部モードの共有パネルから発行されたViewer用URLを開いてください。") {
    if (viewerError) viewerError.hidden = false;
    const messageEl = document.getElementById("viewerErrorMessage");
    if (messageEl) messageEl.textContent = message;
    const logEl = document.getElementById("viewerDiagnosticLog");
    if (logEl) logEl.textContent = viewerDiag.steps.join("\n") || "診断情報はありません。";
    if (mapEl) mapEl.style.display = "none";
  }

  function hideError() {
    if (viewerError) viewerError.hidden = true;
    if (mapEl) mapEl.style.display = "block";
  }

  function showSuccessDiagnostic() {
    let box = document.getElementById("viewerSuccessDiagnostic");
    if (!box) {
      box = document.createElement("details");
      box.id = "viewerSuccessDiagnostic";
      box.className = "viewerDiagnosticSuccess";
      box.innerHTML = `<summary>Viewer読込成功</summary><pre id="viewerSuccessDiagnosticLog"></pre>`;
      document.body.appendChild(box);
    }
    const log = document.getElementById("viewerSuccessDiagnosticLog");
    if (log) log.textContent = viewerDiag.steps.join("\n");
  }



  function isPanelOpen(panel) {
    return !!panel && panel.hidden === false;
  }

  function updatePanelButtonState(button, panel) {
    if (!button || !panel) return;
    const open = isPanelOpen(panel);
    button.classList.toggle("is-active", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setPanelOpen(panel, button, open, map = null) {
    if (!panel) return;
    panel.hidden = !open;
    if (open && !panel.dataset.panelState) panel.dataset.panelState = "normal";
    updatePanelButtonState(button, panel);
    setTimeout(() => { if (map && typeof map.invalidateSize === "function") map.invalidateSize(); }, 80);
  }

  function closeViewerPanel(panelId, map = null) {
    if (panelId === "viewerSearchPanel") setPanelOpen(viewerSearchPanel, viewerSearchToggleBtn, false, map);
    if (panelId === "viewerInfoPanel") setPanelOpen(viewerInfoPanel, viewerInfoToggleBtn, false, map);
  }

  function setupViewerPanels(map) {
    setPanelOpen(viewerSearchPanel, viewerSearchToggleBtn, false, map);
    setPanelOpen(viewerInfoPanel, viewerInfoToggleBtn, false, map);

    if (viewerSearchToggleBtn) {
      viewerSearchToggleBtn.addEventListener("click", () => {
        setPanelOpen(viewerSearchPanel, viewerSearchToggleBtn, !isPanelOpen(viewerSearchPanel), map);
      });
    }
    if (viewerInfoToggleBtn) {
      viewerInfoToggleBtn.addEventListener("click", () => {
        setPanelOpen(viewerInfoPanel, viewerInfoToggleBtn, !isPanelOpen(viewerInfoPanel), map);
      });
    }

    document.querySelectorAll(".viewerPanelBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.panelTarget;
        const action = btn.dataset.panelAction;
        const panel = document.getElementById(targetId);
        if (!panel) return;
        if (action === "close") {
          closeViewerPanel(targetId, map);
          return;
        }
        if (action === "min") {
          panel.dataset.panelState = panel.dataset.panelState === "min" ? "normal" : "min";
        } else if (action === "max") {
          panel.dataset.panelState = panel.dataset.panelState === "max" ? "normal" : "max";
        }
        setTimeout(() => { if (map && typeof map.invalidateSize === "function") map.invalidateSize(); }, 80);
      });
    });

    window.addEventListener("resize", () => {
      if (map && typeof map.invalidateSize === "function") map.invalidateSize();
    });

    diag("Viewerパネル制御", true, "検索/情報ボタン・拡大縮小・閉じるを初期化");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeShareText(value) {
    return String(value || "").trim().replace(/\s+/g, "");
  }

  function base64UrlToBase64(value) {
    const cleaned = normalizeShareText(value).replace(/-/g, "+").replace(/_/g, "/");
    const mod = cleaned.length % 4;
    if (mod === 1) throw new Error(`Base64文字数が不正です（length=${cleaned.length}）。URLが途中で切れている可能性があります。`);
    return cleaned + (mod ? "=".repeat(4 - mod) : "");
  }

  function bytesFromBase64Url(encoded) {
    const base64 = base64UrlToBase64(encoded);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function utf8DecodeBytes(bytes) {
    if (typeof TextDecoder === "function") {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return decodeURIComponent(escape(binary));
  }

  function parseJsonText(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) throw new Error("復号後のテキストが空です。");
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  }

  function decodeJsonBase64Url(encoded) {
    diag("URLデータ取得", true, `${String(encoded || "").length}文字`);
    const bytes = bytesFromBase64Url(encoded);
    diag("Base64復号", true, `${bytes.length} bytes`);
    const text = utf8DecodeBytes(bytes);
    diag("UTF-8復号", true, `${text.length}文字`);
    const parsed = parseJsonText(text);
    diag("JSON解析", true, parsed && parsed.f ? `形式=${parsed.f}` : "通常形式");
    return parsed;
  }

  async function decodeCompressedJsonBase64Url(encoded) {
    diag("旧圧縮URL取得", true, `${String(encoded || "").length}文字`);
    if (typeof DecompressionStream !== "function") {
      throw new Error("このブラウザは圧縮Viewerデータの展開に対応していません。");
    }
    const bytes = bytesFromBase64Url(encoded);
    diag("旧圧縮Base64復号", true, `${bytes.length} bytes`);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const text = await new Response(stream).text();
    diag("旧圧縮データ展開", true, `${text.length}文字`);
    const parsed = parseJsonText(text);
    diag("JSON解析", true, parsed && parsed.f ? `形式=${parsed.f}` : "通常形式");
    return parsed;
  }

  function getShareValueFromLocation() {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    diag("Viewer起動URL", true, `hash=${hash.length}文字 / search=${search.length}文字`);

    function pick(raw, keys) {
      if (!raw) return null;
      const body = raw.startsWith("#") || raw.startsWith("?") ? raw.slice(1) : raw;
      for (const key of keys) {
        const prefix = key + "=";
        if (body.startsWith(prefix)) return { key, value: body.slice(prefix.length) };
        const marker = "&" + prefix;
        const idx = body.indexOf(marker);
        if (idx >= 0) return { key, value: body.slice(idx + marker.length).split("&")[0] };
      }
      try {
        const params = new URLSearchParams(body);
        for (const key of keys) {
          const value = params.get(key);
          if (value) return { key, value };
        }
      } catch (error) {
        diag("URLSearchParams解析", false, error.message);
      }
      return null;
    }

    const found = pick(hash, ["data", "z", "share"]) || pick(search, ["data", "z", "share"]);
    if (!found) return null;
    let value = found.value || "";
    try {
      const decoded = decodeURIComponent(value);
      if (decoded && decoded.length >= value.length * 0.9) value = decoded;
    } catch (_) {
      // すでにURL安全文字のみの場合は何もしない。
    }
    value = normalizeShareText(value);
    diag("共有パラメータ検出", true, `${found.key} / ${value.length}文字`);
    return { key: found.key, value };
  }

  function expandPoint(value) {
    if (!Array.isArray(value) || value.length < 2) return null;
    const lat = Number(value[0]);
    const lng = Number(value[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  function expandBounds(value) {
    if (!Array.isArray(value) || value.length < 2) return null;
    const sw = expandPoint(value[0]);
    const ne = expandPoint(value[1]);
    return sw && ne ? { southWest: sw, northEast: ne } : null;
  }

  function expandPin(value) {
    if (!Array.isArray(value)) return null;
    return {
      type: value[0] || "fire",
      lat: Number(value[1]),
      lng: Number(value[2]),
      completed: value[3] === 1,
      number: value[4] || "",
      pinNo: value[4] || "",
      gridNo: value[5] || "",
      awarenessLabel: value[6] || "",
      completedLabel: value[7] || "",
      incidentNo: value[8] || "",
      summary: value[9] || "",
      units: value[10] || "",
      injured: value[11] ?? 0
    };
  }

  function expandDrawing(item) {
    if (!item) return null;
    const meta = item.m || {};
    return {
      meta: {
        type: meta.t || "polyline",
        color: meta.c || "#e60000",
        weight: meta.w || 4,
        opacity: meta.o ?? 1,
        style: meta.s || "solid",
        fillMode: meta.f || "none"
      },
      latlngs: item.l || null,
      circleCenter: expandPoint(item.cc),
      radius: item.r || null,
      arrowStart: expandPoint(item.as),
      arrowEnd: expandPoint(item.ae)
    };
  }

  function expandMeasurement(item) {
    if (!item) return null;
    return {
      name: item.n || "名称未設定",
      type: item.t || "polygon",
      style: item.s || {},
      points: Array.isArray(item.p) ? item.p.map(expandPoint).filter(Boolean) : [],
      areaM2: item.a || 0,
      areaHa: item.h || 0,
      gridRange: item.g || null
    };
  }

  function expandHistory(value) {
    if (!Array.isArray(value)) return null;
    return {
      pinNo: value[0] || "",
      number: value[0] || "",
      type: value[1] || "fire",
      gridNo: value[2] || "",
      lat: typeof value[3] === "number" ? value[3] : null,
      lng: typeof value[4] === "number" ? value[4] : null,
      awarenessLabel: value[5] || "",
      completedLabel: value[6] || "",
      incidentNo: value[7] || "",
      summary: value[8] || "",
      units: value[9] || "",
      injured: value[10] ?? 0
    };
  }

  function expandTrack(value) {
    if (!Array.isArray(value)) return null;
    const points = (value[4] || []).map(expandPoint).filter(Boolean);
    if (points.length < 2) return null;
    return { name: value[0] || "GPX軌跡", color: value[1] || "#facc15", weight: Number(value[2] || 5), opacity: Number(value[3] ?? 1), points };
  }

  function expandCompactViewerData(data) {
    if (!data || data.f !== "gv2") return data;
    const bounds = expandBounds(data.s?.[0]);
    const center = expandPoint(data.s?.[1]);
    return {
      appName: "G-Link Standard",
      format: "glink-viewer",
      version: data.v || "1.6",
      build: data.b || "Build022.3",
      viewerMode: true,
      sharedAt: data.t || "",
      notice: data.n || "無料版Viewerは閲覧専用です。リアルタイム同期は行いません。",
      coordinateType: data.c || "dms",
      header: {
        dateTime: data.h?.[0] || "",
        disasterName: data.h?.[1] || "",
        createdUnit: data.h?.[2] || ""
      },
      session: {
        bounds,
        center,
        zoom: data.s?.[2] || 13,
        mapType: data.s?.[3] || "pale",
        gridSize: data.s?.[4] || 0,
        coordinateType: data.c || "dms"
      },
      mapType: data.s?.[3] || "pale",
      gridSize: data.s?.[4] || 0,
      bounds,
      gridLineSettings: data.g || {},
      pins: (data.p || []).map(expandPin).filter(Boolean),
      drawings: (data.d || []).map(expandDrawing).filter(Boolean),
      tracks: (data.x || []).map(expandTrack).filter(Boolean),
      measurements: (data.m || []).map(expandMeasurement).filter(Boolean),
      activityHistory: (data.a || []).map(expandHistory).filter(Boolean)
    };
  }

  async function decodeViewerPayload() {
    try {
      const found = getShareValueFromLocation();
      if (found && (found.key === "data" || found.key === "share")) {
        return expandCompactViewerData(decodeJsonBase64Url(found.value));
      }
      if (found && found.key === "z") {
        return expandCompactViewerData(await decodeCompressedJsonBase64Url(found.value));
      }
      diag("共有URL確認", false, "#data= / ?data= がありません。共有パネルからViewer用URLを再発行してください。");

      const lastData = localStorage.getItem("glinkViewerLastData");
      if (lastData) {
        diag("ローカル退避データ検出", true, `${lastData.length}文字`);
        const parsed = parseJsonText(lastData);
        diag("ローカル退避データ解析", true, parsed && parsed.f ? `形式=${parsed.f}` : "通常形式");
        return expandCompactViewerData(parsed);
      }
      return null;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      diag("読込処理", false, message);
      viewerDiag.error = message;
      console.warn("Viewer用データを読み込めませんでした。", error);
      return null;
    }
  }

  function latLngFromPlain(point) {
    if (!point || typeof point.lat !== "number" || typeof point.lng !== "number") return null;
    return L.latLng(point.lat, point.lng);
  }

  function boundsFromData(data) {
    const bounds = data.bounds || data.session?.bounds;
    if (!bounds || !bounds.southWest || !bounds.northEast) return null;
    const sw = latLngFromPlain(bounds.southWest);
    const ne = latLngFromPlain(bounds.northEast);
    return sw && ne ? L.latLngBounds(sw, ne) : null;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function normalizePinType(type) {
    return pinLabels[type] ? type : "fire";
  }

  function createPinIcon(type, completed, number) {
    const color = completed ? pinColors.completed : (pinColors[normalizePinType(type)] || pinColors.fire);
    const label = String(number || "");
    const fontSize = label.length >= 3 ? 9 : (label.length >= 2 ? 10 : 12);
    return L.divIcon({
      className: "numberedPinIcon",
      html: `<div class="numberedPinMarker" style="background:${color};font-size:${fontSize}px;"><span>${escapeHtml(label)}</span></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14]
    });
  }

  function formatLatLng(data) {
    if (typeof data?.lat !== "number" || typeof data?.lng !== "number") return "-";
    return `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`;
  }

  function pinPopup(data, number) {
    const type = pinLabels[normalizePinType(data.type)] || "火災";
    const attachment = data.attachmentDataUrl ? `<br><img src="${data.attachmentDataUrl}" style="width:180px;max-width:100%;margin-top:6px;border-radius:4px;">` : "";
    return `
      <b>№${escapeHtml(number)} ${escapeHtml(type)}</b><br>
      ${data.completed ? "【活動完了】<br>" : ""}
      覚知日時：${escapeHtml(data.awarenessLabel || "-")}<br>
      完了日時：${escapeHtml(data.completedLabel || "-")}<br>
      座標：${escapeHtml(formatLatLng(data))}<br>
      グリッド番号：${escapeHtml(data.gridNo || "-")}<br>
      災害番号：${escapeHtml(data.incidentNo || "-")}<br>
      概要：${escapeHtml(data.summary || "-")}<br>
      出動部隊：${escapeHtml(data.units || "-")}<br>
      傷病者人数：${escapeHtml(data.injured || 0)}
      ${attachment}
    `;
  }

  function dashArrayFromStyle(style) {
    if (style === "dash") return "8 6";
    if (style === "dot") return "2 7";
    return null;
  }

  function styleOptions(meta = {}) {
    const color = meta.color || "#e60000";
    return {
      color,
      weight: Number(meta.weight || 4),
      opacity: Number(meta.opacity ?? 1),
      dashArray: dashArrayFromStyle(meta.style),
      fill: meta.fillMode === "semi",
      fillColor: color,
      fillOpacity: meta.fillMode === "semi" ? 0.25 : 0
    };
  }

  function toLatLngList(value) {
    if (!Array.isArray(value)) return [];
    if (Array.isArray(value[0])) return value[0].map(latLngFromPlain).filter(Boolean);
    return value.map(latLngFromPlain).filter(Boolean);
  }

  function addArrowHead(map, layerGroup, start, end, color) {
    const p1 = map.latLngToLayerPoint(start);
    const p2 = map.latLngToLayerPoint(end);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const len = 18;
    const spread = Math.PI / 7;
    const left = L.point(p2.x - len * Math.cos(angle - spread), p2.y - len * Math.sin(angle - spread));
    const right = L.point(p2.x - len * Math.cos(angle + spread), p2.y - len * Math.sin(angle + spread));
    const head = L.polygon([
      end,
      map.layerPointToLatLng(left),
      map.layerPointToLatLng(right)
    ], { color, weight: 1, fillColor: color, fillOpacity: 1 });
    layerGroup.addLayer(head);
  }


  function renderTracks(map, data) {
    const group = L.layerGroup().addTo(map);
    (data.tracks || []).forEach(item => {
      const points = (item.points || []).map(latLngFromPlain).filter(Boolean);
      if (points.length < 2) return;
      const layer = L.polyline(points, {
        color: item.color || "#facc15",
        weight: Number(item.weight || 5),
        opacity: Number(item.opacity ?? 1)
      });
      layer.bindPopup(`軌跡：${escapeHtml(item.name || "GPX軌跡")}`);
      group.addLayer(layer);
    });
  }

  function renderDrawings(map, data) {
    const group = L.layerGroup().addTo(map);
    (data.drawings || []).forEach(item => {
      const meta = item.meta || {};
      const opt = styleOptions(meta);
      let layer = null;
      if (meta.type === "circle" && item.circleCenter && item.radius) {
        layer = L.circle(latLngFromPlain(item.circleCenter), { ...opt, radius: item.radius });
      } else if (meta.type === "arrow" && item.arrowStart && item.arrowEnd) {
        const start = latLngFromPlain(item.arrowStart);
        const end = latLngFromPlain(item.arrowEnd);
        if (start && end) {
          const arrowGroup = L.layerGroup();
          arrowGroup.addLayer(L.polyline([start, end], opt));
          arrowGroup.addTo(group);
          setTimeout(() => addArrowHead(map, arrowGroup, start, end, opt.color), 0);
        }
        return;
      } else {
        const points = toLatLngList(item.latlngs);
        if (points.length < 2) return;
        if (meta.type === "polygon" || meta.type === "rectangle") layer = L.polygon(points, opt);
        else layer = L.polyline(points, opt);
      }
      if (layer) group.addLayer(layer);
    });
  }

  function renderMeasurements(map, data) {
    const group = L.layerGroup().addTo(map);
    (data.measurements || []).forEach(item => {
      const points = (item.points || []).map(latLngFromPlain).filter(Boolean);
      if (points.length < 3) return;
      const style = item.style || {};
      const layer = L.polygon(points, {
        color: style.lineColor || style.color || "#7e22ce",
        weight: Number(style.weight || 3),
        opacity: 1,
        fillColor: style.fillColor || "#a855f7",
        fillOpacity: Number(style.opacity ?? 0.35)
      });
      layer.bindPopup(`計測図形：${escapeHtml(item.name || "名称未設定")}<br>面積：${Number(item.areaM2 || 0).toLocaleString()}㎡ / ${Number(item.areaHa || 0).toFixed(3)}ha`);
      group.addLayer(layer);
    });
  }

  function renderGrid(map, bounds, gridSize, settings = {}) {
    const size = Number(gridSize || 0);
    if (!bounds || !size) return;

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const centerLat = (sw.lat + ne.lat) / 2;
    const latStep = size / 111320;
    const lngStep = size / (111320 * Math.cos(centerLat * Math.PI / 180));
    const color = settings.color || "#888888";
    const weight = Number(settings.weight || 1);
    const opacity = Number(settings.opacity ?? 0.5);
    const gridGroup = L.layerGroup().addTo(map);

    for (let lng = sw.lng; lng <= ne.lng + lngStep / 2; lng += lngStep) {
      gridGroup.addLayer(L.polyline([[sw.lat, lng], [ne.lat, lng]], { color, weight, opacity, interactive: false }));
    }
    for (let lat = sw.lat; lat <= ne.lat + latStep / 2; lat += latStep) {
      gridGroup.addLayer(L.polyline([[lat, sw.lng], [lat, ne.lng]], { color, weight, opacity, interactive: false }));
    }
  }

  function renderLegend(data) {
    const legend = document.getElementById("viewerLegend");
    if (!legend) return;
    const rows = [
      [pinColors.fire, "火災"],
      [pinColors.rescue, "救助"],
      [pinColors.emergency, "救急"],
      [pinColors.completed, "活動完了"]
    ];
    legend.innerHTML = `<strong>凡例</strong>${rows.map(([color, label]) => `<div class="legendRow"><span class="legendDot" style="background:${color}"></span>${escapeHtml(label)}</div>`).join("")}`;
  }

  function renderHeaderInfo(data) {
    const header = data.header || {};
    const gridSize = data.gridSize || data.session?.gridSize || 0;
    document.getElementById("viewerDate").textContent = header.dateTime || "-";
    document.getElementById("viewerDisaster").textContent = header.disasterName || "-";
    document.getElementById("viewerUnit").textContent = header.createdUnit || "-";
    document.getElementById("viewerGridSize").textContent = gridSize ? `${gridSize}m` : "なし";
    document.getElementById("viewerSharedAt").textContent = formatDateTime(data.sharedAt || data.savedAt);
  }


  function renderSummary(data) {
    const box = document.getElementById("viewerSummary");
    if (!box) return;
    const pins = Array.isArray(data.pins) ? data.pins : [];
    const histories = Array.isArray(data.activityHistory) ? data.activityHistory : [];
    const measurements = Array.isArray(data.measurements) ? data.measurements : [];
    const completed = pins.filter(pin => pin.completed).length;
    box.innerHTML = `
      <div class="summaryBox"><span class="summaryNumber">${pins.length}</span><span class="summaryLabel">ピン</span></div>
      <div class="summaryBox"><span class="summaryNumber">${completed}</span><span class="summaryLabel">完了</span></div>
      <div class="summaryBox"><span class="summaryNumber">${histories.length}</span><span class="summaryLabel">活動履歴</span></div>
      <div class="summaryBox"><span class="summaryNumber">${measurements.length}</span><span class="summaryLabel">計測図形</span></div>
      <div class="summaryBox"><span class="summaryNumber">${escapeHtml(data.session?.zoom || "-")}</span><span class="summaryLabel">ズーム</span></div>
      <div class="summaryBox"><span class="summaryNumber">${escapeHtml(data.session?.mapType || data.mapType || "-")}</span><span class="summaryLabel">地図種類</span></div>
    `;
  }

  function renderPinsInfo(data) {
    const box = document.getElementById("viewerPins");
    if (!box) return;
    const rows = Array.isArray(data.pins) ? data.pins : [];
    if (!rows.length) {
      box.className = "viewerPins emptyText";
      box.textContent = "ピンはありません。";
      return;
    }
    box.className = "viewerPins";
    box.innerHTML = `<table class="pinTable"><thead><tr><th>№</th><th>種別</th><th>状態</th><th>グリッド</th><th>座標</th></tr></thead><tbody>${rows.map((pin, i) => `
      <tr>
        <td>${escapeHtml(pin.number || pin.pinNo || i + 1)}</td>
        <td>${escapeHtml(pinLabels[normalizePinType(pin.type)] || pin.type || "-")}</td>
        <td>${pin.completed ? "完了" : "活動中"}</td>
        <td>${escapeHtml(pin.gridNo || "-")}</td>
        <td class="viewerCoordinateCell">${escapeHtml(formatLatLng(pin))}</td>
      </tr>`).join("")}</tbody></table>`;
  }

  function renderHistory(data) {
    const box = document.getElementById("viewerHistory");
    const rows = Array.isArray(data.activityHistory) ? [...data.activityHistory] : [];
    rows.sort((a, b) => Number(a.awarenessTimestamp || 0) - Number(b.awarenessTimestamp || 0));
    if (!rows.length) {
      box.className = "viewerHistory emptyText";
      box.textContent = "活動履歴はありません。";
      return;
    }
    box.className = "viewerHistory";
    box.innerHTML = `<table class="historyTable"><thead><tr><th>№</th><th>種別</th><th>覚知</th><th>完了</th><th>内容</th></tr></thead><tbody>${rows.map((item, i) => `
      <tr>
        <td>${escapeHtml(item.number || item.pinNumber || i + 1)}</td>
        <td>${escapeHtml(item.typeLabel || pinLabels[item.type] || item.type || "-")}</td>
        <td>${escapeHtml(item.awarenessLabel || "-")}</td>
        <td>${escapeHtml(item.completedLabel || "-")}</td>
        <td>グリッド：${escapeHtml(item.gridNo || "-")}<br>座標：${escapeHtml(item.coordinateText || item.coords || formatLatLng(item))}<br>災害番号：${escapeHtml(item.incidentNo || "-")}<br>概要：${escapeHtml(item.summary || "-")}<br>出動部隊：${escapeHtml(item.units || "-")}</td>
      </tr>`).join("")}</tbody></table>`;
  }

  function renderMeasurementInfo(data) {
    const box = document.getElementById("viewerMeasurements");
    const rows = Array.isArray(data.measurements) ? data.measurements : [];
    if (!rows.length) {
      box.className = "viewerMeasurements emptyText";
      box.textContent = "計測図形はありません。";
      return;
    }
    box.className = "viewerMeasurements";
    box.innerHTML = `<table class="measureTable"><thead><tr><th>№</th><th>名称</th><th>面積</th></tr></thead><tbody>${rows.map((item, i) => `
      <tr><td>${escapeHtml(item.number || i + 1)}</td><td>${escapeHtml(item.name || "名称未設定")}</td><td>${Number(item.areaM2 || 0).toLocaleString()}㎡<br>${Number(item.areaHa || 0).toFixed(3)}ha</td></tr>`).join("")}</tbody></table>`;
  }


  function decimalToDmsParts(value) {
    const abs = Math.abs(Number(value));
    let degrees = Math.floor(abs);
    const minFloat = (abs - degrees) * 60;
    let minutes = Math.floor(minFloat);
    let seconds = (minFloat - minutes) * 60;
    seconds = Math.round(seconds * 100) / 100;
    if (seconds >= 60) { seconds = 0; minutes += 1; }
    if (minutes >= 60) { minutes = 0; degrees += 1; }
    return { degrees, minutes, seconds };
  }

  function formatDmsValue(value, axis) {
    if (!Number.isFinite(Number(value))) return "-";
    const parts = decimalToDmsParts(value);
    const suffix = axis === "lat" ? (Number(value) >= 0 ? "N" : "S") : (Number(value) >= 0 ? "E" : "W");
    return `${parts.degrees}°${String(parts.minutes).padStart(2, "0")}′${parts.seconds.toFixed(2).padStart(5, "0")}″${suffix}`;
  }

  function formatViewerCoordinate(latlng, data) {
    const type = data.coordinateType || data.session?.coordinateType || "dms";
    if (type === "decimal") return `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    return `${formatDmsValue(latlng.lat, "lat")}, ${formatDmsValue(latlng.lng, "lng")}`;
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

  function getViewerGridInfo(bounds, gridSize) {
    const size = Number(gridSize || 0);
    if (!bounds || !size) return null;
    const centerLat = bounds.getCenter().lat;
    const latStep = size / 111320;
    const lngStep = size / (111320 * Math.cos(centerLat * Math.PI / 180));
    return {
      latStep,
      lngStep,
      westLine: Math.floor(bounds.getWest() / lngStep) * lngStep,
      eastLine: Math.ceil(bounds.getEast() / lngStep) * lngStep,
      southLine: Math.floor(bounds.getSouth() / latStep) * latStep,
      northLine: Math.ceil(bounds.getNorth() / latStep) * latStep
    };
  }

  function getViewerGridNumber(latlng, bounds, gridSize) {
    const info = getViewerGridInfo(bounds, gridSize);
    if (!info || !latlng) return "-";
    const colCount = Math.round((info.eastLine - info.westLine) / info.lngStep);
    const rowCount = Math.round((info.northLine - info.southLine) / info.latStep);
    if (colCount <= 0 || rowCount <= 0) return "-";
    const epsilonLat = info.latStep * 1e-9;
    const epsilonLng = info.lngStep * 1e-9;
    const inLng = latlng.lng >= info.westLine - epsilonLng && latlng.lng <= info.eastLine + epsilonLng;
    const inLat = latlng.lat <= info.northLine + epsilonLat && latlng.lat >= info.southLine - epsilonLat;
    if (!inLng || !inLat) return "範囲外";
    let colIndex = Math.floor((latlng.lng - info.westLine) / info.lngStep);
    let rowIndex = Math.floor((info.northLine - latlng.lat) / info.latStep);
    colIndex = Math.min(Math.max(colIndex, 0), colCount - 1);
    rowIndex = Math.min(Math.max(rowIndex, 0), rowCount - 1);
    return `${getColumnName(colIndex)}-${rowIndex + 1}`;
  }

  function parseViewerCoordinate(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    const normalized = text
      .replace(/[，、]/g, ",")
      .replace(/[°º˚]/g, "度")
      .replace(/[′’']/g, "分")
      .replace(/[″”\"]/g, "秒")
      .replace(/北緯/g, "N")
      .replace(/南緯/g, "S")
      .replace(/東経/g, "E")
      .replace(/西経/g, "W")
      .replace(/[()（）]/g, " ")
      .trim();
    const decimals = normalized.match(/[-+]?\d+(?:\.\d+)?/g);
    if (!decimals || decimals.length < 2) return null;
    let lat = Number(decimals[0]);
    let lng = Number(decimals[1]);

    // 60進法らしい入力（度・分・秒を含む、かつ数値が4個以上）の簡易対応。
    if (/[度分秒NSEW]/i.test(normalized) && decimals.length >= 4) {
      const nums = decimals.map(Number);
      lat = nums[0] + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600;
      lng = nums[3] + (nums[4] || 0) / 60 + (nums[5] || 0) / 3600;
      if (/S|南/i.test(normalized)) lat *= -1;
      if (/W|西/i.test(normalized)) lng *= -1;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return L.latLng(lat, lng);
  }

  function setViewerSearchStatus(message, isError = false) {
    const status = document.getElementById("viewerSearchStatus");
    if (!status) return;
    status.textContent = message || "";
    status.style.color = isError ? "#b91c1c" : "#475569";
  }

  function createSearchMarker(map, latlng, html) {
    if (window.viewerSearchLayer) window.viewerSearchLayer.clearLayers();
    else window.viewerSearchLayer = L.layerGroup().addTo(map);
    const icon = L.divIcon({ className: "", html: '<div class="searchMarkerPulse"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
    const marker = L.marker(latlng, { icon }).bindPopup(html).addTo(window.viewerSearchLayer);
    marker.openPopup();
  }

  async function searchViewerAddress(map, data, bounds) {
    const input = document.getElementById("viewerAddressInput");
    const value = input ? input.value.trim() : "";
    if (!value) { setViewerSearchStatus("地名・施設名・住所を入力してください。", true); return; }
    setViewerSearchStatus("住所検索中です...");
    try {
      const url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + encodeURIComponent(value);
      const response = await fetch(url);
      if (!response.ok) throw new Error("address search failed");
      const results = await response.json();
      const first = Array.isArray(results) ? results[0] : null;
      const coordinates = first?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        setViewerSearchStatus("該当する住所が見つかりませんでした。", true);
        return;
      }
      const latlng = L.latLng(Number(coordinates[1]), Number(coordinates[0]));
      const grid = getViewerGridNumber(latlng, bounds, data.gridSize || data.session?.gridSize);
      const label = first?.properties?.title || value;
      map.setView(latlng, Math.max(map.getZoom(), 16), { animate: true });
      createSearchMarker(map, latlng, `<div class="tapPopupText"><b>住所検索</b><br>${escapeHtml(label)}<br>座標：${escapeHtml(formatViewerCoordinate(latlng, data))}<br>グリッド番号：${escapeHtml(grid)}</div>`);
      setViewerSearchStatus(`検索結果：${label} / グリッド：${grid}`);
    } catch (error) {
      console.warn("Viewer住所検索に失敗しました。", error);
      setViewerSearchStatus("住所検索に失敗しました。通信状況を確認してください。", true);
    }
  }

  function searchViewerCoordinate(map, data, bounds) {
    const input = document.getElementById("viewerCoordInput");
    const value = input ? input.value.trim() : "";
    const latlng = parseViewerCoordinate(value);
    if (!latlng) { setViewerSearchStatus("座標を読み取れませんでした。例：39.0819, 141.7085", true); return; }
    const grid = getViewerGridNumber(latlng, bounds, data.gridSize || data.session?.gridSize);
    map.setView(latlng, Math.max(map.getZoom(), 16), { animate: true });
    createSearchMarker(map, latlng, `<div class="tapPopupText"><b>座標検索</b><br>座標：${escapeHtml(formatViewerCoordinate(latlng, data))}<br>グリッド番号：${escapeHtml(grid)}</div>`);
    setViewerSearchStatus(`座標検索：${formatViewerCoordinate(latlng, data)} / グリッド：${grid}`);
  }

  function setupViewerInteraction(map, data, bounds) {
    const addressBtn = document.getElementById("viewerAddressSearchBtn");
    const coordBtn = document.getElementById("viewerCoordSearchBtn");
    const addressInput = document.getElementById("viewerAddressInput");
    const coordInput = document.getElementById("viewerCoordInput");
    const tapInfo = document.getElementById("viewerTapInfo");

    if (addressBtn) addressBtn.addEventListener("click", () => searchViewerAddress(map, data, bounds));
    if (coordBtn) coordBtn.addEventListener("click", () => searchViewerCoordinate(map, data, bounds));
    if (addressInput) addressInput.addEventListener("keydown", e => { if (e.key === "Enter") searchViewerAddress(map, data, bounds); });
    if (coordInput) coordInput.addEventListener("keydown", e => { if (e.key === "Enter") searchViewerCoordinate(map, data, bounds); });

    map.on("click", event => {
      const latlng = event.latlng;
      const grid = getViewerGridNumber(latlng, bounds, data.gridSize || data.session?.gridSize);
      const coord = formatViewerCoordinate(latlng, data);
      const html = `<div class="tapPopupText"><b>地点情報</b><br>座標：${escapeHtml(coord)}<br>グリッド番号：${escapeHtml(grid)}</div>`;
      L.popup().setLatLng(latlng).setContent(html).openOn(map);
      if (tapInfo) tapInfo.innerHTML = `座標：${escapeHtml(coord)}<br>グリッド番号：${escapeHtml(grid)}`;
    });
  }

  const data = await decodeViewerPayload();
  if (!data) {
    showError(viewerDiag.error ? `共有データの読込に失敗しました：${viewerDiag.error}` : "共有データを取得できませんでした。指揮本部モードの共有パネルからViewer用URLを再発行してください。");
    return;
  }
  diag("共有データ読込完了", true, `ピン${(data.pins || []).length}件 / 履歴${(data.activityHistory || []).length}件`);
  // Build022.3：ピン0件・履歴0件でも、地図情報があれば正常な共有データとして表示する。
  // CSSのdisplay指定によりhidden属性が効かない環境もあるため、成功時は明示的にエラー画面を非表示にする。
  hideError();

  renderHeaderInfo(data);
  renderSummary(data);
  renderPinsInfo(data);
  renderHistory(data);
  renderMeasurementInfo(data);
  renderLegend(data);

  const layerType = data.mapType || data.session?.mapType || "pale";
  const layer = mapLayers[layerType] || mapLayers.pale;
  const center = latLngFromPlain(data.session?.center) || L.latLng(39.0819, 141.7085);
  diag("地図生成開始", true);
  const map = L.map("viewerMap", {
    zoomControl: true,
    attributionControl: true
  }).setView(center, Number(data.session?.zoom || 14));
  setupViewerPanels(map);

  L.tileLayer(layer.url, {
    maxZoom: layer.maxZoom,
    minZoom: 2,
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
    crossOrigin: true
  }).addTo(map);

  const bounds = boundsFromData(data);
  if (bounds) {
    L.rectangle(bounds, { color: "#dc2626", weight: 2, fill: false, interactive: false }).addTo(map);
    map.fitBounds(bounds, { padding: [10, 10] });
  }

  renderGrid(map, bounds, data.gridSize || data.session?.gridSize, data.gridLineSettings || {});

  (data.pins || []).forEach((pin, index) => {
    if (typeof pin.lat !== "number" || typeof pin.lng !== "number") return;
    const marker = L.marker([pin.lat, pin.lng], {
      icon: createPinIcon(pin.type, pin.completed, index + 1)
    }).addTo(map);
    marker.bindPopup(pinPopup(pin, index + 1));
  });

  showSuccessDiagnostic();

  renderTracks(map, data);
  renderDrawings(map, data);
  renderMeasurements(map, data);
  setupViewerInteraction(map, data, bounds);
  diag("パネル状態", true, `検索=${viewerSearchPanel && !viewerSearchPanel.hidden ? "OPEN" : "CLOSE"} / 情報=${viewerInfoPanel && !viewerInfoPanel.hidden ? "OPEN" : "CLOSE"}`);
  diag("地図表示領域", true, `${mapEl ? mapEl.clientWidth : 0}×${mapEl ? mapEl.clientHeight : 0}px`);
  diag("地図表示完了", true);

  setTimeout(() => map.invalidateSize(), 100);
});
