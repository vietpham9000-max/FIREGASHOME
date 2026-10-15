# FireGas Web Dashboard

## Mục đích và cách chạy

Web dùng Firebase Authentication và Firebase Realtime Database để giám sát FireGasHome, hiển thị telemetry và gửi lệnh. Web không thay thế logic an toàn cục bộ trên thiết bị.

```powershell
python -m http.server 5500
```

Mở `http://localhost:5500/web/`.

## Real Mode

`/web/` mặc định là Real Mode. Chế độ này chỉ dùng Firebase, Auth và telemetry thật; không sinh mock và không tự chuyển sang Demo khi Firebase lỗi. Người vận hành phải đăng nhập bằng tài khoản Firebase Authentication hợp lệ.

## Demo Mode

Mở `/web/?demo=1`. Có thể chọn tình huống trên giao diện hoặc dùng:

- `?demo=1&scenario=normal`
- `?demo=1&scenario=gas`
- `?demo=1&scenario=fire`
- `?demo=1&scenario=critical`

Demo Mode được đánh dấu là dữ liệu mô phỏng và không khởi tạo Firebase.

## Firebase và Authentication

`firebaseConfig` nằm đầu `app.js`. Web dùng Firebase SDK 11.1.0 và Email/Password Authentication. Không đặt email, mật khẩu người dùng hoặc mật khẩu thiết bị trong source Web.

Database paths:

- Telemetry: `devices/firegas01/telemetry`
- Commands: `devices/firegas01/commands`
- Trạng thái kết nối SDK: `.info/connected`

## Data contract

Telemetry Web sử dụng: `temperature`, `humidity`, `gas`, `gasRaw`, `gasDetected`, `flame`, `flameValue`, `alarm`, `fan`, `pump`, `doorOpen`, `wifiRssi`, `arduinoConnected`, `dhtOk`, `fanControlLocked`, `pumpControlLocked`, `doorControlLocked`, `lastSeen`.

`lastSeen` nên là Unix timestamp mili-giây; Web cũng chấp nhận timestamp giây.

Commands Web ghi: `mode`, `fan`, `pump`, `doorOpen`, `sequence`. Mỗi transaction tăng `sequence` và giữ các command field còn lại.

## AUTO, MANUAL và Safety Lock

- `AUTO`: khóa điều khiển thủ công.
- `MANUAL`: cho phép gửi lệnh khi Firebase và ESP32 đang kết nối, telemetry còn mới.
- `fanControlLocked`, `pumpControlLocked`, `doorControlLocked`: khóa riêng từng thiết bị; logic an toàn luôn được ưu tiên.
- Mất mạng, Firebase disconnected, ESP32 offline hoặc telemetry stale: khóa toàn bộ điều khiển.

## Online, stale và kết nối

`ESP32_ONLINE_TIMEOUT_MS = 15000`. ESP32 Online khi `Date.now() - lastSeen <= 15 giây`; quá hạn là Offline/STALE. Không có `lastSeen` là Unknown. Banner không báo an toàn khi telemetry thiếu hoặc stale.

Arduino UNO hiển thị đúng field `arduinoConnected`; thiếu field là Unknown. Firebase phân biệt Connected, Connecting và Disconnected. Web cũng lắng nghe `window.online/offline`.

## Xác nhận command

1. Gửi transaction: `Đang gửi…`.
2. Write thành công: `Đã gửi lệnh · đang chờ thiết bị xác nhận`.
3. Chờ `telemetry.fan`, `telemetry.pump` hoặc `telemetry.doorOpen` khớp yêu cầu.
4. Khớp: `Thiết bị đã xác nhận`.
5. Không khớp sau `COMMAND_CONFIRM_TIMEOUT_MS = 8000`: `Thiết bị chưa xác nhận`.

Web không tự gửi lại và không coi Firebase write thành công là relay đã hoạt động.

## Chart history

Demo Mode có lịch sử mô phỏng. Real Mode chỉ giữ lịch sử in-memory từ telemetry nhận sau khi mở trang, tối đa `MAX_HISTORY_POINTS = 120`. Reload sẽ xóa lịch sử; Web không thay đổi database để lưu chart.

## Data flow

```text
Sensors → ESP32 → Firebase telemetry → Web
Web → Firebase commands → ESP32 → UART → Arduino UNO → Relay/Actuator
```

## Yêu cầu dành cho hardware developer

- Cập nhật `lastSeen` đều đặn bằng thời gian thực đồng bộ được.
- Báo `arduinoConnected`, `dhtOk` và các safety lock đúng trạng thái thực.
- Phản hồi output thực tế qua `fan`, `pump`, `doorOpen`, không chỉ echo command.
- Xử lý `sequence` để tránh bỏ sót hoặc thực thi lặp lệnh.
- Luôn ưu tiên logic an toàn cục bộ khi Web/Firebase mất kết nối.

## Các file chính

- `index.html`: cấu trúc login/dashboard.
- `style.css`: giao diện và responsive.
- `app.js`: Auth, Firebase, telemetry, commands, Demo Mode và chart.
- `manifest.json`, `service-worker.js`, `icon.svg`: PWA và asset.

## Checklist bàn giao

1. Bật Email/Password Authentication và Authorized Domains phù hợp.
2. Kiểm tra user vận hành đăng nhập được.
3. Xác nhận hai database paths và Firebase Rules cho đúng user.
4. Kiểm tra Online, sau đó tắt ESP32 để xác nhận Offline/STALE sau 15 giây.
5. Thử AUTO/MANUAL, từng safety lock và telemetry xác nhận output.
6. Ngắt mạng trình duyệt để xác nhận control bị khóa.
7. Kiểm tra Demo Mode riêng, bảo đảm không nhầm với dữ liệu thật.
