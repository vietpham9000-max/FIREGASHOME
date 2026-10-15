// ============================== CONFIG ==============================
const FIREBASE_VERSION = "11.1.0";
const ESP32_ONLINE_TIMEOUT_MS = 15_000;
const COMMAND_CONFIRM_TIMEOUT_MS = 8_000;
const MAX_HISTORY_POINTS = 120;
const pageParams = new URLSearchParams(location.search);
const isDemoMode = pageParams.get("demo") === "1";
const isLocalDev = ["localhost", "127.0.0.1"].includes(location.hostname);

const firebaseConfig = {
  apiKey: "AIzaSyAH87METsPlhGaa0ZaiYRtTJVbWLnOW7Ic",
  authDomain: "iot-giam-sat-chay-gas.firebaseapp.com",
  databaseURL: "https://iot-giam-sat-chay-gas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-giam-sat-chay-gas",
  storageBucket: "iot-giam-sat-chay-gas.firebasestorage.app",
  messagingSenderId: "342016305000",
  appId: "1:342016305000:web:ab0a324dc43c53133fd8dd"
};
const REQUIRED_FIREBASE_CONFIG = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId"];

// ============================== STATE ==============================
const $ = id => document.getElementById(id);
let firebaseApi = null, auth = null, db = null, telemetryRef = null, commandsRef = null;
let stopTelemetry = null, stopCommands = null, stopConnection = null;
let firebaseState = isDemoMode ? "demo" : "connecting";
let browserOnline = navigator.onLine;
let telemetry = {};
let telemetryReceived = false;
let commandsReceived = false;
let commands = { mode: "AUTO", fan: false, pump: false, doorOpen: false, sequence: 0 };
let demoTimer = null, chartTimer = null, scenario = "normal", selectedRange = 1;
let lastHistoryTimestamp = null;
const pendingCommands = new Map();
const loggedErrors = new Set();
const chartHistory = { temperature: [], humidity: [], gas: [] };

const demoBase = {
  temperature: 28.4, humidity: 64, gas: 82, gasRaw: 82, gasDetected: false,
  flame: false, flameValue: 0, alarm: false, fan: false, pump: false,
  doorOpen: false, wifiRssi: -53, arduinoConnected: true, dhtOk: true,
  fanControlLocked: false, pumpControlLocked: false, doorControlLocked: false,
  lastSeen: Date.now()
};
const safetyIcons = {
  safe: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
  gas: '<svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>',
  fire: '<svg viewBox="0 0 24 24"><path d="M13 2c.5 3.7-1.6 5.3-3.2 7-1.5 1.5-2.8 3.2-2.8 5.7a5 5 0 0 0 10 0c0-1.5-.5-2.9-1.4-4.1-.2 2-1.4 3.2-2.4 3.9.4-3.1-.8-5.2-2.3-6.8"/></svg>',
  critical: '<svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 8v6M12 17.5h.01"/></svg>',
  offline: '<svg viewBox="0 0 24 24"><path d="M4 4l16 16M5 12a10 10 0 0 1 2.4-2.2M10.5 8.2A10 10 0 0 1 19 12M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/></svg>'
};

function setText(id, value) { const element = $(id); if (element) element.textContent = value; }
function logOnce(key, message, error) { if (loggedErrors.has(key)) return; loggedErrors.add(key); console.error(message, error?.code || "", error?.message || error || ""); }
function clearLoggedError(key) { loggedErrors.delete(key); }
function normalizedTimestamp(value) { const number = Number(value); return Number.isFinite(number) ? (number < 1e12 ? number * 1000 : number) : null; }
function telemetryAge() { const timestamp = normalizedTimestamp(telemetry.lastSeen); return timestamp ? Math.max(0, Date.now() - timestamp) : null; }
function telemetryState() {
  if (isDemoMode) return "fresh";
  if (!telemetryReceived || !normalizedTimestamp(telemetry.lastSeen)) return "unknown";
  return telemetryAge() <= ESP32_ONLINE_TIMEOUT_MS ? "fresh" : "stale";
}
function ageLabel(age) { if (age == null) return "Chưa nhận dữ liệu"; const seconds = Math.floor(age / 1000); return seconds < 60 ? `${seconds} giây trước` : `${Math.floor(seconds / 60)} phút trước`; }
function formatTime(value) { return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function firebaseConfigValid() { return REQUIRED_FIREBASE_CONFIG.every(key => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim() && !firebaseConfig[key].includes("YOUR_")); }

// ============================== UI RENDER ==============================
function setDot(id, state) { const dot = $(id); dot.classList.toggle("online", state === "online"); dot.classList.toggle("warning", state === "demo" || state === "connecting" || state === "unknown"); }
function setDeviceBadge(id, text, tone = "neutral") { const badge = $(id); badge.textContent = text; badge.className = `device-badge ${tone}`; }
function setStatusLabel(id, text, tone = "good") { const label = $(id); label.textContent = text; label.className = `status-label ${tone}`; }
function setToggle(id, active, disabled) { const button = $(id); button.classList.toggle("on", Boolean(active)); button.disabled = Boolean(disabled); button.setAttribute("aria-checked", String(Boolean(active))); }
function showDashboard(user = null) {
  $("login").classList.add("hidden"); $("dashboard").classList.remove("hidden");
  if (user?.email) { setText("user-avatar", user.email.split("@")[0].slice(0, 2).toUpperCase()); $("user-avatar").title = user.email; }
  requestAnimationFrame(() => { render(); drawChart(); });
}
function showLogin() { $("dashboard").classList.add("hidden"); $("login").classList.remove("hidden"); closeSidebar(); }

function renderSafety(connectionProblem, dataState) {
  const gasValue = Number(telemetry.gas ?? telemetry.gasRaw);
  const gasDetected = Boolean(telemetry.gasDetected) || (Number.isFinite(gasValue) && gasValue >= 400);
  const fireDetected = Boolean(telemetry.flame);
  let state = "safe", title = "HỆ THỐNG AN TOÀN", description = "Không phát hiện khí gas hoặc ngọn lửa", activity = "HOẠT ĐỘNG ỔN ĐỊNH";
  if (connectionProblem || dataState !== "fresh") {
    state = "offline"; title = dataState === "stale" ? "DỮ LIỆU KHÔNG CÒN CẬP NHẬT" : "KHÔNG XÁC ĐỊNH ĐƯỢC TRẠNG THÁI";
    description = !browserOnline ? "Trình duyệt đã mất kết nối mạng" : firebaseState !== "connected" && !isDemoMode ? "Không kết nối được Firebase" : "Không nhận được dữ liệu mới từ ESP32";
    activity = dataState === "stale" ? "STALE" : "MẤT KẾT NỐI";
  } else if (gasDetected && fireDetected) { state = "critical"; title = "NGUY HIỂM"; description = "Phát hiện đồng thời khí gas và ngọn lửa"; activity = "XỬ LÝ KHẨN CẤP"; }
  else if (fireDetected) { state = "fire"; title = "CẢNH BÁO CHÁY"; description = "Bơm và cửa thoát hiểm đã được kích hoạt"; activity = "BÁO ĐỘNG ĐANG BẬT"; }
  else if (gasDetected) { state = "gas"; title = "CẢNH BÁO RÒ RỈ KHÍ GAS"; description = "Hệ thống đã tự động bật quạt thông gió"; activity = "ĐANG THÔNG GIÓ"; }
  const banner = $("overview"); banner.className = `safety-banner ${state}`; $("safety-icon").innerHTML = safetyIcons[state];
  setText("safety-title", title); setText("safety-description", description); setText("safety-activity", activity); setText("safety-clock", formatTime(Date.now()));
}

function commandMessage(key, safetyLocked, canReachDevice, isManual) {
  const pending = pendingCommands.get(key);
  if (pending?.status === "sending") return "Đang gửi lệnh…";
  if (pending?.status === "sent") return "Đã gửi lệnh · đang chờ thiết bị xác nhận";
  if (pending?.status === "confirmed") return "Thiết bị đã xác nhận";
  if (pending?.status === "timeout") return "Thiết bị chưa xác nhận";
  if (pending?.status === "error") return "Không gửi được lệnh";
  if (!isDemoMode && !commandsReceived) return "Đang tải trạng thái điều khiển…";
  if (!canReachDevice) return "Không thể gửi lệnh khi thiết bị mất kết nối";
  if (safetyLocked) return "Hệ thống an toàn đang kiểm soát";
  return isManual ? "Sẵn sàng điều khiển" : "Chuyển sang MANUAL để điều khiển";
}

function renderControls(dataState) {
  const isManual = commands.mode === "MANUAL";
  const canReachDevice = isDemoMode || (browserOnline && firebaseState === "connected" && dataState === "fresh" && commandsReceived);
  $("mode-auto").classList.toggle("active", !isManual); $("mode-manual").classList.toggle("active", isManual);
  $("mode-auto").disabled = !canReachDevice; $("mode-manual").disabled = !canReachDevice;
  setText("control-mode-label", isManual ? "THỦ CÔNG" : "TỰ ĐỘNG");
  setText("control-notice", !isDemoMode && !commandsReceived ? "Đang tải trạng thái điều khiển từ Firebase…" : !canReachDevice ? "Không thể gửi lệnh khi thiết bị mất kết nối." : isManual ? "Chế độ thủ công đang bật. Quy tắc khóa an toàn vẫn được ưu tiên." : "Chế độ tự động đang ưu tiên các quy tắc an toàn.");
  const definitions = [
    { key: "fan", actual: Boolean(telemetry.fan), requested: Boolean(commands.fan), text: typeof telemetry.fan === "boolean" ? telemetry.fan ? "ON" : "OFF" : "UNKNOWN" },
    { key: "pump", actual: Boolean(telemetry.pump), requested: Boolean(commands.pump), text: typeof telemetry.pump === "boolean" ? telemetry.pump ? "ON" : "OFF" : "UNKNOWN" },
    { key: "door", actual: Boolean(telemetry.doorOpen), requested: Boolean(commands.doorOpen), text: typeof telemetry.doorOpen === "boolean" ? telemetry.doorOpen ? "OPEN" : "CLOSED" : "UNKNOWN" }
  ];
  definitions.forEach(item => {
    const lockField = `${item.key}ControlLocked`, safetyLocked = Boolean(telemetry[lockField]);
    const disabled = !canReachDevice || !isManual || safetyLocked;
    setText(`${item.key}-control-state`, item.text); $(`${item.key}-control-state`).classList.toggle("on", item.actual);
    setText(`${item.key}-lock-text`, commandMessage(item.key, safetyLocked, canReachDevice, isManual));
    $(`${item.key}-lock-badge`).classList.toggle("hidden", !safetyLocked && canReachDevice);
    $(`${item.key}-lock-badge`).textContent = safetyLocked ? "LOCKED" : "OFFLINE";
    $(`${item.key}-control`).classList.toggle("locked", safetyLocked || !canReachDevice);
    setToggle(item.key, item.requested, disabled);
  });
}

function render() {
  const dataState = telemetryState();
  const age = telemetryAge();
  const firebaseConnected = firebaseState === "connected";
  const connectionProblem = !isDemoMode && (!browserOnline || !firebaseConnected);
  const espState = isDemoMode ? "demo" : dataState === "fresh" ? "online" : dataState === "stale" ? "offline" : "unknown";
  const hasArduinoField = typeof telemetry.arduinoConnected === "boolean";
  const unoState = isDemoMode ? "demo" : !telemetryReceived || !hasArduinoField ? "unknown" : telemetry.arduinoConnected ? "online" : "offline";
  const dhtError = telemetry.dhtOk === false;
  const stale = dataState === "stale";
  const temperature = dhtError ? NaN : Number(telemetry.temperature);
  const humidity = dhtError ? NaN : Number(telemetry.humidity);
  const gasValue = Number(telemetry.gas ?? telemetry.gasRaw);
  const rssi = Number(telemetry.wifiRssi);
  const gasDetected = Boolean(telemetry.gasDetected) || (Number.isFinite(gasValue) && gasValue >= 400);
  const loadingText = telemetryReceived ? "Không có dữ liệu" : "Đang tải dữ liệu";

  setText("temperature", Number.isFinite(temperature) ? temperature.toFixed(1) : "--"); setText("humidity", Number.isFinite(humidity) ? Math.round(humidity) : "--");
  setText("gas", Number.isFinite(gasValue) ? Math.round(gasValue) : "--"); setText("rssi", Number.isFinite(rssi) ? Math.round(rssi) : "--");
  if (dhtError) { setStatusLabel("temperature-status", "DHT22 không phản hồi", "danger"); setStatusLabel("humidity-status", "DHT22 không phản hồi", "danger"); }
  else if (stale) { setStatusLabel("temperature-status", "Dữ liệu cũ · STALE", "warning"); setStatusLabel("humidity-status", "Dữ liệu cũ · STALE", "warning"); }
  else { setStatusLabel("temperature-status", Number.isFinite(temperature) ? temperature >= 50 ? "Nhiệt độ cao" : "Ổn định" : loadingText, temperature >= 50 ? "danger" : Number.isFinite(temperature) ? "good" : "neutral"); setStatusLabel("humidity-status", Number.isFinite(humidity) ? "Bình thường" : loadingText, Number.isFinite(humidity) ? "good" : "neutral"); }
  setStatusLabel("gas-status", stale ? "Dữ liệu cũ · STALE" : Number.isFinite(gasValue) ? gasDetected ? "Phát hiện khí gas" : "Mức an toàn" : loadingText, stale ? "warning" : gasDetected ? "warning" : Number.isFinite(gasValue) ? "good" : "neutral");
  setStatusLabel("wifi-status", stale ? "Dữ liệu cũ · STALE" : Number.isFinite(rssi) ? rssi >= -60 ? "Tốt" : rssi >= -75 ? "Trung bình" : "Yếu" : loadingText, stale ? "warning" : Number.isFinite(rssi) && rssi < -75 ? "warning" : Number.isFinite(rssi) ? "good" : "neutral");
  const gasPercent = Number.isFinite(gasValue) ? Math.max(0, Math.min(100, gasValue / 1023 * 100)) : 0; $("gas-progress-bar").style.width = `${gasPercent}%`; $("gas-progress-bar").style.background = gasValue >= 800 ? "var(--red)" : gasDetected || gasPercent > 25 ? "var(--amber)" : "var(--green)";

  const statusText = state => state === "demo" ? "Demo" : state === "online" ? "Online" : state === "offline" ? "Offline" : "Unknown";
  setText("esp-status", statusText(espState)); setDot("esp-dot", espState); setText("uno-status", statusText(unoState)); setDot("uno-dot", unoState);
  const firebaseLabel = isDemoMode ? "Demo" : firebaseState === "connected" ? "Connected" : firebaseState === "connecting" ? "Connecting" : "Disconnected";
  setText("firebase-sidebar-status", firebaseLabel); setDot("firebase-dot", isDemoMode ? "demo" : firebaseState);
  setText("connection-text", isDemoMode ? "Dữ liệu mô phỏng" : !browserOnline ? "Mất kết nối mạng" : firebaseLabel); setDot("connection-dot", isDemoMode ? "demo" : firebaseState);
  const timestamp = normalizedTimestamp(telemetry.lastSeen); setText("updated", isDemoMode || timestamp ? ageLabel(age) : "Chưa có dữ liệu");
  setDeviceBadge("esp-device-state", isDemoMode ? "SIMULATED" : espState.toUpperCase(), espState === "online" ? "good" : "neutral"); setDeviceBadge("uno-device-state", isDemoMode ? "SIMULATED" : unoState.toUpperCase(), unoState === "online" ? "good" : "neutral");
  setDeviceBadge("fan-state", telemetry.fan === true ? "ON" : telemetry.fan === false ? "OFF" : "NO DATA", telemetry.fan ? "good" : "neutral"); setDeviceBadge("pump-state", telemetry.pump === true ? "ON" : telemetry.pump === false ? "OFF" : "NO DATA", telemetry.pump ? "good" : "neutral");
  setDeviceBadge("door-state", telemetry.doorOpen === true ? "OPEN" : telemetry.doorOpen === false ? "CLOSED" : "NO DATA", telemetry.doorOpen ? "warning" : "neutral"); setDeviceBadge("alarm-state", telemetry.alarm === true ? "ACTIVE" : telemetry.alarm === false ? "NORMAL" : "NO DATA", telemetry.alarm ? "danger" : telemetry.alarm === false ? "good" : "neutral");
  setDeviceBadge("dht-state", dhtError ? "ERROR" : telemetry.dhtOk === true ? "NORMAL" : "UNKNOWN", dhtError ? "danger" : telemetry.dhtOk === true ? "good" : "neutral"); setDeviceBadge("mq2-state", gasDetected ? "GAS DETECTED" : Number.isFinite(gasValue) ? "NORMAL" : "NO DATA", gasDetected ? "danger" : Number.isFinite(gasValue) ? "good" : "neutral"); setDeviceBadge("flame-state", telemetry.flame === true ? "FIRE DETECTED" : telemetry.flame === false ? "NORMAL" : "NO DATA", telemetry.flame ? "danger" : telemetry.flame === false ? "good" : "neutral");
  renderSafety(connectionProblem, dataState); renderControls(dataState);
}

// ============================== CHART ==============================
function appendHistory() {
  const timestamp = normalizedTimestamp(telemetry.lastSeen) || Date.now();
  if (!isDemoMode && (!telemetryReceived || timestamp === lastHistoryTimestamp)) return;
  const values = [Number(telemetry.temperature), Number(telemetry.humidity), Number(telemetry.gas ?? telemetry.gasRaw)];
  if (!values.some(Number.isFinite)) return;
  lastHistoryTimestamp = timestamp;
  [chartHistory.temperature, chartHistory.humidity, chartHistory.gas].forEach((series, index) => { series.push(Number.isFinite(values[index]) ? values[index] : null); if (series.length > MAX_HISTORY_POINTS) series.shift(); });
  drawChart();
}
function drawChart() {
  const canvas = $("environment-chart"); if (!canvas || !canvas.offsetWidth) return;
  const ratio = window.devicePixelRatio || 1, width = canvas.offsetWidth, height = canvas.offsetHeight; canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio); ctx.clearRect(0, 0, width, height); const pad = { x: 12, y: 12 }, graphW = width - 24, graphH = height - 24;
  ctx.strokeStyle = "#223041"; ctx.lineWidth = 1; for (let row = 0; row <= 4; row++) { const y = pad.y + graphH / 4 * row; ctx.beginPath(); ctx.moveTo(pad.x, y); ctx.lineTo(width - pad.x, y); ctx.stroke(); }
  const plot = (series, color, normalize) => { if (series.length < 2) return; ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.lineCap = "round"; let started = false; series.forEach((value, index) => { if (!Number.isFinite(value)) { started = false; return; } const x = pad.x + index / Math.max(1, series.length - 1) * graphW, y = pad.y + (1 - Math.max(0, Math.min(1, normalize(value)))) * graphH; if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); }); ctx.stroke(); };
  plot(chartHistory.temperature, "#4a9eff", value => (value - 15) / 40); plot(chartHistory.humidity, "#42c99a", value => value / 100); plot(chartHistory.gas, "#e2ad4e", value => value / 1023);
}

// ============================== DEMO MODE ==============================
function applyScenario(nextScenario) {
  scenario = nextScenario; telemetry = { ...demoBase, temperature: telemetry.temperature || demoBase.temperature, humidity: telemetry.humidity || demoBase.humidity, lastSeen: Date.now() }; commands = { ...commands, mode: "AUTO", fan: false, pump: false, doorOpen: false };
  if (["gas", "critical"].includes(scenario)) Object.assign(telemetry, { gas: 670, gasRaw: 670, gasDetected: true, fan: true, fanControlLocked: true });
  if (["fire", "critical"].includes(scenario)) Object.assign(telemetry, { flame: true, flameValue: 1, alarm: true, pump: true, doorOpen: true, pumpControlLocked: true, doorControlLocked: true });
  commands = { ...commands, fan: telemetry.fan, pump: telemetry.pump, doorOpen: telemetry.doorOpen };
  document.querySelectorAll("[data-scenario]").forEach(button => button.classList.toggle("active", button.dataset.scenario === scenario)); render(); appendHistory();
}
function startDemo() {
  telemetryReceived = true; commandsReceived = true; firebaseState = "demo"; telemetry = { ...demoBase, lastSeen: Date.now() }; commands = { mode: "AUTO", fan: false, pump: false, doorOpen: false, sequence: 0 };
  $("mode-badge").classList.remove("hidden"); $("demo-tools").classList.remove("hidden"); showDashboard();
  for (let i = 0; i < 25; i++) { chartHistory.temperature.push(28.4 + Math.sin(i / 3) * .35); chartHistory.humidity.push(64 + Math.sin(i / 4) * 1.3); chartHistory.gas.push(82 + Math.sin(i / 2.5) * 7); }
  const requestedScenario = pageParams.get("scenario"); applyScenario(["normal", "gas", "fire", "critical"].includes(requestedScenario) ? requestedScenario : "normal");
  demoTimer = setInterval(() => { telemetry.temperature += (Math.random() - .5) * .16; telemetry.humidity += (Math.random() - .5) * .35; telemetry.wifiRssi = -53 + Math.round((Math.random() - .5) * 4); telemetry.lastSeen = Date.now(); if (scenario === "normal") { telemetry.gas = 82 + Math.round((Math.random() - .5) * 14); telemetry.gasRaw = telemetry.gas; } render(); }, 1000);
  chartTimer = setInterval(appendHistory, 2000);
}

// ============================== COMMANDS ==============================
function actualFieldForCommand(key) { return key === "door" ? "doorOpen" : key; }
function checkPendingConfirmations() {
  for (const [key, pending] of pendingCommands) {
    const actual = telemetry[actualFieldForCommand(key)];
    if ((pending.status === "sent" || pending.status === "sending") && typeof actual === "boolean" && actual === pending.requested) { clearTimeout(pending.timer); pending.status = "confirmed"; setTimeout(() => { if (pendingCommands.get(key) === pending) { pendingCommands.delete(key); render(); } }, 2500); }
  }
}
async function sendCommand(changes) {
  if (isDemoMode) { commands = { ...commands, ...changes, sequence: commands.sequence + 1 }; if ("fan" in changes) telemetry.fan = changes.fan; if ("pump" in changes) telemetry.pump = changes.pump; if ("doorOpen" in changes) telemetry.doorOpen = changes.doorOpen; render(); return; }
  if (!firebaseApi || !commandsRef || !browserOnline || firebaseState !== "connected" || telemetryState() !== "fresh") { render(); return; }
  const deviceEntry = Object.entries(changes).find(([key]) => ["fan", "pump", "doorOpen"].includes(key));
  const pendingKey = deviceEntry ? (deviceEntry[0] === "doorOpen" ? "door" : deviceEntry[0]) : null;
  if (pendingKey) { const previous = pendingCommands.get(pendingKey); if (previous?.timer) clearTimeout(previous.timer); pendingCommands.set(pendingKey, { requested: Boolean(deviceEntry[1]), status: "sending", timer: null }); render(); }
  try {
    await firebaseApi.runTransaction(commandsRef, current => ({ mode: current?.mode === "MANUAL" ? "MANUAL" : "AUTO", fan: Boolean(current?.fan), pump: Boolean(current?.pump), doorOpen: Boolean(current?.doorOpen), ...changes, sequence: (Number(current?.sequence) || 0) + 1 }));
    if (pendingKey) { const pending = pendingCommands.get(pendingKey); pending.status = "sent"; pending.timer = setTimeout(() => { if (pending.status === "sent") { pending.status = "timeout"; render(); } }, COMMAND_CONFIRM_TIMEOUT_MS); checkPendingConfirmations(); }
  } catch (error) { if (pendingKey) pendingCommands.get(pendingKey).status = "error"; logOnce(`write-${error.code}`, "Firebase command write failed:", error); }
  render();
}

// ============================== FIREBASE ==============================
async function initializeFirebase() {
  if (!firebaseConfigValid()) { firebaseState = "disconnected"; setText("firebase-status", "Firebase chưa được cấu hình"); render(); return; }
  setText("firebase-status", "Đang kết nối Firebase…");
  try {
    const [appModule, authModule, databaseModule] = await Promise.all([import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`), import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`)]);
    firebaseApi = { ...appModule, ...authModule, ...databaseModule }; const app = firebaseApi.initializeApp(firebaseConfig); auth = firebaseApi.getAuth(app); db = firebaseApi.getDatabase(app);
    telemetryRef = firebaseApi.ref(db, "devices/firegas01/telemetry"); commandsRef = firebaseApi.ref(db, "devices/firegas01/commands");
    stopConnection = firebaseApi.onValue(firebaseApi.ref(db, ".info/connected"), snapshot => { firebaseState = snapshot.val() === true ? "connected" : browserOnline ? "connecting" : "disconnected"; if (firebaseState === "connected") clearLoggedError("firebase-connect"); render(); }, error => { firebaseState = "disconnected"; logOnce("firebase-connect", "Firebase connection monitor failed:", error); render(); });
    setText("firebase-status", "Firebase sẵn sàng");
    firebaseApi.onAuthStateChanged(auth, user => { if (user) startLiveMode(user); else stopLiveMode(); }, error => { firebaseState = "disconnected"; setText("firebase-status", "Không xác định được trạng thái đăng nhập"); logOnce("auth-state", "Firebase auth state failed:", error); });
  } catch (error) { firebaseState = "disconnected"; setText("firebase-status", "Firebase không khả dụng · Không chuyển sang dữ liệu Demo"); logOnce("firebase-init", "Firebase initialization failed:", error); render(); }
}
function startLiveMode(user) {
  telemetry = {}; telemetryReceived = false; commandsReceived = false; chartHistory.temperature.length = 0; chartHistory.humidity.length = 0; chartHistory.gas.length = 0;
  $("mode-badge").classList.add("hidden"); $("demo-tools").classList.add("hidden"); showDashboard(user);
  if (stopTelemetry) stopTelemetry(); if (stopCommands) stopCommands();
  stopTelemetry = firebaseApi.onValue(telemetryRef, snapshot => { telemetryReceived = true; telemetry = snapshot.val() || {}; clearLoggedError("telemetry-read"); checkPendingConfirmations(); appendHistory(); render(); }, error => { firebaseState = error.code === "PERMISSION_DENIED" ? "disconnected" : firebaseState; logOnce("telemetry-read", "Firebase telemetry read failed:", error); render(); });
  stopCommands = firebaseApi.onValue(commandsRef, snapshot => { commandsReceived = true; commands = { ...commands, ...(snapshot.val() || {}) }; clearLoggedError("commands-read"); render(); }, error => { commandsReceived = false; logOnce("commands-read", "Firebase commands read failed:", error); render(); });
}
function stopLiveMode() {
  if (stopTelemetry) { stopTelemetry(); stopTelemetry = null; }
  if (stopCommands) { stopCommands(); stopCommands = null; }
  for (const pending of pendingCommands.values()) if (pending.timer) clearTimeout(pending.timer);
  pendingCommands.clear(); telemetry = {}; telemetryReceived = false; commandsReceived = false; showLogin();
}

// ============================== EVENT HANDLERS ==============================
$("login-form").addEventListener("submit", async event => {
  event.preventDefault(); const email = $("email").value.trim(), password = $("password").value, errorElement = $("login-error"); errorElement.textContent = "";
  if (!email || !password) { errorElement.textContent = "Vui lòng nhập đầy đủ email và mật khẩu."; return; }
  if (!firebaseApi || !auth) { errorElement.textContent = firebaseConfigValid() ? "Firebase hiện không khả dụng." : "Firebase chưa được cấu hình."; return; }
  $("login-button").disabled = true; $("login-button").classList.add("loading");
  try { await firebaseApi.signInWithEmailAndPassword(auth, email, password); }
  catch (error) { const messages = { "auth/invalid-credential": "Sai email hoặc mật khẩu.", "auth/unauthorized-domain": "Tên miền chưa được Firebase cho phép.", "auth/operation-not-allowed": "Đăng nhập Email/Password chưa được bật.", "auth/network-request-failed": "Không kết nối được Firebase.", "auth/too-many-requests": "Có quá nhiều lần thử. Vui lòng thử lại sau." }; errorElement.textContent = `${messages[error.code] || "Đăng nhập thất bại."} [${error.code || error.name}]`; logOnce(`auth-${error.code}`, "Firebase login failed:", error); }
  finally { $("login-button").disabled = false; $("login-button").classList.remove("loading"); }
});
$("demo-login").addEventListener("click", () => { location.href = "./?demo=1"; });
$("toggle-password").addEventListener("click", () => { const input = $("password"), show = input.type === "password"; input.type = show ? "text" : "password"; $("toggle-password").setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu"); });
$("logout").addEventListener("click", async () => { if (isDemoMode) { location.href = "./"; return; } if (auth && firebaseApi) { try { await firebaseApi.signOut(auth); } catch (error) { logOnce("signout", "Firebase sign out failed:", error); } } showLogin(); });
$("mode-auto").addEventListener("click", () => sendCommand({ mode: "AUTO" })); $("mode-manual").addEventListener("click", () => sendCommand({ mode: "MANUAL" }));
$("fan").addEventListener("click", () => sendCommand({ fan: !commands.fan })); $("pump").addEventListener("click", () => sendCommand({ pump: !commands.pump })); $("door").addEventListener("click", () => sendCommand({ doorOpen: !commands.doorOpen }));
document.querySelectorAll("[data-scenario]").forEach(button => button.addEventListener("click", () => { if (isDemoMode) applyScenario(button.dataset.scenario); }));
document.querySelectorAll(".nav-item").forEach(item => item.addEventListener("click", () => { document.querySelectorAll(".nav-item").forEach(link => link.classList.remove("active")); item.classList.add("active"); closeSidebar(); }));
function closeSidebar() { $("sidebar").classList.remove("open"); $("sidebar-backdrop").classList.remove("open"); }
$("menu-toggle").addEventListener("click", () => { $("sidebar").classList.toggle("open"); $("sidebar-backdrop").classList.toggle("open"); }); $("sidebar-backdrop").addEventListener("click", closeSidebar);
$("environment-chart").addEventListener("mousemove", event => { const canvas = event.currentTarget, rect = canvas.getBoundingClientRect(), length = chartHistory.temperature.length; if (!length) return; const index = Math.max(0, Math.min(length - 1, Math.round((event.clientX - rect.left) / rect.width * (length - 1)))), tooltip = $("chart-tooltip"), value = (series, suffix) => Number.isFinite(series[index]) ? `${series[index].toFixed(1)} ${suffix}` : "No data"; tooltip.innerHTML = `<strong>Điểm dữ liệu ${index + 1}</strong><br><span style="color:#63abf6">●</span> Nhiệt độ: ${value(chartHistory.temperature, "°C")}<br><span style="color:#42c99a">●</span> Độ ẩm: ${value(chartHistory.humidity, "%")}<br><span style="color:#e2ad4e">●</span> Gas: ${value(chartHistory.gas, "")}`; tooltip.classList.remove("hidden"); tooltip.style.transform = `translate(${Math.min(rect.width - 132, Math.max(6, event.clientX - rect.left + 12))}px,${Math.min(rect.height - 88, Math.max(6, event.clientY - rect.top - 40))}px)`; });
$("environment-chart").addEventListener("mouseleave", () => $("chart-tooltip").classList.add("hidden"));
document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => { selectedRange = Number(button.dataset.range); document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("active", item === button)); const labels = selectedRange === 1 ? ["-50s", "-40s", "-30s", "-20s", "-10s", "Hiện tại"] : selectedRange === 5 ? ["-5m", "-4m", "-3m", "-2m", "-1m", "Hiện tại"] : ["-15m", "-12m", "-9m", "-6m", "-3m", "Hiện tại"]; document.querySelectorAll(".chart-axis span").forEach((label, index) => { label.textContent = labels[index]; }); drawChart(); }));
window.addEventListener("resize", drawChart);
window.addEventListener("offline", () => { browserOnline = false; if (!isDemoMode) firebaseState = "disconnected"; render(); });
window.addEventListener("online", () => { browserOnline = true; if (!isDemoMode) firebaseState = "connecting"; render(); });
setInterval(() => { if (!$("dashboard").classList.contains("hidden")) render(); }, 1000);
setText("footer-year", new Date().getFullYear());

// ============================== PWA BOOT ==============================
if (isLocalDev && "serviceWorker" in navigator) window.addEventListener("load", async () => { try { const registrations = await navigator.serviceWorker.getRegistrations(); await Promise.all(registrations.map(registration => registration.unregister())); if ("caches" in window) { const names = await caches.keys(); await Promise.all(names.filter(name => name.startsWith("firegas-")).map(name => caches.delete(name))); } } catch (error) { logOnce("sw-cleanup", "Local Service Worker cleanup failed:", error); } });
else if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(error => logOnce("sw-register", "Service Worker registration failed:", error)));

if (isDemoMode) startDemo(); else initializeFirebase();
