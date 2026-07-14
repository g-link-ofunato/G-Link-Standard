(() => {
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const STORAGE_KEY = "gLink_launcherHeader";

  const stage = document.getElementById("launcherStage");
  const form = document.getElementById("launcherForm");
  const disasterInput = document.getElementById("disasterName");
  const unitInput = document.getElementById("createdUnit");
  const newProjectButton = document.getElementById("newProjectButton");
  const continueProjectButton = document.getElementById("continueProjectButton");
  const continueProjectPanel = document.getElementById("continueProjectPanel");
  const glinkProjectButton = document.getElementById("glinkProjectButton");
  const glinkProjectInput = document.getElementById("glinkProjectInput");
  const glinkProjectStatus = document.getElementById("glinkProjectStatus");
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
      page: "launcher.html",
      build: "Build026.0-RESTORE-COMPLETE",
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

  function resetRestoreDiagnostics() {
    try { sessionStorage.removeItem(GLINK_RESTORE_DIAG_KEY); } catch (e) {}
    try { localStorage.removeItem(GLINK_RESTORE_DIAG_KEY); } catch (e) {}
  }

  function resizeStage() {
    if (!stage) return;
    const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
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

  function clearProjectStorage(keysOnlyForProject = false) {
    const keys = [
      "disasterSession",
      "gLink_workingData",
      "gLink_returnBackupData",
      "gLink_returnFromSaveCenter",
      "gLink_pendingRestoreData",
      "gLink_saveCenterData",
      "glinkViewerLastData"
    ];
    if (!keysOnlyForProject) {
      keys.push("gLink_header", "gLink_launcherHeader");
    }
    keys.forEach(key => {
      try { sessionStorage.removeItem(key); } catch (e) {}
      try { localStorage.removeItem(key); } catch (e) {}
    });
  }

  function loadPreviousValues() {
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
      version: "1.6",
      build: "Build026.0-RESTORE-COMPLETE"
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const header = {
      dateTime: payload.dateTime,
      disasterName: payload.disasterName,
      createdUnit: payload.createdUnit,
      coordinateType: payload.coordinateType
    };
    sessionStorage.setItem("gLink_header", JSON.stringify(header));
    localStorage.setItem("gLink_header", JSON.stringify(header));
  }

  function showLauncherPanel(mode) {
    if (form) form.classList.toggle("hidden", mode !== "new");
    if (continueProjectPanel) continueProjectPanel.classList.toggle("hidden", mode !== "continue");
    if (newProjectButton) newProjectButton.classList.toggle("active", mode === "new");
    if (continueProjectButton) continueProjectButton.classList.toggle("active", mode === "continue");
    if (mode === "new" && disasterInput) window.setTimeout(() => disasterInput.focus(), 50);
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
    if (!data || data.format !== "glink") {
      alert("G-Link保存ファイル（.glink）として認識できませんでした。");
      return;
    }

    resetRestoreDiagnostics();
    const restoreData = sanitizeGlinkPayloadForRestore(data);
    try {
      const before = glinkDiagStorageSnapshot();
      clearProjectStorage(false);
      glinkDiagLog("launcher restore storage cleared", { before, after: glinkDiagStorageSnapshot() });
      const json = JSON.stringify(restoreData);
      sessionStorage.setItem("gLink_pendingRestoreData", json);
      // Build026.0-RESTORE-COMPLETE: .glink復元ではpendingRestoreDataだけを正式入口にする。
      // workingData/saveCenterDataはfixed側で復元完了後に作成し、古いデータ混入を防止する。
      sessionStorage.setItem("gLink_returnFromSaveCenter", "1");
      localStorage.setItem("gLink_pendingRestoreData", json);
      localStorage.setItem("gLink_returnFromSaveCenter", "1");
      if (restoreData.session) {
        const sessionJson = JSON.stringify(restoreData.session);
        sessionStorage.setItem("disasterSession", sessionJson);
        localStorage.setItem("disasterSession", sessionJson);
      }
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
      glinkDiagLog("launcher restore data staged", { summary: glinkDiagSummarizeData(restoreData), jsonLength: json.length, storage: glinkDiagStorageSnapshot() });
      if (glinkProjectStatus) glinkProjectStatus.textContent = `読込完了。pin ${(restoreData.pins||[]).length}件、図形 ${(restoreData.drawings||[]).length}件、計測 ${(restoreData.measurements||[]).length}件を復元準備しました。`;
    } catch (error) {
      console.error(".glink読込データの一時保存に失敗しました。", error);
      alert(".glinkファイルの読込準備に失敗しました。GPX軌跡や図形の点数が非常に多い可能性があります。");
      return;
    }

    if (glinkProjectStatus) glinkProjectStatus.textContent = "読込完了。指揮本部モードを開きます。";
    window.location.href = "fixed.html?restore=glink&v=0260";
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

    clearProjectStorage(false);
    saveLauncherHeader(disasterName, createdUnit);
    window.location.href = "area.html";
  }

  window.addEventListener("resize", resizeStage);
  window.addEventListener("orientationchange", resizeStage);

  document.addEventListener("DOMContentLoaded", () => {
    resizeStage();
    loadPreviousValues();
    glinkDiagLog("launcher DOMContentLoaded", {
      hasNewButton: !!newProjectButton,
      hasContinueButton: !!continueProjectButton,
      hasProjectInput: !!glinkProjectInput,
      storage: glinkDiagStorageSnapshot()
    });
  });

  if (newProjectButton) newProjectButton.addEventListener("click", () => showLauncherPanel("new"));
  if (continueProjectButton) continueProjectButton.addEventListener("click", () => showLauncherPanel("continue"));
  if (glinkProjectButton && glinkProjectInput) {
    glinkProjectButton.addEventListener("click", () => glinkProjectInput.click());
    glinkProjectInput.addEventListener("change", () => {
      readGlinkProjectFile(glinkProjectInput.files && glinkProjectInput.files[0]);
      glinkProjectInput.value = "";
    });
  }
  if (form) form.addEventListener("submit", handleSubmit);
})();

/* Build026.3.6: launcher notification and logout icon rail */
(()=>{
'use strict';
if(window.__GLINK_STANDARD_NOTIFICATIONS_LOADED__) return;
window.__GLINK_STANDARD_NOTIFICATIONS_LOADED__=true;
console.info('[G-Link Notify]',{time:new Date().toISOString(),build:'Build026.3.6',event:'S026360-SCRIPT-LOADED'});
const BUILD='Build026.3.6',PORTAL_BASE='https://g-link-portal.pages.dev',LOCAL_KEY='gLink_standardAuthRemembered',SESSION_KEY='gLink_standardAuthSession';
let state={items:[],unreadCount:0,license:null},root=null,diagRoot=null,diagLines=[];
function createDiagPanel(){
  if(diagRoot)return diagRoot;
  diagRoot=document.createElement('aside');
  diagRoot.id='glinkNotifyDiagnostic';
  diagRoot.setAttribute('aria-label','通知診断情報');
  Object.assign(diagRoot.style,{position:'fixed',right:'10px',bottom:'10px',zIndex:'2147483647',width:'min(430px,calc(100vw - 20px))',maxHeight:'42vh',overflow:'auto',background:'rgba(10,18,28,.96)',color:'#eaf4ff',border:'1px solid rgba(120,190,255,.8)',borderRadius:'10px',boxShadow:'0 8px 30px rgba(0,0,0,.35)',padding:'10px 12px',font:'12px/1.5 Consolas,monospace',whiteSpace:'pre-wrap',wordBreak:'break-word'});
  diagRoot.innerHTML='<strong style="display:block;margin-bottom:6px;font-size:13px">G-Link 通知診断 Build026.3.2-DIAG</strong><div id="glinkNotifyDiagnosticBody">初期化中…</div>';
  document.body.appendChild(diagRoot);
  return diagRoot;
}
function diag(event,details={}){
  const entry={time:new Date().toISOString(),build:BUILD,event,details};
  console.info('[G-Link Notify]',entry);
  diagLines.push(entry);
  if(diagLines.length>12)diagLines.shift();
  const panel=createDiagPanel();
  const body=panel.querySelector('#glinkNotifyDiagnosticBody');
  if(body)body.textContent=diagLines.map(x=>`${x.event}\n${JSON.stringify(x.details,null,2)}`).join('\n────────────\n');
}
function authState(){for(const [store,key] of [[sessionStorage,SESSION_KEY],[localStorage,LOCAL_KEY]]){try{const v=store.getItem(key);if(v)return JSON.parse(v);}catch(e){}}return null;}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function create(){if(root)return;const stage=document.getElementById('launcherStage');if(!stage)return;let rail=stage.querySelector('#glinkStatusRail');if(!rail){rail=document.createElement('div');rail.id='glinkStatusRail';rail.className='glink-status-rail';stage.appendChild(rail);}rail.querySelector('#glinkLicenseBadge')?.remove();rail.querySelector('#glinkOrgStatusIcon')?.remove();let bellButton=rail.querySelector('#glinkNoticeBell');if(!bellButton){bellButton=document.createElement('button');bellButton.id='glinkNoticeBell';bellButton.className='glink-status-icon notice-bell';bellButton.type='button';bellButton.setAttribute('aria-label','お知らせ');bellButton.title='お知らせ';bellButton.innerHTML='<span aria-hidden="true">🔔</span><b id="glinkNoticeCount" hidden>0</b>';rail.appendChild(bellButton);}bellButton.style.order='1';root=document.createElement('div');root.id='glinkNoticeCenter';root.innerHTML=`<section id="glinkNoticePanel" class="notice-panel" hidden><header><div><strong>お知らせ</strong><small id="glinkNoticeStatus">取得中…</small></div><button id="glinkNoticeClose" type="button">×</button></header><div id="glinkNoticeList" class="notice-list"></div><footer><button id="glinkReadAll" type="button">すべて既読</button></footer></section><div id="glinkImportantOverlay" class="important-overlay" hidden><article><span class="important-label">重要なお知らせ</span><h2 id="glinkImportantTitle"></h2><p id="glinkImportantBody"></p><a id="glinkImportantLink" target="_blank" rel="noopener" hidden>詳細を見る</a><button id="glinkImportantClose" type="button">確認しました</button></article></div>`;stage.appendChild(root);bellButton.addEventListener('click',()=>{const p=root.querySelector('#glinkNoticePanel');p.hidden=!p.hidden;if(!p.hidden)markVisibleRead();});root.querySelector('#glinkNoticeClose').addEventListener('click',()=>root.querySelector('#glinkNoticePanel').hidden=true);root.querySelector('#glinkReadAll').addEventListener('click',()=>{hideImportant('read-all');markRead(state.items.filter(x=>!x.read).map(x=>x.key));});root.querySelector('#glinkImportantClose').addEventListener('click',()=>{const key=root.querySelector('#glinkImportantOverlay').dataset.key;hideImportant('confirmed');diag('S026340-IMPORTANT-CONFIRMED',{key});markRead([key]);});root.querySelector('#glinkNoticeList').addEventListener('click',e=>{const card=e.target.closest('[data-notice-key]');if(card)markRead([card.dataset.noticeKey]);});}
async function api(path,options={}){const a=authState();if(!a?.token)throw new Error('認証情報がありません。');const r=await fetch(`${PORTAL_BASE}${path}`,{...options,headers:{'Content-Type':'application/json','Authorization':`Bearer ${a.token}`,...(options.headers||{})},cache:'no-store'});let d={};try{d=await r.json();}catch{}if(!r.ok)throw new Error(d.message||`HTTP ${r.status}`);return d;}
function priorityLabel(v){return v==='urgent'?'緊急':v==='important'?'重要':'通常';}
function categoryLabel(v){return ({system:'システム',operation:'運用',incident:'障害',update:'更新',license:'ライセンス',other:'その他'})[v]||'その他';}
function formatDate(v){try{return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));}catch{return '';}}
function hideImportant(reason='none'){if(!root)return;const o=root.querySelector('#glinkImportantOverlay');if(!o)return;o.hidden=true;o.removeAttribute('data-key');o.style.removeProperty('display');diag('S026340-IMPORTANT-HIDE',{reason});}
function showImportant(important){const o=root.querySelector('#glinkImportantOverlay');if(!important){hideImportant('none');diag('S026340-IMPORTANT-NONE',{unread:state.unreadCount});return;}o.dataset.key=important.key;root.querySelector('#glinkImportantTitle').textContent=important.title;root.querySelector('#glinkImportantBody').textContent=important.body;const l=root.querySelector('#glinkImportantLink');if(important.linkUrl){l.href=important.linkUrl;l.textContent=important.linkLabel||'詳細を見る';l.hidden=false;}else{l.hidden=true;l.removeAttribute('href');}o.hidden=false;o.removeAttribute('hidden');diag('S026340-IMPORTANT-SHOW',{key:important.key,priority:important.priority});}
function render(){create();const count=root.querySelector('#glinkNoticeCount');count.textContent=state.unreadCount;count.hidden=!state.unreadCount;root.querySelector('#glinkNoticeStatus').textContent=`未読 ${state.unreadCount}件`;const list=root.querySelector('#glinkNoticeList');list.innerHTML=state.items.map(n=>`<article class="notice-item ${n.read?'read':'unread'} ${esc(n.priority)}" data-notice-key="${esc(n.key)}"><div class="notice-meta"><span>${priorityLabel(n.priority)}</span><span>${categoryLabel(n.category)}</span><time>${formatDate(n.publishedAt)}</time>${n.read?'':'<b>NEW</b>'}</div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p>${n.linkUrl?`<a href="${esc(n.linkUrl)}" target="_blank" rel="noopener">${esc(n.linkLabel||'詳細を見る')}</a>`:''}</article>`).join('')||'<p class="notice-empty">現在のお知らせはありません。</p>';renderLicense();const important=state.items.find(n=>!n.read&&(n.priority==='urgent'||n.priority==='important'));diag('S026340-IMPORTANT-FOUND',{found:Boolean(important),key:important?.key||null,unread:state.unreadCount});showImportant(important);}
function renderLicense(){const d=state.license?.daysRemaining;if(d!==null&&d!==undefined)diag('S026301-LICENSE',{daysRemaining:d});}
async function load(){create();diag('S026320-LOAD-START',{authenticated:Boolean(window.GLinkLicense?.authenticated),hasAuthState:Boolean(authState()?.token),portalBase:PORTAL_BASE});try{const d=await api('/api/app/notifications');state.items=d.notifications||[];state.unreadCount=Number(d.unreadCount||0);state.license=d.license||null;diag('S026320-API-RESULT',{count:state.items.length,unreadCount:state.unreadCount,notifications:state.items.map(n=>({key:n.key,title:n.title,priority:n.priority,read:n.read,publishedAt:n.publishedAt}))});render();diag('S026300-NOTIFY',{count:state.items.length});}catch(e){root.querySelector('#glinkNoticeStatus').textContent='取得できませんでした';root.querySelector('#glinkNoticeList').innerHTML='<p class="notice-empty">通信環境を確認してください。</p>';diag('S026300-NOTIFY-ERROR',{name:e.name,message:e.message,stack:e.stack||''});}}
async function markRead(keys){keys=keys.filter(Boolean);if(!keys.length)return;try{await api('/api/app/notifications',{method:'POST',body:JSON.stringify({keys})});state.items.forEach(n=>{if(keys.includes(n.key))n.read=true;});state.unreadCount=state.items.filter(n=>!n.read).length;diag('S026305-READ',{keys});render();}catch(e){diag('S026305-READ-ERROR',{message:e.message});}}
function markVisibleRead(){const keys=state.items.filter(n=>!n.read).map(n=>n.key);if(keys.length)markRead(keys);}
window.addEventListener('glink-license-ready',()=>{diag('S026320-LICENSE-READY',{authenticated:Boolean(window.GLinkLicense?.authenticated)});load();});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{create();createDiagPanel();diag('S026320-DOM-READY',{authenticated:Boolean(window.GLinkLicense?.authenticated),hasAuthState:Boolean(authState()?.token)});if(window.GLinkLicense?.authenticated)load();});else{create();createDiagPanel();diag('S026320-DOM-ALREADY',{authenticated:Boolean(window.GLinkLicense?.authenticated),hasAuthState:Boolean(authState()?.token)});if(window.GLinkLicense?.authenticated)load();}
})();

