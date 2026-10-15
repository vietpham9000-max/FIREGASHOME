#pragma once
#include <Arduino.h>
class ArduinoBridge {
 public:
  void begin();
  void loop();
  void setFan(bool on);
  void setPump(bool on);
  bool fanState() const;
  bool pumpState() const;
  bool connected() const;
 private:
  void send(const char *message);
  void handleLine(const String &line);
  HardwareSerial serial_{2};
  String input_;
  bool desiredFan_ = false;
  bool desiredPump_ = false;
  bool fan_ = false;
  bool pump_ = false;
  bool fanPending_ = true;
  bool pumpPending_ = true;
  unsigned long lastReceiveAt_ = 0;
  unsigned long lastPingAt_ = 0;
  unsigned long lastCommandAt_ = 0;
};
