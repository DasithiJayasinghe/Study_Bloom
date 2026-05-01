import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
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
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { studySpaceService, Folder } from '../../services/studySpaceService';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Exact Palette from Screenshot
const SCREEN_BG = '#FEF7FA';
const BANNER_BG = '#FFDDF4';
const INPUT_BG = '#F2E8F3';
const ACCENT_PINK = '#D12061';
const BUTTON_CANCEL = '#EDE3F0';
const TEXT_DARK = '#402D3A';
const SECONDARY_TEXT = '#8E7385';

export default function AddStudyGemScreen() {
    const { profileImage } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [attachments, setAttachments] = useState<any[]>([]);

    useFocusEffect(
        React.useCallback(() => {
            const fetchFolders = async () => {
                try {
                    const fetchedFolders = await studySpaceService.getFolders();
                    
                    setFolders(prevFolders => {
                        // If a new folder was added (length increased), find and select it
                        if (prevFolders.length > 0 && fetchedFolders.length > prevFolders.length) {
                            const newFolder = fetchedFolders.find(f => !prevFolders.some(old => old._id === f._id));
                            if (newFolder) {
                                setSelectedFolder(newFolder);
                            }
                        } 
                        // Initial load: select first folder if none selected
                        else if (prevFolders.length === 0 && fetchedFolders.length > 0) {
                            setSelectedFolder(fetchedFolders[0]);
                        }
                        return fetchedFolders;
                    });
                } catch (error) {
                    console.error('Error fetching folders:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchFolders();
        }, [])
    );

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
            Alert.alert('Error', 'Failed to pick a document. Please try again.');
        }
    };

    const handleRemoveAttachment = (uri: string) => {
        setAttachments(prev => prev.filter(item => item.uri !== uri));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Missing Title', 'Please give your study gem a name ✨');
            return;
        }
        if (!selectedFolder) {
            Alert.alert('Missing Folder', 'Please select a folder to save your gem in 📂');
            return;
        }

        try {
            setIsSaving(true);
            await studySpaceService.createStudyGem({
                title,
                description,
                notes,
                folderId: selectedFolder._id,
                type: 'manual',
                tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
                attachments: attachments.map(a => ({
                    name: a.name,
                    url: a.uri,
                    fileType: a.mimeType || 'application/octet-stream'
                }))
            });
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save your study gem. Please try again.';
            Alert.alert('Error', message);
            console.error('Save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: SCREEN_BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
            {/* Header */}
                    <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={ACCENT_PINK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Study Gem ✨</Text>
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
                {/* Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerIconContainer}>
                        <MaterialIcons name="auto-awesome" size={20} color={ACCENT_PINK} />
                    </View>
                    <Text style={styles.bannerText}>Create your own little study gem 💕</Text>
                </View>

                {/* Form Fields */}
                <View style={styles.formSection}>
                    <Text style={styles.label}>ENTRY TITLE</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Name your study gem..."
                        placeholderTextColor={SECONDARY_TEXT}
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Add a brief description..."
                        placeholderTextColor={SECONDARY_TEXT}
                        value={description}
                        onChangeText={setDescription}
                    />

                    <Text style={styles.label}>ARCHIVIST NOTES</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Write your personal notes..."
                        placeholderTextColor={SECONDARY_TEXT}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                    />

                    <Text style={styles.label}>SAVE TO FOLDER</Text>
                    <View style={styles.folderContainer}>
                        <TouchableOpacity
                            style={styles.folderDropdown}
                            onPress={() => setShowDropdown(!showDropdown)}
                        >
                            <Text style={styles.folderText}>
                                {selectedFolder ? `${selectedFolder.icon} ${selectedFolder.name}` : 'Select Folder...'}
                            </Text>
                            <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={TEXT_DARK} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.newFolderButton} onPress={() => router.push('/study-space/create-folder')}>
                            <Text style={styles.newFolderText}>+ New</Text>
                        </TouchableOpacity>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <View style={styles.dropdownMenu}>
                                {isLoading ? (
                                    <ActivityIndicator color={ACCENT_PINK} style={{ padding: 20 }} />
                                ) : folders.length === 0 ? (
                                    <Text style={{ textAlign: 'center', padding: 15, color: SECONDARY_TEXT }}>No folders found</Text>
                                ) : (
                                    folders.map((folder) => (
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
                                    ))
                                )}
                            </View>
                        )}
                    </View>

                    <Text style={styles.label}>TAGS</Text>
                    <View style={styles.tagInputContainer}>
                        <Ionicons name="pricetag" size={18} color={SECONDARY_TEXT} style={styles.tagIcon} />
                        <TextInput
                            style={styles.tagInput}
                            placeholder="Add tags (e.g., algorithms, recursion)"
                            placeholderTextColor={SECONDARY_TEXT}
                            value={tags}
                            onChangeText={setTags}
                        />
                    </View>
                </View>

                {/* Attachments Section */}
                <View style={styles.attachmentSection}>
                    <View style={styles.attachmentHeader}>
                        <View style={styles.headerLabelRow}>
                            <Text style={styles.label}>ADD ATTACHMENTS 🖇️</Text>
                        </View>
                        <View style={styles.usedBadge}>
                            <Text style={styles.usedText}>{attachments.length}/5 USED</Text>
                        </View>
                    </View>

                    <View style={styles.attachmentGrid}>
                        {/* Upload Button */}
                        <TouchableOpacity 
                            style={styles.uploadCard} 
                            onPress={handlePickDocument}
                            activeOpacity={0.7}
                        >
                            <View style={styles.uploadIconCircle}>
                                <Ionicons name="cloud-upload" size={24} color={SECONDARY_TEXT} />
                            </View>
                            <Text style={styles.uploadText}>UPLOAD FILE</Text>
                        </TouchableOpacity>

                        {/* Attachment Items */}
                        {attachments.map((item, index) => {
                            const isImage = item.mimeType?.startsWith('image/') || item.name.match(/\.(jpg|jpeg|png|gif)$/i);
                            return (
                                <View key={item.uri + index} style={styles.attachmentCard}>
                                    <View style={[styles.previewArea, !isImage && { backgroundColor: '#F8E7F3' }]}>
                                        {isImage ? (
                                            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                                        ) : (
                                            <MaterialIcons name="insert-drive-file" size={32} color={ACCENT_PINK} />
                                        )}
                                    </View>
                                    <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                                    
                                    <TouchableOpacity 
                                        style={styles.deleteBadge}
                                        onPress={() => handleRemoveAttachment(item.uri)}
                                    >
                                        <Ionicons name="close" size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Gem 💖</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginTop: Platform.OS === 'android' ? 30 : 0,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F7EBF5',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: ACCENT_PINK,
        letterSpacing: 0.5,
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
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BANNER_BG,
        padding: 20,
        borderRadius: 25,
        marginBottom: 30,
        marginTop: 10,
    },
    bannerIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    bannerText: {
        color: '#4A2143',
        fontWeight: '600',
        fontSize: 15,
        flex: 1,
    },
    formSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: TEXT_DARK,
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: INPUT_BG,
        borderRadius: 18,
        padding: 16,
        fontSize: 14,
        color: TEXT_DARK,
        marginBottom: 20,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    folderContainer: {
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
    newFolderButton: {
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
    tagInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: INPUT_BG,
        borderRadius: 18,
        paddingHorizontal: 16,
    },
    tagIcon: {
        marginRight: 10,
    },
    tagInput: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 14,
        color: TEXT_DARK,
    },
    // New Attachment Styles
    attachmentSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    attachmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    usedBadge: {
        backgroundColor: BANNER_BG,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    usedText: {
        fontSize: 10,
        fontWeight: '800',
        color: ACCENT_PINK,
    },
    attachmentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    uploadCard: {
        width: (width - 55) / 2,
        height: 140,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#F1D9E7',
        borderStyle: 'dashed',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    uploadText: {
        fontSize: 12,
        fontWeight: '700',
        color: SECONDARY_TEXT,
        letterSpacing: 0.5,
    },
    attachmentCard: {
        width: (width - 55) / 2,
        height: 140,
        backgroundColor: 'white',
        borderRadius: 25,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        position: 'relative',
    },
    previewArea: {
        width: '100%',
        height: 90,
        borderRadius: 18,
        backgroundColor: '#F7F7F7',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 8,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    fileName: {
        fontSize: 10,
        fontWeight: '700',
        color: TEXT_DARK,
        width: '90%',
        textAlign: 'center',
    },
    deleteBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFCDD2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    saveButton: {
        backgroundColor: ACCENT_PINK,
        borderRadius: 25,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: ACCENT_PINK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
        marginTop: 20,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        backgroundColor: BUTTON_CANCEL,
        borderRadius: 25,
        paddingVertical: 18,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: TEXT_DARK,
        fontSize: 16,
        fontWeight: '700',
    },
});
