import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

// ▼ レス書き込み処理
async function addPost(formData: FormData) {
  'use server';
  const content = formData.get('content') as string;
  const name = (formData.get('name') as string) || '名無しさん';
  const thread_id = formData.get('thread_id'); // どのスレか

  if (content && thread_id) {
    await supabase.from('posts').insert([{ name, content, thread_id }]);
    // 書き込んだスレのページだけ更新
    revalidatePath(`/threads/${thread_id}`);
  }
}

// ▼ スレッド詳細画面
export default async function ThreadPage({ params }: { params: { id: string } }) {
  // Next.js 15以降は params を await する必要がある場合がある
  const { id } = await params;

  // 1. スレのタイトルを取得
  const { data: thread } = await supabase.from('threads').select('*').eq('id', id).single();
  
  // 2. そのスレのレスを取得
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', id) // ここ重要！スレIDで絞り込み
    .order('created_at', { ascending: true }); // 古い順（1から順に）

  if (!thread) return <div>スレッドが見つかりません</div>;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>← 一覧に戻る</Link>
      
      <h1 style={{ color: '#c00', margin: '20px 0' }}>{thread.title}</h1>

      {/* レス一覧 */}
      <div style={{ marginBottom: '50px' }}>
        {posts?.map((post, index) => (
          <div key={post.id} style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '14px', marginBottom: '5px', color: '#000' }}>
              {index + 1} ：
              <span style={{ color: 'green', fontWeight: 'bold' }}>{post.name}</span>
              ：{new Date(post.created_at).toLocaleString('ja-JP')}
            </div>
            <div style={{ marginLeft: '20px', whiteSpace: 'pre-wrap' }}>
              {post.content}
            </div>
          </div>
        ))}
      </div>

      {/* 書き込みフォーム */}
      <div style={{ backgroundColor: '#efefef', padding: '20px', border: '1px solid #ccc' }}>
        <form action={addPost}>
          {/* 隠しデータとしてスレIDを送る */}
          <input type="hidden" name="thread_id" value={id} />
          
          <div>
            <input name="name" placeholder="名無しさん" style={{ marginBottom: '10px', padding: '5px' }} />
          </div>
          <div>
            <textarea name="content" rows={5} style={{ width: '100%', padding: '5px' }} required></textarea>
          </div>
          <button type="submit" style={{ marginTop: '10px', padding: '5px 20px' }}>書き込む</button>
        </form>
      </div>
    </main>
  );
}