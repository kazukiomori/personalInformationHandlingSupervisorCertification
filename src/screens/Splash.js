import { Pressable, StyleSheet, View, Alert } from 'react-native'
import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/AppText';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, ALL_CATEGORY, filterByCategory, questions as allQuestions } from '../config/question';
import { SRS_STORAGE_KEY, isDue } from '../utils/spacedRepetition';

const ALL_SET_SIZE = "all";
const SET_SIZE_OPTIONS = [10, 20, ALL_SET_SIZE];

const Splash = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [setSize, setSetSize] = useState(ALL_SET_SIZE);
  const [dueCount, setDueCount] = useState(0);

  const loadDueQuestions = useCallback(async () => {
    const storedSrs = await AsyncStorage.getItem(SRS_STORAGE_KEY);
    const srsData = storedSrs ? JSON.parse(storedSrs) : {};
    return filterByCategory(allQuestions, selectedCategory).filter(q => isDue(srsData[q.id]));
  }, [selectedCategory]);

  // 復習が必要な問題数は、画面に戻ってくるたび(セッション終了後など)に再取得する
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadDueQuestions().then((due) => {
        if (isActive) setDueCount(due.length);
      });
      return () => { isActive = false; };
    }, [loadDueQuestions])
  );

  const startNormalQuiz = () => {
    navigation.navigate("Questions", {
      mode: "normal",
      category: selectedCategory,
      setSize: setSize === ALL_SET_SIZE ? null : setSize,
    });
  };

  const startReviewQuiz = async () => {
    try {
      const dueQuestions = await loadDueQuestions();

      if (dueQuestions.length === 0) {
        Alert.alert(
          "お知らせ",
          selectedCategory === ALL_CATEGORY
            ? "今復習が必要な問題はありません"
            : `「${selectedCategory}」で今復習が必要な問題はありません`
        );
        return;
      }

      navigation.navigate("Questions", { mode: "review", category: selectedCategory });
    } catch (error) {
      console.error("復習問題の取得に失敗しました:", error);
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

      {/* Set Size Selector (通常モードの1回あたりの出題数。復習モードには適用しない) */}
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
        <Pressable style={styles.levelBox} onPress={startReviewQuiz} >
          <Text style={[styles.levelText, { color: "#1E90FF" }]}>復習する{"\n"}({dueCount}問)</Text>
        </Pressable>
      </View>

      <Pressable style={styles.statsLink} onPress={() => navigation.navigate("Stats")}>
        <Text style={styles.statsLinkText}>📊 学習履歴・進捗を見る</Text>
      </Pressable>
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
  statsLink: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  statsLinkText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    textDecorationLine: "underline",
  },
})
