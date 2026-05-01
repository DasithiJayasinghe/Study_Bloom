import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

// Richer, darker pink and purple colors
const COLORS = [
  'rgba(194, 24, 91, 0.75)',   // Deep Accent Pink
  'rgba(142, 36, 170, 0.75)',  // Violet
  'rgba(156, 39, 176, 0.75)',  // Deep Magenta
  'rgba(216, 27, 96, 0.75)',   // Rich Pink
];

const Butterfly = ({ index }: { index: number }) => {
  const flightProgress = useRef(new Animated.Value(0)).current;
  const flutter = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  // Randomize initial properties
  const startX = useRef(Math.random() * (width - 100) + 50).current;
  const color = useRef(COLORS[index % COLORS.length]).current;
  const size = useRef(15 + Math.random() * 8).current; // 15 to 23
  const duration = useRef(6000 + Math.random() * 3000).current; // 6s to 9s flight

  useEffect(() => {
    // 1. Vertical Flight (Bottom to Top)
    Animated.timing(flightProgress, {
      toValue: 1,
      duration: duration,
      easing: Easing.inOut(Easing.sin), // Smooth acceleration and deceleration
      useNativeDriver: true,
    }).start();

    // 2. Wing Flutter (Fast scaling)
    Animated.loop(
      Animated.sequence([
        Animated.timing(flutter, { toValue: 1, duration: 100 + Math.random() * 50, useNativeDriver: true }),
        Animated.timing(flutter, { toValue: 0, duration: 100 + Math.random() * 50, useNativeDriver: true }),
      ])
    ).start();

    // 3. Gentle Sway/Drift (Left to Right organically)
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 2500 + Math.random() * 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: -1, duration: 2500 + Math.random() * 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [duration, flightProgress, flutter, drift]);

  // Interpolations
  const translateY = flightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, -100], // Start at bottom of screen, go above top
  });

  const translateX = drift.interpolate({
    inputRange: [-1, 1],
    outputRange: [startX - 40, startX + 40], // Sway 40px left and right around startX
  });

  const opacity = flightProgress.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0], // Fade in quickly, hold, fade out at end
  });

  // Flutter transforms (scaleX to simulate 3D wing flapping)
  const scaleX = flutter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1], // Wings fold and unfold
  });

  // Base rotation plus slight lean depending on drift direction
  const rotate = drift.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-20deg', '20deg'],
  });

  return (
    <Animated.View
      style={[
        styles.butterflyContainer,
        {
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate },
          ],
        },
      ]}
    >
      <Animated.View style={[styles.wingsWrapper, { transform: [{ scaleX }] }]}>
        {/* Left Wing */}
        <View style={[
          styles.wing, 
          styles.leftWing, 
          { backgroundColor: color, width: size, height: size * 1.3 }
        ]} />
        {/* Body */}
        <View style={[styles.body, { height: size }]} />
        {/* Right Wing */}
        <View style={[
          styles.wing, 
          styles.rightWing, 
          { backgroundColor: color, width: size, height: size * 1.3 }
        ]} />
      </Animated.View>
      
      {/* Soft Glow */}
      <View style={[styles.glow, { width: size * 2.5, height: size * 2.5, backgroundColor: color }]} />
    </Animated.View>
  );
};

export const ButterflyOverlay = ({ trigger }: { trigger: number }) => {
  const [swarms, setSwarms] = useState<{ id: string; index: number }[]>([]);

  useEffect(() => {
    if (trigger > 0) {
      // Show only 2 to 4 butterflies at a time for a calming effect
      const numButterflies = Math.floor(Math.random() * 3) + 2; 
      
      const newSwarm = Array.from({ length: numButterflies }).map((_, i) => ({
        id: `${trigger}-${i}-${Date.now()}`,
        index: i,
      }));
      
      setSwarms(newSwarm);
      
      // Cleanup after longest possible animation (9s flight + buffer)
      const timer = setTimeout(() => setSwarms([]), 10000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (swarms.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {swarms.map(b => (
        <Butterfly key={b.id} index={b.index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  butterflyContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wingsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 2,
  },
  wing: {
    borderRadius: 20,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  leftWing: {
    borderBottomRightRadius: 2,
    borderTopRightRadius: 10,
    marginRight: 1,
  },
  rightWing: {
    borderBottomLeftRadius: 2,
    borderTopLeftRadius: 10,
    marginLeft: 1,
  },
  body: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1,
  },
  glow: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.3,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    zIndex: 1,
  }
});
