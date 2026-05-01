import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useBlossomFiles } from '@/contexts/BlossomFilesContext';
import { BLOSSOM_MOODS, useBlossomMood } from '@/contexts/BlossomMoodContext';
import { useBlossomTasks } from '@/contexts/BlossomTasksContext';
import { useBlossomWater } from '@/contexts/BlossomWaterContext';
import { useAuth } from '@/contexts/AuthContext';
import { blossomApi } from '@/services/blossomApi';
import { localDateKey } from '@/utils/localDateKey';
import { getDailyAffirmationToday } from '@/utils/dailyAffirmation';

/**
 * Blossom Routine home — colors matched to design mockup.
 * Page bg #F3EAF5; headers #4A148C; header bar in shell #D81B60.
 */
const C = {
  pageBg: '#F3EAF5',
  purple: '#4A148C',
  /** Today’s Overview outer box */
  overviewBox: '#F8E8FB',
  overviewTitle: '#7A4B8B',
  overviewTeal: '#2E6D7E',
  overviewMagenta: '#E81C61',
  overviewSub: '#7E7932',
  overviewStatYellow: '#FEFFCA',
  /** Daily Affirmation — outer card & solid pink inner (no lavender) */
  affirmOuter: '#FFF0F5',
  affirmTitle: '#6A4E85',
  affirmInnerPink: '#FCE4EC',
  affirmQuote: '#D84381',
  expensePaper: '#F0F6FC',
  expenseBorder: '#C5D9ED',
  expenseText: '#3E5C76',
  expenseMuted: '#8FA3B5',
  expenseAccent: '#6B9DC9',
  addBtn: '#E6B1C4',
  /** Text on pink (#E6B1C4) surfaces — matches add button */
  expensePinkInk: '#5C3D4A',
  /** Same hue as addBtn (#E6B1C4), translucent over the white card */
  expenseTotalBg: 'rgba(230, 177, 196, 0.4)',
  expenseTotalBorder: 'rgba(217, 163, 183, 0.55)',
  expenseRowBorder: '#E2EDF6',
  expenseInputBorder: '#D4E4F0',
};

function formatExpenseDateLabel(dk: string): string {
  const parts = dk.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dk;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatMoneyLKR(rupees: number): string {
  return rupees.toLocaleString('en-LK', { style: 'currency', currency: 'LKR' });
}

/** Parses user input as LKR rupees (2 decimal places max). */
function parseAmountToRupees(raw: string): number | null {
  const t = raw.trim().replace(/[Rs$,\s]/gi, '');
  if (!t) return null;
  const x = Number.parseFloat(t);
  if (Number.isNaN(x) || x < 0) return null;
  const rupees = Math.round(x * 100) / 100;
  if (rupees < 0.01 || rupees > 99_999_999.99) return null;
  return rupees;
}

type ExpenseRow = { id: string; label: string; amountRupees: number };

function DailyExpensesCard() {
  const { isAuthenticated } = useAuth();
  const [dayKey, setDayKey] = useState(() => localDateKey());
  const [entries, setEntries] = useState<ExpenseRow[]>([]);
  const [totalRupees, setTotalRupees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [amountDraft, setAmountDraft] = useState('');

  const load = useCallback(async () => {
    const dk = localDateKey();
    setDayKey(dk);
    if (!isAuthenticated) {
      setEntries([]);
      setTotalRupees(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await blossomApi.getExpenses(dk);
      setEntries(data.entries);
      setTotalRupees(data.totalRupees);
    } catch (e) {
      console.warn('[DailyExpenses]', e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const prevAuthRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (prevAuthRef.current === undefined) {
      prevAuthRef.current = isAuthenticated;
      return;
    }
    if (prevAuthRef.current !== isAuthenticated) {
      prevAuthRef.current = isAuthenticated;
      void load();
    }
  }, [isAuthenticated, load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onAdd = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign in', 'Log in to save your daily expenses.');
      return;
    }
    const label = labelDraft.trim();
    if (!label) {
      Alert.alert('Add a label', 'What did you spend on? (e.g. Coffee, Bus fare)');
      return;
    }
    const rupees = parseAmountToRupees(amountDraft);
    if (rupees === null) {
      Alert.alert('Check amount', 'Enter a valid amount in rupees (e.g. 5 or 12.50).');
      return;
    }
    const dk = localDateKey();
    setAdding(true);
    try {
      await blossomApi.postExpense({ date: dk, label, amountRupees: rupees });
      setLabelDraft('');
      setAmountDraft('');
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Try again.';
      Alert.alert('Could not add', msg);
    } finally {
      setAdding(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!isAuthenticated) return;
    setBusyId(id);
    try {
      await blossomApi.deleteExpense(id);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Try again.';
      Alert.alert('Could not remove', msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.card, styles.affirmOuterCard]}>
      <Text style={[styles.cardTitle, styles.overviewCardTitle, styles.expenseTitle]}>💸 TODAY&apos;S SPENDING</Text>
      <Text style={styles.expenseDateHint}>{formatExpenseDateLabel(dayKey)}</Text>

      <View style={styles.expenseTotalRow}>
        <Text style={styles.expenseTotalLabel}>Today&apos;s total</Text>
        <Text style={styles.expenseTotalValue}>{formatMoneyLKR(totalRupees)}</Text>
      </View>

      {loading ? (
        <View style={styles.expenseLoading}>
          <ActivityIndicator size="small" color={C.expenseAccent} />
        </View>
      ) : entries.length === 0 ? (
        <Text style={styles.expenseEmpty}>No expenses logged yet — add one below.</Text>
      ) : (
        <View style={styles.expenseList}>
          {entries.map((e) => (
            <View key={e.id} style={styles.expenseRow}>
              <View style={styles.expenseRowText}>
                <Text style={styles.expenseLabel} numberOfLines={2}>
                  {e.label}
                </Text>
                <Text style={styles.expenseAmount}>{formatMoneyLKR(e.amountRupees)}</Text>
              </View>
              <TouchableOpacity
                style={styles.expenseDelete}
                onPress={() => void onDelete(e.id)}
                disabled={busyId !== null}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {busyId === e.id ? (
                  <ActivityIndicator size="small" color={C.expenseMuted} />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#C62828" />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!isAuthenticated ? (
        <Text style={styles.expenseHint}>Sign in to track spending — your list is saved per day.</Text>
      ) : (
        <Text style={styles.expenseHint}>Each line is saved to your account for this calendar day.</Text>
      )}

      <View style={[styles.expensePaper]}>
        <TextInput
          style={styles.expenseInput}
          value={labelDraft}
          onChangeText={setLabelDraft}
          placeholder="What was it? (e.g. Lunch, Snacks)"
          placeholderTextColor={C.expenseMuted}
          editable={!adding && isAuthenticated}
          maxLength={200}
        />
        <TextInput
          style={styles.expenseInput}
          value={amountDraft}
          onChangeText={setAmountDraft}
          placeholder="Amount (e.g. 8.50)"
          placeholderTextColor={C.expenseMuted}
          keyboardType="decimal-pad"
          editable={!adding && isAuthenticated}
        />
      </View>

      <TouchableOpacity
        style={[styles.expenseAddBtn, (adding || !isAuthenticated) && styles.expenseAddBtnDisabled]}
        onPress={() => void onAdd()}
        disabled={adding || loading || !isAuthenticated}
        activeOpacity={0.88}
      >
        {adding ? (
          <ActivityIndicator size="small" color={C.expensePinkInk} />
        ) : (
          <Text style={styles.expenseAddLabel}>Add expense</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/**
 * Shared Blossom Routine dashboard: Today's Overview, daily spending, Daily Affirmation.
 * Used on Home (Mood uses its own screen).
 */
export function BlossomRoutineDashboardContent() {
  const { ml } = useBlossomWater();
  const { latestMood } = useBlossomMood();
  const { incompleteCount } = useBlossomTasks();
  const { fileCount } = useBlossomFiles();

  const moodMeta = latestMood
    ? BLOSSOM_MOODS.find((m) => m.id === latestMood.moodId)
    : null;
  const moodEmoji = moodMeta?.emoji ?? '🌸';
  const moodCaption = latestMood
    ? `${moodMeta?.label ?? 'Mood'} · ${latestMood.timeLabel}`
    : 'No check-in yet';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, styles.overviewCard]}>
        <Text style={[styles.cardTitle, styles.overviewCardTitle]}>🌸 TODAY&apos;S OVERVIEW</Text>
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={[styles.statCell, styles.statCellHalf, styles.overviewStatCell]}>
              <Text style={[styles.statNum, { color: C.overviewTeal }]}>{Math.round(ml)}</Text>
              <Text style={[styles.statSub, styles.overviewStatSub]}>ml water</Text>
            </View>
            <View style={[styles.statCell, styles.statCellHalf, styles.overviewStatCell]}>
              <Text style={styles.statEmoji}>{moodEmoji}</Text>
              <Text
                style={[styles.statSub, styles.overviewStatSub, styles.moodOverviewCaption, { marginTop: 4 }]}
                numberOfLines={2}
              >
                {moodCaption}
              </Text>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.statCell, styles.statCellHalf, styles.overviewStatCell]}>
              <Text style={[styles.statNum, { color: C.overviewMagenta }]}>{incompleteCount}</Text>
              <Text style={[styles.statSub, styles.overviewStatSub]}>tasks left</Text>
            </View>
            <View style={[styles.statCell, styles.statCellHalf, styles.overviewStatCell]}>
              <Text style={[styles.statNum, { color: C.overviewMagenta }]}>{fileCount}</Text>
              <Text style={[styles.statSub, styles.overviewStatSub]}>files saved</Text>
            </View>
          </View>
        </View>
      </View>

      <DailyExpensesCard />

      <View style={[styles.card, styles.affirmOuterCard]}>
        <Text style={[styles.cardTitle, styles.affirmSectionTitle]}>✨ DAILY AFFIRMATION</Text>
        <View style={styles.affirmInner}>
          <Text style={styles.affirmText}>{getDailyAffirmationToday()}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: C.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: C.pageBg,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  overviewCard: {
    backgroundColor: C.overviewBox,
  },
  overviewCardTitle: {
    color: C.overviewTitle,
  },
  overviewStatCell: {
    backgroundColor: C.overviewStatYellow,
  },
  overviewStatSub: {
    color: C.overviewSub,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.purple,
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  expenseTitle: {
    marginBottom: 4,
  },
  expenseDateHint: {
    fontSize: 12,
    fontWeight: '600',
    color: C.expenseMuted,
    marginBottom: 12,
    marginTop: -8,
  },
  expenseTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.expenseTotalBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.expenseTotalBorder,
  },
  expenseTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.expensePinkInk,
  },
  expenseTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.expensePinkInk,
  },
  expenseLoading: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseEmpty: {
    fontSize: 13,
    color: C.expenseMuted,
    fontWeight: '600',
    marginBottom: 12,
  },
  expenseList: {
    gap: 8,
    marginBottom: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.expenseRowBorder,
  },
  expenseRowText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  expenseLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.expenseText,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: C.expenseAccent,
  },
  expenseDelete: {
    padding: 4,
  },
  expenseHint: {
    fontSize: 11,
    color: C.expenseMuted,
    marginTop: 4,
    marginBottom: 10,
  },
  expensePaper: {
    backgroundColor: C.expensePaper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.expenseBorder,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  expenseInput: {
    fontSize: 15,
    color: C.expenseText,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.expenseInputBorder,
  },
  expenseAddBtn: {
    backgroundColor: C.addBtn,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseAddBtnDisabled: {
    opacity: 0.55,
  },
  expenseAddLabel: {
    color: C.expensePinkInk,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCell: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCellHalf: {
    flex: 1,
    minHeight: 88,
  },
  statNum: {
    fontSize: 26,
    fontWeight: '800',
  },
  statEmoji: {
    fontSize: 32,
  },
  statSub: {
    fontSize: 12,
    fontWeight: '600',
    color: C.purple,
    textAlign: 'center',
  },
  moodOverviewCaption: {
    fontSize: 11,
    lineHeight: 14,
  },
  affirmOuterCard: {
    backgroundColor: C.affirmOuter,
  },
  affirmSectionTitle: {
    color: C.affirmTitle,
  },
  affirmInner: {
    backgroundColor: C.affirmInnerPink,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  affirmText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
    color: C.affirmQuote,
    textAlign: 'center',
  },
});
