import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Pressable, TextInput } from 'react-native'
import React, { useState , useEffect} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { questions as allQuestions } from "../config/question"; // 全ての問題を読み込む
import AppBannerAd from "../components/AppBannerAd";

const Questions = ({ route, navigation }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const { mode } = route.params; // "normal" または "mistake"
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    setCurrentQuestionIndex(0); // 問題のインデックスをリセット
    setSelectedAnswer(null); // 選択された答えもリセット
    setTextAnswer(''); // 自由入力欄もリセット
    setIsAnswered(false); // 解答状態もリセット
    const loadQuestions = async () => {
      if (mode === "mistake") {
        const storedQuestions = await AsyncStorage.getItem('incorrectQuestions');
        const incorrectQuestions = storedQuestions ? JSON.parse(storedQuestions) : [];
        setQuestions(incorrectQuestions);
      } else {
        setQuestions(allQuestions);
      }
    };
    loadQuestions();
  }, [mode]);

  useEffect(() => {
    // 🔹 answeredQuestions が更新されたら非同期で不揮発ストレージに保存
    const saveIncorrectQuestions = async () => {
      await AsyncStorage.setItem('incorrectQuestions', JSON.stringify(incorrectQuestions));
    };
  
    if (incorrectQuestions.length > 0) {
      saveIncorrectQuestions();
    }
  }, [incorrectQuestions]); 

  // 不揮発領域から間違えた問題を取得
  const loadIncorrectQuestions = async () => {
    try {
      const storedQuestions = await AsyncStorage.getItem('incorrectQuestions');
      if (storedQuestions) {
        setIncorrectQuestions(JSON.parse(storedQuestions));
      }
    } catch (error) {
      console.error('間違えた問題の取得に失敗しました:', error);
    }
  };

  // 間違えた問題を保存
  const saveIncorrectQuestion = async (question) => {
    try {
      const updatedQuestions = [...incorrectQuestions];

      // 重複を防ぐ
      if (!updatedQuestions.some(q => q.question === question.question)) {
        updatedQuestions.push(question);
        await AsyncStorage.setItem('incorrectQuestions', JSON.stringify(updatedQuestions));
        setIncorrectQuestions(updatedQuestions);
      }
    } catch (error) {
      console.error('間違えた問題の保存に失敗しました:', error);
    }
  };

  // 間違えた問題を削除
  const removeIncorrectQuestion = async (question) => {
    try {
      const updatedQuestions = incorrectQuestions.filter(q => q.question !== question.question);
      await AsyncStorage.setItem('incorrectQuestions', JSON.stringify(updatedQuestions));
      setIncorrectQuestions(updatedQuestions);
    } catch (error) {
      console.error('間違えた問題の削除に失敗しました:', error);
    }
  };

  // 選択肢をタップしたときの処理
  const handleAnswerSelection = async (answer, question) => {
    if (isAnswered) return; // 解答済みなら二重回答を防ぐ

    setSelectedAnswer(answer);
    const isCorrect = answer === question.correctAnswer;

    if (isCorrect) {
      setCorrectAnswersCount(prev => prev + 1);
      removeIncorrectQuestion(question);
    }

    const answeredQuestion = {
      question: question.question,
      selectedAnswer: answer,
      correctAnswer: question.correctAnswer,
    };

    setAnsweredQuestions(prev => [...prev, answeredQuestion]);

    if (!isCorrect) {
      setIncorrectQuestions(prev => {
        const updatedQuestions = [...prev];
        if (!updatedQuestions.some(q => q.question === question.question)) {
          updatedQuestions.push(question);
        }

        AsyncStorage.setItem('incorrectQuestions', JSON.stringify(updatedQuestions))
        .catch(error => console.error('間違えた問題の保存に失敗しました:', error));

        return updatedQuestions;
      });
    }

    setLastAnswerCorrect(isCorrect);
    setIsAnswered(true);
  };

  const goToNextQuestion = () => {
    const isLast = currentQuestionIndex === questions.length - 1;

    if (isLast) {
      navigation.navigate('Result', {
        correctAnswersCount,
        answeredQuestions,
      });
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
                <View style={styles.optionBox}>
                  <Text style={styles.optionText}>{option}</Text>
                </View>
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
  optionsContainer: {
    marginTop: 10,
  },
  optionBox: {
    backgroundColor: "#E3F2FD", // 薄い青
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: "center",
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
    borderWidth: 2,
    borderColor: "#28a745",
    borderRadius: 8,
  },
  optionBoxIncorrect: {
    borderWidth: 2,
    borderColor: "#dc3545",
    borderRadius: 8,
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
