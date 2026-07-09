(() => {
  "use strict";

  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const STORAGE_KEY = "gLink_launcherHeader";

  const stage = document.getElementById("launcherStage");
  const form = document.getElementById("launcherForm");
  const disasterInput = document.getElementById("disasterName");
  const unitInput = document.getElementById("createdUnit");

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
    disasterInput.focus();
  });

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
})();

