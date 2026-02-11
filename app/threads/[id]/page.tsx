import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
// addPost のインポートは不要になったので消してOK（PostFormの中で使ってるから）
import RealtimePostList from '@/components/RealtimePostList';
import PostForm from '@/components/PostForm'; // ▼ これをインポート！

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: thread } = await supabase.from('threads').select('*').eq('id', id).single();
  const { data: posts } = await supabase.from('posts').select('*').eq('thread_id', id).order('created_at', { ascending: true });

  if (!thread) return <div>スレッドが見つかりません</div>;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>← 一覧に戻る</Link>
      
      <RealtimePostList 
        initialPosts={posts || []} 
        threadId={id} 
        threadTitle={thread.title} 
      />

      {/* ▼ 今までの長い <form>... </form> の塊を、この1行に置き換えるお！ ▼ */}
      <PostForm threadId={id} />
      
    </main>
  );
}