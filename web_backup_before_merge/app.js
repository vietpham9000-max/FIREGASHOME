import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getDatabase, onValue, ref, runTransaction } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// Copy the Web App config from Firebase Console > Project settings.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "iot-giam-sat-chay-gas.firebaseapp.com",
  databaseURL: "https://iot-giam-sat-chay-gas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-giam-sat-chay-gas"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const telemetryRef = ref(db, "devices/firegas01/telemetry");
const commandsRef = ref(db, "devices/firegas01/commands");
const $ = id => document.getElementById(id);
let telemetry = {}, commands = { mode: "AUTO", fan: false, pump: false, doorOpen: false };
let stopTelemetry, stopCommands;

function label(id, on, yes = "BẬT", no = "TẮT") {
  $(id).textContent = on ? yes : no;
  $(id).style.color = on ? "#fb7185" : "#86efac";
}
function render() {
  const online = Number.isFinite(telemetry.lastSeen) && Date.now() - telemetry.lastSeen < 10000;
  $("esp-status").textContent = online ? "ESP32 Online" : "ESP32 Offline";
  $("esp-status").classList.toggle("off", !online);
  $("uno-status").textContent = telemetry.arduinoConnected ? "Arduino Online" : "Arduino Offline";
  $("uno-status").classList.toggle("off", !telemetry.arduinoConnected);
  $("updated").textContent = telemetry.lastSeen ? `Cập nhật: ${new Date(telemetry.lastSeen).toLocaleString("vi-VN")}` : "Chưa có dữ liệu";
  $("temperature").textContent = Number.isFinite(telemetry.temperature) ? telemetry.temperature.toFixed(1) : "--";
  $("humidity").textContent = Number.isFinite(telemetry.humidity) ? telemetry.humidity.toFixed(1) : "--";
  $("gas").textContent = telemetry.gas ?? "--";
  $("rssi").textContent = telemetry.wifiRssi ?? "--";
  label("flame", telemetry.flame, "PHÁT HIỆN", "AN TOÀN");
  label("alarm", telemetry.alarm);
  label("fan-state", telemetry.fan);
  $("pump-state").textContent = telemetry.pumpAvailable ? (telemetry.pump ? "BẬT" : "TẮT") : "CHƯA KÍCH HOẠT";
  label("door1", telemetry.doorOpen, "MỞ", "ĐÓNG");
  label("door2", telemetry.doorOpen, "MỞ", "ĐÓNG");
  $("mode").textContent = commands.mode || "AUTO";
  $("fan").textContent = commands.fan ? "BẬT" : "TẮT";
  $("door").textContent = commands.doorOpen ? "MỞ" : "ĐÓNG";
  $("pump").disabled = !telemetry.pumpAvailable;
  $("pump").textContent = telemetry.pumpAvailable ? (commands.pump ? "BẬT" : "TẮT") : "CHƯA KÍCH HOẠT";
}
async function command(changes) {
  await runTransaction(commandsRef, current => ({
    mode: current?.mode === "MANUAL" ? "MANUAL" : "AUTO",
    fan: Boolean(current?.fan),
    pump: Boolean(current?.pump),
    doorOpen: Boolean(current?.doorOpen),
    ...changes,
    sequence: (Number(current?.sequence) || 0) + 1
  }));
}

$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  $("login-error").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("email").value, $("password").value); }
  catch (error) { $("login-error").textContent = "Đăng nhập thất bại. Kiểm tra email hoặc mật khẩu."; }
});
$("logout").addEventListener("click", () => signOut(auth));
$("mode").addEventListener("click", () => command({ mode: commands.mode === "MANUAL" ? "AUTO" : "MANUAL" }));
$("fan").addEventListener("click", () => command({ fan: !commands.fan }));
$("pump").addEventListener("click", () => command({ pump: !commands.pump }));
$("door").addEventListener("click", () => command({ doorOpen: !commands.doorOpen }));

onAuthStateChanged(auth, user => {
  $("login").classList.toggle("hidden", !!user);
  $("dashboard").classList.toggle("hidden", !user);
  $("logout").classList.toggle("hidden", !user);
  if (stopTelemetry) stopTelemetry();
  if (stopCommands) stopCommands();
  if (!user) return;
  stopTelemetry = onValue(telemetryRef, snapshot => { telemetry = snapshot.val() || {}; render(); });
  stopCommands = onValue(commandsRef, snapshot => { commands = { ...commands, ...(snapshot.val() || {}) }; render(); });
});
setInterval(render, 2000);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
