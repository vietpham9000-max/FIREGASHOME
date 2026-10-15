# FireGasHome

Hệ thống giám sát cháy và rò rỉ khí gas dùng ESP32 DevKit và Arduino UNO R3.

- ESP32 đọc MQ-2, flame sensor và DHT22; điều khiển hai servo cửa, buzzer, LED; kết nối Wi-Fi/Firebase; xử lý nút quạt.
- UNO điều khiển relay quạt D7 và relay bơm D8 qua giao thức UART. Relay bơm mặc định bị khóa vì dây chưa được xác nhận.
- Logic an toàn gas/fire chạy cục bộ kể cả khi mất Wi-Fi hoặc Firebase.
- Dashboard Firebase Hosting nằm trong `web/` và hỗ trợ cài PWA.

## Cấu hình

Sao chép giá trị mẫu trong `config.example.h` sang `config.h`, sau đó điền Wi-Fi, Firebase Web API key và tài khoản Email/Password dành cho thiết bị. `config.h` được gitignore.

Trong `web/app.js`, thay `YOUR_FIREBASE_WEB_API_KEY` bằng API key của Firebase Web App. Bật Email/Password provider và tự tạo tài khoản trong Firebase Console; dashboard không cho tự đăng ký.

## Build ESP32

```text
pio run
```

Không cần upload để kiểm tra build. Sketch UNO và hướng dẫn test UART nằm tại `arduino_uno/FireGasUno/`.

## Firebase

Cấu trúc Realtime Database:

- `/devices/firegas01/telemetry`: dữ liệu cảm biến và trạng thái thực tế.
- `/devices/firegas01/commands`: `fan`, `pump`, `doorOpen`, `mode`, `sequence`.

`firebase.json` và `database.rules.json` đã sẵn sàng nhưng không tự deploy. Rules yêu cầu đăng nhập cho cả đọc và ghi.

> Đây là prototype học tập, không thay thế thiết bị báo cháy, chữa cháy hoặc phát hiện khí gas đạt chuẩn.
