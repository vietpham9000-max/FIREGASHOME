const AI_BASE_URL = 'https://semisweet-conceal-gizzard.ngrok-free.dev';
const DEVICE = '/api/v1/devices/firegas01';
const byId = id => document.getElementById(id);
const panel = byId('ai-panel');
const openButton = byId('ai-open');
const closeButton = byId('ai-close');
const chatView = byId('ai-chat-view');
const insightsView = byId('ai-insights-view');
const chatTab = byId('ai-tab-chat');
const insightsTab = byId('ai-tab-insights');
const messages = byId('ai-messages');
const question = byId('ai-question');
let sending = false;

async function api(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), body ? 135000 : 12000);
  try {
    const response = await fetch(`${AI_BASE_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(response.status === 503 && body ? 'Ollama đang bận hoặc quá thời gian phản hồi. Vui lòng thử lại sau.' : `API AI trả HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('API AI phản hồi quá lâu. Vui lòng thử lại.');
    throw error;
  } finally { clearTimeout(timer); }
}

function addMessage(role, content, source) {
  const item = document.createElement('div');
  item.className = `ai-message ${role}`;
  if (role === 'assistant') {
    const label = document.createElement('small');
    label.textContent = `FIREGAS AI${source ? ` · ${source}` : ''}`;
    item.append(label);
  }
  item.append(document.createTextNode(content));
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
  return item;
}

function setOpen(open) {
  panel.hidden = !open;
  openButton.setAttribute('aria-expanded', String(open));
  openButton.hidden = open;
  if (open) question.focus();
  else openButton.focus();
}

function setTab(tab) {
  const chat = tab === 'chat';
  chatView.hidden = !chat;
  insightsView.hidden = chat;
  chatTab.classList.toggle('active', chat);
  insightsTab.classList.toggle('active', !chat);
  chatTab.setAttribute('aria-selected', String(chat));
  insightsTab.setAttribute('aria-selected', String(!chat));
  if (!chat) void loadInsights();
}

async function send(text) {
  const value = text.trim();
  if (!value || sending) return;
  question.value = '';
  setTab('chat');
  addMessage('user', value);
  sending = true;
  byId('ai-send').disabled = true;
  const pending = addMessage('assistant', 'Đang trả lời…');
  try {
    const reply = await api('/api/v1/ai/chat', { device_id: 'firegas01', question: value });
    pending.remove();
    addMessage('assistant', reply.answer, reply.source);
  } catch (error) {
    pending.remove();
    addMessage('assistant', error instanceof Error ? error.message : 'Không kết nối được trợ lý AI.');
  } finally {
    sending = false;
    byId('ai-send').disabled = false;
  }
}

function card(title, value, detail, note) {
  const box = document.createElement('article');
  box.className = 'ai-card';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const main = document.createElement('strong');
  main.textContent = value;
  const explanation = document.createElement('p');
  explanation.textContent = detail;
  box.append(heading, main, explanation);
  if (note) { const small = document.createElement('small'); small.textContent = note; box.append(small); }
  return box;
}

function timeLabel(value) {
  if (!value) return 'Chưa có thời gian đo';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? 'Không rõ thời gian đo' : time.toLocaleString('vi-VN');
}

async function loadInsights() {
  const cards = byId('ai-cards');
  const errorText = byId('ai-error');
  cards.replaceChildren();
  cards.append(card('Phân tích AI', 'Đang tải…', 'Đang lấy dữ liệu từ backend.'));
  errorText.textContent = '';
  const paths = [`${DEVICE}/ai/risk`, `${DEVICE}/ai/fuzzy`, `${DEVICE}/history?limit=5`, `${DEVICE}/ai/alerts`];
  const results = await Promise.allSettled(paths.map(path => api(path)));
  const data = results.map(result => result.status === 'fulfilled' ? result.value : null);
  const [risk, fuzzy, history, alerts] = data;
  if (results.every(result => result.status === 'rejected')) errorText.textContent = 'Không kết nối được API AI. Kiểm tra URL ngrok và máy chạy backend.';
  else if (results.some(result => result.status === 'rejected')) errorText.textContent = 'Một số chức năng AI chưa tải được. Thử làm mới.';
  const source = risk?.source ?? fuzzy?.source ?? history?.source ?? alerts?.source;
  byId('ai-source').textContent = `Nguồn: ${source ?? 'chưa kết nối'}${risk?.stale ? ' · DỮ LIỆU CŨ' : ''}`;
  const level = { HIGH: 'Cao', ELEVATED: 'Tăng', LOW: 'Thấp', UNKNOWN: 'Chưa xác định' }[risk?.level] ?? 'Chưa xác định';
  const riskDetail = risk?.stale ? 'Bản đo đã cũ. Không thể kết luận mức rủi ro hiện tại.' : source === 'PREVIEW' ? 'Dữ liệu từ firmware thử nghiệm, chưa đánh giá an toàn vận hành.' : source === 'DEMO' ? 'Dữ liệu JSON ngoại tuyến; đây không phải đánh giá thiết bị đang chạy.' : risk?.level === 'UNKNOWN' ? 'Luật vẫn chạy với dữ liệu LIVE. MQ-2 chưa hiệu chuẩn nên chưa đủ căn cứ kết luận an toàn.' : risk ? 'Đánh giá theo luật từ telemetry LIVE; không cần model học máy. Gas là ADC, chưa phải ppm.' : 'Chưa tải được đánh giá.';
  const fuzzyLevel = fuzzy?.signal_level === 'HIGH' ? 'cao' : fuzzy?.signal_level === 'RISING' ? 'đang tăng' : 'thấp';
  const fuzzyValue = !fuzzy ? 'Chưa tải được' : fuzzy.status === 'READY' ? `${fuzzy.score}/100` : 'Chưa đánh giá';
  const fuzzyDetail = !fuzzy ? 'Không lấy được chỉ số fuzzy từ backend.' : fuzzy.status === 'READY' ? `Mức tín hiệu ADC tham khảo: ${fuzzyLevel}. Gas ${fuzzy.gas_adc}/1023. Chưa hiệu chuẩn MQ-2; không phải xác suất cháy hay kết luận an toàn.` : fuzzy.explanation;
  const historyCount = history?.items?.length ?? 0;
  const alertCount = alerts?.items?.length ?? 0;
  cards.replaceChildren(
    card('Tín hiệu gas theo luật mờ', fuzzyValue, fuzzyDetail),
    card('Đánh giá rủi ro theo luật', level, riskDetail, timeLabel(risk?.observed_at)),
    card('Lịch sử AI', `${historyCount} bản ghi`, historyCount ? 'Các bản đo gần nhất đã lưu trên backend.' : 'Chưa có lịch sử đã thu thập cho nguồn dữ liệu này.'),
    card('Cảnh báo AI', !alerts ? 'Chưa tải được' : ['NOT_IMPLEMENTED', 'NO_HISTORY'].includes(alerts.status) ? 'Chưa theo dõi' : `${alertCount} cảnh báo`, !alerts ? 'Không lấy được trạng thái cảnh báo từ backend.' : ['NOT_IMPLEMENTED', 'NO_HISTORY'].includes(alerts.status) ? 'Backend chưa lưu cảnh báo AI; không thể kết luận không có cảnh báo.' : 'Danh sách cảnh báo từ backend.'),
  );
}

openButton.addEventListener('click', () => setOpen(true));
closeButton.addEventListener('click', () => setOpen(false));
chatTab.addEventListener('click', () => setTab('chat'));
insightsTab.addEventListener('click', () => setTab('insights'));
byId('ai-refresh').addEventListener('click', () => void loadInsights());
byId('ai-form').addEventListener('submit', event => { event.preventDefault(); void send(question.value); });
document.querySelectorAll('[data-ai-question]').forEach(button => button.addEventListener('click', () => void send(button.dataset.aiQuestion || '')));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) setOpen(false); });
document.querySelectorAll('#login input').forEach(input => input.addEventListener('focus', () => setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250)));
addMessage('assistant', 'Xin chào! Tôi có thể giải thích chỉ số hiện tại và kiến thức FireGas. Nếu dữ liệu thiết bị đã cũ, tôi sẽ nói rõ thay vì đoán trạng thái an toàn.');
