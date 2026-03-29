import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import TrimScreen from '../screens/TrimScreen';
import ConfirmScreen from '../screens/ConfirmScreen';
import ConvertingScreen from '../screens/ConvertingScreen';
import ResultScreen from '../screens/ResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: '動画を選択' }} />
      <Stack.Screen name="Trim" component={TrimScreen} options={{ title: 'トリミング' }} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} options={{ title: '変換確認' }} />
      <Stack.Screen
        name="Converting"
        component={ConvertingScreen}
        options={{ title: '変換中', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ title: '完了', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
