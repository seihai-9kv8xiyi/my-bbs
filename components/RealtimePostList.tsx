'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { deletePost, votePost } from '@/app/actions';
import toast, { Toaster } from 'react-hot-toast';
import PushManager from './PushManager'; // ▼ 新しく作ったこれをインポート！

// リンクとか安価(>>1)を変換する関数
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
  delete_password?: string;
};

export default function RealtimePostList({ initialPosts, threadId, threadTitle }: { initialPosts: Post[], threadId: string, threadTitle: string }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

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
          
          playSound();
          
          // 画面を開いている時の通知（トースト）
          toast.success(`新着: ${newPost.name}\n${newPost.content}`, { 
            position: 'bottom-right',
            duration: 4000,
            style: { borderLeft: '4px solid #5865F2', background: '#36393f', color: '#fff' }
          });
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
  }, [threadId]);

  return (
    <div style={{ marginBottom: '50px' }}>
      <Toaster />

      {/* ヘッダー部分 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '2px solid #c00', 
        marginBottom: '20px', 
        paddingBottom: '10px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
          {threadTitle}
          <span style={{ marginLeft: '10px', fontSize: '16px', color: '#c00', fontWeight: 'normal' }}>
            ({posts.length})
          </span>
        </h1>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* ▼ ここにプッシュ通知登録ボタンを配置！ */}
          <PushManager />

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
              borderRadius: '5px',
              height: 'fit-content'
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* 投稿一覧部分 */}
      {posts.map((post, index) => {
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