import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    SafeAreaView,
    Platform,
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { studySpaceService, StudyGem, Folder } from '../../services/studySpaceService';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Palette for "The Ethereal Archivist"
const SCREEN_BG = '#FFF8FB';
const INPUT_BG = '#F5EBF5';
const ACCENT_PINK = '#C2185B';
const TEXT_DARK = '#2D0C26';
const SECONDARY_TEXT = '#8E7385';

export default function EditStudyGemScreen() {
    const { profileImage } = useAuth();
    const { id } = useLocalSearchParams();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);

    useEffect(() => {
        if (id && typeof id === 'string') {
            loadData(id);
        }
    }, [id]);

    useFocusEffect(
        useCallback(() => {
            const fetchFolders = async () => {
                try {
                    const fetchedFolders = await studySpaceService.getFolders();
                    setFolders(fetchedFolders);
                } catch (error) {
                    console.error('Failed to refresh folders:', error);
                }
            };
            
            // Wait for initial load to finish to avoid double flashing
            if (!isLoading) {
                fetchFolders();
            }
        }, [isLoading])
    );

    const loadData = async (gemId: string) => {
        try {
            setIsLoading(true);
            const [fetchedGem, fetchedFolders] = await Promise.all([
                studySpaceService.getStudyGem(gemId),
                studySpaceService.getFolders()
            ]);

            setFolders(fetchedFolders);
            setTitle(fetchedGem.title);
            setDescription(fetchedGem.description || '');
            setNotes(fetchedGem.notes || '');
            setTags(fetchedGem.tags.join(', '));
            setAttachments(fetchedGem.attachments || []);

            const currentFolderId = typeof fetchedGem.folder === 'string'
                ? fetchedGem.folder
                : fetchedGem.folder?._id;

            const currentFolder = fetchedFolders.find(f => f._id === currentFolderId);
            if (currentFolder) setSelectedFolder(currentFolder);

        } catch (error) {
            console.error('Error loading edit data:', error);
            Alert.alert('Error', 'Failed to load study gem data.');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickDocument = async () => {
        if (attachments.length >= 5) {
            Alert.alert('Limit Reached', 'You can only add up to 5 attachments ✨');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: false
            });

            if (!result.canceled) {
                const newFile = result.assets[0];
                setAttachments([...attachments, newFile]);
            }
        } catch (error) {
            console.error('Pick document error:', error);
            Alert.alert('Error', 'Failed to pick document.');
        }
    };

    const handleRemoveAttachment = (uriOrUrl: string) => {
        setAttachments(prev => prev.filter(item => (item.uri || item.url) !== uriOrUrl));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Missing Title', 'Please enter a name for your study gem ✨');
            return;
        }

        try {
            setIsSaving(true);
            await studySpaceService.updateStudyGem(id as string, {
                title,
                description,
                notes,
                folderId: selectedFolder?._id,
                ...( { folder: selectedFolder?._id } as any ),
                tags: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
                attachments: attachments.map(a => ({
                    name: a.name,
                    url: a.uri || a.url,
                    fileType: a.mimeType || a.fileType || 'application/octet-stream'
                }))
            });
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to update study gem.');
            console.error('Update error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={ACCENT_PINK} />
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: SCREEN_BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={ACCENT_PINK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Study Gem ✏️</Text>
                <Image
                    source={profileImage ? { uri: profileImage } : require('../../assets/images/icon.png')}
                    style={styles.profilePic}
                />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={() => {
                    if (showDropdown) setShowDropdown(false);
                }}
                scrollEventThrottle={16}
            >
                {/* Form Fields */}
                <View style={styles.formSection}>
                    <Text style={styles.inputLabel}>ENTRY TITLE</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter title..."
                        placeholderTextColor={SECONDARY_TEXT}
                    />

                    <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
                    <TextInput
                        style={styles.input}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Add a brief description..."
                        placeholderTextColor={SECONDARY_TEXT}
                    />

                    <Text style={styles.inputLabel}>ARCHIVIST NOTES</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={4}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add your personal notes..."
                        placeholderTextColor={SECONDARY_TEXT}
                    />
                </View>

                {/* Folder Selection */}
                <Text style={styles.inputLabel}>SAVE TO FOLDER</Text>
                <View style={styles.folderRow}>
                    <TouchableOpacity
                        style={styles.folderDropdown}
                        onPress={() => setShowDropdown(!showDropdown)}
                    >
                        <Text style={styles.folderText}>
                            {selectedFolder ? `${selectedFolder.icon} ${selectedFolder.name}` : 'Select Folder...'}
                        </Text>
                        <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.newFolderBtn} onPress={() => router.push('/study-space/create-folder')}>
                        <Text style={styles.newFolderText}>+ New</Text>
                    </TouchableOpacity>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <View style={styles.dropdownMenu}>
                            {folders.map((folder) => (
                                <TouchableOpacity
                                    key={folder._id}
                                    style={[
                                        styles.dropdownItem,
                                        selectedFolder?._id === folder._id && styles.dropdownItemActive
                                    ]}
                                    onPress={() => {
                                        setSelectedFolder(folder);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        selectedFolder?._id === folder._id && styles.dropdownItemTextActive
                                    ]}>
                                        {folder.icon} {folder.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Tags */}
                <Text style={styles.inputLabel}>TAGS</Text>
                <TextInput
                    style={styles.input}
                    value={tags}
                    onChangeText={setTags}
                    placeholder="Add tags (e.g., algorithms, visualization)"
                    placeholderTextColor={SECONDARY_TEXT}
                />

                {/* Attachments Section - Horizontal Style */}
                <View style={styles.attachmentSection}>
                    <View style={styles.attachmentHeader}>
                        <Text style={styles.inputLabel}>ADD ATTACHMENTS 🖇️</Text>
                        <View style={styles.usedBadge}>
                            <Text style={styles.usedText}>{attachments.length}/5 USED</Text>
                        </View>
                    </View>

                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.attachmentScroll}
                        contentContainerStyle={styles.attachmentScrollContent}
                    >
                        {/* Upload Button */}
                        <TouchableOpacity style={styles.uploadCircle} onPress={handlePickDocument}>
                            <View style={styles.uploadInner}>
                                <Feather name="aperture" size={20} color={ACCENT_PINK} />
                                <Text style={styles.uploadBtnText}>UPLOAD</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Existing/New Attachments */}
                        {attachments.map((item, index) => {
                            const uri = item.uri || item.url;
                            const isImage = (item.mimeType || item.fileType)?.startsWith('image/') || item.name.match(/\.(jpg|jpeg|png|gif)$/i);
                            
                            return (
                                <View key={uri + index} style={styles.organicCard}>
                                    <View style={styles.cardPreview}>
                                        {isImage ? (
                                            <Image source={{ uri }} style={styles.thumbnail} />
                                        ) : (
                                            <View style={styles.docCard}>
                                                <Text style={styles.docText} numberOfLines={3}>
                                                    {item.name || 'Document'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.deleteOverlay}
                                        onPress={() => handleRemoveAttachment(uri)}
                                    >
                                        <Ionicons name="close" size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes 💖</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isSaving}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
        </KeyboardAvoidingView>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginTop: Platform.OS === 'android' ? 30 : 0,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    profilePic: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formSection: {
        marginTop: 10,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#8D6E63',
        letterSpacing: 0.5,
        marginBottom: 10,
        marginTop: 20,
    },
    input: {
        backgroundColor: INPUT_BG,
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 15,
        fontSize: 15,
        color: TEXT_DARK,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 15,
        borderRadius: 35,
        backgroundColor: '#FDEEFB',
    },
    folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
        zIndex: 1000,
    },
    folderDropdown: {
        flex: 1,
        backgroundColor: INPUT_BG,
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: 12,
    },
    dropdownMenu: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 80, // Accounts for newFolderButton
        backgroundColor: 'white', // Bright background for contrast
        borderRadius: 18,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 1001,
    },
    dropdownItem: {
        padding: 14,
        borderRadius: 12,
    },
    dropdownItemActive: {
        backgroundColor: '#FBF2FB',
    },
    dropdownItemText: {
        fontSize: 14,
        color: TEXT_DARK,
        fontWeight: '500',
    },
    dropdownItemTextActive: {
        color: ACCENT_PINK,
        fontWeight: '700',
    },
    folderText: {
        color: TEXT_DARK,
        fontSize: 14,
        fontWeight: '500',
    },
    newFolderBtn: {
        borderWidth: 1,
        borderColor: '#F1D9E7',
        borderStyle: 'dashed',
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    newFolderText: {
        color: SECONDARY_TEXT,
        fontSize: 14,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: ACCENT_PINK,
        borderRadius: 30,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: ACCENT_PINK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 40,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        backgroundColor: '#EFE3F2',
        borderRadius: 30,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 15,
    },
    cancelButtonText: {
        color: '#9C27B0',
        fontSize: 16,
        fontWeight: '700',
    },
    // Horizontal Attachment Styles
    attachmentSection: {
        marginVertical: 10,
    },
    attachmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    usedBadge: {
        backgroundColor: '#FFDDF4',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
        marginTop: 10,
    },
    usedText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#D12061',
    },
    attachmentScroll: {
        marginTop: 15,
        overflow: 'visible',
    },
    attachmentScrollContent: {
        gap: 15,
        paddingRight: 10,
    },
    uploadCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: '#F1D9E7',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadInner: {
        alignItems: 'center',
    },
    uploadBtnText: {
        fontSize: 8,
        fontWeight: '800',
        color: TEXT_DARK,
        marginTop: 4,
    },
    organicCard: {
        width: 100,
        height: 100,
        position: 'relative',
    },
    cardPreview: {
        width: 100,
        height: 100,
        borderRadius: 40,
        backgroundColor: '#FDEEFB',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    docCard: {
        padding: 12,
        alignItems: 'center',
    },
    docText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#D12061',
        textAlign: 'center',
        lineHeight: 14,
    },
    deleteOverlay: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white',
    },
});
