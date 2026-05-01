import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlossomRoutineShell } from '@/components/blossom-routine/BlossomRoutineShell';
import { StudyBloomColors } from '@/constants/theme';
import { useBlossomHabits } from '@/contexts/BlossomHabitsContext';
import { localDateKey } from '@/utils/localDateKey';

const PURPLE = '#5E35B1';
const LIGHT_PURPLE_ML = '#CE93D8';
/** StudyBloom flower accent — matches main app */
const FLOWER_PINK = StudyBloomColors.primary;
/** Same as Water Tracker outer card (`AFFIRM_OUTER_PINK`) */
const OUTER_CARD_PINK = '#FFF0F5';
/** Inner habit rows — soft lavender */
const HABIT_ROW_BG = '#F3E5F5';
const HABIT_ROW_BORDER = LIGHT_PURPLE_ML;
/** Pastel + button — light pink box & soft rose icon */
const ADD_BTN_PASTEL_BG = '#FCE4EC';
const ADD_BTN_PASTEL_BORDER = '#F8BBD0';
const ADD_BTN_ICON_PINK = '#F06292';

export default function BlossomHabitsScreen() {
  const { habits, addHabit, removeHabit, toggleToday } = useBlossomHabits();
  const [draft, setDraft] = useState('');
  const [dayKey, setDayKey] = useState(() => localDateKey());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const t = localDateKey();
        setDayKey((prev) => (prev === t ? prev : t));
      }
    });
    return () => sub.remove();
  }, []);

  const sorted = useMemo(() => {
    return [...habits].sort((a, b) => {
      const aToday = a.lastCompletedDate === dayKey ? 1 : 0;
      const bToday = b.lastCompletedDate === dayKey ? 1 : 0;
      if (aToday !== bToday) return bToday - aToday;
      return b.streak - a.streak;
    });
  }, [habits, dayKey]);

  const onAdd = useCallback(() => {
    addHabit(draft);
    setDraft('');
  }, [addHabit, draft]);

  return (
    <BlossomRoutineShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.pageTitle}>MY HABITS</Text>
            <Text style={styles.subtitle}>
              Tap the flower when you've done it today—tiny steps add up.
            </Text>

            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Add a habit..."
                placeholderTextColor={StudyBloomColors.gray}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={onAdd}
                activeOpacity={0.85}
                accessibilityLabel="Add habit"
              >
                <Ionicons name="add" size={28} color={ADD_BTN_ICON_PINK} />
              </TouchableOpacity>
            </View>

            <View style={styles.list}>
              {sorted.map((h) => {
                const doneToday = h.lastCompletedDate === dayKey;
                return (
                  <View key={h.id} style={styles.habitRow}>
                    <TouchableOpacity
                      style={styles.bloomBtn}
                      onPress={() => toggleToday(h.id)}
                      activeOpacity={0.85}
                      accessibilityLabel={doneToday ? 'Mark not done today' : 'Mark done for today'}
                    >
                      {doneToday ? (
                        <View style={styles.bloomDone}>
                          <Ionicons name="flower" size={22} color={FLOWER_PINK} />
                        </View>
                      ) : (
                        <View style={styles.bloomEmpty}>
                          <Ionicons name="flower-outline" size={20} color={FLOWER_PINK} />
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.habitMid}>
                      <Text style={[styles.habitTitle, doneToday && styles.habitTitleDone]} numberOfLines={2}>
                        {h.title}
                      </Text>
                      {h.streak > 0 ? (
                        <Text style={styles.streakHint}>{`${h.streak}-day streak · keep going`}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => removeHabit(h.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.removeBtn}
                      accessibilityLabel="Remove habit"
                    >
                      <Ionicons name="close" size={22} color={StudyBloomColors.gray} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {habits.length === 0 && (
              <Text style={styles.empty}>No habits yet—add your first one above.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BlossomRoutineShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: OUTER_CARD_PINK,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PURPLE,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: StudyBloomColors.gray,
    marginBottom: 16,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addInput: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: StudyBloomColors.lightGray,
    paddingHorizontal: 14,
    fontSize: 15,
    color: StudyBloomColors.black,
    backgroundColor: '#FFF',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ADD_BTN_PASTEL_BG,
    borderWidth: 1.5,
    borderColor: ADD_BTN_PASTEL_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginTop: 18,
    gap: 10,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HABIT_ROW_BG,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: HABIT_ROW_BORDER,
  },
  bloomBtn: {
    padding: 2,
  },
  bloomEmpty: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: StudyBloomColors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloomDone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCE4EC',
    borderWidth: 2,
    borderColor: '#F48FB1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitMid: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  habitTitleDone: {
    color: '#AD1457',
    fontWeight: '600',
  },
  streakHint: {
    fontSize: 12,
    marginTop: 4,
    color: FLOWER_PINK,
    fontWeight: '600',
  },
  removeBtn: {
    padding: 2,
  },
  empty: {
    marginTop: 16,
    fontSize: 14,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
