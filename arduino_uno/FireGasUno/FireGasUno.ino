#include <SoftwareSerial.h>

constexpr uint8_t PIN_FAN_RELAY = 7;
constexpr uint8_t PIN_PUMP_RELAY = 8;
constexpr uint8_t PIN_UART_RX = 10;
constexpr uint8_t PIN_UART_TX = 11;
constexpr bool RELAY_ACTIVE_LOW = true;

#define ENABLE_FAN_RELAY true
#define ENABLE_PUMP_RELAY false

SoftwareSerial espSerial(PIN_UART_RX, PIN_UART_TX);
String input;
bool fanState = false;
bool pumpState = false;

void writeRelay(uint8_t pin, bool on) {
  digitalWrite(pin, (on == RELAY_ACTIVE_LOW) ? LOW : HIGH);
}
void reportStates() {
  espSerial.println(fanState ? F("FAN:1") : F("FAN:0"));
  espSerial.println(pumpState ? F("PUMP:1") : F("PUMP:0"));
}
void handleCommand(const String &command) {
  if (command == "PING") espSerial.println(F("PONG"));
  else if (command == "STATUS?") reportStates();
  else if (command == "FAN:1" || command == "FAN:0") {
    const bool requested = command.endsWith("1");
    fanState = ENABLE_FAN_RELAY && requested;
    writeRelay(PIN_FAN_RELAY, fanState);
    espSerial.println(fanState ? F("FAN:1") : F("FAN:0"));
  } else if (command == "PUMP:1" || command == "PUMP:0") {
    const bool requested = command.endsWith("1");
    if (!ENABLE_PUMP_RELAY && requested) Serial.println(F("PUMP DISABLED - wiring not confirmed"));
    pumpState = ENABLE_PUMP_RELAY && requested;
    writeRelay(PIN_PUMP_RELAY, pumpState);
    espSerial.println(pumpState ? F("PUMP:1") : F("PUMP:0"));
  }
}
void setup() {
  pinMode(PIN_FAN_RELAY, OUTPUT);
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  writeRelay(PIN_FAN_RELAY, false);
  writeRelay(PIN_PUMP_RELAY, false);
  Serial.begin(115200);
  espSerial.begin(9600);
  input.reserve(40);
  espSerial.println(F("READY"));
  reportStates();
}
void loop() {
  while (espSerial.available()) {
    const char value = static_cast<char>(espSerial.read());
    if (value == '\n') {
      input.trim();
      if (!input.isEmpty()) handleCommand(input);
      input = "";
    } else if (value != '\r' && input.length() < 39) input += value;
  }
}
