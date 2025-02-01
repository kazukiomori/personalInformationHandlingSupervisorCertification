import * as React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Splash from "../screens/Splash";
import Questions from "../screens/Questions";
import Result from "../screens/Result";

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Splash" component={Splash} />
      <Stack.Screen name="Questions" component={Questions} />
      <Stack.Screen name="Result" component={Result} />
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
