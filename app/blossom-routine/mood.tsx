import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlossomRoutineShell } from '@/components/blossom-routine/BlossomRoutineShell';
import { StudyBloomColors } from '@/constants/theme';
import { BLOSSOM_MOODS, type MoodId, useBlossomMood } from '@/contexts/BlossomMoodContext';

const MOODS = BLOSSOM_MOODS;

export default function BlossomMoodScreen() {
  const { todayLog, addMoodEntry } = useBlossomMood();
  const [selected, setSelected] = useState<MoodId>('happy');
  const [note, setNote] = useState('');

  const saveMood = useCallback(() => {
    const mood = MOODS.find((m) => m.id === selected);
    if (!mood) return;
    addMoodEntry(selected, note);
    setNote('');
  }, [note, selected, addMoodEntry]);

  return (
    <BlossomRoutineShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🌈 HOW ARE YOU FEELING?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moodRow}
            >
              {MOODS.map((m) => {
                const isSel = selected === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.moodChip, isSel && styles.moodChipSelected]}
                    onPress={() => setSelected(m.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, isSel && styles.moodLabelSelected]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder={`Write how you're feeling... 🌸`}
              placeholderTextColor={StudyBloomColors.gray}
              multiline
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveMood} activeOpacity={0.9}>
              <Text style={styles.saveBtnText}>Save my mood ✨</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, styles.moodLogCard]}>
            <Text style={styles.sectionTitle}>📖 MOOD LOG</Text>
            {todayLog.length === 0 ? (
              <Text style={styles.logEmpty}>No mood logged yet today — save one above. 🌸</Text>
            ) : null}
            {todayLog.map((entry, index) => {
              const mood = MOODS.find((x) => x.id === entry.moodId);
              const emoji = mood?.emoji ?? '📝';
              const name = mood?.label ?? 'Mood';
              return (
                <View
                  key={entry.id}
                  style={[styles.logRow, index < todayLog.length - 1 && styles.logRowBorder]}
                >
                  <Text style={styles.logEmoji}>{emoji}</Text>
                  <View style={styles.logMid}>
                    <Text style={styles.logMood}>{name}</Text>
                    <Text style={styles.logNote} numberOfLines={2}>
                      {entry.note}
                    </Text>
                  </View>
                  <Text style={styles.logTime}>{entry.timeLabel}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BlossomRoutineShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5E35B1',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  moodRow: {
    gap: 10,
    paddingBottom: 4,
  },
  moodChip: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#FFF9C4',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodChipSelected: {
    backgroundColor: '#FCE4EC',
    borderColor: '#E91E8C',
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: StudyBloomColors.gray,
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: '#AD1457',
  },
  input: {
    marginTop: 16,
    minHeight: 100,
    backgroundColor: '#FFF9C4',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: StudyBloomColors.black,
    borderWidth: 1,
    borderColor: '#FFF59D',
  },
  saveBtn: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFF0F5',
    borderWidth: 1.5,
    borderColor: '#F8BBD0',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#AD1457',
  },
  moodLogCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 10,
  },
  logRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C8E6C9',
  },
  logEmoji: {
    fontSize: 24,
    marginTop: 2,
  },
  logMid: {
    flex: 1,
  },
  logMood: {
    fontSize: 16,
    fontWeight: '800',
    color: StudyBloomColors.black,
  },
  logNote: {
    fontSize: 13,
    color: StudyBloomColors.gray,
    marginTop: 2,
  },
  logTime: {
    fontSize: 13,
    fontWeight: '600',
    color: StudyBloomColors.gray,
  },
  logEmpty: {
    fontSize: 14,
    color: StudyBloomColors.gray,
    marginBottom: 4,
  },
});
