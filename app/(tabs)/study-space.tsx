import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    SafeAreaView,
    Platform,
    Alert,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { studySpaceService, Folder, StudyGem } from '../../services/studySpaceService';
import { useAuth } from '../../contexts/AuthContext';
import { ButterflyOverlay } from '../../components/studySpace/ButterflyOverlay';

// Palette for "The Ethereal Archivist"
const SCREEN_BG = '#FEF7FA';
const TIMER_CARD_BG = '#F3E6F3'; // A little darker lilac for the timer card
const ACCENT_PINK = '#C2185B';
const LIGHT_LAVENDER = '#EAD8EB'; // Darker lavender for buttons and chips
const TEXT_DARK = '#2D0C26';
const SECONDARY_TEXT = '#8E7385';

export default function StudySpaceScreen() {
    const { user, profileImage } = useAuth();
    const INITIAL_FOCUS_SECONDS = 25 * 60;
    const [activeFolder, setActiveFolder] = useState('All');
    const [folders, setFolders] = useState<Folder[]>([]);
    const [studyGems, setStudyGems] = useState<StudyGem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [timeLeft, setTimeLeft] = useState(INITIAL_FOCUS_SECONDS);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [totalStudyToday, setTotalStudyToday] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const [butterflyTrigger, setButterflyTrigger] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            const loadInitialData = async () => {
                try {
                    setIsLoading(true);
                    const [fetchedFolders, fetchedGems, stats] = await Promise.all([
                        studySpaceService.getFolders(),
                        studySpaceService.getStudyGems(activeFolder === 'All' ? undefined : folders.find(f => f.name === activeFolder)?._id),
                        studySpaceService.getSessionStats()
                    ]);
                    setFolders(fetchedFolders);
                    setStudyGems(fetchedGems);
                    setTotalStudyToday(stats.todayTotalSeconds);
                } catch (error) {
                    console.error('Error loading data:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            loadInitialData();
        }, [activeFolder, folders.length])
    );

    // Only depend on isTimerRunning — including timeLeft here restarts the interval every tick and can break the countdown on device.
    useEffect(() => {
        if (!isTimerRunning) {
            return;
        }

        const intervalId = setInterval(() => {
            setTimeLeft((current) => {
                if (current <= 1) {
                    setIsTimerRunning(false);
                    handleSessionComplete();
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isTimerRunning]);

    const handleSessionComplete = async () => {
        if (!sessionStartTime) return;

        try {
            const endTime = new Date();
            const duration = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000);

            // Find current folder ID if available
            const folderId = folders.find(f => f.name === activeFolder)?._id;

            await studySpaceService.saveStudySession({
                duration,
                folderId,
                startTime: sessionStartTime.toISOString(),
                endTime: endTime.toISOString()
            });

            // Update local stats
            const stats = await studySpaceService.getSessionStats();
            setTotalStudyToday(stats.todayTotalSeconds);
            Alert.alert('Session Complete! ✨', `You studied for ${Math.floor(duration / 60)} minutes. Great job! 💖`);
        } catch (error) {
            console.error('Error saving session:', error);
        } finally {
            setSessionStartTime(null);
        }
    };

    const handleStartTimer = () => {
        if (!isTimerRunning) {
            setSessionStartTime(new Date());
            setIsTimerRunning(true);
            setButterflyTrigger(prev => prev + 1);
        }
    };

    const handlePauseTimer = () => {
        setIsTimerRunning(false);
    };

    const handleSelectFolder = async (name: string, id?: string) => {
        setActiveFolder(name);
        try {
            setIsLoading(true);
            const filteredGems = await studySpaceService.getStudyGems(id);
            setStudyGems(filteredGems);
        } catch (error) {
            console.error('Error filtering gems:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteFolder = async (folder: Folder) => {
        Alert.alert(
            'Delete Folder?',
            `Are you sure you want to delete "${folder.name}"? This will also delete all gems inside it! ⚠️`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await studySpaceService.deleteFolder(folder._id);
                            
                            // Refresh folders
                            const fetchedFolders = await studySpaceService.getFolders();
                            setFolders(fetchedFolders);
                            
                            // If we were viewing this folder, switch to All
                            if (activeFolder === folder.name) {
                                handleSelectFolder('All');
                            } else {
                                // Refresh gems to clear out the ones that were just deleted with the folder
                                const currentFolderId = activeFolder === 'All' ? undefined : fetchedFolders.find(f => f.name === activeFolder)?._id;
                                const filteredGems = await studySpaceService.getStudyGems(currentFolderId);
                                setStudyGems(filteredGems);
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete folder.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleFolderLongPress = (folder: Folder) => {
        Alert.alert(
            `${folder.icon} ${folder.name}`,
            'Manage your folder ✨',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Edit Folder',
                    onPress: () => router.push({
                        pathname: '/study-space/edit-folder',
                        params: { id: folder._id }
                    })
                },
                {
                    text: 'Delete Folder',
                    style: 'destructive',
                    onPress: () => handleDeleteFolder(folder)
                }
            ]
        );
    };

    const filteredGemsToDisplay = studyGems.filter(gem => 
        gem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (gem.notes && gem.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (gem.tags && gem.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: SCREEN_BG }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Little Study Space 💕</Text>
                    <Text style={styles.headerSubTitle}>STAY COZY AND PRODUCTIVE ✨</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                    <Image
                        source={profileImage ? { uri: profileImage } : require('../../assets/images/icon.png')}
                        style={styles.profilePic}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Focus Timer Card */}
                <View style={styles.timerCard}>
                    <View style={styles.timerHeader}>
                        <Text style={styles.timerLabel}>FOCUS TIME</Text>
                        <Feather name="clock" size={16} color={ACCENT_PINK} style={styles.timerIcon} />
                    </View>
                    <Text style={styles.timerText}>
                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </Text>
                    <View style={styles.timerActions}>
                        <TouchableOpacity style={styles.startButton} onPress={handleStartTimer}>
                            <Text style={styles.startButtonText}>{isTimerRunning ? 'Running' : 'Start'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pauseButton} onPress={handlePauseTimer}>
                            <Text style={styles.pauseButtonText}>Pause</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => {
                                if (isTimerRunning) {
                                    Alert.alert(
                                        'Stop Session?',
                                        'Are you sure you want to stop this session? Progress will be saved. ✨',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Stop & Save',
                                                onPress: () => {
                                                    setIsTimerRunning(false);
                                                    handleSessionComplete();
                                                    setTimeLeft(INITIAL_FOCUS_SECONDS);
                                                }
                                            }
                                        ]
                                    );
                                } else {
                                    setTimeLeft(INITIAL_FOCUS_SECONDS);
                                }
                            }}
                        >
                            <Ionicons name="refresh" size={24} color={TEXT_DARK} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Daily Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>Today's Focus ✨</Text>
                        <MaterialIcons name="auto-awesome" size={12} color={ACCENT_PINK} />
                    </View>
                    <View style={styles.progressStatsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{Math.floor(totalStudyToday / 60)}</Text>
                            <Text style={styles.statLabel}>MINS</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{Math.floor(totalStudyToday / 3600)}h {Math.floor((totalStudyToday % 3600) / 60)}m</Text>
                            <Text style={styles.statLabel}>TOTAL</Text>
                        </View>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min((totalStudyToday / (25 * 60 * 4)) * 100, 100)}%` }]} />
                    </View>
                    <Text style={styles.progressQuote}>"Small steps every day! 🌸"</Text>
                </View>

                {/* Study Journey Button */}
                <TouchableOpacity
                    style={styles.journeyBtn}
                    onPress={() => router.push('/study-space/study-journey')}
                >
                    <MaterialIcons name="auto-awesome" size={18} color="white" />
                    <Text style={styles.journeyBtnText}>View My Study Journey 🌸</Text>
                </TouchableOpacity>

                {/* Folder Chips */}
                <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>Your folders</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderRow}>
                    <TouchableOpacity
                        style={[
                            styles.folderChip,
                            activeFolder === 'All' && styles.folderChipActive
                        ]}
                        onPress={() => handleSelectFolder('All')}
                    >
                        <Text style={[
                            styles.folderText,
                            activeFolder === 'All' && styles.folderTextActive
                        ]}>
                            ✨ All
                        </Text>
                    </TouchableOpacity>

                    {folders.map((folder) => (
                        <TouchableOpacity
                            key={folder._id}
                            style={[
                                styles.folderChip,
                                activeFolder === folder.name && { backgroundColor: folder.color || '#B7104A' }
                            ]}
                            onPress={() => handleSelectFolder(folder.name, folder._id)}
                            onLongPress={() => handleFolderLongPress(folder)}
                        >
                            <Text style={[
                                styles.folderText,
                                activeFolder === folder.name && styles.folderTextActive
                            ]}>
                                {folder.icon} {folder.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={styles.addFolderButton}
                        onPress={() => router.push('/study-space/create-folder')}
                    >
                        <Text style={styles.addFolderText}>+ Add </Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.searchContainer}>
                    <Feather name="search" size={18} color={TEXT_DARK} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your gems... ✨"
                        placeholderTextColor={SECONDARY_TEXT}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x-circle" size={18} color={SECONDARY_TEXT} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Loading / Empty / List States */}
                {isLoading ? (
                    <View style={styles.loadingArea}>
                        <Text style={styles.loadingText}>Tending to your garden... 🌸</Text>
                    </View>
                ) : filteredGemsToDisplay.length === 0 ? (
                    <View style={styles.emptyArea}>
                        <Ionicons name="flower-outline" size={48} color="#E1BEE7" />
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No gems match your search. 🌸' : 'No gems here yet. Start your collection!'}
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity
                                style={styles.addGemButton}
                                onPress={() => router.push('/study-space/add-study-gem')}
                            >
                                <View style={styles.addGemIcon}>
                                    <Ionicons name="add" size={24} color="white" />
                                </View>
                                <Text style={styles.addGemText}>Add First Gem ✨</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.gemsList}>
                        {filteredGemsToDisplay.map((gem) => (
                            <TouchableOpacity
                                key={gem._id}
                                style={styles.gemCard}
                                onPress={() => router.push({
                                    pathname: '/study-space/study-gem-details',
                                    params: { id: gem._id }
                                })}
                            >
                                <View style={styles.gemBadgeRow}>
                                    <View style={styles.typeBadge}>
                                        <Ionicons
                                            name={gem.type === 'community' ? 'chatbubble-ellipses-outline' : 'pencil'}
                                            size={12}
                                            color="#9C27B0"
                                        />
                                        <Text style={styles.typeText}>
                                            {gem.type === 'community' ? 'FROM COMMUNITY' : 'MY NOTE'}
                                        </Text>
                                    </View>
                                    {gem.tags.includes('IMPORTANT') && (
                                        <View style={styles.importantBadge}>
                                            <Text style={styles.importantText}>IMPORTANT ✨</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.gemTitle}>{gem.title}</Text>

                                {gem.notes && (
                                    <View style={styles.noteBox}>
                                        <View style={styles.noteIndicator} />
                                        <Text style={styles.notePreview} numberOfLines={2}>
                                            {gem.notes}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.gemFooter}>
                                    <View style={styles.footerInfo}>
                                        {gem.tags.length > 0 && (
                                            <View style={styles.tagBadge}>
                                                <Text style={styles.tagTextSmall}>{gem.tags[0]}</Text>
                                            </View>
                                        )}
                                        {gem.attachments.length > 0 && (
                                            <Ionicons name="attach" size={18} color={TEXT_DARK} style={{ marginLeft: 8 }} />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/study-space/add-study-gem')}
            >
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            <ButterflyOverlay trigger={butterflyTrigger} />
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SCREEN_BG,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginTop: Platform.OS === 'android' ? 30 : 0,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#B7104A',
    },
    headerSubTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#F48FB1',
        letterSpacing: 1,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#425466',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    timerCard: {
        backgroundColor: TIMER_CARD_BG,
        borderRadius: 30,
        padding: 15, // Compacted
        alignItems: 'center',
        marginVertical: 10,
        shadowColor: '#F48FB1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    timerLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#9C27B0',
        letterSpacing: 1.2,
    },
    timerIcon: {
        marginLeft: 4,
    },
    timerText: {
        fontSize: 48, // Slightly smaller timer
        fontWeight: '700',
        color: TEXT_DARK,
        marginVertical: 2,
    },
    timerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 2,
    },
    startButton: {
        backgroundColor: '#B7104A',
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderRadius: 18,
    },
    startButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    pauseButton: {
        backgroundColor: '#F2E8F3',
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderRadius: 18,
    },
    pauseButtonText: {
        color: '#9C27B0',
        fontSize: 14,
        fontWeight: '700',
    },
    resetButton: {
        padding: 6,
    },
    progressCard: {
        backgroundColor: 'white',
        borderRadius: 25,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#C2185B',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#FCE4EC',
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginBottom: 10,
    },
    progressTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: ACCENT_PINK,
        letterSpacing: 0.8,
    },
    progressStatsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    statBox: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: TEXT_DARK,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: SECONDARY_TEXT,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#F2E8F3',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#FCE4EC',
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: ACCENT_PINK,
        borderRadius: 4,
    },
    progressQuote: {
        fontSize: 11,
        color: SECONDARY_TEXT,
        textAlign: 'center',
    },
    journeyBtn: {
        backgroundColor: '#9C27B0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 20,
        gap: 8,
        shadowColor: '#9C27B0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    journeyBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    folderRow: {
        marginVertical: 10,
    },
    folderChip: {
        backgroundColor: LIGHT_LAVENDER,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 18,
        marginRight: 10,
        height: 40,
        justifyContent: 'center',
    },
    folderChipActive: {
        backgroundColor: '#B7104A',
    },
    folderText: {
        color: '#9C27B0',
        fontWeight: '700',
        fontSize: 13,
    },
    folderTextActive: {
        color: 'white',
    },
    addFolderButton: {
        width: 60,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E1BEE7',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addFolderText: {
        color: '#B7104A',
        fontWeight: '700',
        fontSize: 11,
    },
    gemsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: ACCENT_PINK,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 100,
    },
    addGemButton: {
        borderWidth: 2,
        borderColor: '#F1D9E7',
        borderStyle: 'dashed',
        borderRadius: 35,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        marginTop: 10,
        width: '100%',
    },
    addGemIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#9C27B0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    addGemText: {
        color: '#9C27B0',
        fontSize: 15,
        fontWeight: '700',
    },
    gemsList: {
        gap: 15,
        paddingBottom: 20,
    },
    gemCard: {
        backgroundColor: 'white',
        borderRadius: 25,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    gemBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    typeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#9C27B0',
        letterSpacing: 0.5,
    },
    importantBadge: {
        backgroundColor: '#C2185B',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    importantText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '700',
    },
    gemTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: TEXT_DARK,
        marginBottom: 8,
    },
    noteBox: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    noteIndicator: {
        width: 3,
        backgroundColor: '#FFD1D1',
        borderRadius: 2,
        marginRight: 10,
    },
    notePreview: {
        flex: 1,
        fontSize: 13,
        color: TEXT_DARK,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    gemFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagBadge: {
        backgroundColor: '#F2E8F3',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    tagTextSmall: {
        fontSize: 9,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    loadingArea: {
        padding: 80,
        alignItems: 'center',
    },
    loadingText: {
        color: SECONDARY_TEXT,
        fontSize: 14,
        fontStyle: 'italic',
    },
    emptyArea: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 30,
        marginTop: 10,
    },
    emptyText: {
        color: SECONDARY_TEXT,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: TIMER_CARD_BG,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
        shadowColor: '#C2185B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: TEXT_DARK,
        paddingVertical: 0,
    },
});
