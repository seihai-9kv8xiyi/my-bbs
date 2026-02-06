'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { deletePost, votePost } from '@/app/actions';
import toast, { Toaster } from 'react-hot-toast';

// ... (formatContent 関数はそのまま変更なし) ...
function formatContent(content: string) {
  const parts = content.split(/(>>\d+|https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (part.match(/^>>\d+$/)) {
      const number = part.replace('>>', '');
      return <a key={index} href={`#post-${number}`} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>{part}</a>;
    }
    if (part.match(/^https?:\/\/[^\s]+$/)) {
      return <a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline', wordBreak: 'break-all' }} onClick={(e) => { if (!window.confirm(`外部サイトへ移動しますか？\n\n${part}`)) e.preventDefault(); }}>{part}</a>;
    }
    return part;
  });
}

type Post = {
  id: number;
  name: string;
  content: string;
  image_url: string | null;
  created_at: string;
  client_id: string | null;
  likes: number;
  thread_id: string;
};

export default function RealtimePostList({ initialPosts, threadId, threadTitle }: { initialPosts: Post[], threadId: string, threadTitle: string }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  
  // ▼ 音のミュート設定
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  // ▼ 通知の許可状態 ('default', 'granted', 'denied')
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ▼ 初回ロード時に、現在の通知許可状態を確認する
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // ▼ 通知許可をリクエストする関数
  const requestNotification = async () => {
    if (!('Notification' in window)) {
      alert('このブラウザは通知に対応していません。');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('デスクトップ通知をONにしました！');
      new Notification('設定完了', { body: 'こんな感じで通知が届きます' });
    }
  };

  // ▼ デスクトップ通知を送る関数
  const sendDesktopNotification = (post: Post) => {
    // 許可されていて、かつブラウザが非アクティブ（裏側にある）時などに便利
    // ※今回は常に送る設定にするお
    if (permission === 'granted') {
      const notif = new Notification(`【${threadTitle}】新着: ${post.name}`, {
        body: post.content,
        icon: post.image_url || '/icon.png', // 画像があればアイコンにする（なければ適当なパスでOK）
        silent: isMutedRef.current, // アプリ内のミュート設定と連動させる（Chromeだとうまく効かないこともある）
      });
      
      // 通知をクリックしたらウィンドウをアクティブにする
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  };

  const playSound = () => {
    if (isMutedRef.current) return;
    try {
      const audio = new Audio('/res.mp3'); 
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `thread_id=eq.${threadId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newPost = payload.new as Post;
          setPosts((prev) => [...prev, newPost]);
          
          playSound();     // 音を鳴らす
          sendDesktopNotification(newPost); // ★ここでWindows通知を送る！

          // アプリ内のトーストも一応出しておく（不要なら消してもOK）
          toast.success(`新着: ${newPost.name}\n${newPost.content}`, { position: 'bottom-right' });
        }
        if (payload.eventType === 'DELETE') {
          setPosts((prev) => prev.filter(p => p.id !== payload.old.id));
        }
        if (payload.eventType === 'UPDATE') {
          setPosts((prev) => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Post : p));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, permission]); // permissionが変わったらuseEffect内の関数も最新の状態を知る必要がある

  return (
    <div style={{ marginBottom: '50px' }}>
      <Toaster />

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '2px solid #c00', 
        marginBottom: '20px', 
        paddingBottom: '10px',
        flexWrap: 'wrap', // スマホで見づらくならないように折り返し許可
        gap: '10px'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
          {threadTitle}
          <span style={{ marginLeft: '10px', fontSize: '16px', color: '#c00', fontWeight: 'normal' }}>
            ({posts.length})
          </span>
        </h1>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* ▼ デスクトップ通知許可ボタン */}
          {permission !== 'granted' && (
            <button
              onClick={requestNotification}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              🔔 通知を許可する
            </button>
          )}

          {/* ミュートボタン */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              backgroundColor: isMuted ? '#999' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '5px'
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {posts.map((post, index) => {
        // ... (投稿表示部分はそのまま変更なし) ...
        const postNumber = index + 1;
        return (
          <div key={post.id} id={`post-${postNumber}`} style={{ marginBottom: '15px', borderBottom: '1px dotted #ccc', paddingBottom: '10px' }}>
            <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {postNumber} ：
                <span style={{ color: 'green', fontWeight: 'bold' }}> {post.name} </span>
                <span style={{ fontSize: '12px', color: '#666' }}> (ID: {post.client_id || '???'}) </span>
                ：{new Date(post.created_at).toLocaleString('ja-JP')}
              </div>
              <button onClick={() => votePost(post.id, threadId)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '15px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px', color: '#e0245e', display: 'flex', alignItems: 'center', gap: '4px' }}><span>♥</span> {post.likes || 0}</button>
            </div>
            <div style={{ marginLeft: '20px', marginTop: '5px' }}>
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: '10px', wordWrap: 'break-word' }}>{formatContent(post.content)}</div>
              {post.image_url && <img src={post.image_url} alt="投稿画像" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }} />}
            </div>
            <details style={{ marginTop: '5px', fontSize: '12px', color: '#666', marginLeft: '20px' }}>
              <summary style={{ cursor: 'pointer' }}>[削除]</summary>
              <form action={deletePost} style={{ display: 'inline-flex', gap: '5px', marginTop: '5px' }}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="thread_id" value={threadId} />
                <input type="password" name="password" placeholder="削除キー" style={{ width: '80px', fontSize: '12px', padding: '2px' }} required />
                <button type="submit" style={{ fontSize: '12px', padding: '2px 5px' }}>削除</button>
              </form>
            </details>
          </div>
        );
      })}
    </div>
  );
}