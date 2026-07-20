import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import React, { useEffect, useState } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import Text from '../components/AppText';
import { loadIsPremiumUnlocked } from '../utils/purchases';
import AppBannerAd from "../components/AppBannerAd";

const Result = ({ route, navigation }) => {
  const { correctAnswersCount, answeredQuestions, totalCount, passRate } = route.params;
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadIsPremiumUnlocked().then(setIsPremium);
  }, []);

  const totalQuestions = totalCount ?? answeredQuestions.length;
  const unansweredCount = totalQuestions - answeredQuestions.length;
  const correctRate = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
  const isMockExam = passRate !== undefined;
  const isPassing = isMockExam && correctRate >= passRate;

  const gotoSplash = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.scrollView}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{isMockExam ? '模擬試験 結果' : 'クイズ結果'}</Text>
      </View>

      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{totalQuestions}問中 {correctAnswersCount}問正解</Text>
        <Text style={styles.rateText}>正答率: {correctRate}%</Text>
        {unansweredCount > 0 && (
          <Text style={styles.unansweredText}>(時間切れによる未解答: {unansweredCount}問)</Text>
        )}
      </View>

      {isMockExam && (
        <View style={[styles.passBadge, isPassing ? styles.passBadgeSuccess : styles.passBadgeFail]}>
          <Text style={styles.passBadgeText}>
            {isPassing ? '合格圏内です 🎉' : '合格ラインに届いていません'}
          </Text>
          <Text style={styles.passBadgeSubText}>合格ライン: 正答率{passRate}%以上</Text>
        </View>
      )}

      <Text style={styles.subTitle}>解答詳細:</Text>
      {answeredQuestions.map((answeredQuestion, index) => {
        const isCorrect = answeredQuestion.selectedAnswer === answeredQuestion.correctAnswer;
        return (
          <View key={index} style={[styles.questionBox, isCorrect ? styles.correctBox : styles.incorrectBox]}>
            <Text style={styles.questionText}>問題: {answeredQuestion.question}</Text>
            <Text style={styles.answerText}>あなたの答え: {answeredQuestion.selectedAnswer}</Text>
            <Text style={styles.correctAnswerText}>正解: {answeredQuestion.correctAnswer}</Text>
            <Text style={isCorrect ? styles.correctText : styles.incorrectText}>{isCorrect ? '◯ 正解' : '× 不正解'}</Text>
          </View>
        );
      })}

      <TouchableOpacity style={styles.button} onPress={gotoSplash}>
        <Icon name="home" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>トップに戻る</Text>
      </TouchableOpacity>
    </ScrollView>
    {!isPremium && <AppBannerAd />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContainer: {
    alignItems: "center",
    paddingBottom: 30, // 下部の余白を確保
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20, // 上の余白を増やして見切れを防ぐ
    marginBottom: 20,
    textAlign: 'center', // 中央揃えに調整
  },
  scoreContainer: {
    width: '90%',
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  rateText: {
    fontSize: 18,
    color: '#fff',
  },
  unansweredText: {
    fontSize: 13,
    color: '#e3f2fd',
    marginTop: 4,
  },
  passBadge: {
    width: '90%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  passBadgeSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  passBadgeFail: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  passBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  passBadgeSubText: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  subTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 10,
  },
  questionBox: {
    width: '90%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  correctBox: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
    borderWidth: 1,
  },
  incorrectBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
    borderWidth: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  answerText: {
    fontSize: 16,
    color: '#555',
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#155724',
    fontWeight: 'bold',
  },
  correctText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 5,
  },
  incorrectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    width: '90%',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Result;
