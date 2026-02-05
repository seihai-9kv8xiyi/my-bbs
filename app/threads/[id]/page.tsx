import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { addPost } from '@/app/actions'; // アクションを読み込む
import RealtimePostList from '@/components/RealtimePostList'; // さっきの部品を読み込む

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // 最初の1回だけデータを取ってくる
  const { data: thread } = await supabase.from('threads').select('*').eq('id', id).single();
  const { data: posts } = await supabase.from('posts').select('*').eq('thread_id', id).order('created_at', { ascending: true });

  if (!thread) return <div>スレッドが見つかりません</div>;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>← 一覧に戻る</Link>
      
      <h1 style={{ color: '#c00', margin: '20px 0' }}>{thread.title}</h1>

      {/* ▼ ここでリアルタイム部品を呼び出す！ */}
      {/* initialPostsとして最初のデータを渡してあげるお */}
      <RealtimePostList initialPosts={posts || []} threadId={id} />

      {/* 書き込みフォーム */}
      <div style={{ backgroundColor: '#efefef', padding: '20px', border: '1px solid #ccc' }}>
        <form action={addPost}>
          <input type="hidden" name="thread_id" value={id} />
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input name="name" placeholder="名無しさん" style={{ padding: '5px' }} />
            <input name="delete_password" placeholder="削除キー(任意)" style={{ padding: '5px' }} />
          </div>

          <div>
            <textarea name="content" rows={5} style={{ width: '100%', padding: '5px' }} required></textarea>
          </div>
          
          <div style={{ margin: '10px 0' }}>
            <label style={{ fontSize: '14px' }}>画像添付：</label>
            <input type="file" name="image" accept="image/*" />
          </div>

          <button type="submit" style={{ marginTop: '10px', padding: '5px 20px' }}>書き込む</button>
        </form>
      </div>
    </main>
  );
}