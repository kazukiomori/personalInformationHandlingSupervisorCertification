// 学習セッションの結果(学習履歴)に関する純粋なデータ処理をまとめたモジュール。
// AsyncStorageへの読み書きは呼び出し側(画面コンポーネント)で行う。

export const SESSION_HISTORY_KEY = "sessionHistory";
export const MAX_HISTORY_ENTRIES = 200; // 際限なく増え続けないよう保存件数の上限を設ける

export const toDateOnlyString = (date) => date.toISOString().slice(0, 10);

// 1セッション分の解答結果から、カテゴリ別の正答数・出題数を集計する
export const buildCategoryBreakdown = (answeredQuestions) => {
  const breakdown = {};
  answeredQuestions.forEach(({ category, selectedAnswer, correctAnswer }) => {
    if (!category) return;
    if (!breakdown[category]) {
      breakdown[category] = { correct: 0, total: 0 };
    }
    breakdown[category].total += 1;
    if (selectedAnswer === correctAnswer) {
      breakdown[category].correct += 1;
    }
  });
  return breakdown;
};

// セッション終了時に保存する1件分の履歴レコードを作る
export const createSessionRecord = ({ mode, category, correctCount, totalCount, answeredQuestions, now = new Date() }) => ({
  timestamp: now.toISOString(),
  date: toDateOnlyString(now),
  mode,
  category,
  correctCount,
  totalCount,
  categoryBreakdown: buildCategoryBreakdown(answeredQuestions),
});

// 全セッション履歴から、カテゴリ別の累計正答数・出題数を集計する(弱点分析用)
export const aggregateCategoryStats = (sessions) => {
  const stats = {};
  sessions.forEach((session) => {
    Object.entries(session.categoryBreakdown || {}).forEach(([category, { correct, total }]) => {
      if (!stats[category]) {
        stats[category] = { correct: 0, total: 0 };
      }
      stats[category].correct += correct;
      stats[category].total += total;
    });
  });
  return stats;
};

// 学習した日付の集合から、今日(または昨日)を起点にした連続学習日数を計算する。
// 今日まだ学習していなくても、昨日までの連続記録があればストリークは途切れていないものとして扱う。
export const computeStreak = (sessions, now = new Date()) => {
  const studiedDates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const cursor = new Date(now);

  if (!studiedDates.has(toDateOnlyString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (studiedDates.has(toDateOnlyString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};
