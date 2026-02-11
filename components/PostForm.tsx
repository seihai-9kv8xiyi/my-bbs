'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { addPost } from '@/app/actions';
import toast from 'react-hot-toast';

export default function PostForm({ threadId }: { threadId: string }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 画面のリロードを防ぐ
    setIsUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('image') as File;

    let publicUrl = '';

    // 1. 画像がある場合、ブラウザからSupabaseへ直接アップロード！
    if (file && file.size > 0) {
      // 日本語ファイル名対策
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // ★ここが「直接アップロード」の魔法だお！
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) {
        console.error(uploadError);
        toast.error('画像のアップロードに失敗しました。');
        setIsUploading(false);
        return;
      }

      // アップロード成功！URLを取得
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      publicUrl = data.publicUrl;
    }

    // 2. 画像のURLをセットして、サーバーのアクションを呼ぶ
    // もともとの file はサーバーに送ると重いから消して、代わりに URL を送るお
    formData.delete('image'); 
    formData.append('image_url', publicUrl);

    await addPost(formData);
    
    // 3. 完了処理
    form.reset(); // フォームを空にする
    setIsUploading(false);
    toast.success('書き込み完了しました！');
  };

  return (
    <div style={{ backgroundColor: '#efefef', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="thread_id" value={threadId} />
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input name="name" placeholder="名無しさん" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          <input name="delete_password" placeholder="削除キー(任意)" style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        
        <div>
          <textarea 
            name="content" 
            rows={5} 
            placeholder="ここに内容を書いてください。"
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }} 
            required
          ></textarea>
        </div>
        
        <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold' }}>画像添付：</label>
          {/* input type="file" はそのまま。acceptで画像のみに制限 */}
          <input type="file" name="image" accept="image/*" />
        </div>

        <button 
          type="submit" 
          disabled={isUploading}
          style={{ 
            marginTop: '10px', 
            padding: '10px 20px', 
            backgroundColor: isUploading ? '#ccc' : '#333', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isUploading ? 'アップロード中...' : '書き込む'}
        </button>
      </form>
    </div>
  );
}