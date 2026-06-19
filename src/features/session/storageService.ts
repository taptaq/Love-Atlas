import { supabase } from '../../lib/supabase';

export async function uploadPresentMomentImage(sessionId: string | undefined, file: File) {
  if (!supabase || !sessionId) return null;
  const path = `${sessionId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from('present-moment').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('present-moment').getPublicUrl(path);
  return data.publicUrl;
}
