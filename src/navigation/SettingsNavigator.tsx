import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from './types';
import SettingsScreen from '../screens/SettingsScreen';
import LicensesScreen from '../screens/LicensesScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Licenses" component={LicensesScreen} />
    </Stack.Navigator>
  );
}
