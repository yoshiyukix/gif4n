import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StudioStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import TrimScreen from '../screens/TrimScreen';
import ConvertingScreen from '../screens/ConvertingScreen';
import ResultScreen from '../screens/ResultScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<StudioStackParamList>();

export function StudioNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Trim"
        component={TrimScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="Converting"
        component={ConvertingScreen}
        options={{ title: '変換中', headerBackVisible: false, headerStyle: { backgroundColor: colors.surface } }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ title: 'Done', headerBackVisible: false, headerLeft: () => null, headerStyle: { backgroundColor: colors.surface } }}
      />
    </Stack.Navigator>
  );
}
