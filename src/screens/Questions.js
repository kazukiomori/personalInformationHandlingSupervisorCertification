import { StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'
import { questions } from "../config/question"

const Questions = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  return (
    <View>
      <Text>{questions[currentQuestionIndex].question}</Text>
      {questions[currentQuestionIndex].options.map((option) => (
        <View>
          <Text>{option}</Text>
        </View>
      ))}
    </View>
  );
};

export default Questions

const styles = StyleSheet.create({})
