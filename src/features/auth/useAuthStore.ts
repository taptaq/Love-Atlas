import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type AuthStore = {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error';
  error: string;
  initialize: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
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
  signInWithEmail: async (email) => {
    if (!isSupabaseConfigured || !supabase) {
      set({ status: 'error', error: 'Supabase is not configured' });
      return;
    }
    set({ status: 'loading', error: '' });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    set((state) => ({ ...state, status: state.user ? 'authenticated' : 'anonymous', error: '' }));
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
