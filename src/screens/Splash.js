import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Splash = ({ navigation }) => {
  return (
    <View>
      <Text>Splash</Text>

      <Pressable onPress={() => navigation.navigate("Qustions")}>
      <Text>問題へ</Text>
      </Pressable>
    </View>
  )
}

export default Splash

const styles = StyleSheet.create({})
