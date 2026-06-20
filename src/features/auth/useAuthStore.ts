import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type AuthStore = {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error';
  error: string;
  initialize: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

let authListenerStarted = false;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: 'idle',
  error: '',
  initialize: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ user: null, status: 'anonymous', error: '' });
      return;
    }
    set({ status: 'loading', error: '' });
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ user: null, status: 'error', error: error.message });
      return;
    }
    set({ user: data.session?.user ?? null, status: data.session?.user ? 'authenticated' : 'anonymous', error: '' });
    if (!authListenerStarted) {
      authListenerStarted = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, status: session?.user ? 'authenticated' : 'anonymous', error: '' });
      });
    }
  },
  signInWithPassword: async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'error', error: 'Supabase is not configured' });
      return;
    }
    set({ status: 'loading', error: '' });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    set({ user: data.user, status: 'authenticated', error: '' });
  },
  signUp: async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'error', error: 'Supabase is not configured' });
      return;
    }
    set({ status: 'loading', error: '' });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    // 注册成功：若 Supabase 开启了邮箱验证，data.session 为 null，需要提示用户去邮箱验证
    if (data.session) {
      set({ user: data.user, status: 'authenticated', error: '' });
    } else {
      // 需要邮箱验证
      set({ status: 'anonymous', error: '', user: null });
      throw new Error('VERIFY_EMAIL');
    }
  },
  resendVerificationEmail: async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'error', error: 'Supabase is not configured' });
      return;
    }
    set({ status: 'loading', error: '' });
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    set({ status: 'anonymous', error: '', user: null });
  },
  signOut: async () => {
    if (!supabase) {
      set({ user: null, status: 'anonymous', error: '' });
      return;
    }
    set({ status: 'loading', error: '' });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    set({ user: null, status: 'anonymous', error: '' });
  },
}));
