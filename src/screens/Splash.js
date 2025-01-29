import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import tw from 'twrnc';

const Splash = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>問題演習アプリ</Text>
        <Text style={styles.appSubtitle}>個人情報取扱主任者認定制度</Text>
      </View>

      {/* Questions Buttons */}
      <View style={styles.levelContainer}>
        <Pressable style={styles.levelBox} onPress={() => navigation.navigate("Questions")} >
          <Text style={[styles.levelText, { color: "#FF69B4" }]}>LEVEL 1</Text>
        </Pressable>
        <Pressable style={styles.levelBox} onPress={() => navigation.navigate("Questions")} >
          <Text style={[styles.levelText, { color: "#1E90FF" }]}>LEVEL 2</Text>
        </Pressable>
        <Pressable style={styles.levelBox} onPress={() => navigation.navigate("Questions")} >
          <Text style={[styles.levelText, { color: "#32CD32" }]}>LEVEL 3</Text>
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
  appSubtitle: {
    fontSize: 18,
    color: "#fff",
    marginTop: 5,
  },
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
