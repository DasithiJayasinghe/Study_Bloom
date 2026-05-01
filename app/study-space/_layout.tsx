import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { StudyBloomColors } from '@/constants/theme';

// Custom light theme with StudyBloom colors
const StudyBloomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: StudyBloomColors.primary,
    background: StudyBloomColors.neutral,
    card: StudyBloomColors.white,
    text: StudyBloomColors.black,
    border: StudyBloomColors.lightGray,
  },
};

// Custom dark theme with StudyBloom colors
const StudyBloomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: StudyBloomColors.primary,
    background: '#1A1A2E',
    card: '#2D2D44',
    text: StudyBloomColors.white,
    border: '#3D3D5C',
  },
};

export const unstable_settings = {
  initialRouteName: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? StudyBloomDarkTheme : StudyBloomLightTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="add-study-gem" options={{ title: 'Add Study Gem' }} />
          <Stack.Screen name="create-folder" options={{ presentation: 'modal', title: 'Create Folder' }} />
          <Stack.Screen name="edit-folder" options={{ title: 'Edit Folder' }} />
          <Stack.Screen name="study-gem-details" options={{ title: 'Study Gem Details' }} />
          <Stack.Screen name="edit-study-gem" options={{ title: 'Edit Study Gem' }} />
          <Stack.Screen name="save-to-my-space" options={{ title: 'Save to My Space' }} />
          <Stack.Screen name="study-journey" options={{ title: 'Study Journey' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
