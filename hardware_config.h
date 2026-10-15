#pragma once
#include <Arduino.h>
constexpr uint8_t DOOR_CLOSED_ANGLE = 0;
constexpr uint8_t DOOR_OPEN_ANGLE = 90;
constexpr bool FLAME_ACTIVE_LOW = true;
constexpr int GAS_THRESHOLD_ON = 500;
constexpr int GAS_THRESHOLD_OFF = 450;
constexpr unsigned long SENSOR_INTERVAL_MS = 250;
constexpr unsigned long DHT_INTERVAL_MS = 2000;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 2000;
constexpr unsigned long COMMAND_INTERVAL_MS = 1000;
constexpr unsigned long BUTTON_DEBOUNCE_MS = 40;
constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
constexpr uint8_t MQ2_SAMPLES_PER_READ = 8;
