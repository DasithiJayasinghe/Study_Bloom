import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { BlossomRoutineShell } from '@/components/blossom-routine/BlossomRoutineShell';
import { StudyBloomColors } from '@/constants/theme';
import { type TaskCategory, useBlossomTasks } from '@/contexts/BlossomTasksContext';

type Filter = 'all' | TaskCategory;

const CATEGORY_STYLE: Record<
  TaskCategory,
  { bg: string; text: string; border: string }
> = {
  study: { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9' },
  health: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  life: { bg: '#FCE4EC', text: '#C2185B', border: '#F48FB1' },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'study', label: 'Study' },
  { key: 'life', label: 'Life' },
  { key: 'health', label: 'Health' },
];

const ADD_CATEGORY_OPTIONS: TaskCategory[] = ['study', 'life', 'health'];

/** Used by add button (must be above component — not below `styles`). */
const LIGHT_PURPLE_ML = '#CE93D8';

export default function BlossomTasksScreen() {
  const { tasks, addTask: appendTask, toggleTaskDone, removeTask } = useBlossomTasks();
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('study');

  const visible = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.category === filter);
  }, [tasks, filter]);

  const canSubmit = draft.trim().length > 0;

  const addTask = useCallback(() => {
    if (!draft.trim()) return;
    appendTask(draft, newTaskCategory);
    setDraft('');
  }, [draft, newTaskCategory, appendTask]);

  const onFilterPress = useCallback((key: Filter) => {
    setFilter(key);
    if (key !== 'all') setNewTaskCategory(key);
  }, []);

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
            <Text style={styles.pageTitle}>MY TASKS</Text>

            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Add a task..."
                placeholderTextColor={StudyBloomColors.gray}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={addTask}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addBtn, !canSubmit && styles.addBtnDisabled]}
                onPress={addTask}
                activeOpacity={0.85}
                disabled={!canSubmit}
                accessibilityLabel="Add task"
              >
                <Ionicons name="add" size={28} color={LIGHT_PURPLE_ML} />
              </TouchableOpacity>
            </View>

            <Text style={styles.addToLabel}>Add new tasks to</Text>
            <View style={styles.newCatRow}>
              {ADD_CATEGORY_OPTIONS.map((c) => {
                const isSel = newTaskCategory === c;
                const label = c.charAt(0).toUpperCase() + c.slice(1);
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.newCatPill, isSel && styles.newCatPillActive]}
                    onPress={() => setNewTaskCategory(c)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.newCatPillText, isSel && styles.newCatPillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((f) => {
                const isSel = filter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterPill, isSel && styles.filterPillActive]}
                    onPress={() => onFilterPress(f.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.filterText, isSel && styles.filterTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.taskList}>
              {visible.map((task) => {
                const cat = CATEGORY_STYLE[task.category];
                return (
                  <View key={task.id} style={styles.taskRow}>
                    <TouchableOpacity
                      style={styles.checkWrap}
                      onPress={() => toggleTaskDone(task.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {task.done ? (
                        <View style={styles.checkFilled}>
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                      ) : (
                        <View style={styles.checkEmpty} />
                      )}
                    </TouchableOpacity>
                    <Text
                      style={[styles.taskTitle, task.done && styles.taskTitleDone]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>
                    <View style={[styles.catPill, { borderColor: cat.border, backgroundColor: cat.bg }]}>
                      <Text style={[styles.catPillText, { color: cat.text }]}>{task.category}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeTask(task.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close" size={22} color={StudyBloomColors.gray} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BlossomRoutineShell>
  );
}

const PURPLE = '#5E35B1';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#E3F2FD',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PURPLE,
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  addToLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
    marginTop: 4,
    marginBottom: 8,
  },
  newCatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  newCatPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: LIGHT_PURPLE_ML,
  },
  newCatPillActive: {
    backgroundColor: LIGHT_PURPLE_ML,
    borderColor: LIGHT_PURPLE_ML,
  },
  newCatPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: LIGHT_PURPLE_ML,
  },
  newCatPillTextActive: {
    color: '#FFF',
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
    backgroundColor: '#FAFAFA',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3E5F5',
    borderWidth: 1.5,
    borderColor: LIGHT_PURPLE_ML,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: LIGHT_PURPLE_ML,
  },
  filterPillActive: {
    backgroundColor: LIGHT_PURPLE_ML,
    borderColor: LIGHT_PURPLE_ML,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: LIGHT_PURPLE_ML,
  },
  filterTextActive: {
    color: '#FFF',
  },
  taskList: {
    marginTop: 8,
    gap: 10,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
  },
  checkWrap: {
    padding: 2,
  },
  checkEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: StudyBloomColors.gray,
    backgroundColor: '#FFF',
  },
  checkFilled: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: StudyBloomColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: StudyBloomColors.gray,
    fontWeight: '500',
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  removeBtn: {
    padding: 2,
  },
});
