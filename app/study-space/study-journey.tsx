import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Image,
    ActivityIndicator,
    Dimensions,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { studySpaceService } from '../../services/studySpaceService';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Premium "Cozy Diary" Palette
const DIARY_BG = '#FDF5F9';
const ACCENT_PINK = '#D81B60'; // Darker pink for headers/highlights
const PILL_ACTIVE = '#C2185B';
const CARD_LIGHT_PINK = '#FCE4EC';
const BAR_STUDY = '#F48FB1';
const BAR_COZY = '#F8BBD0';
const TEXT_PRIMARY = '#2D0C26';
const TEXT_SECONDARY = '#8E7385';

export default function StudyJourneyScreen() {
    const { user, profileImage } = useAuth();
    const [viewMode, setViewMode] = useState<'Week' | 'Month'>('Week');
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [viewMode])
    );

    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const loadStats = async () => {
        try {
            setIsLoading(true);
            let data;
            if (viewMode === 'Week') {
                data = await studySpaceService.getWeeklyStats();
            } else {
                data = await studySpaceService.getMonthlyStats();
            }
            setStats(data);
        } catch (error) {
            console.error('Error loading diary stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const chartData = viewMode === 'Week' ? stats?.weeklyData : stats?.monthlyData;
    
    // Calculate dynamic max for the Y-axis (minimum 5h)
    const rawMax = Math.max(5, ...(chartData?.map((d: any) => Math.max(d.studyHours || 0, d.cozyHours || 0)) || [0]));
    const maxDisplayHours = Math.ceil(rawMax);
    const yScale = 220 / maxDisplayHours;

    if (isLoading && !stats) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loaderArea}>
                    <ActivityIndicator size="large" color={PILL_ACTIVE} />
                    <Text style={styles.loadingText}>Opening your diary... ✨</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Diary Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.backbutton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#880E4F" />
                    </TouchableOpacity>
                    <View style={styles.headerTitles}>
                        <Text style={styles.headerTitle}>MY STUDY DIARY ✨</Text>
                        <Text style={styles.headerSubTitle}>{monthName} 🌷</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                    <Image
                        source={profileImage ? { uri: profileImage } : require('../../assets/images/icon.png')}
                        style={styles.profilePic}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* View Multi-Toggle */}
                <View style={styles.toggleContainer}>
                    <View style={styles.toggleBg}>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, viewMode === 'Week' && styles.toggleActive]}
                            onPress={() => setViewMode('Week')}
                        >
                            <Text style={[styles.toggleText, viewMode === 'Week' && styles.toggleTextActive]}>Week</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.toggleBtn, viewMode === 'Month' && styles.toggleActive]}
                            onPress={() => setViewMode('Month')}
                        >
                            <Text style={[styles.toggleText, viewMode === 'Month' && styles.toggleTextActive]}>Month</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryTextContainer}>
                        <Text style={styles.summaryMajorText}>
                            You studied {stats?.totalHours || 0} hours {'\n'}this {viewMode.toLowerCase()} ✨
                        </Text>
                        <Text style={styles.summaryMinorText}>
                            Keep going, you're doing amazing 💖
                        </Text>
                    </View>
                    <View style={styles.cardWatermark}>
                        <Ionicons name="book-outline" size={80} color="rgba(194, 24, 91, 0.05)" />
                    </View>
                </View>

                {/* Balance Chart Card */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>{viewMode}ly Balance</Text>
                            <View style={styles.legend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.dot, { backgroundColor: BAR_STUDY }]} />
                                    <Text style={styles.legendText}>STUDY</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.dot, { backgroundColor: BAR_COZY }]} />
                                    <Text style={styles.legendText}>COZY TIME</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.chartAreaWrapper}>
                        {/* Dynamic Y-Axis Labels */}
                        <View style={styles.yAxisLabels}>
                            {Array.from({ length: maxDisplayHours }, (_, i) => maxDisplayHours - i).map(h => (
                                <Text key={h} style={[styles.yLabel, { position: 'absolute', bottom: h * yScale + 44 }]}>
                                    {h}h
                                </Text>
                            ))}
                        </View>

                        <View style={styles.chartArea}>
                            {/* Dynamic Horizontal Grid Lines */}
                            {Array.from({ length: maxDisplayHours + 1 }, (_, i) => i).map(h => (
                                <View 
                                    key={h} 
                                    style={[styles.gridLine, { position: 'absolute', bottom: h * yScale + 48, left: 0, right: 0, opacity: h === 0 ? 0.3 : 1 }]} 
                                />
                            ))}

                            {/* The Bars with Floating Labels */}
                            <View style={styles.barsContainer}>
                                {chartData?.length > 0 && chartData.map((item: any, idx: number) => {
                                    const isSelected = selectedIdx === idx;
                                    const studyHours = item.studyHours || 0;
                                    const cozyHours = item.cozyHours || 0;
                                    
                                    const studyHeight = Math.max((studyHours / maxDisplayHours) * 220, 10);
                                    const cozyHeight = Math.max((cozyHours / maxDisplayHours) * 220, 10);
                                    
                                    return (
                                        <TouchableOpacity 
                                            key={idx} 
                                            activeOpacity={0.9}
                                            onPress={() => {
                                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                setSelectedIdx(selectedIdx === idx ? null : idx);
                                            }}
                                            style={[styles.barGroup, { width: (width - 130) / chartData.length }]}
                                        >
                                            {/* Cute Floating Label - Properly Offset Above Bar */}
                                            <View style={[
                                                styles.floatingLabel,
                                                { 
                                                    bottom: studyHeight + 35, // Adjusted to float correctly above bar base (23) + height
                                                    transform: [{ scale: isSelected ? 1.15 : 0.8 }],
                                                    backgroundColor: isSelected ? '#FCE4EC' : 'white',
                                                    shadowOpacity: isSelected ? 0.15 : 0,
                                                    opacity: isSelected ? 1 : 0,
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? PILL_ACTIVE + '22' : 'transparent',
                                                }
                                            ]}>
                                                <Text style={[styles.labelText, isSelected && { color: PILL_ACTIVE }]}>
                                                    {studyHours}h {idx % 2 === 0 ? '✨' : '🌸'}
                                                </Text>
                                            </View>

                                            <View style={styles.barPair}>
                                                <View style={[
                                                    styles.bar, 
                                                    { 
                                                        height: studyHeight, 
                                                        backgroundColor: BAR_STUDY,
                                                        opacity: selectedIdx !== null && !isSelected ? 0.3 : 1
                                                    }
                                                ]} />
                                                <View style={[
                                                    styles.bar, 
                                                    { 
                                                        height: cozyHeight, 
                                                        backgroundColor: BAR_COZY,
                                                        opacity: selectedIdx !== null && !isSelected ? 0.3 : 1
                                                    }
                                                ]} />
                                            </View>
                                            <Text style={[styles.dayLabel, isSelected && { color: PILL_ACTIVE, fontWeight: '900' }]}>
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DIARY_BG,
    },
    loaderArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        color: PILL_ACTIVE,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F2E8F3',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backbutton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitles: {
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#B7104A',
    },
    headerSubTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#F48FB1',
        letterSpacing: 0.5,
    },
    profilePic: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E1BEE7',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    toggleContainer: {
        alignItems: 'center',
        marginVertical: 25,
    },
    toggleBg: {
        flexDirection: 'row',
        backgroundColor: '#F48FB122',
        borderRadius: 25,
        padding: 4,
        width: 220,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 22,
        alignItems: 'center',
    },
    toggleActive: {
        backgroundColor: PILL_ACTIVE,
        shadowColor: PILL_ACTIVE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '700',
        color: TEXT_SECONDARY,
    },
    toggleTextActive: {
        color: 'white',
    },
    summaryCard: {
        backgroundColor: CARD_LIGHT_PINK,
        borderRadius: 35,
        padding: 30,
        marginBottom: 25,
        position: 'relative',
        overflow: 'hidden',
    },
    summaryTextContainer: {
        zIndex: 1,
    },
    summaryMajorText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#4A148C',
        lineHeight: 30,
        marginBottom: 10,
    },
    summaryMinorText: {
        fontSize: 14,
        color: '#880E4F',
        fontWeight: '600',
        opacity: 0.8,
    },
    cardWatermark: {
        position: 'absolute',
        right: -10,
        bottom: -10,
    },
    chartCard: {
        backgroundColor: 'white',
        borderRadius: 35,
        padding: 25,
        shadowColor: '#C2185B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        marginBottom: 8,
    },
    legend: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        fontWeight: '800',
        color: TEXT_SECONDARY,
    },
    goalContainer: {
        alignItems: 'center',
    },
    goalPercent: {
        fontSize: 22,
        fontWeight: '900',
        color: PILL_ACTIVE,
    },
    goalLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: TEXT_SECONDARY,
        textAlign: 'center',
    },
    chartAreaWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 280,
    },
    yAxisLabels: {
        width: 30,
        height: '100%',
        marginRight: 10,
    },
    yLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: TEXT_SECONDARY,
        opacity: 0.4,
    },
    chartArea: {
        flex: 1,
        height: 280,
        justifyContent: 'flex-end',
        paddingBottom: 25,
    },
    gridLines: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        paddingBottom: 45,
    },
    gridLine: {
        height: 1,
        backgroundColor: '#F8F1F8',
    },
    barsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        zIndex: 1,
    },
    barGroup: {
        alignItems: 'center',
    },
    barPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        marginBottom: 10,
    },
    bar: {
        width: 8,
        borderRadius: 4,
    },
    dayLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: TEXT_SECONDARY,
    },
    floatingLabel: {
        position: 'absolute',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        // Soft Glow Shadow
        shadowColor: PILL_ACTIVE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    labelText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#880E4F',
    },
    closeDiaryBtn: {
        marginTop: 30,
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#FCE4EC',
        borderRadius: 20,
    },
    closeDiaryText: {
        color: PILL_ACTIVE,
        fontWeight: '700',
        fontSize: 14,
    }
});
