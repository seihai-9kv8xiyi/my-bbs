'use server';

import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import webPush from 'web-push'; // ← これがないとエラーになるお！
import { Resend } from 'resend';
// 投稿削除
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

// いいね機能
export async function votePost(postId: number, threadId: string) {
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

/// ▼▼▼ app/actions.ts のスレ立て機能をこれに上書き！ ▼▼▼
// ⚠️ 引数に boardId が増えているのがポイントだお！
// ▼▼▼ app/actions.ts のスレ立て機能をこれに上書きするお！ ▼▼▼
export async function createThread(formData: FormData) {
  const title = formData.get('title') as string;
  // ここでフロントから送られてきた board_id を受け取るお！
  const boardId = formData.get('board_id') as string || 'lounge'; 

  if (!title) return;

  // DBにタイトルと board_id を一緒に保存するお！
  await supabase.from('threads').insert({ title, board_id: boardId });
  
  // キャッシュをクリアするお！
  revalidatePath(`/boards/${boardId}`);
  revalidatePath('/');
}

// ▼▼▼ 書き込み＆通知のメイン部分 ▼▼▼
export async function addPost(formData: FormData) {
  const name = formData.get('name') as string || '名無しさん';
  const content = formData.get('content') as string;
  const deletePassword = formData.get('delete_password') as string;
  const threadId = formData.get('thread_id') as string;
  const imageUrl = formData.get('image_url') as string;

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

  // ▼▼▼ プッシュ通知を一斉送信（スレッド名付き） ▼▼▼
  try {
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      
      webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:example@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      // スレッドのタイトルを取得
      const { data: threadData } = await supabase
        .from('threads')
        .select('title')
        .eq('id', threadId)
        .single();
      
      const threadTitle = threadData?.title || 'スレッド';

      // DBから登録者リストを取得
      const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');

      if (subscriptions) {
        // 通知の中身を作成
        // ★ threadId を追加して小人に教えるお！
        const notificationPayload = JSON.stringify({
          title: `【${threadTitle}】新着: ${name}`,
          body: content,
          threadId: threadId, 
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
  }
  // ▲▲▲ 通知処理終わり ▲▲▲

  revalidatePath('/');
  revalidatePath(`/threads/${threadId}`);
}

// 通知登録用のアクション
export async function subscribeUser(sub: any) {
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

// ▼▼▼ お問い合わせ送信機能だお！ ▼▼▼
export async function submitInquiry(formData: FormData) {
  const name = formData.get('name') as string || '名無しさん';
  const message = formData.get('message') as string;

  if (!message) return { success: false, error: 'メッセージが空だお' };

  await supabase.from('inquiries').insert({ name, message });

  try {
    // ✅ ここだお！「使う直前」に関数の中で準備するお！
    // 念のため、キーがない時は空文字にする安全対策（|| ''）もつけておくお
    const resend = new Resend(process.env.RESEND_API_KEY || '');

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: '君のメールアドレス@example.com', // 自分のメアドに直すお
      subject: `【掲示板】${name}さんからのお問い合わせ`,
      text: message
    });
    
    return { success: true };
  } catch (error) {
    console.error('メール送信エラー:', error);
    return { success: false, error: 'メールが送れなかったお…' };
  }
}