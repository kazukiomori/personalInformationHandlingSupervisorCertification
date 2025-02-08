import { Pressable, StyleSheet, Text, View, Alert } from 'react-native'
import React from 'react'
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Splash = ({ navigation }) => {
  const startNormalQuiz = () => {
    navigation.navigate("Questions", { mode: "normal" });
  };

  const startMistakeQuiz = async () => {
    try {
      const storedQuestions = await AsyncStorage.getItem('incorrectQuestions');
      const incorrectQuestions = storedQuestions ? JSON.parse(storedQuestions) : [];

      if (incorrectQuestions.length === 0) {
        Alert.alert("お知らせ", "ミスした問題はありません");
        return;
      }
      
      navigation.navigate("Questions", { mode: "mistake" });
    } catch (error) {
      console.error("ミス問題の取得に失敗しました:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>問題演習アプリ</Text>
        {/* <Text style={styles.appSubtitle}>個人情報取扱主任者認定制度</Text> */}
      </View>

      {/* Questions Buttons */}
      <View style={styles.levelContainer}>
        <Pressable style={styles.levelBox} onPress={startNormalQuiz} >
          <Text style={[styles.levelText, { color: "#FF69B4" }]}>選択問題</Text>
        </Pressable>
        <Pressable style={styles.levelBox} onPress={startMistakeQuiz} >
          <Text style={[styles.levelText, { color: "#1E90FF" }]}>選択問題{"\n"}(ミス問題)</Text>
        </Pressable>
      </View>
    </View>
  )
}

export default Splash

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#87CEEB",
    alignItems: "center",
    paddingTop: 50,
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  // appSubtitle: {
  //   fontSize: 18,
  //   color: "#fff",
  //   marginTop: 5,
  // },
  levelContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  levelBox: {
    width: 120,
    height: 120,
    backgroundColor: "#fff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "bold",
  }
})
