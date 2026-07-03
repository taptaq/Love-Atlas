import type { Language } from '../types';

// 服务端错误消息 → 中文口语化提示
const errorMap: Array<{ match: RegExp; cn: string; en: string }> = [
  { match: /not found|不存在|找不到/i, cn: '找不到对应的空间，可能已被关闭或删除。', en: 'Space not found — it may have been closed or deleted.' },
  { match: /Only active temporary space members can upgrade/i, cn: '升级失败：当前账号不是这个临时空间的成员。请用创建该临时空间的同一浏览器/账号重试，或直接重新创建一个临时空间。', en: 'Upgrade failed: your account is not a member of this temporary space. Please retry in the same browser used to create it, or create a new temporary space.' },
  { match: /Only temporary spaces can be upgraded/i, cn: '升级失败：只有临时空间才能升级为专属空间，当前空间类型不支持。', en: 'Upgrade failed: only temporary spaces can be upgraded.' },
  { match: /temporary space has expired/i, cn: '升级失败：这个临时空间已过期，无法升级。请重新创建一个新的临时空间。', en: 'Upgrade failed: this temporary space has expired. Please create a new one.' },
  { match: /Upgraded space has no active exploration/i, cn: '升级失败：空间内没有可用的探索记录，数据可能不完整。请重新创建临时空间后再试。', en: 'Upgrade failed: no active exploration found in this space. Please recreate the temporary space and try again.' },
  { match: /Only active space members|not a member|不是成员/i, cn: '你还不是这个空间的成员，请重新加入。', en: 'You are not a member of this space. Please rejoin.' },
  { match: /Participant ID is required|participantId/i, cn: '需要你的参与者身份才能操作，请重新进入空间。', en: 'Your participant identity is required. Please re-enter the space.' },
  { match: /maximum.*member|成员上限|已满/i, cn: '空间人数已满（最多 2 人），无法再加入。', en: 'This space is full (max 2 members).' },
  { match: /already.*active companion persistent relationship space/i, cn: '你已经拥有一个虚拟伴侣专属空间了，无法再创建/升级。如需新建，请先在空间设置里解绑现有空间。', en: 'You already have an active companion private space. Please unbind it first.' },
  { match: /already.*active persistent relationship space|已有专属关系空间|专属关系空间.*已存在/i, cn: '升级失败：你已经拥有一个专属关系空间了，无法再升级。如需新建，请先在空间设置里解绑现有空间。', en: 'Upgrade failed: you already have an active private relationship space. Please unbind it first.' },
  { match: /already.*active|已有活跃/i, cn: '你已经在一个活跃空间里了，请先离开当前空间。', en: 'You are already in an active space. Please leave it first.' },
  { match: /already.*exists|已存在/i, cn: '这个空间已经存在了，试试直接加入？', en: 'This space already exists. Try joining it instead?' },
  { match: /invalid.*code|邀请码|invite code/i, cn: '邀请码不对，请检查后再试。', en: 'That invite code is invalid. Please check and try again.' },
  { match: /expired|已过期/i, cn: '这个空间已过期，请重新创建一个。', en: 'This space has expired. Please create a new one.' },
  { match: /Authentication required|userId/i, cn: '操作失败：需要登录后才能进行此操作。请点击右上角登录。', en: 'Authentication required. Please sign in via the top-right button.' },
  { match: /Can't reach database server|database server is running|database.*connection|数据库连接/i, cn: '无法连接到数据库服务器，请检查网络或稍后再试。', en: 'Cannot reach the database server. Please check your network or try again later.' },
  { match: /network|fetch|ECONN|网络/i, cn: '网络连接出了点问题，请检查网络后重试。', en: 'Network issue. Please check your connection and retry.' },
  { match: /unauthorized|未授权|401/i, cn: '登录已过期，请重新登录后再试。', en: 'Your session has expired. Please sign in again.' },
  { match: /forbidden|无权|403/i, cn: '你没有权限执行这个操作。', en: 'You do not have permission to do this.' },
  { match: /rate.*limit|频率|429/i, cn: '操作太频繁了，稍等几秒再试。', en: 'Too many requests. Please wait a moment.' },
  { match: /server|500|502|503/i, cn: '服务器开了点小差，请稍后重试。', en: 'Server hiccup. Please try again shortly.' },
  { match: /timeout|超时/i, cn: '请求超时了，请重试一次。', en: 'Request timed out. Please try again.' },
];

const fallback = { cn: '出了点小问题，请重试一下。', en: 'Something went wrong. Please try again.' };

export function friendlyError(error: unknown, language: Language = 'cn'): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  for (const item of errorMap) {
    if (item.match.test(raw)) {
      return language === 'cn' ? item.cn : item.en;
    }
  }
  return language === 'cn' ? fallback.cn : fallback.en;
}
