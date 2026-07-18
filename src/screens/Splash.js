import { Pressable, StyleSheet, Text, View, Alert } from 'react-native'
import React, { useState } from 'react'
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, ALL_CATEGORY, filterByCategory } from '../config/question';

const ALL_SET_SIZE = "all";
const SET_SIZE_OPTIONS = [10, 20, ALL_SET_SIZE];

const Splash = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [setSize, setSetSize] = useState(ALL_SET_SIZE);

  const startNormalQuiz = () => {
    navigation.navigate("Questions", {
      mode: "normal",
      category: selectedCategory,
      setSize: setSize === ALL_SET_SIZE ? null : setSize,
    });
  };

  const startMistakeQuiz = async () => {
    try {
      const storedQuestions = await AsyncStorage.getItem('incorrectQuestions');
      const incorrectQuestions = storedQuestions ? JSON.parse(storedQuestions) : [];
      const targetQuestions = filterByCategory(incorrectQuestions, selectedCategory);

      if (targetQuestions.length === 0) {
        Alert.alert(
          "お知らせ",
          selectedCategory === ALL_CATEGORY
            ? "ミスした問題はありません"
            : `「${selectedCategory}」でミスした問題はありません`
        );
        return;
      }

      navigation.navigate("Questions", { mode: "mistake", category: selectedCategory });
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

      {/* Category Selector */}
      <View style={styles.categoryContainer}>
        {CATEGORIES.map((category) => {
          const isSelected = category === selectedCategory;
          return (
            <Pressable
              key={category}
              style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Set Size Selector (通常モードの1回あたりの出題数。ミス問題モードには適用しない) */}
      <Text style={styles.sectionLabel}>出題数(通常モード)</Text>
      <View style={styles.categoryContainer}>
        {SET_SIZE_OPTIONS.map((size) => {
          const isSelected = size === setSize;
          const label = size === ALL_SET_SIZE ? "すべて" : `${size}問`;
          return (
            <Pressable
              key={size}
              style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              onPress={() => setSetSize(size)}
            >
              <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Questions Buttons */}
      <View style={styles.levelContainer}>
        <Pressable style={styles.levelBox} onPress={startNormalQuiz} >
          <Text style={[styles.levelText, { color: "#FF69B4" }]}>はじめる</Text>
        </Pressable>
        <Pressable style={styles.levelBox} onPress={startMistakeQuiz} >
          <Text style={[styles.levelText, { color: "#1E90FF" }]}>ミス問題{"\n"}を復習</Text>
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
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fff",
  },
  categoryChipSelected: {
    backgroundColor: "#1565C0",
    borderColor: "#1565C0",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1565C0",
  },
  categoryChipTextSelected: {
    color: "#fff",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    opacity: 0.9,
  },
})
