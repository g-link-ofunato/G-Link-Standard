/* 水利CSV一時表示：D1、保存センター、共有Viewerへ書き込まない。 */
window.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const context = window.glinkWaterMapContext;
  if (!context || !window.L) return;
  const {map, getDisasterBounds} = context;
  const $ = id => document.getElementById(id);
  const vehicleTab = $('registrationVehicleTab');
  const waterTab = $('registrationWaterTab');
  const vehicleContent = $('registrationVehicleContent');
  const waterContent = $('registrationWaterContent');
  const fileInput = $('waterCsvFileInput');
  const status = $('waterImportStatus');
  const count = $('waterLayerCount');
  const master = $('waterLayerVisible');
  const hydrants = $('waterHydrantVisible');
  const tanks = $('waterTankVisible');
  const natural = $('waterNaturalVisible');
  const available = $('waterAvailableVisible');
  const unavailable = $('waterUnavailableVisible');
  const waterAccordion = $('waterLayerAccordionBtn');
  const waterDetails = $('waterLayerDetails');
  waterAccordion?.addEventListener('click', () => {
    const open = waterAccordion.getAttribute('aria-expanded') !== 'true';
    waterAccordion.setAttribute('aria-expanded', String(open));
    waterAccordion.setAttribute('aria-label', open ? '水利の詳細を閉じる' : '水利の詳細を開く');
    waterDetails.hidden = !open;
  });
  const group = L.layerGroup().addTo(map);
  const renderer = L.canvas({padding: 0.2});
  let records = [];
  let activeMarkers = [];
  const MAX_CSV_BYTES = 8 * 1024 * 1024;
  const MAX_RECORDS = 50000;
  const MAX_DRAWN = 1500;
  const setStatus = message => { if (status) status.textContent = message; };
  const setTab = water => {
    vehicleContent.hidden = water;
    waterContent.hidden = !water;
    vehicleTab.setAttribute('aria-pressed', String(!water));
    waterTab.setAttribute('aria-pressed', String(water));
    vehicleTab.style.opacity = water ? '0.6' : '1';
    waterTab.style.opacity = water ? '1' : '0.6';
  };
  vehicleTab?.addEventListener('click', () => setTab(false));
  waterTab?.addEventListener('click', () => setTab(true));
  setTab(false);

  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(v => v.trim())) rows.push(row);
        row = [];
        if (rows.length > MAX_RECORDS + 1) throw new Error('最大50,000件まで読み込めます。');
      } else field += c;
    }
    if (quoted) throw new Error('CSVの引用符が閉じられていません。');
    row.push(field);
    if (row.some(v => v.trim())) rows.push(row);
    return rows;
  }
  const clean = v => String(v ?? '').trim();
  // 60進法（度分秒）を優先し、10進法も受け付ける。座標系はWGS84。
  function parseCoordinate(value, limit) {
    const raw = clean(value).normalize('NFKC').trim();
    if (!raw) return NaN;
    const compact = raw.replace(/[\s　]/g, '');
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(compact)) {
      const decimal = Number(compact);
      return Math.abs(decimal) <= limit ? decimal : NaN;
    }
    // 度分秒記号・コロン・空白区切りに対応。N/E/S/W の方位も許容。
    const normalized = raw.replace(/[º˚°度]/g, ':').replace(/[′’'分]/g, ':')
      .replace(/[″”"秒]/g, '').replace(/：/g, ':').trim();
    const directionMatch = normalized.match(/^([NSEW北南東西])|([NSEW北南東西])$/i);
    const direction = directionMatch ? (directionMatch[1] || directionMatch[2]).toUpperCase() : '';
    const numeric = normalized.replace(/[NSEW北南東西]/gi, '').trim();
    const parts = numeric.split(/[\s:]+/).filter(Boolean);
    if (parts.length < 2 || parts.length > 3 || !parts.every(p => /^\d+(?:\.\d+)?$/.test(p) || /^-\d+(?:\.\d+)?$/.test(p))) return NaN;
    const deg = Number(parts[0]), min = Number(parts[1]), sec = parts.length === 3 ? Number(parts[2]) : 0;
    if (!Number.isFinite(deg) || min < 0 || min >= 60 || sec < 0 || sec >= 60) return NaN;
    let sign = deg < 0 || direction === 'S' || direction === 'W' || direction === '南' || direction === '西' ? -1 : 1;
    if ((deg < 0 && ['N','E','北','東'].includes(direction)) || (deg > 0 && ['S','W','南','西'].includes(direction))) return NaN;
    const coordinate = sign * (Math.abs(deg) + min / 60 + sec / 3600);
    return Math.abs(coordinate) <= limit ? coordinate : NaN;
  }
  function readRows(rows) {
    if (!rows.length) throw new Error('CSVにデータがありません。');
    const header = rows[0].map(v => clean(v).replace(/^\uFEFF/, '').replace(/[\s　]/g, '').toLowerCase());
    const column = (...names) => header.findIndex(v => names.includes(v));
    const fields = [column('種別','種類','type'), column('名称','名前','name'), column('口径','口径(mm)','口径（mm）','diameter'), column('水量','水量(m3)','水量（㎥）','水量(t)','capacity'), column('緯度','latitude','lat'), column('経度','longitude','lng','lon')];
    const availabilityIdx = column('使用の有無', '使用状況', 'availability'); // 旧CSVには列がないため使用可として扱う
    if (fields.some(i => i < 0)) throw new Error('必須列（種別、名称、口径、水量、緯度、経度）が不足しています。');
    const result = [];
    let invalid = 0;
    for (const row of rows.slice(1)) {
      const [typeIdx,nameIdx,diamIdx,capIdx,latIdx,lngIdx] = fields;
      const raw = clean(row[typeIdx]);
      const type = /^(消火栓|消|hydrant)$/i.test(raw) ? 'hydrant' : /^(防火水槽|水槽|tank)$/i.test(raw) ? 'tank' : /^(自然水利|自然|natural)$/i.test(raw) ? 'natural' : null;
      const availability = availabilityIdx < 0 || !clean(row[availabilityIdx]) ? '使用可' : clean(row[availabilityIdx]);
      const latText = clean(row[latIdx]), lngText = clean(row[lngIdx]);
      const lat = parseCoordinate(latText, 90), lng = parseCoordinate(lngText, 180);
      if (!type || !['使用可', '使用不能'].includes(availability) || !latText || !lngText || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { invalid++; continue; }
      result.push({type, name: clean(row[nameIdx]), diameter: clean(row[diamIdx]), capacity: clean(row[capIdx]), availability, lat, lng});
    }
    return {result, invalid};
  }
  // CSS pixel を96dpi相当として縮尺分母を近似。画面の物理DPIではなく地図表示用の判定。
  function detailedEnough() {
    const metersPerPixel = 156543.03392804097 * Math.cos(map.getCenter().lat * Math.PI / 180) / Math.pow(2, map.getZoom());
    return metersPerPixel * 96 / 0.0254 <= 20000;
  }
  // 水利情報バナーは度分秒を日本語単位で表示（CSVの入力形式は問わない）。
  function formatDms(value) {
    const absolute = Math.abs(value);
    let totalSeconds = Math.round(absolute * 3600 * 100) / 100;
    const degrees = Math.floor(totalSeconds / 3600);
    totalSeconds -= degrees * 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    const secondText = seconds.toFixed(2).replace(/\.?0+$/, '');
    return `${value < 0 ? '-' : ''}${degrees}度${String(minutes).padStart(2, '0')}分${secondText.padStart(2, '0')}秒`;
  }
  function tooltipNode(record) {
    const root = document.createElement('div');
    root.style.cssText = 'min-width:175px;font-size:13px;line-height:1.6';
    const title = document.createElement('strong');
    title.textContent = `${record.type === 'hydrant' ? '消火栓' : record.type === 'tank' ? '防火水槽' : '自然水利'}｜${record.name || '名称未登録'}`;
    root.append(title);
    for (const [label, value] of [['口径', record.diameter ? record.diameter + ' mm' : '未登録'], ['水量', record.capacity ? record.capacity + ' t' : '未登録'], ['使用の有無', record.availability], ['緯度', formatDms(record.lat)], ['経度', formatDms(record.lng)]]) {
      const line = document.createElement('div'); line.textContent = `${label}：${value}`; root.append(line);
    }
    return root;
  }
  function redraw() {
    group.clearLayers();
    activeMarkers = [];
    if (!records.length || !master.checked || !detailedEnough()) return;
    const disaster = getDisasterBounds();
    if (!disaster || !disaster.isValid()) return;
    const visible = map.getBounds();
    let drawn = 0;
    for (const record of records) {
      if ((record.type === 'hydrant' && !hydrants.checked) || (record.type === 'tank' && !tanks.checked) || (record.type === 'natural' && !natural.checked)) continue;
      if ((record.availability === '使用不能' && !unavailable.checked) || (record.availability !== '使用不能' && !available.checked)) continue;
      const point = L.latLng(record.lat, record.lng);
      if (!disaster.contains(point) || !visible.contains(point)) continue;
      if (++drawn > MAX_DRAWN) break;
      const color = record.availability === '使用不能' ? '#171717' : record.type === 'hydrant' ? '#d71920' : record.type === 'tank' ? '#063bb2' : '#16843a';
      // 円と文字を組み合わせた divIcon。表示範囲内のみDOMを生成する。
      const icon = L.divIcon({className:'',html:`<div style="width:25px;height:25px;border-radius:50%;background:${color};color:white;border:1.5px solid white;box-shadow:0 1px 3px #3339;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;">${record.type === 'hydrant' ? '消' : '水'}</div>`,iconSize:[25,25],iconAnchor:[12,12]});
      const marker = L.marker(point, {icon, keyboard:false}).bindTooltip(tooltipNode(record), {direction:'top',opacity:0.98,sticky:false});
      marker.addTo(group); activeMarkers.push(marker);
    }
    if (drawn > MAX_DRAWN) setStatus(`表示件数が${MAX_DRAWN.toLocaleString()}件を超えたため、一部を省略しています。さらに拡大してください。`);
  }
  $('waterTemplateBtn')?.addEventListener('click', () => {
    // 手入力用CSV様式を配布（Excel形式は使用しない）。
    const a = document.createElement('a');
    a.href = './G-Link_水利登録様式.csv';
    a.download = 'G-Link_水利登録様式.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  $('waterImportBtn')?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; if (!file) return;
    try {
      if (file.size > MAX_CSV_BYTES) throw new Error('CSVは8MB以内にしてください。');
      const bytes = await file.arrayBuffer();
      let text;
      try { text = new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
      catch (_) { text = new TextDecoder('shift_jis').decode(bytes); }
      const {result,invalid} = readRows(parseCsv(text));
      if (!result.length) throw new Error('有効な水利データがありません。座標と種別を確認してください。');
      records = result; count.textContent = String(records.length);
      setStatus(`${records.length.toLocaleString()}件読込（無効行 ${invalid}件）。赤枠内かつ縮尺1/20,000以上で表示。`);
      redraw();
    } catch (error) { setStatus(`読込エラー：${error.message}`); }
    finally { fileInput.value = ''; }
  });
  $('waterClearBtn')?.addEventListener('click', () => {
    records = []; count.textContent = '0'; group.clearLayers(); activeMarkers = [];
    setStatus('読込データを解除しました。');
  });
  [master,hydrants,tanks,natural,available,unavailable].forEach(input => input?.addEventListener('change', redraw));
  window.addEventListener('glink-show-all-layers', () => {
    [master,hydrants,tanks,natural,available,unavailable].forEach(input => { if (input) input.checked = true; }); redraw();
  });
  map.on('moveend zoomend', redraw);
});
