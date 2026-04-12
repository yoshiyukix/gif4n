import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryStackParamList } from './types';
import LibraryScreen from '../screens/LibraryScreen';
import LibraryDetailScreen from '../screens/LibraryDetailScreen';

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export function LibraryNavigator() {
  return (
    <Stack.Navigator initialRouteName="Library">
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LibraryDetail"
        component={LibraryDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
