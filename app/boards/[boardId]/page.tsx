import { supabase } from '@/lib/supabaseClient';
import { createThread } from '@/app/actions';
import Link from 'next/link';

// 板の名前の辞書だお
const boardsInfo: Record<string, string> = {
  'news': 'ニュース速報板',
  'game': 'ゲーム板',
  'lounge': 'ラウンジ（雑談）'
};

export const revalidate = 0; // 常に最新を取得するお

// URLから [boardId] を受け取るお
export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const boardName = boardsInfo[boardId] || '名無し板';

  // この板（board_id）に属するスレッドだけを取得するお！
  const { data: threads } = await supabase
    .from('threads')
    .select('*,posts(id)')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false });

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/" style={{ color: '#0066cc', textDecoration: 'underline' }}>← 板一覧に戻る</Link>
      </div>
      
      <h1 style={{ borderBottom: '2px solid #c00', paddingBottom: '10px', color: '#333' }}>
        {boardName}
      </h1>

      {/* スレ立てフォーム（この板専用！） */}
      <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>新規スレッド作成</h3>
        <form action={createThread} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* ▼ ここで「どの板に立てるか」をこっそり送っているお！ */}
          <input type="hidden" name="board_id" value={boardId} />
          <input type="text" name="title" placeholder="スレッドのタイトル" required style={{ flex: 1, padding: '8px', minWidth: '200px' }} />
          <button type="submit" style={{ padding: '8px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>スレ立て</button>
        </form>
      </div>

      {/* スレッド一覧 */}
      <div>
        {threads && threads.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {threads.map((thread) => (
              <div key={thread.id} style={{ marginBottom: '10px' }}>
                <Link href={`/threads/${thread.id}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>
                  {thread.title}({thread.posts?.length || 0})
                </Link>
              </div>
        ))}
          </ul>
        ) : (
          <p style={{ color: '#666' }}>まだスレッドがないです。さっさとスレを建ててクレメンス。</p>
        )}
      </div>
    </div>
  );
}
