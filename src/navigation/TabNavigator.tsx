import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from './types';
import { StudioNavigator } from './StudioNavigator';
import { LibraryNavigator } from './LibraryNavigator';
import { AppTabBar } from '../components/AppTabBar';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Studio" component={StudioNavigator} />
      <Tab.Screen name="Library" component={LibraryNavigator} />
    </Tab.Navigator>
  );
}
