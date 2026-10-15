import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { askAi, getAiAlerts, getAiAnomalies, getAiHistory, getAiRisk, type AiAlerts, type AiAnomaly, type AiHistory, type AiRisk, type AiSource } from '@/services/ai';
import { colors, radius, spacing } from '@/theme';

type Section = 'chat' | 'insights';
type Message = { id: number; role: 'assistant' | 'user'; text: string; source?: AiSource };

const firstMessage: Message = {
  id: 0,
  role: 'assistant',
  text: 'Xin chào! Tôi có thể giải thích chỉ số hiện tại và kiến thức FireGas. Nếu thiết bị chưa gửi dữ liệu mới, tôi sẽ nói rõ thay vì đoán trạng thái an toàn.',
};

function timeLabel(value: string | null | undefined) {
  if (!value) return 'Chưa có thời gian đo';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Không rõ thời gian đo' : date.toLocaleString('vi-VN');
}

function insightText(risk: AiRisk | null, anomaly: AiAnomaly | null, history: AiHistory | null, alerts: AiAlerts | null) {
  const riskLevel = risk?.level === 'HIGH' ? 'Cao' : risk?.level === 'ELEVATED' ? 'Tăng' : risk?.level === 'LOW' ? 'Thấp' : 'Chưa xác định';
  const riskDetail = risk?.stale ? 'Bản đo đã cũ, không thể kết luận mức rủi ro hiện tại.' : risk?.source === 'PREVIEW' ? 'Dữ liệu từ firmware thử nghiệm, chưa đánh giá an toàn vận hành.' : risk ? 'Đánh giá theo luật dựa trên telemetry đã nhận; MQ-2 chưa quy đổi sang ppm.' : 'Chưa tải được kết quả.';
  const anomalyDetail = anomaly?.status === 'READY' ? anomaly.is_anomaly ? 'Model phát hiện giá trị khác baseline đã học.' : 'Model chưa phát hiện khác biệt so với baseline.' : anomaly?.status === 'STALE_DATA' ? 'Bản đo đã cũ, không chấm điểm bất thường.' : 'Chưa có đủ dữ liệu và model để chấm điểm bất thường.';
  return { riskLevel, riskDetail, anomalyDetail, historyCount: history?.items.length ?? 0, alertCount: alerts?.items.length ?? 0 };
}

export default function AiScreen() {
  const { user } = useApp();
  const [section, setSection] = useState<Section>('chat');
  const [messages, setMessages] = useState<Message[]>([firstMessage]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [risk, setRisk] = useState<AiRisk | null>(null);
  const [anomaly, setAnomaly] = useState<AiAnomaly | null>(null);
  const [history, setHistory] = useState<AiHistory | null>(null);
  const [alerts, setAlerts] = useState<AiAlerts | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const nextId = useRef(1);

  const loadInsights = useCallback(async () => {
    setLoadingInsights(true);
    const results = await Promise.allSettled([getAiRisk(), getAiAnomalies(), getAiHistory(), getAiAlerts()]);
    if (results[0].status === 'fulfilled') setRisk(results[0].value);
    if (results[1].status === 'fulfilled') setAnomaly(results[1].value);
    if (results[2].status === 'fulfilled') setHistory(results[2].value);
    if (results[3].status === 'fulfilled') setAlerts(results[3].value);
    setOverviewError(results.every(result => result.status === 'rejected') ? 'Không kết nối được API AI. Kiểm tra URL ngrok và máy chạy backend.' : '');
    setLoadingInsights(false);
  }, []);

  useEffect(() => { if (user) void loadInsights(); }, [user, loadInsights]);

  const send = async (suggestion?: string) => {
    const question = (suggestion ?? draft).trim();
    if (!question || sending) return;
    setDraft('');
    Keyboard.dismiss();
    setSection('chat');
    setMessages(current => [...current, { id: nextId.current++, role: 'user', text: question }]);
    setSending(true);
    try {
      const reply = await askAi(question);
      setMessages(current => [...current, { id: nextId.current++, role: 'assistant', text: reply.answer, source: reply.source }]);
    } catch (error) {
      setMessages(current => [...current, { id: nextId.current++, role: 'assistant', text: error instanceof Error ? error.message : 'Không kết nối được trợ lý AI.' }]);
    } finally {
      setSending(false);
    }
  };

  if (!user) return <Redirect href="/login" />;
  const summary = insightText(risk, anomaly, history, alerts);
  const source = risk?.source ?? anomaly?.source;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" color={colors.textPrimary} size={25} /></Pressable>
          <View style={styles.heading}><Text style={styles.title}>FireGas AI</Text><Text style={styles.subtitle}>Trợ lý và phân tích thiết bị</Text></View>
          <View style={styles.mark}><Ionicons name="sparkles" color={colors.white} size={20} /></View>
        </View>

        <View style={styles.tabs}>
          <Pressable onPress={() => setSection('chat')} style={[styles.tab, section === 'chat' && styles.tabActive]}><Text style={[styles.tabText, section === 'chat' && styles.tabTextActive]}>Trò chuyện</Text></Pressable>
          <Pressable onPress={() => setSection('insights')} style={[styles.tab, section === 'insights' && styles.tabActive]}><Text style={[styles.tabText, section === 'insights' && styles.tabTextActive]}>Phân tích AI</Text></Pressable>
        </View>

        {section === 'chat' ? <>
          <ScrollView ref={scrollRef} style={styles.fill} contentContainerStyle={styles.chatContent} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {messages.map(message => <View key={message.id} style={[styles.message, message.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
              {message.role === 'assistant' ? <Text style={styles.messageTag}>FIREGAS AI{message.source ? ` · ${message.source}` : ''}</Text> : null}
              <Text style={styles.messageText}>{message.text}</Text>
            </View>)}
            {sending ? <View style={[styles.message, styles.assistantMessage, styles.typing]}><ActivityIndicator size="small" color={colors.blue} /><Text style={styles.hint}>Đang trả lời…</Text></View> : null}
          </ScrollView>
          <View style={styles.suggestions}>
            <Pressable onPress={() => void send('Gas hiện tại bao nhiêu?')} style={styles.chip}><Text style={styles.chipText}>Gas hiện tại?</Text></Pressable>
            <Pressable onPress={() => void send('Thiết bị đang có cảnh báo không?')} style={styles.chip}><Text style={styles.chipText}>Có cảnh báo?</Text></Pressable>
          </View>
          <View style={styles.composer}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Hỏi FireGas AI..." placeholderTextColor={colors.textMuted} style={styles.input} multiline maxLength={2000} accessibilityLabel="Nhập câu hỏi cho trợ lý AI" />
            <Pressable disabled={!draft.trim() || sending} onPress={() => void send()} accessibilityLabel="Gửi câu hỏi" style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}><Ionicons name="arrow-up" size={22} color={colors.white} /></Pressable>
          </View>
        </> : <ScrollView style={styles.fill} contentContainerStyle={styles.insightsContent} showsVerticalScrollIndicator={false}>
          <View style={styles.statusRow}><Text style={styles.statusText}>Nguồn: {source ?? 'Chưa kết nối'}{risk?.stale ? ' · DỮ LIỆU CŨ' : ''}</Text><Pressable onPress={() => void loadInsights()} accessibilityLabel="Làm mới phân tích" style={styles.refresh}><Ionicons name="refresh" size={19} color={colors.blue} /></Pressable></View>
          {overviewError ? <Text style={styles.error}>{overviewError}</Text> : null}
          {loadingInsights ? <ActivityIndicator color={colors.blue} /> : null}
          <View style={styles.card}><View style={styles.cardHead}><Ionicons name="shield-outline" size={19} color={colors.warning} /><Text style={styles.cardTitle}>Risk Assessment</Text></View><Text style={styles.cardValue}>{summary.riskLevel}</Text><Text style={styles.cardDetail}>{summary.riskDetail}</Text><Text style={styles.timestamp}>{timeLabel(risk?.observed_at)}</Text></View>
          <View style={styles.card}><View style={styles.cardHead}><Ionicons name="analytics-outline" size={19} color={colors.blue} /><Text style={styles.cardTitle}>Phát hiện bất thường</Text></View><Text style={styles.cardValue}>{anomaly?.status === 'READY' ? anomaly.is_anomaly ? 'Cần xem xét' : 'Chưa phát hiện' : 'Chưa có model'}</Text><Text style={styles.cardDetail}>{summary.anomalyDetail}</Text></View>
          <View style={styles.card}><View style={styles.cardHead}><Ionicons name="time-outline" size={19} color={colors.success} /><Text style={styles.cardTitle}>Lịch sử AI</Text></View><Text style={styles.cardValue}>{summary.historyCount} bản ghi</Text><Text style={styles.cardDetail}>{history?.status === 'NO_HISTORY' ? 'Chưa có lịch sử đã thu thập cho nguồn dữ liệu này.' : 'Các bản đo gần nhất đã lưu trên backend.'}</Text>{history?.items.map((point, index) => <Text key={`${point.observed_at ?? index}`} style={styles.historyLine}>{timeLabel(point.observed_at)} · Gas {point.gas_adc ?? '--'}/1023</Text>)}</View>
          <View style={styles.card}><View style={styles.cardHead}><Ionicons name="notifications-outline" size={19} color={colors.danger} /><Text style={styles.cardTitle}>Cảnh báo AI</Text></View><Text style={styles.cardValue}>{summary.alertCount} cảnh báo</Text><Text style={styles.cardDetail}>{alerts?.status === 'NO_HISTORY' ? 'Chưa có lịch sử cảnh báo từ backend.' : 'Danh sách cảnh báo từ backend.'}</Text></View>
        </ScrollView>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 42, height: 42, justifyContent: 'center' }, heading: { flex: 1 }, title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' }, subtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  mark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  tabs: { flexDirection: 'row', gap: 6, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: 4, borderRadius: radius.md, backgroundColor: colors.surface },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm }, tabActive: { backgroundColor: colors.surfaceRaised }, tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' }, tabTextActive: { color: colors.white },
  chatContent: { flexGrow: 1, justifyContent: 'flex-end', gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  message: { maxWidth: '88%', padding: spacing.md, borderRadius: radius.lg }, assistantMessage: { alignSelf: 'flex-start', backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 4 }, userMessage: { alignSelf: 'flex-end', backgroundColor: '#23578E', borderTopRightRadius: 4 },
  messageTag: { color: '#9FCCFF', fontSize: 10, fontWeight: '800', marginBottom: 6 }, messageText: { color: colors.textPrimary, fontSize: 14, lineHeight: 21 }, typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, hint: { color: colors.textSecondary, fontSize: 12 },
  suggestions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }, chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }, chipText: { color: colors.textSecondary, fontSize: 11 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, minHeight: 44, maxHeight: 110, paddingHorizontal: spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, color: colors.textPrimary, fontSize: 14, backgroundColor: colors.background },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue }, sendDisabled: { opacity: .45 },
  insightsContent: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl }, statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statusText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' }, refresh: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 12 }, card: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 8 }, cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' }, cardValue: { color: colors.white, fontSize: 21, fontWeight: '800' }, cardDetail: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 }, timestamp: { color: colors.textMuted, fontSize: 11 }, historyLine: { color: colors.textSecondary, fontSize: 11 },
});
