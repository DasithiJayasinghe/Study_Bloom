import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { BlossomRoutineShell } from '@/components/blossom-routine/BlossomRoutineShell';
import { BLOSSOM_WATER_GOAL_ML, useBlossomWater } from '@/contexts/BlossomWaterContext';
const PURPLE = '#5E35B1';
const PURPLE_SOFT = '#7E57C2';
/** Vibrant magenta-purple — only for the “WATER TRACKER” heading */
const TRACKER_HEADING_MAGENTA = '#D81B60';
/** Lighter purple for the big ml count (number + “ml” match) */
const COUNT_PURPLE_ML = '#CE93D8';
const SKY_BLUE = '#29B6F6';
const TRACK_EMPTY = '#FFFDE7';
const GLASS_WATER = '#4FC3F7';
const GLASS_EMPTY = '#E1F5FE';
/** Match Blossom Routine Daily Affirmation outer / inner pinks */
const AFFIRM_OUTER_PINK = '#FFF0F5';
const AFFIRM_INNER_PINK = '#FCE4EC';

const FILL_DURATION_MS = 1600;
const RESET_DURATION_MS = 1200;

export default function BlossomWaterScreen() {
  const { ml, setWaterMl, resetWater, calendarDayKey } = useBlossomWater();
  const mlAnim = useRef(new Animated.Value(ml)).current;
  const [displayMl, setDisplayMl] = useState(ml);
  const [isAnimating, setIsAnimating] = useState(false);
  const listenerIdRef = useRef<string | null>(null);
  const prevDayKeyRef = useRef(calendarDayKey);

  useEffect(() => {
    const id = mlAnim.addListener(({ value }) => setDisplayMl(value));
    listenerIdRef.current = id;
    return () => {
      if (listenerIdRef.current != null) {
        mlAnim.removeListener(listenerIdRef.current);
      }
    };
  }, [mlAnim]);

  /** Snap gauge when the calendar day changes (midnight / foreground). */
  useEffect(() => {
    if (prevDayKeyRef.current === calendarDayKey) return;
    prevDayKeyRef.current = calendarDayKey;
    mlAnim.stopAnimation();
    mlAnim.setValue(ml);
    setDisplayMl(ml);
    setIsAnimating(false);
  }, [calendarDayKey, ml, mlAnim]);

  /** Keep gauge in sync when `ml` updates from server while idle (e.g. initial load). */
  useEffect(() => {
    if (isAnimating) return;
    mlAnim.setValue(ml);
    setDisplayMl(ml);
  }, [ml, isAnimating, mlAnim]);

  const pctOfGoal = Math.min(100, (displayMl / BLOSSOM_WATER_GOAL_ML) * 100);
  const pctRounded = Math.round(pctOfGoal);

  const addWater = (amount: number) => {
    if (isAnimating) return;
    mlAnim.stopAnimation((current) => {
      const end = Math.min(BLOSSOM_WATER_GOAL_ML, current + amount);
      if (end <= current + 0.5) return;
      setWaterMl(end);
      setIsAnimating(true);
      mlAnim.setValue(current);
      Animated.timing(mlAnim, {
        toValue: end,
        duration: FILL_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setIsAnimating(false);
      });
    });
  };

  const reset = () => {
    if (isAnimating) return;
    mlAnim.stopAnimation((current) => {
      if (current < 0.5) return;
      resetWater();
      setIsAnimating(true);
      mlAnim.setValue(current);
      Animated.timing(mlAnim, {
        toValue: 0,
        duration: RESET_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setIsAnimating(false);
      });
    });
  };

  return (
    <BlossomRoutineShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, styles.cardOuterPink]}>
          <Text style={styles.trackerTitle}>💧 WATER TRACKER</Text>

          <Text style={styles.mainMl}>
            {Math.round(displayMl)}
            <Text style={styles.mainMlUnit}> ml</Text>
          </Text>
          <Text style={styles.goalLine}>Goal: {BLOSSOM_WATER_GOAL_ML} ml</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pctOfGoal}%` }]} />
          </View>
          <Text style={styles.pctLabel}>{pctRounded}% of goal</Text>

          <View style={styles.glassesWrap}>
            <View style={styles.glassesRow7}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <GlassSegment key={i} index={i} totalMl={displayMl} />
              ))}
            </View>
            <View style={styles.glassesRow1}>
              <GlassSegment index={7} totalMl={displayMl} />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isAnimating && styles.actionBtnDisabled]}
              onPress={() => addWater(100)}
              activeOpacity={0.85}
              disabled={isAnimating}
            >
              <Text style={styles.actionBtnText}>+100ml</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, isAnimating && styles.actionBtnDisabled]}
              onPress={() => addWater(200)}
              activeOpacity={0.85}
              disabled={isAnimating}
            >
              <Text style={styles.actionBtnText}>+200ml</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, isAnimating && styles.actionBtnDisabled]}
              onPress={reset}
              activeOpacity={0.85}
              disabled={isAnimating}
            >
              <Text style={styles.actionBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </BlossomRoutineShell>
  );
}

const SEGMENT = 250;

/** Each glass = 250 ml; water rises bottom → top inside the cup */
function GlassSegment({ index, totalMl }: { index: number; totalMl: number }) {
  const start = index * SEGMENT;
  const end = start + SEGMENT;
  let fillLevel = 0;
  if (totalMl >= end) {
    fillLevel = 1;
  } else if (totalMl > start) {
    fillLevel = (totalMl - start) / SEGMENT;
  }
  const pctLabel = Math.round(fillLevel * 100);
  return (
    <View style={styles.glassOuter} accessibilityLabel={`Cup ${index + 1}, ${pctLabel} percent full`}>
      {fillLevel > 0 ? (
        <View
          style={[
            styles.glassFill,
            { height: `${fillLevel * 100}%` },
            fillLevel > 0 && fillLevel < 1 ? styles.glassFillSurface : null,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardOuterPink: {
    backgroundColor: AFFIRM_OUTER_PINK,
  },
  trackerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TRACKER_HEADING_MAGENTA,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  mainMl: {
    fontSize: 42,
    fontWeight: '800',
    color: COUNT_PURPLE_ML,
    textAlign: 'center',
  },
  mainMlUnit: {
    fontSize: 28,
    fontWeight: '800',
    color: COUNT_PURPLE_ML,
  },
  goalLine: {
    fontSize: 16,
    fontWeight: '600',
    color: PURPLE_SOFT,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: TRACK_EMPTY,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: SKY_BLUE,
  },
  pctLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE_SOFT,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  glassesWrap: {
    alignItems: 'center',
    marginBottom: 22,
    gap: 10,
  },
  glassesRow7: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  glassesRow1: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  glassOuter: {
    width: 36,
    height: 44,
    borderRadius: 10,
    backgroundColor: GLASS_EMPTY,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#B3E5FC',
  },
  glassFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: GLASS_WATER,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  glassFillSurface: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: AFFIRM_INNER_PINK,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8BBD0',
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#AD1457',
  },
});
