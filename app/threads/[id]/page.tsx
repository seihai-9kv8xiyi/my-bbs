import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

// ▼ 新規書き込み処理
async function addPost(formData: FormData) {
  'use server';
  const content = formData.get('content') as string;
  const name = (formData.get('name') as string) || '名無しさん';
  const delete_password = (formData.get('delete_password') as string) || ''; // パスワード取得
  const thread_id = formData.get('thread_id');
  const imageFile = formData.get('image') as File;

  let image_url = null;

  // 画像アップロード処理
  if (imageFile && imageFile.size > 0) {
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageFile);

    if (!uploadError) {
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      image_url = data.publicUrl;
    }
  }

  if (content && thread_id) {
    // パスワードも一緒に保存するお
    await supabase.from('posts').insert([{ name, content, thread_id, image_url, delete_password }]);
    revalidatePath(`/threads/${thread_id}`);
  }
}

// ▼ 削除機能（ここが新機能！）
async function deletePost(formData: FormData) {
  'use server';
  const post_id = formData.get('post_id');
  const input_password = formData.get('password') as string;
  const thread_id = formData.get('thread_id');

  if (post_id && input_password) {
    // IDとパスワードが一致する投稿を探して削除する
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post_id)
      .eq('delete_password', input_password); // ここでパスワードチェック！

    if (!error) {
      revalidatePath(`/threads/${thread_id}`);
    }
  }
}

// ▼ スレッド詳細画面
export default async function ThreadPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const { data: thread } = await supabase.from('threads').select('*').eq('id', id).single();
  
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', id)
    .order('created_at', { ascending: true });

  if (!thread) return <div>スレッドが見つかりません</div>;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>← 一覧に戻る</Link>
      
      <h1 style={{ color: '#c00', margin: '20px 0' }}>{thread.title}</h1>

      {/* レス一覧 */}
      <div style={{ marginBottom: '50px' }}>
        {posts?.map((post, index) => (
          <div key={post.id} style={{ marginBottom: '15px', borderBottom: '1px dotted #ccc', paddingBottom: '10px' }}>
            <div className="post-header">
              {index + 1} ：
              <span style={{ color: 'green', fontWeight: 'bold' }}> {post.name} </span>
              ：{new Date(post.created_at).toLocaleString('ja-JP')}
            </div>
            
            <div style={{ marginLeft: '20px' }}>
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{post.content}</div>
              {post.image_url && (
                <img src={post.image_url} alt="投稿画像" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }} />
              )}
            </div>

            {/* ▼ 削除フォーム（折りたたみ式） */}
            <details style={{ marginTop: '5px', fontSize: '12px', color: '#666', marginLeft: '20px' }}>
              <summary style={{ cursor: 'pointer' }}>[削除]</summary>
              <form action={deletePost} style={{ display: 'inline-flex', gap: '5px', marginTop: '5px' }}>
                <input type="hidden" name="post_id" value={post.id} />
                <input type="hidden" name="thread_id" value={id} />
                <input 
                  type="password" 
                  name="password" 
                  placeholder="削除キー" 
                  style={{ width: '80px', fontSize: '12px', padding: '2px' }} 
                  required 
                />
                <button type="submit" style={{ fontSize: '12px', padding: '2px 5px' }}>削除</button>
              </form>
            </details>
          </div>
        ))}
      </div>

      {/* 書き込みフォーム */}
      <div style={{ backgroundColor: '#efefef', padding: '20px', border: '1px solid #ccc' }}>
        <form action={addPost}>
          <input type="hidden" name="thread_id" value={id} />
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input name="name" placeholder="名無しさん" style={{ padding: '5px' }} />
            {/* ▼ 削除キー入力欄を追加 */}
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