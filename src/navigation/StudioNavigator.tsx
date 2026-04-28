import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StudioStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import TrimScreen from '../screens/TrimScreen';
import ConvertingScreen from '../screens/ConvertingScreen';
import ResultScreen from '../screens/ResultScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LicensesScreen from '../screens/LicensesScreen';

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
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="Result" component={ResultScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen name="Licenses" component={LicensesScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
