import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // 显式开启自动刷新 + 会话持久化
        autoRefreshToken: true,
        persistSession: true,
        // 避免从 URL hash 检测 session 导致与路由冲突
        detectSessionInUrl: false,
        // 刷新失败时不要无限重试，让 onAuthStateChange 收到 SIGNED_OUT
        flowType: 'implicit',
      },
    })
  : null;
