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

function sanitizePathSegment(value: string, fallback: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || fallback;
}

function getSafeFileExtension(file: File) {
  const extension = file.name.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase();
  if (extension) return extension;
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

function createStoragePath(sessionId: string, file: File) {
  const safeSessionId = sanitizePathSegment(sessionId, 'session');
  const baseName = sanitizePathSegment(file.name.replace(/\.[^.]+$/, ''), 'moment-image');
  const extension = getSafeFileExtension(file);
  return `${safeSessionId}/${generateUUID()}-${baseName}.${extension}`;
}

export async function uploadPresentMomentImage(sessionId: string | undefined, file: File) {
  if (!supabase || !sessionId) return null;
  const path = createStoragePath(sessionId, file);
  const { error } = await supabase.storage.from('present-moment').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('present-moment').getPublicUrl(path);
  return data.publicUrl;
}
