import * as React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Splash from "../screens/Splash";
import Questions from "../screens/Questions";
import Result from "../screens/Result";
import Stats from "../screens/Stats";

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Splash" component={Splash} options={{ title: '個人情報取扱主任者認定制度' }}/>
      <Stack.Screen name="Questions" component={Questions} />
      <Stack.Screen name="Result" component={Result} options={{ headerShown: false }} />
      <Stack.Screen name="Stats" component={Stats} options={{ title: '学習履歴・進捗' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
