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

// 投稿処理
export async function addPost(formData: FormData) {
  const content = formData.get('content') as string;
  const name = (formData.get('name') as string) || '名無しさん';
  const delete_password = (formData.get('delete_password') as string) || '';
  const thread_id = formData.get('thread_id');
  const imageFile = formData.get('image') as File;

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
  const client_id = generateID(ip);

  let image_url = null;

  if (imageFile && imageFile.size > 0) {
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { error } = await supabase.storage.from('images').upload(fileName, imageFile);
    if (!error) {
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      image_url = data.publicUrl;
    }
  }

  if (content && thread_id) {
    await supabase.from('posts').insert([{ name, content, thread_id, image_url, delete_password, client_id }]);
    // リアルタイム更新があるから revalidatePath は必須じゃないけど、念のため残しておく
    revalidatePath(`/threads/${thread_id}`);
  }
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