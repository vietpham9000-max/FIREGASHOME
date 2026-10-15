#include "ArduinoBridge.h"
#include "../pins.h"

namespace {
constexpr uint32_t UART_BAUD = 9600;
constexpr unsigned long PING_INTERVAL_MS = 5000;
constexpr unsigned long CONNECTION_TIMEOUT_MS = 15000;
constexpr unsigned long RETRY_INTERVAL_MS = 1000;
}

void ArduinoBridge::begin() {
  serial_.begin(UART_BAUD, SERIAL_8N1, PIN_UART_RX, PIN_UART_TX);
  input_.reserve(40);
  send("STATUS?");
  send("PING");
}
void ArduinoBridge::send(const char *message) { serial_.println(message); }
void ArduinoBridge::setFan(bool on) {
  if (desiredFan_ != on) { desiredFan_ = on; fanPending_ = true; }
}
void ArduinoBridge::setPump(bool on) {
  if (desiredPump_ != on) { desiredPump_ = on; pumpPending_ = true; }
}
bool ArduinoBridge::fanState() const { return fan_; }
bool ArduinoBridge::pumpState() const { return pump_; }
bool ArduinoBridge::connected() const {
  return lastReceiveAt_ != 0 && millis() - lastReceiveAt_ < CONNECTION_TIMEOUT_MS;
}
void ArduinoBridge::handleLine(const String &line) {
  lastReceiveAt_ = millis();
  if (line == "READY") {
    fanPending_ = true;
    pumpPending_ = true;
    send("STATUS?");
  } else if (line == "FAN:1" || line == "FAN:0") {
    fan_ = line.endsWith("1");
    fanPending_ = fan_ != desiredFan_;
  } else if (line == "PUMP:1" || line == "PUMP:0") {
    pump_ = line.endsWith("1");
    pumpPending_ = false;
  }
}
void ArduinoBridge::loop() {
  while (serial_.available()) {
    const char value = static_cast<char>(serial_.read());
    if (value == '\n') {
      input_.trim();
      if (!input_.isEmpty()) handleLine(input_);
      input_ = "";
    } else if (value != '\r' && input_.length() < 39) input_ += value;
  }
  const unsigned long now = millis();
  if (now - lastPingAt_ >= PING_INTERVAL_MS) {
    lastPingAt_ = now;
    send("PING");
  }
  if (now - lastCommandAt_ >= RETRY_INTERVAL_MS) {
    lastCommandAt_ = now;
    if (fanPending_) send(desiredFan_ ? "FAN:1" : "FAN:0");
    if (pumpPending_) send(desiredPump_ ? "PUMP:1" : "PUMP:0");
  }
}
