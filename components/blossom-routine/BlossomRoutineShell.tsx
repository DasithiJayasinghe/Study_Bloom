import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, StudyBloomColors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

/** Page background — pale lavender (mockup) */
const BG = '#F3EAF5';
/** Header + Home tab accent */
const HEADER_PINK = '#D81B60';

const TABS: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  /** Accent when this tab is selected (top pill border, icon, label). */
  accent: string;
}[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/blossom-routine', accent: HEADER_PINK },
  { key: 'water', label: 'Water', icon: 'water', href: '/blossom-routine/water', accent: '#2196F3' },
  { key: 'mood', label: 'Mood', icon: 'color-palette', href: '/blossom-routine/mood', accent: '#E91E63' },
  { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline', href: '/blossom-routine/tasks', accent: '#43A047' },
  { key: 'habits', label: 'Habits', icon: 'leaf', href: '/blossom-routine/habits', accent: '#00897B' },
  { key: 'files', label: 'Files', icon: 'folder', href: '/blossom-routine/files', accent: '#E91E63' },
  {
    key: 'space',
    label: 'Space',
    icon: 'planet-outline',
    href: '/(tabs)' as Href,
    accent: '#7C4DFF',
  },
];

function getActiveTab(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last === 'blossom-routine' || last === 'index') return 'home';
  if (['water', 'mood', 'tasks', 'habits', 'files'].includes(last)) return last;
  return 'home';
}

type Props = {
  children: React.ReactNode;
};

export function BlossomRoutineShell({ children }: Props) {
  const pathname = usePathname();
  const active = getActiveTab(pathname);
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] ?? 'Student';

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.headerGradient, { backgroundColor: HEADER_PINK }]}>
        <View style={styles.headerGlowBL} />
        <View style={styles.headerGlowTR} />
        <View style={styles.headerRingOuter} />
        <View style={styles.headerRingMid} />

        <View style={styles.headerForeground}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={goBack}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back to dashboard"
            >
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.flowerCluster}>
              <View style={styles.flowerRingLarge} />
              <View style={styles.flowerRingSmall} />
              <View style={styles.headerFlower}>
                <Ionicons name="flower" size={24} color="rgba(255,255,255,0.95)" />
              </View>
            </View>
          </View>

          <View style={styles.brandRow}>
            <Text style={styles.brand}>StudyBloom</Text>
            <Text style={styles.brandSparkle} accessibilityLabel="">
              🌸
            </Text>
          </View>
          <Text style={styles.greeting}>
            Good morning, {firstName} <Text style={styles.greetingSparkle}>✨</Text>
          </Text>
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>Keep blooming, even on slow days🌷</Text>
          </View>
        </View>
      </View>

      <View style={styles.navWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navScroll}
        >
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.navPill,
                  isActive && {
                    borderColor: tab.accent,
                    backgroundColor: `${tab.accent}14`,
                  },
                ]}
                onPress={() => navigateBlossomTab(tab.key, tab.href)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? tab.accent : '#4A148C'}
                />
                <Text style={[styles.navLabel, isActive && { color: tab.accent, fontWeight: '700' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.mainColumn}>
        <View style={styles.body}>{children}</View>
        <BlossomRoutineBottomNav active={active} />
      </View>
    </SafeAreaView>
  );
}

const BOTTOM_NAV: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  color: string;
}[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/blossom-routine', color: HEADER_PINK },
  { key: 'water', label: 'Water', icon: 'water', href: '/blossom-routine/water', color: '#2196F3' },
  { key: 'mood', label: 'Mood', icon: 'color-palette', href: '/blossom-routine/mood', color: '#E91E63' },
  { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline', href: '/blossom-routine/tasks', color: '#E91E63' },
  { key: 'habits', label: 'Habits', icon: 'leaf', href: '/blossom-routine/habits', color: '#00897B' },
  { key: 'files', label: 'Files', icon: 'folder', href: '/blossom-routine/files', color: '#E91E63' },
  { key: 'space', label: 'Space', icon: 'planet-outline', href: '/(tabs)' as Href, color: '#7C4DFF' },
];

function navigateBlossomTab(key: string, href: Href) {
  if (key === 'space') {
    router.replace(href);
    return;
  }
  router.push(href);
}

function BlossomRoutineBottomNav({ active }: { active: string }) {
  return (
    <View style={bottomStyles.bar}>
      {BOTTOM_NAV.map((item) => {
        const isActive = active === item.key;
        const color = isActive ? item.color : StudyBloomColors.gray;
        return (
          <TouchableOpacity
            key={item.key}
            style={bottomStyles.item}
            onPress={() => navigateBlossomTab(item.key, item.href)}
            activeOpacity={0.75}
          >
            <Ionicons name={item.icon} size={24} color={color} />
            <Text style={[bottomStyles.label, { color }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const bottomStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: StudyBloomColors.lightGray,
  },
  item: {
    alignItems: 'center',
    gap: 4,
    minWidth: 56,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGlowBL: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
    bottom: -55,
    left: -70,
  },
  headerGlowTR: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -20,
    right: -15,
  },
  headerRingOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -90,
  },
  headerRingMid: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    top: -55,
    right: -65,
  },
  headerForeground: {
    position: 'relative',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  backBtn: {
    paddingVertical: 4,
  },
  flowerCluster: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowerRingLarge: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  flowerRingSmall: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  headerFlower: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  brand: {
    fontSize: 31,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
    fontStyle: 'italic',
    ...(Platform.OS === 'ios' || Platform.OS === 'web'
      ? { fontFamily: Fonts.rounded }
      : {}),
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  brandSparkle: {
    fontSize: 22,
    marginTop: 2,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.98)',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  greetingSparkle: {
    fontSize: 15,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    marginTop: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  streakEmoji: {
    fontSize: 15,
  },
  streakText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  navWrap: {
    backgroundColor: BG,
    paddingTop: 12,
    paddingBottom: 4,
  },
  navScroll: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: StudyBloomColors.lightGray,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A148C',
  },
  mainColumn: {
    flex: 1,
    backgroundColor: BG,
  },
  body: {
    flex: 1,
    backgroundColor: BG,
  },
});
