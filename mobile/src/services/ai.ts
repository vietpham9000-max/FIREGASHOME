import { AI_BASE_URL } from '@/constants/config';

export type AiSource = 'DEMO' | 'PREVIEW' | 'LIVE';

export interface AiRisk {
  source: AiSource;
  observed_at: string | null;
  stale: boolean;
  level: 'UNKNOWN' | 'LOW' | 'ELEVATED' | 'HIGH';
  reasons: string[];
  method: string;
}

export interface AiAnomaly {
  source: AiSource;
  status: 'INSUFFICIENT_DATA' | 'STALE_DATA' | 'READY';
  is_anomaly: boolean | null;
  score: number | null;
  reason: string;
}

export interface AiChatReply {
  source: AiSource;
  observed_at: string | null;
  answer: string;
  model: string | null;
}

export interface AiHistory {
  source: AiSource;
  status: string;
  items: { observed_at?: string; gas_adc?: number | null; alarm?: boolean | null }[];
}

export interface AiAlerts {
  source: AiSource;
  status: string;
  items: unknown[];
}

async function request<T>(path: string, body?: object): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), body ? 135_000 : 12_000);
  try {
    const response = await fetch(`${AI_BASE_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(response.status === 503 && body ? 'Ollama đang bận hoặc quá thời gian phản hồi. Vui lòng thử lại sau.' : `API AI trả HTTP ${response.status}`);
    return await response.json() as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('API AI phản hồi quá lâu. Vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const device = '/api/v1/devices/firegas01';

export const getAiRisk = () => request<AiRisk>(`${device}/ai/risk`);
export const getAiAnomalies = () => request<AiAnomaly>(`${device}/ai/anomalies`);
export const getAiHistory = () => request<AiHistory>(`${device}/history?limit=5`);
export const getAiAlerts = () => request<AiAlerts>(`${device}/ai/alerts`);
export const askAi = (question: string) => request<AiChatReply>('/api/v1/ai/chat', { device_id: 'firegas01', question });
