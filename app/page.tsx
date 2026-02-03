import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';

// ▼ 書き込み処理
async function addPost(formData: FormData) {
  'use server';
  const content = formData.get('content') as string;
  // 名前が空なら "名無しさん" を使う
  const name = (formData.get('name') as string) || '名無しさん';
  
  if (content) {
    // name も一緒に保存する
    await supabase.from('posts').insert([{ name, content }]);
    revalidatePath('/');
  }
}

// ▼ 画面の表示
export default async function Home() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <main style={{ maxWidth: '800px', margin: '20px auto', fontFamily: 'MS PGothic, sans-serif' }}>
      <h1 style={{ color: '#c00', borderBottom: '1px solid #ccc' }}>Next.js ちゃんねる</h1>
      
      {/* 投稿フォーム */}
      <div style={{ backgroundColor: '#efefef', padding: '15px', marginBottom: '20px', border: '1px solid #ccc' }}>
        <form action={addPost}>
          <div>
            <label>名前：</label>
            <input 
              name="name" 
              placeholder="名無しさん" 
              style={{ padding: '5px', marginBottom: '10px' }} 
            />
          </div>
          <div>
            <textarea 
              name="content" 
              rows={4} 
              style={{ width: '100%', padding: '5px' }} 
              required 
            ></textarea>
          </div>
          <button type="submit" style={{ padding: '5px 20px', cursor: 'pointer', marginTop: '5px' }}>書き込む</button>
        </form>
      </div>

      {/* 投稿一覧 */}
      <div>
        {posts?.map((post, index) => (
          <div key={post.id} style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              {posts.length - index} 名前：
              <span style={{ color: 'green', fontWeight: 'bold' }}> {post.name} </span> 
              ：{new Date(post.created_at).toLocaleString('ja-JP')}
            </div>
            <div style={{ marginLeft: '20px', whiteSpace: 'pre-wrap' }}>
              {post.content}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}