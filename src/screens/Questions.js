import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Pressable } from 'react-native'
import React, { useState , useEffect} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { questions as allQuestions } from "../config/question"; // 全ての問題を読み込む

const Questions = ({ route, navigation }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  const { mode } = route.params; // "normal" または "mistake"
  const [questions, setQuestions] = useState([]); 

  useEffect(() => {
    setCurrentQuestionIndex(0); // 問題のインデックスをリセット
    setSelectedAnswer(null); // 選択された答えもリセット
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
  
    Alert.alert(
      isCorrect ? "正解！🎉" : "不正解 😢",
      `あなたの答え: ${answer}\n正解: ${question.correctAnswer}`,
      [
        {
          text: "次へ",
          onPress: () => handleNext(answeredQuestion, isCorrect), 
        },
      ]
    );
  };
  
  const handleNext = (lastAnsweredQuestion, isCorrect) => {
    if (currentQuestionIndex === questions.length - 1) {
      Alert.alert(
        "クイズ終了",
        `あなたの正解数は ${correctAnswersCount + (isCorrect ? 1 : 0)} 問です！`,
        [
          {
            text: "結果へ",
            onPress: () => {
              const finalAnsweredQuestions = lastAnsweredQuestion
                ? [...answeredQuestions, lastAnsweredQuestion]
                : answeredQuestions;
  
              navigation.navigate('Result', {
                correctAnswersCount: correctAnswersCount + (isCorrect ? 1 : 0),
                answeredQuestions: finalAnsweredQuestions,
              });
            },
          },
        ]
      );
      return;
    }
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
    <View style={styles.container}>
      <Text style={styles.questionText}>{questions[currentQuestionIndex].question}</Text>
      {questions[currentQuestionIndex].options.map((option, index) => (
        <Pressable
        key={index}
        style={styles.optionButton}
        onPress={() => handleAnswerSelection(option, questions[currentQuestionIndex])}
      >
        <View style={styles.optionBox}>
          <Text style={styles.optionText}>{option}</Text>
        </View>
        </Pressable>
      ))}
       {/* <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>次へ</Text>
        </TouchableOpacity> */}
    </View>
    </ScrollView>
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
})
