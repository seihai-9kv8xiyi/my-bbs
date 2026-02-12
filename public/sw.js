self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || '新着メッセージ';
  const body = data.body || '新しい書き込みがあるお！';
  const icon = '/icon.png'; // アイコン画像があれば

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      vibrate: [100, 50, 100], // ブルブル震える
      data: {
        url: self.location.origin // クリックしたらトップページへ
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