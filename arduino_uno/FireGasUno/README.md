# FireGasUno

UNO nhận lệnh UART không chặn từ ESP32 bằng `SoftwareSerial` 9600 baud.

- D10 RX nhận từ ESP32 GPIO25 TX.
- D11 TX (5 V) đi qua cầu chia áp 2 kΩ/1 kΩ tới ESP32 GPIO26 RX.
- D7 điều khiển relay quạt active LOW (`ENABLE_FAN_RELAY=true`).
- D8 dành cho relay bơm active LOW nhưng đang khóa (`ENABLE_PUMP_RELAY=false`).
- GND của ESP32 và UNO phải nối chung.

Khi bơm chưa được xác nhận dây, `PUMP:1` luôn giữ D8 OFF, trả `PUMP:0` và ghi cảnh báo lên Serial USB.

## Test UART an toàn

Để test mà không kích relay, tạm đổi cả hai cờ `ENABLE_*_RELAY` thành `false`, nạp sketch vào UNO, rồi gửi từng dòng `PING`, `STATUS?`, `FAN:1`, `PUMP:1` qua một bộ chuyển USB–TTL nối D10/D11 đúng mức điện áp. Theo dõi phản hồi ở phía UART và log ở Serial Monitor. Không nối tải quạt/bơm trong bài test này.
