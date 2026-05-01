import { Stack } from 'expo-router';
import React from 'react';
import { StudyBloomColors } from '@/constants/theme';

export default function ExamsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFF5F8',
        },
        headerTintColor: StudyBloomColors.primary,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Exam Planner',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Exam Details',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="add" 
        options={{ 
          title: 'Add Exam',
          headerShown: true,
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="edit/[id]" 
        options={{ 
          title: 'Edit Exam',
          headerShown: true,
          presentation: 'modal',
        }} 
      />
    </Stack>
  );
}
