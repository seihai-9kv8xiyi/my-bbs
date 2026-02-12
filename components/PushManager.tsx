'use client';

import { useState, useEffect } from 'react';
import { subscribeUser } from '@/app/actions';

// Base64の鍵を変換する便利関数
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Service Workerを登録
      navigator.serviceWorker.register('/sw.js');
      
      // すでに登録済みかチェック
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          if (subscription) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    const registration = await navigator.serviceWorker.ready;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      alert('VAPIDキー設定が足りないお！');
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // サーバーに保存！
    await subscribeUser(JSON.parse(JSON.stringify(subscription)));
    setIsSubscribed(true);
    alert('閉じていても通知が送られます！');
  };

  if (isSubscribed) {
    return <button disabled style={{ padding: '5px', fontSize: '12px' }}>✅ 通知登録済み</button>;
  }

  return (
    <button onClick={subscribe} style={{ padding: '5px 10px', fontSize: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
      🔔 閉じてても通知を受け取る
    </button>
  );
}