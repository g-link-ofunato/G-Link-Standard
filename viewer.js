window.addEventListener("DOMContentLoaded", async () => {
  const viewerError = document.getElementById("viewerError");
  const mapEl = document.getElementById("viewerMap");
  const viewerPrintBtn = document.getElementById("viewerPrintBtn");
  if (viewerPrintBtn) viewerPrintBtn.addEventListener("click", () => window.print());

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

  function showError() {
    if (viewerError) viewerError.hidden = false;
    if (mapEl) mapEl.style.display = "none";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function bytesFromBase64Url(encoded) {
    const base64 = String(encoded || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function decodeJsonBase64Url(encoded) {
    const bytes = bytesFromBase64Url(encoded);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const json = decodeURIComponent(escape(binary));
    return JSON.parse(json);
  }

  async function decodeCompressedJsonBase64Url(encoded) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("このブラウザは圧縮Viewerデータの展開に対応していません。");
    }
    const bytes = bytesFromBase64Url(encoded);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const text = await new Response(stream).text();
    return JSON.parse(text);
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

  function expandCompactViewerData(data) {
    if (!data || data.f !== "gv2") return data;
    const bounds = expandBounds(data.s?.[0]);
    const center = expandPoint(data.s?.[1]);
    return {
      appName: "G-Link Standard",
      format: "glink-viewer",
      version: data.v || "1.6",
      build: data.b || "Build019",
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
      measurements: (data.m || []).map(expandMeasurement).filter(Boolean),
      activityHistory: (data.a || []).map(expandHistory).filter(Boolean)
    };
  }

  async function decodeViewerPayload() {
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const compressed = params.get("z");
    const encoded = params.get("data");
    if (!compressed && !encoded) return null;

    try {
      const raw = compressed ? await decodeCompressedJsonBase64Url(compressed) : decodeJsonBase64Url(encoded);
      return expandCompactViewerData(raw);
    } catch (error) {
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

  const data = await decodeViewerPayload();
  if (!data) {
    showError();
    return;
  }

  renderHeaderInfo(data);
  renderSummary(data);
  renderPinsInfo(data);
  renderHistory(data);
  renderMeasurementInfo(data);
  renderLegend(data);

  const layerType = data.mapType || data.session?.mapType || "pale";
  const layer = mapLayers[layerType] || mapLayers.pale;
  const center = latLngFromPlain(data.session?.center) || L.latLng(39.0819, 141.7085);
  const map = L.map("viewerMap", {
    zoomControl: true,
    attributionControl: true
  }).setView(center, Number(data.session?.zoom || 14));

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

  renderDrawings(map, data);
  renderMeasurements(map, data);

  setTimeout(() => map.invalidateSize(), 100);
});
