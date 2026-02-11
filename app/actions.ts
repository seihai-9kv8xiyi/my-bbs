'use server';

import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import crypto from 'crypto';

// ID生成
function generateID(ip: string) {
  const today = new Date().toISOString().split('T')[0];
  const rawData = `${ip}-${today}`;
  const hash = crypto.createHash('md5').update(rawData).digest('base64');
  return hash.substring(0, 8);
}

// ... (importsなどはそのまま)

export async function addPost(formData: FormData) {
  const name = formData.get('name') as string || '名無しさん';
  const content = formData.get('content') as string;
  const deletePassword = formData.get('delete_password') as string;
  const threadId = formData.get('thread_id') as string;
  
  // ▼▼▼ 変更点：ここではもう「URL」として受け取るだけにする！ ▼▼▼
  const imageUrl = formData.get('image_url') as string; 
  // ▲▲▲▲▲▲

  // クライアントIPの取得（ヘッダーから）
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
  
  // ID生成ロジック
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rawId = `${ip}-${today}`;
  let hash = 0;
  for (let i = 0; i < rawId.length; i++) {
    const char = rawId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const clientId = Math.abs(hash).toString(36).slice(0, 8).toUpperCase();

  // DBに追加
  await supabase.from('posts').insert({
    name,
    content,
    client_id: clientId,
    image_url: imageUrl || null, // URLがあれば入れる、なければnull
    delete_password: deletePassword,
    thread_id: threadId
  });

  revalidatePath('/');
  revalidatePath(`/threads/${threadId}`);
}

// 削除処理
export async function deletePost(formData: FormData) {
  const post_id = formData.get('post_id');
  const input_password = formData.get('password') as string;
  const thread_id = formData.get('thread_id');

  if (post_id && input_password) {
    await supabase.from('posts').delete().eq('id', post_id).eq('delete_password', input_password);
    revalidatePath(`/threads/${thread_id}`);
  }
}

// いいね処理
export async function votePost(post_id: number, thread_id: string) {
  const { data: post } = await supabase.from('posts').select('likes').eq('id', post_id).single();
  if (post) {
    const newLikes = (post.likes || 0) + 1;
    await supabase.from('posts').update({ likes: newLikes }).eq('id', post_id);
    revalidatePath(`/threads/${thread_id}`);
  }
}

export async function createThread(formData: FormData) {
  const title = formData.get('title') as string;

  if (!title) return;

  // DBに新しいスレッドを追加
  await supabase.from('threads').insert({ title });

  // トップページを更新して新しいスレを表示させる
  revalidatePath('/');
}