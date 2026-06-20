import { supabase } from '../../lib/supabase';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function uploadPresentMomentImage(sessionId: string | undefined, file: File) {
  if (!supabase || !sessionId) return null;
  const path = `${sessionId}/${generateUUID()}-${file.name}`;
  const { error } = await supabase.storage.from('present-moment').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('present-moment').getPublicUrl(path);
  return data.publicUrl;
}
