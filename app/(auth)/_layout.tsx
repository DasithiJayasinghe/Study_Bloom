import { Stack } from 'expo-router';
import { StudyBloomColors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: StudyBloomColors.neutral },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="landing" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
