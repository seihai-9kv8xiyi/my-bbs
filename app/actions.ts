'use server';

import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import webPush from 'web-push';

export async function deletePost(formData: FormData) {
  const postId = formData.get('post_id');
  const password = formData.get('password');
  const threadId = formData.get('thread_id') as string;

  const { data: post } = await supabase
    .from('posts')
    .select('delete_password')
    .eq('id', postId)
    .single();

  if (post && post.delete_password === password) {
    await supabase.from('posts').delete().eq('id', postId);
    revalidatePath(`/threads/${threadId}`);
    revalidatePath('/');
  }
}

export async function votePost(postId: number, threadId: string) {
  // まず現在のいいね数を取得
  const { data: post } = await supabase
    .from('posts')
    .select('likes')
    .eq('id', postId)
    .single();

  if (post) {
    const newLikes = (post.likes || 0) + 1;
    await supabase
      .from('posts')
      .update({ likes: newLikes })
      .eq('id', postId);
      
    revalidatePath(`/threads/${threadId}`);
  }
}

export async function createThread(formData: FormData) {
  const title = formData.get('title') as string;

  if (!title) return;

  await supabase.from('threads').insert({ title });
  revalidatePath('/');
}

// ▼ ここからが書き込み＆通知のメイン部分
export async function addPost(formData: FormData) {
  const name = formData.get('name') as string || '名無しさん';
  const content = formData.get('content') as string;
  const deletePassword = formData.get('delete_password') as string;
  const threadId = formData.get('thread_id') as string;
  const imageUrl = formData.get('image_url') as string; // URLとして受け取る

  // IPアドレスからIDを生成
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
  
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
    image_url: imageUrl || null,
    delete_password: deletePassword,
    thread_id: threadId
  });

  // ▼▼▼ プッシュ通知を一斉送信 ▼▼▼
  try {
    // VAPIDキーが設定されているか確認
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      
      webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:example@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      // DBから登録者リストを取得
      const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');

      if (subscriptions) {
        const notificationPayload = JSON.stringify({
          title: `【${threadId}】新着: ${name}`,
          body: content,
        });

        // 全員に送る
        const promises = subscriptions.map((sub) => {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          };
          return webPush.sendNotification(pushSubscription, notificationPayload)
            .catch((err) => {
              if (err.statusCode === 410) {
                // 使われていない宛先はお掃除
                supabase.from('push_subscriptions').delete().eq('id', sub.id);
              }
            });
        });

        await Promise.all(promises);
      }
    }
  } catch (error) {
    console.error('通知送信エラー:', error);
    // 通知のエラーで投稿自体を止めないように、ここはエラーを握りつぶして進むお
  }
  // ▲▲▲ 通知処理終わり ▲▲▲

  revalidatePath('/');
  revalidatePath(`/threads/${threadId}`);
}

// ▼ 通知登録用のアクション
export async function subscribeUser(sub: any) {
  // バリデーション：必要なデータがない場合は何もしない
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.auth || !sub.keys.p256dh) {
    return;
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    auth: sub.keys.auth,
    p256dh: sub.keys.p256dh,
  }, { onConflict: 'endpoint' });
  
  if (error) {
    console.error('サブスクリプション保存エラー:', error);
  }
}