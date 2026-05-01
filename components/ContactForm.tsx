"use client"; // ▼ これが画面側で動く（文字を消したりできる）魔法だお！

import { useState, useRef } from 'react';
import { submitInquiry } from '@/app/actions';

export default function ContactForm() {
  // メッセージを表示するための変数だお
  const [status, setStatus] = useState('');
  
  // フォーム自体を操作するための魔法の杖だお
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    setStatus('送信中だお...');
    
    // サーバーのプログラム（actions.ts）を呼び出す
    const result = await submitInquiry(formData);

    if (result?.success) {
      setStatus('✅ 管理人にメッセージを送りました！');
      formRef.current?.reset(); // 🌟 ここで入力欄を空っぽにするお！
      
      // 5秒後に「送ったお！」メッセージを消す気配り
      setTimeout(() => setStatus(''), 5000);
    } else {
      setStatus('❌ 送信に失敗しました…');
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input 
        type="text" 
        name="name" 
        placeholder="お名前（省略可）" 
        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
      />
      <textarea 
        name="message" 
        placeholder="お問い合わせ内容を書いてください" 
        required 
        rows={4} 
        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
      ></textarea>
      
      <button 
        type="submit" 
        style={{ padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        送信するお！
      </button>

      {/* ステータスメッセージがある時だけ表示するお！ */}
      {status && <p style={{ color: '#c00', fontWeight: 'bold', margin: '0' }}>{status}</p>}
    </form>
  );
}