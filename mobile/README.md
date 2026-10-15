# FireGas Home Mobile

Ứng dụng React Native + TypeScript chạy bằng Expo SDK 57. Điều hướng dùng Expo Router (xây trên React Navigation), Firebase JavaScript SDK dùng cho Email/Password Auth và Realtime Database.

## Cấu trúc

```text
src/app/          Routes: Login và 4 bottom tabs
src/components/   UI dùng chung
src/context/      Session, Firebase, telemetry, commands, Demo Mode
src/services/     Firebase, command transaction, notification placeholder
src/types/        Data contract TypeScript
src/utils/        Luật an toàn và format
src/theme/        Màu, spacing, typography
```

## Cài đặt và chạy bằng Expo Go

```powershell
cd C:\Users\viet\Downloads\FireGasHome\mobile
npm install
Copy-Item .env.example .env
npx expo start
```

Quét QR bằng Expo Go. Điện thoại và máy tính nên dùng chung mạng LAN. Nếu LAN không hoạt động:

```powershell
npx expo start --tunnel
```

Trên Windows PowerShell bị chặn script, có thể dùng `npm.cmd` và `npx.cmd` thay cho `npm`/`npx`.

## Firebase config và Authentication

Firebase Web config được đọc từ các biến `EXPO_PUBLIC_*` trong `.env`; `.env.example` chứa project config công khai đang dùng ở Web. Không đặt Wi-Fi password, device password, service-account key hoặc user password trong Mobile.

Real Mode dùng Firebase Email/Password Authentication thật. Không tự đăng nhập bằng tài khoản ESP32.

Paths:

- Telemetry: `devices/firegas01/telemetry`
- Commands: `devices/firegas01/commands`
- SDK connection: `.info/connected`

## Real Mode và Demo Mode

Real Mode là mặc định khi `EXPO_PUBLIC_DEMO_MODE=false`. App không sinh mock và không fallback sang Demo khi Firebase lỗi.

Để test UI, đặt trong `.env`:

```dotenv
EXPO_PUBLIC_DEMO_MODE=true
```

Khởi động lại Metro với `npx expo start --clear`. Demo có Normal, Gas, Fire, Critical, Offline và Stale; luôn hiển thị nhãn dữ liệu mô phỏng. Demo không khởi tạo Firebase.

## Telemetry

App hỗ trợ: `temperature`, `humidity`, `dhtOk`, `gas`, `gasRaw`, `gasDetected`, `flame`, `flameValue`, `flameSensorAvailable`, `alarm`, `fan`, `pump`, `doorOpen`, `mode`, `wifiRssi`, `arduinoConnected`, `manualFan`, `manualPump`, `manualDoor`, `fanControlLocked`, `pumpControlLocked`, `doorControlLocked`, `lastSeen`.

Field thiếu hiển thị Unknown/No data; app không tự tạo field trong Real Mode.

## AUTO, MANUAL và Safety Lock

- AUTO: khóa điều khiển thủ công.
- MANUAL: chỉ cho điều khiển khi Internet/Firebase connected, commands đã tải, ESP32 online và telemetry fresh.
- Safety lock tương ứng luôn khóa Fan/Pump/Door; Mobile không override.
- Mất mạng, stale hoặc offline sẽ khóa controls.

## ESP32 Online và telemetry stale

`ESP32_ONLINE_TIMEOUT_MS = 15000`:

- Không có `lastSeen`: Unknown.
- Tuổi dữ liệu ≤15 giây: Online/Fresh.
- Quá 15 giây: Offline/STALE.

Stale/no telemetry có ưu tiên cao nhất, vì vậy safety banner không báo Safe.

## Commands và xác nhận thiết bị

Transaction ghi `mode`, `fan`, `pump`, `doorOpen` và tăng `sequence` từ giá trị hiện tại, tương thích Web và nhiều client đồng thời.

Flow: `Sending → Waiting confirmation → Confirmed | Timeout | Failed`. Write Firebase thành công chưa phải thiết bị thành công. App chỉ Confirmed khi actual output `telemetry.fan/pump/doorOpen` khớp requested state. Timeout là 8 giây và không tự resend.

## Chart

Real Mode chỉ append telemetry mới nhận được vào history trong RAM, tối đa 120 điểm; reload sẽ reset. Demo Mode mới sinh lịch sử mô phỏng.

## Kiểm tra chất lượng

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Tests bao phủ online/offline/unknown, stale priority, Gas/Fire/Critical, control gating, safety lock, confirmation và timeout constant.

## Android build / APK test

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --profile preview -p android
```

Profile `preview` trong `eas.json` tạo APK internal distribution. Production dùng `eas build -p android`. Package name: `com.firegas.home`.

## iOS notes

Có thể xem bằng Expo Go trên iPhone. Build iOS qua EAS không cần máy Mac, nhưng phát hành cần Apple Developer account và signing hợp lệ. Bundle ID: `com.firegas.home`.

## Push notification TODO

`src/services/notifications.ts` chỉ là điểm mở rộng. Push Gas/Fire production cần backend tin cậy, Cloud Functions/FCM hoặc Expo Push Service để xác thực telemetry và giữ server credential ngoài app. Không fake push production trong phiên bản này.

## Handoff cho Firebase/hardware

- Bật Email/Password provider và cấp user vận hành.
- Rules phải cho user hợp lệ đọc telemetry, đọc/ghi commands.
- ESP32 cập nhật `lastSeen` theo thời gian thực và đều đặn.
- `arduinoConnected`, `dhtOk`, safety locks phải phản ánh trạng thái thật.
- `fan`, `pump`, `doorOpen` phải là output thực tế để app xác nhận command.
- ESP32 xử lý `sequence` và tiếp tục ưu tiên an toàn cục bộ khi Firebase/Mobile mất kết nối.
