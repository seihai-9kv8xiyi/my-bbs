import Link from 'next/link';
import { submitInquiry } from '@/app/actions';
import ContactForm from '@/components/ContactForm';
// ▼ ここに好きな板を定義するお！後から増やせるお。
const boards = [
  { id: 'news', name: 'ニュース速報板', description: '最新のニュースや時事ネタについて語る板です' },
  { id: 'game', name: 'ゲーム板', description: 'ゲーム全般の話題、攻略、対戦募集はこちら' },
  { id: 'lounge', name: 'ラウンジ（雑談）', description: '何でもありの雑談スペース。旧スレッドはここにありまする。' },
  { id: 'anker', name: '安価用板', description: '安価用のスレッドを立てる板です'}
];

export default function Home() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #c00', paddingBottom: '10px', color: '#333' }}>
        MNSKちゃんねる
      </h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>好きな板を選んでください！</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {boards.map(board => (
          <Link href={`/boards/${board.id}`} key={board.id} style={{
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            textDecoration: 'none', 
            color: '#333', 
            background: '#fcfcfc',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'background 0.2s'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#0066cc' }}>{board.name}</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{board.description}</p>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: '50px', padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#333' }}>📮 管理人へのお問い合わせ</h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          削除依頼や、追加してほしい板の要望はこちらへだお！
        </p>
        
        {/* ▼ 長かったフォームがたったの1行に！スッキリ！ ▼ */}
        <ContactForm />
        
      </div>
    </div>
  );
}