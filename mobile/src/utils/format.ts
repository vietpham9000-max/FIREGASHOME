export function relativeTime(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return 'Chưa nhận dữ liệu';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  return seconds < 60 ? `${seconds} giây trước` : `${Math.floor(seconds / 60)} phút trước`;
}
export function authErrorMessage(code?: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.', 'auth/invalid-email': 'Email không hợp lệ.',
    'auth/network-request-failed': 'Không thể kết nối Firebase. Kiểm tra Internet.', 'auth/too-many-requests': 'Có quá nhiều lần thử. Vui lòng thử lại sau.',
    'auth/operation-not-allowed': 'Đăng nhập Email/Password chưa được bật.',
  };
  return messages[code ?? ''] ?? `Đăng nhập thất bại${code ? ` [${code}]` : ''}.`;
}
