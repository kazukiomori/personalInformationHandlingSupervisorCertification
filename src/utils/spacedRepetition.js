// SM-2(Anki等で使われるアルゴリズム)を、正解/不正解の二値評価向けに簡略化したもの。
// 参考: SuperMemo SM-2 (https://super-memory.com/english/ol/sm2.htm)

export const SRS_STORAGE_KEY = "srsData";

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

export const createInitialSrsState = () => ({
  repetitions: 0,
  interval: 0,
  easeFactor: DEFAULT_EASE_FACTOR,
  dueDate: null,
});

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const toDateOnlyString = (date) => date.toISOString().slice(0, 10);

// isCorrect: true なら復習間隔を伸ばし、false なら間隔をリセットして翌日に再出題する。
export const scheduleReview = (srsState, isCorrect, now = new Date()) => {
  const prev = srsState || createInitialSrsState();

  if (!isCorrect) {
    return {
      repetitions: 0,
      interval: 1,
      easeFactor: Math.max(MIN_EASE_FACTOR, prev.easeFactor - 0.2),
      dueDate: toDateOnlyString(addDays(now, 1)),
    };
  }

  const repetitions = prev.repetitions + 1;
  const easeFactor = Math.max(MIN_EASE_FACTOR, prev.easeFactor + 0.1);
  let interval;
  if (repetitions === 1) {
    interval = 1;
  } else if (repetitions === 2) {
    interval = 6;
  } else {
    interval = Math.round(prev.interval * easeFactor);
  }

  return {
    repetitions,
    interval,
    easeFactor,
    dueDate: toDateOnlyString(addDays(now, interval)),
  };
};

// dueDateが今日以前(=未学習でない、かつ復習日が来ている)ものだけを対象とする。
export const isDue = (srsState, now = new Date()) => {
  if (!srsState || !srsState.dueDate) {
    return false;
  }
  return srsState.dueDate <= toDateOnlyString(now);
};
