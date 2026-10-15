import { ConnectionBar } from '@/components/ConnectionBar';
import { DeviceRow } from '@/components/DeviceRow';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useApp } from '@/context/AppContext';
import { gasValue, getEsp32State } from '@/utils/domain';

export default function DevicesScreen() {
  const { isDemoMode, telemetry, telemetryHealth, telemetryReceived, firebaseState, internetOnline } = useApp();
  const esp = getEsp32State(telemetryHealth, isDemoMode);
  const isStale = telemetryHealth === 'stale';
  const isOffline = esp === 'offline';
  const isStaleOrOffline = isStale || isOffline;
  const gas = gasValue(telemetry);
  const gasDetected = telemetry?.gasDetected === true || (gas != null && gas >= 400);
  const unknown = telemetryReceived ? 'Không có dữ liệu' : 'Đang tải dữ liệu';
  const firebaseDisplay = isDemoMode ? 'DEMO' : !internetOnline ? 'DISCONNECTED' : firebaseState.toUpperCase();

  const arduinoStatus = isDemoMode && !isStaleOrOffline
    ? 'SIMULATED'
    : isStaleOrOffline
    ? 'STALE'
    : telemetry?.arduinoConnected === true
    ? 'ONLINE'
    : telemetry?.arduinoConnected === false
    ? 'OFFLINE'
    : 'UNKNOWN';
  const arduinoTone = isDemoMode && !isStaleOrOffline
    ? 'blue'
    : isStaleOrOffline
    ? 'warning'
    : telemetry?.arduinoConnected === true
    ? 'success'
    : telemetry?.arduinoConnected === false
    ? 'danger'
    : 'neutral';
  const arduinoDesc = isStaleOrOffline
    ? 'Trạng thái cũ do ESP32 báo cáo'
    : typeof telemetry?.arduinoConnected === 'boolean'
    ? 'Trạng thái do ESP32 báo cáo'
    : unknown;

  const dhtStatus = isStaleOrOffline
    ? 'STALE'
    : telemetry?.dhtOk === false
    ? 'ERROR'
    : telemetry?.dhtOk === true
    ? 'NORMAL'
    : 'UNKNOWN';
  const dhtTone = isStaleOrOffline
    ? 'warning'
    : telemetry?.dhtOk === false
    ? 'danger'
    : telemetry?.dhtOk === true
    ? 'success'
    : 'neutral';
  const dhtDesc = isStaleOrOffline ? 'Dữ liệu cảm biến đã quá hạn' : 'Cảm biến nhiệt độ và độ ẩm';

  const mq2Status = isStaleOrOffline
    ? 'STALE'
    : gasDetected
    ? 'GAS DETECTED'
    : gas == null
    ? 'NO DATA'
    : 'NORMAL';
  const mq2Tone = isStaleOrOffline
    ? 'warning'
    : gasDetected
    ? 'danger'
    : gas == null
    ? 'neutral'
    : 'success';
  const mq2Desc = gas == null
    ? unknown
    : isStaleOrOffline
    ? `Giá trị cuối: ${Math.round(gas)} / 1023`
    : `Giá trị hiện tại: ${Math.round(gas)} / 1023`;

  const flameStatus = isStaleOrOffline
    ? 'STALE'
    : telemetry?.flameSensorAvailable === false
    ? 'ERROR'
    : telemetry?.flame === true
    ? 'FIRE'
    : telemetry?.flame === false
    ? 'NORMAL'
    : 'UNKNOWN';
  const flameTone = isStaleOrOffline
    ? 'warning'
    : telemetry?.flameSensorAvailable === false || telemetry?.flame === true
    ? 'danger'
    : telemetry?.flame === false
    ? 'success'
    : 'neutral';
  const flameDesc = telemetry?.flameSensorAvailable === false
    ? 'Cảm biến không khả dụng'
    : isStaleOrOffline
    ? 'Dữ liệu cảm biến đã quá hạn'
    : 'Phát hiện ngọn lửa';

  const fanStatus = isStaleOrOffline
    ? typeof telemetry?.fan === 'boolean'
      ? telemetry.fan ? 'LAST: ON' : 'LAST: OFF'
      : 'UNKNOWN'
    : telemetry?.fan === true
    ? 'ON'
    : telemetry?.fan === false
    ? 'OFF'
    : 'UNKNOWN';
  const fanTone = isStaleOrOffline
    ? (typeof telemetry?.fan === 'boolean' ? 'warning' : 'neutral')
    : (telemetry?.fan ? 'success' : 'neutral');
  const fanDesc = isStaleOrOffline
    ? 'Trạng thái thực tế cuối từ telemetry'
    : 'Relay/actuator thực tế từ telemetry';

  const pumpStatus = isStaleOrOffline
    ? typeof telemetry?.pump === 'boolean'
      ? telemetry.pump ? 'LAST: ON' : 'LAST: OFF'
      : 'UNKNOWN'
    : telemetry?.pump === true
    ? 'ON'
    : telemetry?.pump === false
    ? 'OFF'
    : 'UNKNOWN';
  const pumpTone = isStaleOrOffline
    ? (typeof telemetry?.pump === 'boolean' ? 'warning' : 'neutral')
    : (telemetry?.pump ? 'success' : 'neutral');
  const pumpDesc = isStaleOrOffline
    ? 'Trạng thái thực tế cuối từ telemetry'
    : 'Thiết bị ứng phó cháy';

  const doorStatus = isStaleOrOffline
    ? typeof telemetry?.doorOpen === 'boolean'
      ? telemetry.doorOpen ? 'LAST: OPEN' : 'LAST: CLOSED'
      : 'UNKNOWN'
    : telemetry?.doorOpen === true
    ? 'OPEN'
    : telemetry?.doorOpen === false
    ? 'CLOSED'
    : 'UNKNOWN';
  const doorTone = isStaleOrOffline
    ? (typeof telemetry?.doorOpen === 'boolean' ? 'warning' : 'neutral')
    : (telemetry?.doorOpen ? 'warning' : 'neutral');
  const doorDesc = isStaleOrOffline
    ? 'Trạng thái thực tế cuối từ telemetry'
    : 'Servo cửa do ESP32 điều khiển';

  const alarmStatus = isStaleOrOffline
    ? 'STALE'
    : telemetry?.alarm === true
    ? 'ACTIVE'
    : telemetry?.alarm === false
    ? 'NORMAL'
    : 'UNKNOWN';
  const alarmTone = isStaleOrOffline
    ? 'warning'
    : telemetry?.alarm
    ? 'danger'
    : telemetry?.alarm === false
    ? 'success'
    : 'neutral';
  const alarmDesc = isStaleOrOffline
    ? 'Trạng thái thực tế cuối từ telemetry'
    : 'Cảnh báo tại chỗ';

  return (
    <Screen>
      <SectionHeader eyebrow="GIÁM SÁT THIẾT BỊ" title="Trạng thái thiết bị" />
      <ConnectionBar />
      <DeviceRow icon="globe-outline" name="Internet" description="Kết nối mạng của điện thoại" status={internetOnline ? 'ONLINE' : 'OFFLINE'} tone={internetOnline ? 'success' : 'danger'} />
      <DeviceRow icon="cloud-outline" name="Firebase" description="Realtime Database connection" status={firebaseDisplay} tone={isDemoMode ? 'blue' : firebaseDisplay === 'CONNECTED' ? 'success' : firebaseDisplay === 'CONNECTING' ? 'warning' : 'danger'} />
      <DeviceRow icon="hardware-chip-outline" name="ESP32" description={esp === 'demo' ? 'Thiết bị đang được mô phỏng' : esp === 'online' ? 'Telemetry đang cập nhật' : esp === 'offline' ? 'Telemetry đã quá hạn' : 'Chưa nhận lastSeen'} status={esp.toUpperCase()} tone={esp === 'online' ? 'success' : esp === 'demo' ? 'blue' : esp === 'offline' ? 'danger' : 'neutral'} />
      <DeviceRow icon="hardware-chip-outline" name="Arduino UNO" description={arduinoDesc} status={arduinoStatus} tone={arduinoTone} />
      <DeviceRow icon="thermometer-outline" name="DHT22" description={dhtDesc} status={dhtStatus} tone={dhtTone} />
      <DeviceRow icon="warning-outline" name="MQ-2 Gas Sensor" description={mq2Desc} status={mq2Status} tone={mq2Tone} />
      <DeviceRow icon="flame-outline" name="Flame Sensor" description={flameDesc} status={flameStatus} tone={flameTone} />
      <DeviceRow icon="refresh-outline" name="Quạt thông gió" description={fanDesc} status={fanStatus} tone={fanTone} />
      <DeviceRow icon="water-outline" name="Bơm nước" description={pumpDesc} status={pumpStatus} tone={pumpTone} />
      <DeviceRow icon="exit-outline" name="Cửa thoát hiểm" description={doorDesc} status={doorStatus} tone={doorTone} />
      <DeviceRow icon="notifications-outline" name="Còi cảnh báo" description={alarmDesc} status={alarmStatus} tone={alarmTone} />
    </Screen>
  );
}
