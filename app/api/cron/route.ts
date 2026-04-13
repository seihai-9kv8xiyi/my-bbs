import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  // ▼ 誰でも勝手に掃除ボタンを押せないようにする合言葉チェック
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'お前には掃除する権限がない！' }, { status: 401 });
  }

  // ▼ 10日前を計算するお！
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const targetDate = tenDaysAgo.getTime(); // 時間を比較しやすいようにミリ秒にするお

  try {
    // ▼ スレッドと、それに紐づくレス(posts)の作成日時を一緒に全部取得する魔法だお！
    const { data: threads, error: fetchError } = await supabase
      .from('threads')
      .select('id, created_at, posts(id, created_at)');

    if (fetchError) throw fetchError;

    // ▼ 消す対象のスレッドIDを入れる箱
    const idsToDelete: string[] = [];

    // ▼ すべてのスレッドをチェックしていくお！
    for (const thread of threads || []) {
      const postCount = thread.posts ? thread.posts.length : 0;

      // 条件1: レス数が5未満か？（0〜4件のスレが対象）
      if (postCount < 5) {
        
        // 条件2: 最終更新日を調べるお！
        // （スレ立て日時と、すべてのレス日時の中で、一番新しい時間を取得するお）
        const allDates = [
          new Date(thread.created_at).getTime(),
          ...(thread.posts || []).map((p: any) => new Date(p.created_at).getTime())
        ];
        const lastUpdateTime = Math.max(...allDates);

        // 最終更新から10日以上経過していたら、処刑リストに追加だお！
        if (lastUpdateTime < targetDate) {
          idsToDelete.push(thread.id);
        }
      }
    }

    // ▼ 消すスレッドがなければ報告して終了だお
    if (idsToDelete.length === 0) {
      return NextResponse.json({ message: '今日は平和だった！消すスレッドはない！' });
    }

    // ▼ 処刑リストに入ったスレッドを一気にドカンと消すお！！！
    const { error: deleteError } = await supabase
      .from('threads')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) throw deleteError;

    return NextResponse.json({ 
      message: `${idsToDelete.length}個の過疎スレを削除しました！`, 
      deletedIds: idsToDelete 
    });

  } catch (error) {
    console.error('掃除エラー:', error);
    return NextResponse.json({ error: '掃除に失敗しました…' }, { status: 500 });
  }
}