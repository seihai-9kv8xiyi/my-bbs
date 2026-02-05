'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { deletePost, votePost } from '@/app/actions';
// ▼ 1. 通知用の魔法をインポート
import toast, { Toaster } from 'react-hot-toast';

// リンク変換関数
function formatContent(content: string) {
  const parts = content.split(/(>>\d+)/g);
  return parts.map((part, index) => {
    if (part.match(/^>>\d+$/)) {
      const number = part.replace('>>', '');
      return (
        <a key={index} href={`#post-${number}`} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
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

  // ▼ 2. 音を鳴らす関数を作るお
  const playSound = () => {
    try {
      const audio = new Audio('/res.mp3'); // publicフォルダの音源
      audio.volume = 0.5; // 音量は控えめに
      audio.play().catch((e) => {
        // ※ブラウザは「ユーザーが一度も画面を触ってない状態」での自動再生をブロックするお。
        // これは仕様だから気にしなくていいお。
        console.log('音の再生がブロックされたお（画面をクリックすると鳴るようになるお）', e);
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `thread_id=eq.${threadId}` }, (payload) => {
        
        // 新しい投稿があった時 (INSERT)
        if (payload.eventType === 'INSERT') {
          const newPost = payload.new as Post;
          setPosts((currentPosts) => [...currentPosts, newPost]);
          
          // ▼ 3. ここで通知発射！
          playSound(); // 音を鳴らす
          toast.success(`「${newPost.name}」さんが書き込んだお！`, {
            duration: 4000,
            position: 'bottom-right', // 右下に表示
            style: {
              border: '1px solid #713200',
              padding: '16px',
              color: '#713200',
            },
            iconTheme: {
              primary: '#713200',
              secondary: '#FFFAEE',
            },
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
      {/* ▼ 4. 通知を表示するための場所（お皿）を設置 */}
      <Toaster />

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
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{formatContent(post.content)}</div>
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