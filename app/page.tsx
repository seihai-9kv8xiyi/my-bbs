import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

// ▼ スレ立て処理
async function createThread(formData: FormData) {
  'use server';
  const title = formData.get('title') as string;
  if (title) {
    await supabase.from('threads').insert([{ title }]);
    revalidatePath('/');
  }
}

export default async function Home() {
  // スレッドを全取得
  const { data: threads } = await supabase
    .from('threads')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#c00', borderBottom: '1px solid #ccc' }}>Next.js ちゃんねる</h1>
      
      {/* ▼ここがスレ立てフォームだお！ */}
      <div style={{ backgroundColor: '#efefef', padding: '15px', marginBottom: '30px', border: '1px solid #ccc' }}>
        <h3>新規スレッド作成</h3>
        <form action={createThread}>
          <input 
            name="title" 
            placeholder="スレタイを入れてね" 
            style={{ width: '70%', padding: '5px', marginRight: '10px' }} 
            required 
          />
          <button type="submit" style={{ padding: '5px 15px' }}>スレを立てる</button>
        </form>
      </div>

      {/* スレッド一覧 */}
      <div>
        {threads?.map((thread) => (
          <div key={thread.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
            <Link href={`/threads/${thread.id}`} style={{ textDecoration: 'none', color: 'blue', fontSize: '18px', fontWeight: 'bold' }}>
              {thread.id}: {thread.title}
            </Link>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {new Date(thread.created_at).toLocaleString('ja-JP')}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}