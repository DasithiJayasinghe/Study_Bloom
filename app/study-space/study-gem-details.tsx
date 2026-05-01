import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { studySpaceService, StudyGem, Folder } from '../../services/studySpaceService';

// Palette for "The Ethereal Archivist"
const SCREEN_BG = '#FEF7FA';
const NOTE_CARD_BG = '#FBF2FB';
const ACCENT_PINK = '#C2185B';
const TEXT_DARK = '#2D0C26';
const SECONDARY_TEXT = '#8E7385';
const BADGE_PURPLE = '#F2E8F3';

export default function StudyGemDetailsScreen() {
    const { id } = useLocalSearchParams();
    const [gem, setGem] = useState<StudyGem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [viewingDoc, setViewingDoc] = useState<string | null>(null);
    const insets = useSafeAreaInsets();

    useFocusEffect(
        React.useCallback(() => {
            if (id && typeof id === 'string') {
                fetchGem(id);
            }
        }, [id])
    );

    const fetchGem = async (gemId: string) => {
        try {
            setIsLoading(true);
            const fetchedGem = await studySpaceService.getStudyGem(gemId);
            setGem(fetchedGem);
        } catch (error) {
            console.error('Error fetching gem:', error);
            Alert.alert('Error', 'Could not find this study gem.');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Gem?',
            'Are you sure you want to remove this study gem from your collection? 🌸',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (gem) {
                            try {
                                await studySpaceService.deleteStudyGem(gem._id);
                                router.back();
                            } catch (error) {
                                Alert.alert('Error', 'Failed to delete gem.');
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleOptionsMenu = () => {
        Alert.alert(
            'Options',
            'What would you like to do? ✨',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Edit Gem',
                    onPress: () => router.push({
                        pathname: '/study-space/edit-study-gem',
                        params: { id: gem?._id || '' }
                    })
                },
                {
                    text: 'Delete Gem',
                    onPress: handleDelete,
                    style: 'destructive'
                }
            ]
        );
    };

    const handleViewAttachment = async (url: string, fileName: string, fileType?: string) => {
        const isImage = (fileType && fileType.startsWith('image/')) || 
                        fileName.match(/\.(jpg|jpeg|png|gif)$/i) || 
                        url.match(/\.(jpg|jpeg|png|gif)$/i);
        
        if (isImage) {
            setViewingImage(url);
            return;
        }

        // For all other files (PDFs, docs), use our custom in-app document viewer
        setViewingDoc(url);
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={ACCENT_PINK} />
            </SafeAreaView>
        );
    }

    if (!gem) return null;

    // Helper to get folder info safely
    const folder = gem.folder as Folder;
    const previewAttachment = gem.attachments?.[0];
    const previewIsImage =
        !!previewAttachment &&
        ((previewAttachment.fileType && previewAttachment.fileType.startsWith('image/')) ||
            previewAttachment.fileType === 'image/*' ||
            previewAttachment.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
            previewAttachment.url?.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i));

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={ACCENT_PINK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Study Gem Details 💎</Text>
                <TouchableOpacity style={styles.menuButton} onPress={handleOptionsMenu}>
                    <Ionicons name="ellipsis-vertical" size={24} color={ACCENT_PINK} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Main Content Card */}
                <View style={styles.mainCard}>
                    {/* Badges Row */}
                    <View style={styles.badgeRow}>
                        <View style={[styles.folderBadge, { backgroundColor: folder?.color ? `${folder.color}20` : BADGE_PURPLE }]}>
                            <Text style={styles.badgeIcon}>{folder?.icon || '📂'}</Text>
                            <Text style={[styles.badgeText, { color: folder?.color || '#9C27B0' }]}>
                                {folder?.name || 'Uncategorized'}
                            </Text>
                        </View>
                        {gem.tags.includes('IMPORTANT') && (
                            <View style={styles.importantBadge}>
                                <Text style={styles.importantText}>IMPORTANT ✨</Text>
                            </View>
                        )}
                    </View>

                    {gem.tags.length > 0 && (
                        <View style={styles.tagBadge}>
                            <Text style={styles.tagText}>{gem.tags[0].toUpperCase()}</Text>
                        </View>
                    )}

                    <Text style={styles.gemTitle}>{gem.title}</Text>
                    {gem.description ? (
                        <Text style={styles.gemDescription}>{gem.description}</Text>
                    ) : null}

                    {/* Community Selected Answer Mockup */}
                    {gem.type === 'community' && (
                        <>
                            <View style={styles.communityPreviewHeader}>
                                <MaterialIcons name="chat-bubble" size={20} color={ACCENT_PINK} />
                                <Text style={styles.communityPreviewTitle}>SELECTED ANSWER 💬</Text>
                            </View>
                            
                            <View style={styles.previewCard}>
                                <Text style={styles.previewQuestion}>
                                    {gem.title || 'Untitled community post'}
                                </Text>
                                
                                <View style={styles.previewAuthorRow}>
                                    <View style={styles.previewAuthorFallback}>
                                        <MaterialIcons name="person" size={16} color="#9E328A" />
                                    </View>
                                    <Text style={styles.previewAuthorName}>Saved from Community</Text>
                                </View>

                                <Text style={styles.previewText}>
                                    {gem.description || gem.notes || 'No saved preview text for this material.'}
                                </Text>
                                {previewAttachment ? (
                                    <>
                                        {previewIsImage ? (
                                            <View style={styles.previewImageWrap}>
                                                <Image
                                                    source={{ uri: previewAttachment.url }}
                                                    style={styles.previewImage}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        ) : null}
                                        <View style={styles.previewAttachmentRow}>
                                            <MaterialIcons name="attach-file" size={16} color={ACCENT_PINK} />
                                            <Text style={styles.previewAttachmentText}>
                                                {previewAttachment.name || 'Community attachment included'}
                                            </Text>
                                        </View>
                                    </>
                                ) : null}

                                {gem.pollData && gem.pollData.length > 0 && (
                                    <View style={styles.previewPollContainer}>
                                        {gem.pollData.map((opt, idx) => {
                                            const totalVotes = gem.pollData!.reduce((sum, o) => sum + o.voteCount, 0);
                                            const percent = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                                            return (
                                                <View key={idx} style={styles.previewPollOption}>
                                                    <View style={[styles.previewPollFill, { width: `${percent}%` as any }]} />
                                                    <View style={styles.previewPollTextRow}>
                                                        <Text style={styles.previewPollLabel}>{opt.optionText}</Text>
                                                        <Text style={styles.previewPollPercent}>{percent}%</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                        <Text style={styles.previewPollFooter}>Saved Community Poll</Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    {/* Nested Notes Card */}
                    {gem.notes ? (
                        <View style={styles.notesCard}>
                            <View style={styles.notesHeader}>
                                <MaterialIcons name="notes" size={20} color={ACCENT_PINK} />
                                <Text style={styles.notesLabel}>ARCHIVIST NOTES 📝</Text>
                            </View>
                            <Text style={styles.notesText}>{gem.notes}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Attachments Section */}
                {gem.attachments && gem.attachments.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="attach" size={22} color="#4E342E" />
                            <Text style={styles.sectionTitle}>Attachments</Text>
                        </View>

                        <View style={styles.attachmentsGrid}>
                            {gem.attachments.map((file, index) => {
                                const isImage = file.fileType?.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif)$/i);
                                return (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={styles.attachmentItem}
                                        onPress={() => handleViewAttachment(file.url, file.name, file.fileType)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.attachmentDocPreview}>
                                            {isImage ? (
                                                <Image source={{ uri: file.url }} style={styles.thumbnail} />
                                            ) : (
                                                <Ionicons
                                                    name="document-text"
                                                    size={32}
                                                    color="#E1BEE7"
                                                />
                                            )}
                                        </View>
                                        <View style={styles.attachmentFooter}>
                                            <Text style={styles.attachmentName} numberOfLines={1}>
                                                {file.name}
                                            </Text>
                                            <Feather name="eye" size={14} color={ACCENT_PINK} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}


            </ScrollView>

            {/* In-App Image Viewer Modal */}
            <Modal
                visible={!!viewingImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setViewingImage(null)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalCloseArea} 
                        onPress={() => setViewingImage(null)} 
                        activeOpacity={1}
                    />
                    
                    <View style={styles.modalContent}>
                        {viewingImage && (
                            <Image 
                                source={{ uri: viewingImage }} 
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                        )}
                        
                        <TouchableOpacity 
                            style={styles.closeBtn} 
                            onPress={() => setViewingImage(null)}
                        >
                            <Ionicons name="close-circle" size={44} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* In-App Document Viewer Modal (PDFs/Docs) */}
            <Modal
                visible={!!viewingDoc}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setViewingDoc(null)}
            >
                <View style={[styles.docModalContainer, { paddingBottom: insets.bottom }]}>
                    <View style={[styles.docModalHeader, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 40) + 10 }]}>
                        <TouchableOpacity 
                            style={styles.docCloseBtn} 
                            onPress={() => setViewingDoc(null)}
                        >
                            <Ionicons name="chevron-back" size={28} color={ACCENT_PINK} />
                            <Text style={styles.docCloseText}>Back to Gem</Text>
                        </TouchableOpacity>
                        <Text style={styles.docModalTitle}>Document View</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    
                    {viewingDoc && (
                        <WebView 
                            source={{ uri: viewingDoc }} 
                            style={styles.webview}
                            scalesPageToFit={true}
                            originWhitelist={['*']}
                        />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SCREEN_BG,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        marginTop: Platform.OS === 'android' ? 30 : 15,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: ACCENT_PINK,
    },
    menuButton: {
        padding: 8,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    mainCard: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        borderRadius: 35,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    folderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BADGE_PURPLE,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6,
    },
    badgeIcon: {
        fontSize: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    importantBadge: {
        backgroundColor: ACCENT_PINK,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    importantText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    tagBadge: {
        backgroundColor: '#AD4D6D',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 15,
    },
    tagText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    gemTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: TEXT_DARK,
        marginBottom: 10,
    },
    gemDescription: {
        fontSize: 15,
        color: SECONDARY_TEXT,
        lineHeight: 22,
        marginBottom: 20,
    },
    notesCard: {
        backgroundColor: NOTE_CARD_BG,
        borderRadius: 25,
        padding: 20,
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    notesLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: ACCENT_PINK,
        letterSpacing: 1,
    },
    notesText: {
        fontSize: 14,
        color: TEXT_DARK,
        lineHeight: 22,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 25,
        marginTop: 30,
        marginBottom: 15,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#4E342E',
    },
    // Community Preview Styles
    communityPreviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        marginBottom: 12,
        marginTop: 10,
    },
    communityPreviewTitle: {
        marginLeft: 8,
        fontSize: 12,
        fontWeight: '700',
        color: '#4A2143',
        letterSpacing: 1,
    },
    previewCard: {
        backgroundColor: '#F8EFF8',
        borderRadius: 30,
        padding: 24,
        marginBottom: 20,
    },
    previewQuestion: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        lineHeight: 26,
        marginBottom: 16,
    },
    previewAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewAuthorPic: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#E6D3E6',
    },
    previewAuthorFallback: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#E6D3E6',
        backgroundColor: '#F6E8F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewAuthorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9E328A',
    },
    previewText: {
        fontSize: 15,
        color: '#665766',
        lineHeight: 24,
    },
    readMoreText: {
        fontWeight: '700',
        color: ACCENT_PINK,
    },
    previewAttachmentRow: {
        marginTop: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#F4E5F3',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    previewImageWrap: {
        marginTop: 12,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#F6E8F5',
    },
    previewImage: {
        width: '100%',
        height: 180,
    },
    previewAttachmentText: {
        color: '#7D4F79',
        fontSize: 13,
        fontWeight: '600',
    },
    attachmentsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        flexWrap: 'wrap',
        gap: 15,
    },
    attachmentItem: {
        width: '46%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    attachmentDocPreview: {
        height: 80,
        borderRadius: 12,
        backgroundColor: '#FDEEF4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachmentFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    attachmentName: {
        fontSize: 11,
        fontWeight: '600',
        color: TEXT_DARK,
        flex: 1,
        marginRight: 5,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    footerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
        marginTop: 40,
        marginBottom: 20,
    },
    editButton: {
        backgroundColor: ACCENT_PINK,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        gap: 10,
        shadowColor: ACCENT_PINK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    editButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButton: {
        padding: 10,
    },
    deleteButtonText: {
        color: TEXT_DARK,
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        width: '100%',
        height: '80%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '95%',
        height: '100%',
    },
    closeBtn: {
        position: 'absolute',
        top: -40,
        right: 20,
    },
    // Document Modal Styles
    docModalContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    docModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2E8F3',
    },
    docCloseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    docCloseText: {
        fontSize: 14,
        fontWeight: '600',
        color: ACCENT_PINK,
        marginLeft: -5,
    },
    docModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    webview: {
        flex: 1,
    },
    // Poll Display Styles
    previewPollContainer: {
        marginTop: 16,
        gap: 8,
    },
    previewPollOption: {
        height: 40,
        backgroundColor: '#E6D3E6',
        borderRadius: 10,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    previewPollFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(194, 24, 91, 0.15)',
    },
    previewPollTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    previewPollLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    previewPollPercent: {
        fontSize: 12,
        fontWeight: '700',
        color: ACCENT_PINK,
    },
    previewPollFooter: {
        fontSize: 10,
        fontWeight: '700',
        color: SECONDARY_TEXT,
        textAlign: 'center',
        marginTop: 4,
        letterSpacing: 0.5,
    },
});
