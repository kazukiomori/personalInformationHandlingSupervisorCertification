import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/FontAwesome'; // アイコン用

const Result = ({ route, navigation }) => {
  const { correctAnswersCount, answeredQuestions } = route.params;

  const totalQuestions = answeredQuestions.length;
  const correctRate = Math.round((correctAnswersCount / totalQuestions) * 100);

  const handleRestart = () => {
    // もう一回ボタンが押された場合、質問ページに戻る
    navigation.reset({
      index: 0,
      routes: [{ name: 'Questions' }] // 'Questions'という画面に戻る
    });
  };

  const gotoSplash = () => {
    // トップに戻るボタンが押された場合、ホーム画面に遷移
    navigation.popToTop(); // 最初のページに戻る
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>クイズ結果</Text>
      <Text style={styles.score}>{totalQuestions}問中、{correctAnswersCount} 問正解 正答率は{correctRate}%</Text>

      <Text style={styles.subTitle}>解答詳細:</Text>
      {answeredQuestions.map((answeredQuestion, index) => {
        const isCorrect = answeredQuestion.selectedAnswer === answeredQuestion.correctAnswer;
        return (
          <View key={index} style={styles.questionBox}>
            <View style={styles.resultCircle}>
              <Text style={styles.resultText}>{isCorrect ? '◯' : '×'}</Text>
            </View>
            <Text style={styles.questionText}>問題: {answeredQuestion.question}</Text>
            <Text style={styles.answerText}>あなたの答え: {answeredQuestion.selectedAnswer}</Text>
            <Text style={styles.answerText}>正解: {answeredQuestion.correctAnswer}</Text>
          </View>
        );
      })}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={gotoSplash}>
          <Icon name="home" size={20} color="#fff" />
          <Text style={styles.buttonText}>トップに戻る</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleRestart}>
          <Icon name="refresh" size={20} color="#fff" />
          <Text style={styles.buttonText}>もう一回</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  score: {
    fontSize: 20,
    color: '#555',
    marginBottom: 30,
  },
  subTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 10,
  },
  questionBox: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultCircle: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff', // 青色で◯や×を表示
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  answerText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 3,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    width: 150,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
  },
});

export default Result;
