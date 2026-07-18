// 模擬試験(本番想定)モードの設定と純粋なロジック。
// 本番の出題数・時間配分そのものではなく、比率はそのままに縮小した「ミニ模擬試験」として、
// 全201問中30問・制限時間30分・合格ライン70%で構成する(2026-07-18時点の暫定値、実際の試験仕様が分かり次第調整可能)。

export const MOCK_EXAM_QUESTION_COUNT = 30;
export const MOCK_EXAM_TIME_LIMIT_SECONDS = 30 * 60;
export const MOCK_EXAM_PASS_RATE = 70;

// 各カテゴリの母数比率を保ったまま、目標問題数を最大剰余法(largest remainder method)で配分する。
// 例: 5択117/○×54/記述30(計201)から30問を選ぶ場合 → 17/8/5 のように、端数を取りこぼさず合計が必ずtotalになる。
export const allocateByRatio = (counts, total) => {
  const entries = Object.entries(counts);
  const sumCounts = entries.reduce((sum, [, count]) => sum + count, 0);

  const shares = entries.map(([key, count]) => {
    const exact = sumCounts > 0 ? (count / sumCounts) * total : 0;
    const floor = Math.floor(exact);
    return { key, floor, remainder: exact - floor };
  });

  const allocated = shares.reduce((sum, s) => sum + s.floor, 0);
  const remaining = total - allocated;
  const byRemainderDesc = [...shares].sort((a, b) => b.remainder - a.remainder);

  const result = {};
  shares.forEach((s) => { result[s.key] = s.floor; });
  for (let i = 0; i < remaining; i++) {
    result[byRemainderDesc[i % byRemainderDesc.length].key] += 1;
  }
  return result;
};

export const formatTime = (totalSeconds) => {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
