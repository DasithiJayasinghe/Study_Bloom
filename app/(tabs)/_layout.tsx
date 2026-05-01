import { Tabs, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { StudyBloomColors } from '@/constants/theme';
import { helpRequestService } from '@/services/helpRequestService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function HelpFeedTabIcon({ color, size, unseenCount }: { color: string; size: number; unseenCount: number }) {
    return (
        <View style={styles.iconWrapper}>
            <Ionicons name="people-outline" size={size} color={color} />
            {unseenCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unseenCount > 9 ? '9+' : unseenCount}
                    </Text>
                </View>
            )}
        </View>
    );
}

function CustomTabBar({ state, descriptors, navigation, insets, width }: BottomTabBarProps & { insets: any, width: number }) {
    const TAB_WIDTH = width / 5;

    return (
        <View style={{ backgroundColor: '#FFF', borderTopColor: StudyBloomColors.lightGray, borderTopWidth: StyleSheet.hairlineWidth }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    height: 60 + insets.bottom,
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: 8
                }}
            >
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];

                    if ((options as any).href === null || route.name === 'explore') return null;

                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name as any, route.params);
                        }
                    };

                    const color = isFocused ? StudyBloomColors.primary : StudyBloomColors.gray;

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={(options as any).tabBarAccessibilityLabel}
                            testID={(options as any).tabBarTestID}
                            onPress={onPress}
                            style={{ width: TAB_WIDTH, alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.7}
                        >
                            {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color, size: 24 })}
                            <Text style={{ color, fontSize: 10, marginTop: 4, fontWeight: isFocused ? '600' : '400' }} numberOfLines={1}>
                                {label as string}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

export default function TabLayout() {
    const [unseenFeedCount, setUnseenFeedCount] = useState(0);
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const loadUnseenFeedCount = useCallback(async () => {
        try {
            const count = await helpRequestService.getUnseenHelpFeedCount();
            setUnseenFeedCount(count);
        } catch (error) {
            console.log('Failed to load unseen help feed count:', error);
            setUnseenFeedCount(0);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUnseenFeedCount();
        }, [loadUnseenFeedCount])
    );

    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} insets={insets} width={width} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="public-community"
                options={{
                    title: 'Community',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="help-feed"
                options={{
                    title: 'Help Feed',
                    tabBarIcon: ({ color, size }) => (
                        <HelpFeedTabIcon
                            color={color}
                            size={size}
                            unseenCount={unseenFeedCount}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="messages"
                options={{
                    title: "Messages",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubble-outline" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="respond"
                options={{
                    title: "Help Respond",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="checkmark-circle-outline" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="study-space"
                options={{
                    title: 'Study Space',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="sparkles" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="routine"
                options={{
                    title: 'Routine',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="flower-outline" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="exams"
                options={{
                    title: 'Exams',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-clear-outline" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="explore"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrapper: {
        position: 'relative',
        width: 28,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -10,
        minWidth: 17,
        height: 17,
        borderRadius: 9,
        backgroundColor: '#FF4D6D',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '800',
    },
});