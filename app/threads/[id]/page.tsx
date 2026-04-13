import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import RealtimePostList from '@/components/RealtimePostList';
import PostForm from '@/components/PostForm';

const boardsInfo: Record<string, string> = {
  'news': 'ニュース速報板',
  'game': 'ゲーム板',
  'lounge': 'ラウンジ（雑談）'
};

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: thread } = await supabase.from('threads').select('*').eq('id', id).single();
  const { data: posts } = await supabase.from('posts').select('*').eq('thread_id', id).order('created_at', { ascending: true });

  if (!thread) return <div>スレッドが見つかりません</div>;

  // ▼ ここを追加！データベースから板のIDを取得して、名前を辞書から引くお！
  // （昔のデータで board_id が空っぽの場合は 'lounge' 扱いにする安全設計だお）
  const boardId = thread.board_id || 'lounge';
  const boardName = boardsInfo[boardId] || '板';

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      
      {/* ▼▼▼ ここを書き換えたお！「板に戻る」と「トップに戻る」を並べるお！ ▼▼▼ */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <Link href={`/boards/${boardId}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>
          ← {boardName}に戻る
        </Link>
        <Link href="/" style={{ color: '#666', textDecoration: 'underline' }}>
          板一覧(トップ)へ
        </Link>
      </div>
      
      {/* ▼ スレッドのタイトルも一番上に表示するお！ */}
      <h1 style={{ borderBottom: '2px solid #c00', paddingBottom: '10px', fontSize: '24px' }}>
        {thread.title}
      </h1>
      {/* ▲▲▲ 書き換えはここまでだお！ ▲▲▲ */}

      
      <RealtimePostList 
        initialPosts={posts || []} 
        threadId={id} 
        threadTitle={thread.title} 
      />

      <PostForm threadId={id} />
      
    </main>
  );
}