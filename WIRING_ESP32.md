# Đấu dây FireGasHome

## ESP32

| GPIO | Chức năng |
|---|---|
| 4 | DHT22 DATA |
| 16 | LED báo cháy |
| 17 | LED báo gas |
| 18 | Servo cửa thoát hiểm 1 |
| 19 | Servo cửa thoát hiểm 2 |
| 23 | Buzzer duy nhất |
| 25 | UART2 TX tới UNO D10 RX |
| 26 | UART2 RX từ UNO D11 TX qua chia áp |
| 27 | Flame sensor DO |
| 32 | Nút quạt, chân còn lại nối GND (`INPUT_PULLUP`, nhấn = LOW) |
| 34 | MQ-2 AO qua cầu chia áp |

GPIO33 không sử dụng. ESP32 không nối trực tiếp tới relay quạt/bơm và không cấp nguồn cho tải quạt/bơm.

## UART ESP32 ↔ UNO

- ESP32 GPIO25 TX → UNO D10 RX.
- UNO D11 TX (5 V) → điện trở 2 kΩ → node → ESP32 GPIO26 RX.
- Node → điện trở 1 kΩ → GND.
- Bắt buộc nối chung GND ESP32 và UNO.
- Baud: 9600, dữ liệu từng dòng kết thúc bằng `\n`.

## MQ-2

MQ-2 AO → 1 kΩ → 1 kΩ → node → GPIO34; node → 1 kΩ → GND. Firmware đọc ADC 0..4095 rồi scale về 0..1023 và dùng hysteresis.

## UNO và relay

- D7: relay quạt active LOW, đang bật cho phép trong firmware.
- D8: relay bơm active LOW, đang khóa bằng `ENABLE_PUMP_RELAY=false`.
- Nguồn tải quạt/bơm đi qua tiếp điểm relay và nguồn phù hợp riêng; không lấy từ GPIO ESP32.
