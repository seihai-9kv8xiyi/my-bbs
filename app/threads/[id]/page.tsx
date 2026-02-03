import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

// ▼ レス書き込み処理（画像対応版）
async function addPost(formData: FormData) {
  'use server';
  const content = formData.get('content') as string;
  const name = (formData.get('name') as string) || '名無しさん';
  const thread_id = formData.get('thread_id');
  const imageFile = formData.get('image') as File; // 画像ファイルを取得

  let image_url = null;

  // 画像がある場合だけアップロード処理をする
  if (imageFile && imageFile.size > 0) {
    // ファイル名が被らないように「今の時間_ファイル名」にする
    const fileName = `${Date.now()}_${imageFile.name}`;
    
    // 1. SupabaseのStorageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('images') // さっき作ったバケツの名前
      .upload(fileName, imageFile);

    // 2. アップロード成功したら、その公開URLを取得
    if (!uploadError) {
      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      image_url = data.publicUrl;
    }
  }

  // DBに保存（画像URLも一緒に）
  if (content && thread_id) {
    await supabase.from('posts').insert([{ name, content, thread_id, image_url }]);
    revalidatePath(`/threads/${thread_id}`);
  }
}

// ▼ スレッド詳細画面
export default async function ThreadPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // 1. スレのタイトルを取得
  const { data: thread } = await supabase.from('threads').select('*').eq('id', id).single();
  
  // 2. そのスレのレスを取得
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
          <div key={post.id} style={{ marginBottom: '15px' }}>
            <div className="post-header">
              {index + 1} ：
              <span style={{ color: 'green', fontWeight: 'bold' }}> {post.name} </span>
              ：{new Date(post.created_at).toLocaleString('ja-JP')}
            </div>
            <div style={{ marginLeft: '20px' }}>
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{post.content}</div>
              
              {/* ▼ 画像があったら表示するお！ */}
              {post.image_url && (
                <img 
                  src={post.image_url} 
                  alt="投稿画像" 
                  style={{ maxWidth: '300px', maxHeight: '300px', border: '1px solid #ccc', borderRadius: '4px' }} 
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 書き込みフォーム */}
      <div style={{ backgroundColor: '#efefef', padding: '20px', border: '1px solid #ccc' }}>
        <form action={addPost}>
          <input type="hidden" name="thread_id" value={id} />
          
          <div>
            <input name="name" placeholder="名無しさん" style={{ marginBottom: '10px', padding: '5px' }} />
          </div>
          <div>
            <textarea name="content" rows={5} style={{ width: '100%', padding: '5px' }} required></textarea>
          </div>
          
          {/* ▼ 画像選択ボタンを追加したお */}
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