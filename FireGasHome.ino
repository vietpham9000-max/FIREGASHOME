#include "config.h"
#include "pins.h"
#include "hardware_config.h"
#include "ArduinoBridge.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

enum OperatingMode : uint8_t { MANUAL_MODE, AUTO_MODE };
struct SystemState {
  int gas = 0;
  float temperature = NAN, humidity = NAN;
  bool dhtValid = false, flame = false, gasDetected = false;
  bool alarm = false, doorOpen = false;
  bool manualFan = false, manualPump = false, manualDoor = false;
  OperatingMode mode = AUTO_MODE;
} state;
struct DebouncedButton { bool stable = HIGH, previous = HIGH; unsigned long changedAt = 0; } fanButton;

DHT dht(PIN_DHT22, DHT22);
Servo doorServo1, doorServo2;
ArduinoBridge arduinoBridge;
WiFiClientSecure secureClient;
String firebaseToken;
unsigned long firebaseTokenAt = 0, firebaseTokenLifetimeMs = 0;
long long lastCommandSequence = -1;
unsigned long lastSensorAt = 0, lastDhtAt = 0, lastTelemetryAt = 0;
unsigned long lastCommandsAt = 0, lastWiFiAttempt = 0;

String databaseUrl(const char *path) {
  String url = FIREBASE_DATABASE_URL;
  while (url.endsWith("/")) url.remove(url.length() - 1);
  return url + path + ".json?auth=" + firebaseToken;
}
bool firebaseAuthenticated() {
  return !firebaseToken.isEmpty() && millis() - firebaseTokenAt < firebaseTokenLifetimeMs;
}
bool authenticateFirebase() {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  const String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=") + FIREBASE_API_KEY;
  if (!http.begin(secureClient, url)) return false;
  http.setTimeout(2000);
  http.addHeader("Content-Type", "application/json");
  JsonDocument request;
  request["email"] = FIREBASE_DEVICE_EMAIL;
  request["password"] = FIREBASE_DEVICE_PASSWORD;
  request["returnSecureToken"] = true;
  String body;
  serializeJson(request, body);
  const int status = http.POST(body);
  const String response = http.getString();
  http.end();
  if (status != HTTP_CODE_OK) { Serial.printf("Firebase auth failed: HTTP %d\n", status); return false; }
  JsonDocument result;
  if (deserializeJson(result, response)) return false;
  firebaseToken = result["idToken"].as<String>();
  const unsigned long expiresSeconds = result["expiresIn"].as<unsigned long>();
  firebaseTokenAt = millis();
  firebaseTokenLifetimeMs = max(60000UL, (expiresSeconds > 120 ? expiresSeconds - 120 : 60) * 1000UL);
  Serial.println(F("Firebase: authenticated."));
  return !firebaseToken.isEmpty();
}
bool ensureFirebase() { return firebaseAuthenticated() || authenticateFirebase(); }

void setDoor(bool open) {
  if (state.doorOpen == open) return;
  state.doorOpen = open;
  doorServo1.write(open ? DOOR_OPEN_ANGLE : DOOR_CLOSED_ANGLE);
  doorServo2.write(open ? DOOR_OPEN_ANGLE : DOOR_CLOSED_ANGLE);
}
int readGas() {
  uint32_t total = 0;
  for (uint8_t i = 0; i < MQ2_SAMPLES_PER_READ; ++i) total += analogRead(PIN_MQ2_ANALOG);
  return static_cast<int>((total / MQ2_SAMPLES_PER_READ) * 1023UL / 4095UL);
}
void readSensors() {
  const unsigned long now = millis();
  if (now - lastSensorAt >= SENSOR_INTERVAL_MS) {
    lastSensorAt = now;
    state.gas = readGas();
    const bool level = digitalRead(PIN_FLAME_SENSOR);
    state.flame = FLAME_ACTIVE_LOW ? level == LOW : level == HIGH;
    if (!state.gasDetected && state.gas >= GAS_THRESHOLD_ON) state.gasDetected = true;
    else if (state.gasDetected && state.gas <= GAS_THRESHOLD_OFF) state.gasDetected = false;
  }
  if (now - lastDhtAt >= DHT_INTERVAL_MS) {
    lastDhtAt = now;
    const float humidity = dht.readHumidity(), temperature = dht.readTemperature();
    if (isnan(humidity) || isnan(temperature)) {
      state.dhtValid = false;
      Serial.println(F("WARN: DHT22 read failed; safety remains active."));
    } else {
      state.humidity = humidity; state.temperature = temperature; state.dhtValid = true;
    }
  }
}
bool fanButtonPressed() {
  const bool reading = digitalRead(PIN_FAN_BUTTON);
  const unsigned long now = millis();
  if (reading != fanButton.previous) { fanButton.previous = reading; fanButton.changedAt = now; }
  if (now - fanButton.changedAt >= BUTTON_DEBOUNCE_MS && reading != fanButton.stable) {
    fanButton.stable = reading;
    return reading == LOW;
  }
  return false;
}
void updateSafetyOutputs() {
  const bool fanDesired = state.gasDetected || (state.mode == MANUAL_MODE && state.manualFan);
  const bool pumpDesired = state.flame || (state.mode == MANUAL_MODE && state.manualPump);
  const bool doorDesired = state.flame || (state.mode == MANUAL_MODE && state.manualDoor);
  state.alarm = state.gasDetected || state.flame;
  arduinoBridge.setFan(fanDesired);
  arduinoBridge.setPump(pumpDesired);
  setDoor(doorDesired);
  digitalWrite(PIN_BUZZER, state.alarm ? HIGH : LOW);
  digitalWrite(PIN_FIRE_LED, state.flame ? HIGH : LOW);
  digitalWrite(PIN_GAS_LED, state.gasDetected ? HIGH : LOW);
}
void connectWiFi() {
  const unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED || now - lastWiFiAttempt < WIFI_RETRY_INTERVAL_MS) return;
  lastWiFiAttempt = now;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}
void fetchCommands() {
  if (!ensureFirebase()) return;
  HTTPClient http;
  if (!http.begin(secureClient, databaseUrl("/devices/firegas01/commands"))) return;
  http.setTimeout(1500);
  const int status = http.GET();
  const String response = http.getString();
  http.end();
  if (status != HTTP_CODE_OK || response == "null") return;
  JsonDocument commands;
  if (deserializeJson(commands, response)) return;
  const long long sequence = commands["sequence"] | 0;
  if (sequence == lastCommandSequence) return;
  lastCommandSequence = sequence;
  const String mode = commands["mode"] | "AUTO";
  state.mode = mode.equalsIgnoreCase("MANUAL") ? MANUAL_MODE : AUTO_MODE;
  state.manualFan = commands["fan"] | false;
  state.manualPump = commands["pump"] | false;
  state.manualDoor = commands["doorOpen"] | false;
  Serial.printf("Firebase command sequence: %lld\n", sequence);
}
void sendTelemetry() {
  if (!ensureFirebase()) return;
  JsonDocument data;
  if (state.dhtValid) { data["temperature"] = state.temperature; data["humidity"] = state.humidity; }
  data["gas"] = state.gas;
  data["flame"] = state.flame;
  data["alarm"] = state.alarm;
  data["fan"] = arduinoBridge.fanState();
  data["pump"] = arduinoBridge.pumpState();
  data["pumpAvailable"] = false;
  data["doorOpen"] = state.doorOpen;
  data["mode"] = state.mode == AUTO_MODE ? "AUTO" : "MANUAL";
  data["wifiRssi"] = WiFi.RSSI();
  data["arduinoConnected"] = arduinoBridge.connected();
  data["lastSeen"][".sv"] = "timestamp";
  String body;
  serializeJson(data, body);
  HTTPClient http;
  if (!http.begin(secureClient, databaseUrl("/devices/firegas01/telemetry"))) return;
  http.setTimeout(1500);
  http.addHeader("Content-Type", "application/json");
  const int status = http.PUT(body);
  http.end();
  if (status < 200 || status >= 300) Serial.printf("Telemetry failed: HTTP %d\n", status);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_FLAME_SENSOR, INPUT); pinMode(PIN_MQ2_ANALOG, INPUT);
  pinMode(PIN_FAN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_FIRE_LED, OUTPUT); pinMode(PIN_GAS_LED, OUTPUT); pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_FIRE_LED, LOW); digitalWrite(PIN_GAS_LED, LOW); digitalWrite(PIN_BUZZER, LOW);
  analogReadResolution(12); analogSetPinAttenuation(PIN_MQ2_ANALOG, ADC_11db);
  dht.begin();
  doorServo1.setPeriodHertz(50); doorServo2.setPeriodHertz(50);
  doorServo1.attach(PIN_DOOR_SERVO_1, 500, 2400); doorServo2.attach(PIN_DOOR_SERVO_2, 500, 2400);
  doorServo1.write(DOOR_CLOSED_ANGLE); doorServo2.write(DOOR_CLOSED_ANGLE);
  arduinoBridge.begin();
  WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true); secureClient.setInsecure();
  lastWiFiAttempt = millis() - WIFI_RETRY_INTERVAL_MS;
  lastDhtAt = millis() - DHT_INTERVAL_MS;
  Serial.println(F("FireGasHome ESP32 started; local safety is active."));
}
void loop() {
  readSensors();
  if (fanButtonPressed()) {
    state.manualFan = !state.manualFan;
    Serial.printf("Fan manual request: %s\n", state.manualFan ? "ON" : "OFF");
  }
  updateSafetyOutputs();
  arduinoBridge.loop();
  connectWiFi();
  const unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED && now - lastCommandsAt >= COMMAND_INTERVAL_MS) {
    lastCommandsAt = now; fetchCommands();
  }
  if (WiFi.status() == WL_CONNECTED && now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now; sendTelemetry();
  }
}
