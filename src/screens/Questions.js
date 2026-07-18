import { StyleSheet, View, ScrollView, TouchableOpacity, Pressable, TextInput } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import Text from '../components/AppText';
import { questions as allQuestions, ALL_CATEGORY, CATEGORIES, filterByCategory } from "../config/question"; // 全ての問題を読み込む
import { SRS_STORAGE_KEY, scheduleReview, isDue } from "../utils/spacedRepetition";
import { SESSION_HISTORY_KEY, MAX_HISTORY_ENTRIES, createSessionRecord } from "../utils/sessionHistory";
import { BOOKMARKS_STORAGE_KEY, toggleBookmark } from "../utils/bookmarks";
import { MOCK_EXAM_QUESTION_COUNT, MOCK_EXAM_TIME_LIMIT_SECONDS, MOCK_EXAM_PASS_RATE, allocateByRatio, formatTime } from "../utils/mockExam";
import AppBannerAd from "../components/AppBannerAd";

// Fisher-Yatesで配列の並び順をシャッフルする(元の配列は変更しない)
const shuffleArray = (list) => {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 各問題のoptionsも独立してシャッフルした新しいオブジェクトを返す(question.jsの元配列は変更しない)
const shuffleQuestionOptions = (list) => list.map(q => (
  q.options && q.options.length > 0
    ? { ...q, options: shuffleArray(q.options) }
    : q
));

// セッション終了時に学習履歴を1件追加保存する(上限件数を超えた古い記録は切り捨てる)
const saveSessionRecord = async ({ mode, category, correctCount, totalCount, answeredQuestions }) => {
  const record = createSessionRecord({ mode, category, correctCount, totalCount, answeredQuestions });
  const stored = await AsyncStorage.getItem(SESSION_HISTORY_KEY);
  const history = stored ? JSON.parse(stored) : [];
  const updated = [...history, record].slice(-MAX_HISTORY_ENTRIES);
  await AsyncStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
};

const Questions = ({ route, navigation }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const { mode, category = ALL_CATEGORY, setSize = null } = route.params; // mode: "normal" / "review"(間隔反復) / "bookmark"(要復習) / "mockExam"(模擬試験)
  const [questions, setQuestions] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [timeLeft, setTimeLeft] = useState(MOCK_EXAM_TIME_LIMIT_SECONDS);
  const srsDataRef = useRef({}); // 問題id単位の間隔反復スケジュール(セッション中はメモリ上で保持し、都度AsyncStorageへ反映)
  const examFinishedRef = useRef(false); // 模擬試験が終了処理済みかどうか(タイムアウトと通常終了の二重実行を防ぐ)
  const answerLockRef = useRef(false); // 模擬試験は自動で次へ進むため、連打による二重回答を防ぐ

  useEffect(() => {
    setCurrentQuestionIndex(0); // 問題のインデックスをリセット
    setSelectedAnswer(null); // 選択された答えもリセット
    setTextAnswer(''); // 自由入力欄もリセット
    setIsAnswered(false); // 解答状態もリセット
    examFinishedRef.current = false;
    setTimeLeft(MOCK_EXAM_TIME_LIMIT_SECONDS);
    const loadQuestions = async () => {
      const [storedSrs, storedBookmarks] = await Promise.all([
        AsyncStorage.getItem(SRS_STORAGE_KEY),
        AsyncStorage.getItem(BOOKMARKS_STORAGE_KEY),
      ]);
      const srsData = storedSrs ? JSON.parse(storedSrs) : {};
      srsDataRef.current = srsData;
      const bookmarks = storedBookmarks ? JSON.parse(storedBookmarks) : [];
      setBookmarkedIds(bookmarks);

      if (mode === "review") {
        const dueQuestions = allQuestions.filter(q => isDue(srsData[q.id]));
        const shuffled = shuffleArray(filterByCategory(dueQuestions, category));
        setQuestions(shuffleQuestionOptions(shuffled));
      } else if (mode === "bookmark") {
        const bookmarkedQuestions = allQuestions.filter(q => bookmarks.includes(q.id));
        const shuffled = shuffleArray(filterByCategory(bookmarkedQuestions, category));
        setQuestions(shuffleQuestionOptions(shuffled));
      } else if (mode === "mockExam") {
        // 実際の出題比率(カテゴリ構成比)を保ったまま、目標問題数だけ層化抽出する
        const realCategories = CATEGORIES.filter(c => c !== ALL_CATEGORY);
        const countsByCategory = {};
        realCategories.forEach(cat => {
          countsByCategory[cat] = allQuestions.filter(q => q.category === cat).length;
        });
        const allocation = allocateByRatio(countsByCategory, MOCK_EXAM_QUESTION_COUNT);
        const picked = realCategories.flatMap(cat => (
          shuffleArray(allQuestions.filter(q => q.category === cat)).slice(0, allocation[cat])
        ));
        setQuestions(shuffleQuestionOptions(shuffleArray(picked)));
      } else {
        const shuffled = shuffleArray(filterByCategory(allQuestions, category));
        const sliced = setSize ? shuffled.slice(0, setSize) : shuffled;
        setQuestions(shuffleQuestionOptions(sliced));
      }
    };
    loadQuestions();
  }, [mode, category, setSize]);

  // 模擬試験モードの制限時間カウントダウン。0になったらその時点で強制終了する。
  useEffect(() => {
    if (mode !== "mockExam" || questions.length === 0 || examFinishedRef.current) return;

    if (timeLeft <= 0) {
      examFinishedRef.current = true;
      finishSession(answeredQuestions, correctAnswersCount);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [mode, questions.length, timeLeft]);

  // 問題が切り替わったら、模擬試験の連打防止ロックを解除する
  useEffect(() => {
    answerLockRef.current = false;
  }, [currentQuestionIndex]);

  // 「要復習」ブックマークの付け外し(ミスとは独立した、ユーザーが手動で管理する印)
  const handleToggleBookmark = (questionId) => {
    const updated = toggleBookmark(bookmarkedIds, questionId);
    setBookmarkedIds(updated);
    AsyncStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated))
      .catch(error => console.error('ブックマークの保存に失敗しました:', error));
  };

  // セッション(または模擬試験)を終了し、学習履歴を保存してResult画面へ遷移する。
  // 模擬試験は出題数を固定(MOCK_EXAM_QUESTION_COUNT)で評価するため、時間切れで未解答が残っていても
  // 分母はその固定値のままにし、合格ラインの判定に反映させる。
  const finishSession = (finalAnsweredQuestions, finalCorrectCount) => {
    examFinishedRef.current = true;
    const totalCount = mode === "mockExam" ? MOCK_EXAM_QUESTION_COUNT : questions.length;

    saveSessionRecord({ mode, category, correctCount: finalCorrectCount, totalCount, answeredQuestions: finalAnsweredQuestions })
      .catch(error => console.error('学習履歴の保存に失敗しました:', error));

    navigation.navigate('Result', {
      correctAnswersCount: finalCorrectCount,
      answeredQuestions: finalAnsweredQuestions,
      totalCount,
      ...(mode === "mockExam" ? { passRate: MOCK_EXAM_PASS_RATE } : {}),
    });
  };

  // 選択肢をタップしたときの処理
  const handleAnswerSelection = (answer, question) => {
    if (isAnswered) return; // 解答済みなら二重回答を防ぐ
    if (mode === "mockExam") {
      if (answerLockRef.current) return; // 自動で次へ進むため、連打による二重回答を防ぐ
      answerLockRef.current = true;
    }

    const isCorrect = answer === question.correctAnswer;

    const answeredQuestion = {
      question: question.question,
      selectedAnswer: answer,
      correctAnswer: question.correctAnswer,
      category: question.category,
    };

    const updatedAnsweredQuestions = [...answeredQuestions, answeredQuestion];
    const updatedCorrectCount = correctAnswersCount + (isCorrect ? 1 : 0);

    setAnsweredQuestions(updatedAnsweredQuestions);
    setCorrectAnswersCount(updatedCorrectCount);

    const updatedSrsData = {
      ...srsDataRef.current,
      [question.id]: scheduleReview(srsDataRef.current[question.id], isCorrect),
    };
    srsDataRef.current = updatedSrsData;
    AsyncStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(updatedSrsData))
      .catch(error => console.error('復習スケジュールの保存に失敗しました:', error));

    if (mode === "mockExam") {
      // 本番想定: 正誤フィードバックを見せず、即座に次の問題または結果画面へ進む
      const isLast = currentQuestionIndex === questions.length - 1;
      setSelectedAnswer(null);
      setTextAnswer('');
      if (isLast) {
        finishSession(updatedAnsweredQuestions, updatedCorrectCount);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
      return;
    }

    setSelectedAnswer(answer);
    setLastAnswerCorrect(isCorrect);
    setIsAnswered(true);
  };

  const goToNextQuestion = () => {
    const isLast = currentQuestionIndex === questions.length - 1;

    if (isLast) {
      finishSession(answeredQuestions, correctAnswersCount);
      return;
    }

    setIsAnswered(false);
    setSelectedAnswer(null);
    setTextAnswer('');
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handleTextSubmit = (question) => {
    if (isAnswered) return;
    const trimmed = textAnswer.trim();
    if (!trimmed) {
      return;
    }
    handleAnswerSelection(trimmed, question);
  };

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <>
      <ScrollView style={styles.container}>
      <View style={styles.container}>
        {mode === "mockExam" && (
          <View style={styles.examHeaderRow}>
            <Text style={styles.examBadge}>📝 模擬試験</Text>
            <Text style={[styles.examTimer, timeLeft <= 60 && styles.examTimerWarning]}>
              ⏱ {formatTime(timeLeft)}
            </Text>
          </View>
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {questions.length}
          </Text>
        </View>
        <View style={styles.metaRow}>
          {category !== ALL_CATEGORY ? (
            <Text style={styles.categoryBadge}>{category}</Text>
          ) : (
            <View />
          )}
          <Pressable
            style={styles.bookmarkButton}
            onPress={() => handleToggleBookmark(currentQuestion.id)}
            hitSlop={8}
          >
            <Icon
              name={bookmarkedIds.includes(currentQuestion.id) ? "star" : "star-o"}
              size={22}
              color="#FFA000"
            />
            <Text style={styles.bookmarkButtonText}>要復習</Text>
          </Pressable>
        </View>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        {currentQuestion.options && currentQuestion.options.length > 0 ? (
          currentQuestion.options.map((option, index) => {
            const isThisCorrect = option === currentQuestion.correctAnswer;
            const isThisSelected = option === selectedAnswer;
            return (
              <Pressable
                key={index}
                disabled={isAnswered}
                style={[
                  styles.optionButton,
                  isAnswered && isThisCorrect && styles.optionBoxCorrect,
                  isAnswered && isThisSelected && !isThisCorrect && styles.optionBoxIncorrect,
                ]}
                onPress={() => handleAnswerSelection(option, currentQuestion)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.textAnswerContainer}>
            <TextInput
              style={styles.textInput}
              value={textAnswer}
              onChangeText={setTextAnswer}
              editable={!isAnswered}
              placeholder="答えを入力してください"
              returnKeyType="done"
              onSubmitEditing={() => handleTextSubmit(currentQuestion)}
            />
            {!isAnswered && (
              <Pressable
                style={styles.submitButton}
                onPress={() => handleTextSubmit(currentQuestion)}
              >
                <Text style={styles.submitButtonText}>回答する</Text>
              </Pressable>
            )}
          </View>
        )}

        {isAnswered && (
          <View style={[styles.feedbackBox, lastAnswerCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
            <Text style={styles.feedbackTitle}>{lastAnswerCorrect ? '正解！🎉' : '不正解 😢'}</Text>
            {!lastAnswerCorrect && (
              <Text style={styles.feedbackAnswerText}>
                あなたの答え: {selectedAnswer}{'\n'}正解: {currentQuestion.correctAnswer}
              </Text>
            )}
            {currentQuestion.explanation ? (
              <View style={styles.explanationContainer}>
                <Text style={styles.explanationLabel}>解説</Text>
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              </View>
            ) : null}
            <Pressable style={styles.nextButton} onPress={goToNextQuestion}>
              <Text style={styles.nextButtonText}>
                {currentQuestionIndex === questions.length - 1 ? '結果へ' : '次へ'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      </ScrollView>
      <AppBannerAd />
    </>
  );
};

export default Questions

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "justify",
    color: "#333",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "bold",
    color: "#1565C0",
    backgroundColor: "#E3F2FD",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  examHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1565C0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  examBadge: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  examTimer: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  examTimerWarning: {
    color: "#FFCDD2",
  },
  bookmarkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  bookmarkButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFA000",
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E3F2FD",
    overflow: "hidden",
    marginRight: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#1565C0",
  },
  progressText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1565C0",
  },
  optionsContainer: {
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: "#E3F2FD", // 薄い青
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent", // 正誤表示時に枠線が太さ分だけ食い込まないよう、未回答時から確保しておく
  },
  optionText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1565C0",
  },
  nextButton: {
    backgroundColor: "#4CAF50", // 緑色
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  textAnswerContainer: {
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#1565C0",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#1565C0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  optionBoxCorrect: {
    borderColor: "#28a745",
  },
  optionBoxIncorrect: {
    borderColor: "#dc3545",
  },
  feedbackBox: {
    marginTop: 10,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackCorrect: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
  },
  feedbackIncorrect: {
    backgroundColor: "#f8d7da",
    borderColor: "#dc3545",
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  feedbackAnswerText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  explanationContainer: {
    marginTop: 4,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 6,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1565C0",
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#333",
  },
})
