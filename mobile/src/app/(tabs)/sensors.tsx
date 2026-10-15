import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { DeviceRow } from '@/components/DeviceRow';
import { MiniChart } from '@/components/MiniChart';
import { useApp } from '@/context/AppContext';
import { gasValue } from '@/utils/domain';

export default function SensorsScreen() {
  const { telemetry, telemetryHealth, telemetryReceived } = useApp();
  const stale = telemetryHealth === 'stale';
  const empty = telemetryReceived ? 'Không có dữ liệu' : 'Đang tải dữ liệu';
  const gas = gasValue(telemetry);
  const gasDetected = telemetry?.gasDetected === true || (gas != null && gas >= 400);

  const dhtStatus = stale
    ? 'STALE'
    : telemetry?.dhtOk === false
    ? 'ERROR'
    : Number.isFinite(telemetry?.temperature)
    ? 'NORMAL'
    : 'NO DATA';
  const dhtTone = stale
    ? 'warning'
    : telemetry?.dhtOk === false
    ? 'danger'
    : Number.isFinite(telemetry?.temperature)
    ? 'success'
    : 'neutral';
  const tempDesc = stale && Number.isFinite(telemetry?.temperature)
    ? `Giá trị cuối: ${Number(telemetry?.temperature).toFixed(1)} °C`
    : telemetry?.dhtOk === false
    ? 'DHT22 không phản hồi'
    : Number.isFinite(telemetry?.temperature)
    ? `${Number(telemetry?.temperature).toFixed(1)} °C`
    : empty;

  const humidityStatus = stale
    ? 'STALE'
    : telemetry?.dhtOk === false
    ? 'ERROR'
    : Number.isFinite(telemetry?.humidity)
    ? 'NORMAL'
    : 'NO DATA';
  const humidityTone = stale
    ? 'warning'
    : telemetry?.dhtOk === false
    ? 'danger'
    : Number.isFinite(telemetry?.humidity)
    ? 'success'
    : 'neutral';
  const humidityDesc = stale && Number.isFinite(telemetry?.humidity)
    ? `Giá trị cuối: ${Math.round(Number(telemetry?.humidity))} %`
    : telemetry?.dhtOk === false
    ? 'DHT22 không phản hồi'
    : Number.isFinite(telemetry?.humidity)
    ? `${Math.round(Number(telemetry?.humidity))} %`
    : empty;

  const mq2Status = stale
    ? 'STALE'
    : gasDetected
    ? 'DANGER'
    : gas == null
    ? 'NO DATA'
    : 'NORMAL';
  const mq2Tone = stale
    ? 'warning'
    : gasDetected
    ? 'danger'
    : gas == null
    ? 'neutral'
    : 'success';
  const mq2Desc = gas == null
    ? empty
    : `${stale ? 'Giá trị cuối · ' : ''}Gas: ${Math.round(gas)} · Raw: ${telemetry?.gasRaw ?? 'Unknown'}`;

  const flameStatus = stale
    ? 'STALE'
    : telemetry?.flameSensorAvailable === false
    ? 'ERROR'
    : telemetry?.flame === true
    ? 'FIRE'
    : telemetry?.flame === false
    ? 'NORMAL'
    : 'NO DATA';
  const flameTone = stale
    ? 'warning'
    : telemetry?.flameSensorAvailable === false || telemetry?.flame === true
    ? 'danger'
    : telemetry?.flame === false
    ? 'success'
    : 'neutral';
  const flameDesc = telemetry?.flameSensorAvailable === false
    ? 'Cảm biến không khả dụng'
    : typeof telemetry?.flame === 'boolean'
    ? `${stale ? 'Giá trị cuối · ' : ''}Flame value: ${telemetry.flameValue ?? 'Unknown'}`
    : empty;

  const wifiStatus = stale
    ? 'STALE'
    : Number.isFinite(telemetry?.wifiRssi)
    ? Number(telemetry?.wifiRssi) >= -75
      ? 'NORMAL'
      : 'WEAK'
    : 'NO DATA';
  const wifiTone = stale || (Number.isFinite(telemetry?.wifiRssi) && Number(telemetry?.wifiRssi) < -75)
    ? 'warning'
    : Number.isFinite(telemetry?.wifiRssi)
    ? 'success'
    : 'neutral';
  const wifiDesc = Number.isFinite(telemetry?.wifiRssi)
    ? `${stale ? 'Tín hiệu cuối: ' : ''}${telemetry?.wifiRssi} dBm`
    : empty;

  return (
    <Screen>
      <SectionHeader eyebrow="CHẨN ĐOÁN CẢM BIẾN" title="Cảm biến" />
      <DeviceRow icon="thermometer-outline" name="DHT22 · Nhiệt độ" description={tempDesc} status={dhtStatus} tone={dhtTone} />
      <DeviceRow icon="water-outline" name="DHT22 · Độ ẩm" description={humidityDesc} status={humidityStatus} tone={humidityTone} />
      <DeviceRow icon="warning-outline" name="MQ-2 Gas Sensor" description={mq2Desc} status={mq2Status} tone={mq2Tone} />
      <DeviceRow icon="flame-outline" name="Flame Sensor" description={flameDesc} status={flameStatus} tone={flameTone} />
      <DeviceRow icon="wifi-outline" name="ESP32 Wi-Fi" description={wifiDesc} status={wifiStatus} tone={wifiTone} />
      <MiniChart />
    </Screen>
  );
}
