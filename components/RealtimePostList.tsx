'use client';

import { useEffect, useState, useRef } from 'react'; // ← useRefを追加
import { supabase } from '@/lib/supabaseClient';
import { deletePost, votePost } from '@/app/actions';
import toast, { Toaster } from 'react-hot-toast';

// リンク変換関数
function formatContent(content: string) {
  const parts = content.split(/(>>\d+|https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (part.match(/^>>\d+$/)) {
      const number = part.replace('>>', '');
      return (
        <a key={index} href={`#post-${number}`} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
          {part}
        </a>
      );
    }
    if (part.match(/^https?:\/\/[^\s]+$/)) {
      return (
        <a 
          key={index} href={part} target="_blank" rel="noopener noreferrer"
          style={{ color: '#0066cc', textDecoration: 'underline', wordBreak: 'break-all' }}
          onClick={(e) => {
            const isConfirmed = window.confirm(`外部サイトへ移動しますか？\n\nリンク先：\n${part}`);
            if (!isConfirmed) e.preventDefault();
          }}
        >
          {part}
        </a>
      );
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

export default function RealtimePostList({ initialPosts, threadId }: { initialPosts: Post[], threadId: string }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  
  // ▼ 1. ミュート状態管理（画面表示用）
  const [isMuted, setIsMuted] = useState(false);
  
  // ▼ 2. 最新の状態を保持するための「Ref」（ここが修正ポイント！）
  // これを使わないと、イベントリスナーの中で古い状態（false）が使われ続けてしまうんだお
  const isMutedRef = useRef(false);

  // ▼ 3. ボタンが押されて isMuted が変わったら、Refの中身も更新する
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const playSound = () => {
    // ▼ 4. Ref（最新の状態）を見て判断する！
    if (isMutedRef.current) return;

    try {
      const audio = new Audio('/res.mp3'); 
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `thread_id=eq.${threadId}` }, (payload) => {
        
        if (payload.eventType === 'INSERT') {
          const newPost = payload.new as Post;
          setPosts((currentPosts) => [...currentPosts, newPost]);
          
          // ここで playSound を呼ぶとき、Ref経由なら最新のミュート設定が反映されるお！
          playSound();
          
          toast.success(`「${newPost.name}」さんが書き込んだお！`, {
            duration: 4000,
            position: 'bottom-right',
            style: { border: '1px solid #713200', padding: '16px', color: '#713200' },
            iconTheme: { primary: '#713200', secondary: '#FFFAEE' },
          });
        }
        
        if (payload.eventType === 'DELETE') {
          setPosts((currentPosts) => currentPosts.filter(post => post.id !== payload.old.id));
        }

        if (payload.eventType === 'UPDATE') {
          setPosts((currentPosts) => currentPosts.map(post => 
            post.id === payload.new.id ? { ...post, ...payload.new } as Post : post
          ));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  return (
    <div style={{ marginBottom: '50px' }}>
      <Toaster />

      {/* ミュートボタン */}
      <div style={{ marginBottom: '10px', textAlign: 'right' }}>
        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{
            padding: '5px 10px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: isMuted ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          {isMuted ? '🔇 通知音: OFF' : '🔊 通知音: ON'}
        </button>
      </div>

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
              
              <button 
                onClick={() => votePost(post.id, threadId)}
                style={{ 
                  background: 'none', border: '1px solid #ddd', borderRadius: '15px',
                  padding: '2px 8px', cursor: 'pointer', fontSize: '12px',
                  color: '#e0245e', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <span>♥</span> {post.likes || 0}
              </button>
            </div>
            
            <div style={{ marginLeft: '20px', marginTop: '5px' }}>
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: '10px', wordWrap: 'break-word' }}>
                {formatContent(post.content)}
              </div>
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