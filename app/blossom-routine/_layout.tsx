import { Stack } from 'expo-router';
import { BlossomFilesProvider } from '@/contexts/BlossomFilesContext';
import { BlossomHabitsProvider } from '@/contexts/BlossomHabitsContext';
import { BlossomMoodProvider } from '@/contexts/BlossomMoodContext';
import { BlossomWaterProvider } from '@/contexts/BlossomWaterContext';

export default function BlossomRoutineLayout() {
  return (
    <BlossomWaterProvider>
    <BlossomMoodProvider>
    <BlossomFilesProvider>
    <BlossomHabitsProvider>
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#EDE7F3' },
      }}
    />
    </BlossomHabitsProvider>
    </BlossomFilesProvider>
    </BlossomMoodProvider>
    </BlossomWaterProvider>
  );
}
