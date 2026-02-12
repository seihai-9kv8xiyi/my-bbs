import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
// createThreadアクションの場所は適宜合わせてくれお（前回までの手順通りならこのまま）
import { createThread } from './actions'; 

export const revalidate = 0; // 常に最新の状態を取得するおまじない

export default async function Home() {
  // ▼ ここが魔法のポイント！ '*, posts(count)' で数を数えさせる！
  const { data: threads } = await supabase
    .from('threads')
    .select('*, posts(count)')
    .order('created_at', { ascending: false });

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>MNSKちゃんねる</h1>

      {/* スレ立てフォーム */}
      <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>新規スレッド作成</h2>
        <form action={createThread} style={{ display: 'flex', gap: '10px' }}>
          <input 
            name="title" 
            placeholder="スレッドタイトル" 
            style={{ flex: 1, padding: '10px' }} 
            required 
          />
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}>
            作成
          </button>
        </form>
      </div>

      {/* スレッド一覧表示 */}
      <div>
        <h2 style={{ fontSize: '20px', borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '20px' }}>
          スレッド一覧
        </h2>
        
        {threads?.map((thread: any) => (
          <div key={thread.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
            <Link href={`/threads/${thread.id}`} style={{ textDecoration: 'none', color: '#333', fontSize: '18px', fontWeight: 'bold', display: 'block' }}>
              {/* ▼ ここでタイトルと数を表示！ */}
              {thread.title} 
              <span style={{ marginLeft: '10px', color: '#c00', fontSize: '14px', fontWeight: 'normal' }}>
                ({thread.posts[0]?.count || 0})
              </span>
            </Link>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              作成日: {new Date(thread.created_at).toLocaleString('ja-JP')}
            </div>
          </div>
        ))}

        {threads?.length === 0 && <p>まだスレッドがないです。</p>}
      </div>
    </main>
  );
}
