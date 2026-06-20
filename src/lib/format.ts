import type { Language } from '../types';

// 格式化日期，null 时返回「暂无」占位
export function formatDate(language: Language, value: string | null): string {
  if (!value) return language === 'cn' ? '暂无' : 'Not yet';
  return new Date(value).toLocaleString(language === 'cn' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 将数组转为「 · 」分隔的可读字符串
export function readableList(value: unknown): string {
  return Array.isArray(value) ? value.filter(Boolean).join(' · ') : '';
}

// 根据最后在线时间返回在线状态标签
export function presenceLabel(language: Language, value: string | null): string {
  if (!value) return language === 'cn' ? '未上线' : 'Never seen';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 2) return language === 'cn' ? '在线' : 'Online';
  if (minutes < 10) return language === 'cn' ? '刚刚在线' : 'Recently online';
  return language === 'cn' ? '离线' : 'Offline';
}
