self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || '新着メッセージ';
  const body = data.body || '新しい書き込みがあるお！';
  const threadId = data.threadId || 'unknown'; // サーバーからスレIDを受け取る

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/icon.png',
      vibrate: [100, 50, 100],
      tag: `thread-${threadId}`, // ★これだお！同じスレIDなら上書きしてまとめるお！
      renotify: true, // ★上書きした時にもう一度ブルッと震わせる（不要なら false にするお）
      data: {
        url: `${self.location.origin}/threads/${threadId}` // ★タップした時、トップじゃなくて直接スレッドへ飛ぶようにしたお！
      }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});