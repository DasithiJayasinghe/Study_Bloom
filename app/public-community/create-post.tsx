import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { communityService } from '@/services/communityService';

// Web-only: create a hidden file input element we can trigger programmatically
let webFileInput: HTMLInputElement | null = null;
if (typeof document !== 'undefined') {
    webFileInput = document.createElement('input');
    webFileInput.type = 'file';
    webFileInput.accept = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';
    webFileInput.style.display = 'none';
    document.body.appendChild(webFileInput);
}

const COLORS = {
    background: '#fff3ff',
    surface: '#ffffff',
    surfaceContainerHigh: '#eeddf1',
    surfaceContainerLow: '#fbecfe',
    surfaceVariant: '#e8d7ed',
    primary: '#b7004d',
    secondary: '#9720ab',
    onSurface: '#342c38',
    onSurfaceVariant: '#625865',
    outline: '#7e7381',
    gradientStart: '#D81B60',
    gradientEnd: '#9C27B0',
    error: '#b31b25',
};

const POST_TYPES = ['Question', 'Material', 'Discussion', 'Poll'];

export default function CreatePostScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ editPostId?: string; editTitle?: string; editContent?: string; editType?: string; editSubject?: string }>();
    const isEditing = !!params.editPostId;

    const [selectedType, setSelectedType] = useState(isEditing && params.editType ? params.editType.charAt(0).toUpperCase() + params.editType.slice(1) : 'Question');
    const [title, setTitle] = useState(params.editTitle || '');
    const [subject, setSubject] = useState(params.editSubject || '');
    const [description, setDescription] = useState(params.editContent || '');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [attachment, setAttachment] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const addPollOption = () => {
        setPollOptions((prev) => [...prev, '']);
    };

    const removePollOption = (index: number) => {
        if (pollOptions.length <= 2) return;
        setPollOptions((prev) => prev.filter((_, i) => i !== index));
    };

    const updatePollOption = (index: number, text: string) => {
        setPollOptions((prev) => prev.map((opt, i) => (i === index ? text : opt)));
    };

    const handleAttach = async () => {
        if (Platform.OS === 'web') {
            // On web, use a hidden <input type="file"> for reliable File objects
            if (!webFileInput) return;
            webFileInput.onchange = (e: any) => {
                const file = e.target?.files?.[0];
                if (file) {
                    setAttachment({ webFile: file, name: file.name, mimeType: file.type });
                }
                webFileInput!.value = ''; // reset so same file can be picked again
            };
            webFileInput.click();
        } else {
            try {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['image/*', 'application/pdf'],
                    copyToCacheDirectory: true,
                });
                if (!result.canceled && result.assets?.[0]) {
                    setAttachment(result.assets[0]);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to pick a document.');
                console.error('Document Picker Error:', error);
            }
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Required', 'Please add a title for your post.');
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('content', description.trim());
            formData.append('subject', subject);

            if (isEditing) {
                // Update existing post
                await communityService.updatePost(params.editPostId!, formData);
            } else {
                // Create new post
                formData.append('type', selectedType.toLowerCase());
                if (selectedType.toLowerCase() === 'poll') {
                    formData.append('pollOptions', JSON.stringify(pollOptions.filter((o) => o.trim())));
                }
                if (attachment) {
                    if (Platform.OS === 'web' && attachment.webFile) {
                        // Web: attachment.webFile is a real File object — append directly
                        formData.append('attachment', attachment.webFile, attachment.name);
                    } else if (Platform.OS !== 'web') {
                        // Native: use the {uri, name, type} shortcut
                        const uri = attachment.uri;
                        const name = uri.split('/').pop() || 'attachment';
                        const type = attachment.mimeType || 'image/jpeg';
                        formData.append('attachment', { uri, name, type } as any);
                    }
                }
                await communityService.createPost(formData);
            }
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || `Failed to ${isEditing ? 'update' : 'create'} post`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: COLORS.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isEditing ? 'Edit Post' : 'New Post'}</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + Math.max(insets.bottom, 0) }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Post Type Selector */}
                    {!isEditing && (
                        <>
                            <Text style={styles.overlineLabel}>CHOOSE POST TYPE</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.typeChips}
                            >
                                {POST_TYPES.map((type) => {
                                    const isActive = selectedType === type;
                                    return (
                                        <TouchableOpacity
                                            key={type}
                                            activeOpacity={0.7}
                                            onPress={() => setSelectedType(type)}
                                        >
                                            {isActive ? (
                                                <LinearGradient
                                                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.typeChipActive}
                                                >
                                                    <Text style={styles.typeChipActiveText}>{type}</Text>
                                                </LinearGradient>
                                            ) : (
                                                <View style={styles.typeChipInactive}>
                                                    <Text style={styles.typeChipInactiveText}>{type}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </>
                    )}

                    {/* Post Title */}
                    <Text style={styles.overlineLabel}>POST TITLE</Text>
                    <View style={styles.inputCard}>
                        <TextInput
                            style={styles.inputText}
                            placeholder="What's on your mind?"
                            placeholderTextColor={COLORS.onSurfaceVariant}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Subject */}
                    <Text style={styles.overlineLabel}>SUBJECT</Text>
                    <View style={styles.inputCard}>
                        <TextInput
                            style={styles.inputText}
                            placeholder="e.g. Data Structures"
                            placeholderTextColor={COLORS.onSurfaceVariant}
                            value={subject}
                            onChangeText={setSubject}
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.descLabelRow}>
                        <Text style={styles.overlineLabel}>DESCRIPTION</Text>
                        <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
                            <MaterialIcons name="attach-file" size={16} color={COLORS.primary} />
                            <Text style={styles.attachText}>Attach</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputCard}>
                        <TextInput
                            style={[styles.inputText, styles.descriptionInput]}
                            placeholder="Add details or context..."
                            placeholderTextColor={COLORS.onSurfaceVariant}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                    {attachment && (
                        <View style={styles.attachmentPreview}>
                            <MaterialIcons
                                name={attachment.mimeType === 'application/pdf' ? 'picture-as-pdf' : 'insert-drive-file'}
                                size={16}
                                color={COLORS.secondary}
                            />
                            <Text style={styles.attachmentName} numberOfLines={1}>
                                {attachment.name || attachment.uri?.split('/').pop() || 'Attachment'}
                            </Text>
                            <TouchableOpacity onPress={() => setAttachment(null)}>
                                <MaterialIcons name="close" size={16} color={COLORS.error} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Poll Options (shown when type is Poll) */}
                    {selectedType === 'Poll' && (
                        <View style={styles.pollSection}>
                            <View style={styles.pollHeader}>
                                <Text style={styles.pollTitle}>Poll Options</Text>
                                <TouchableOpacity style={styles.pollAddBtn} onPress={addPollOption}>
                                    <MaterialIcons name="add" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            {pollOptions.map((opt, idx) => (
                                <View key={idx} style={styles.pollOptionRow}>
                                    <TextInput
                                        style={styles.pollOptionInput}
                                        placeholder={`Option ${idx + 1}`}
                                        placeholderTextColor={COLORS.onSurfaceVariant}
                                        value={opt}
                                        onChangeText={(t) => updatePollOption(idx, t)}
                                    />
                                    {pollOptions.length > 2 && (
                                        <TouchableOpacity onPress={() => removePollOption(idx)}>
                                            <MaterialIcons name="remove-circle" size={24} color={COLORS.error} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitWrapper}
                        activeOpacity={0.8}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        <LinearGradient
                            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitBtn}
                        >
                            <Text style={styles.submitText}>
                                {submitting ? (isEditing ? 'Saving...' : 'Posting...') : (isEditing ? 'Save Changes' : 'Post to Community')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.primary,
        fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    overlineLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginTop: 16,
        marginBottom: 8,
    },
    typeChips: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    typeChipActive: {
        alignSelf: 'flex-start',
        borderRadius: 9999,
        paddingVertical: 10,
        paddingHorizontal: 22,
    },
    typeChipActiveText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    typeChipInactive: {
        backgroundColor: COLORS.surface,
        borderRadius: 9999,
        paddingVertical: 10,
        paddingHorizontal: 22,
    },
    typeChipInactiveText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    inputCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 30,
        elevation: 4,
    },
    inputText: {
        padding: 14,
        fontSize: 15,
        color: COLORS.onSurface,
    },
    subjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 14,
        paddingVertical: 14,
        paddingLeft: 14,
    },
    subjectDropdown: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        marginTop: 4,
        overflow: 'hidden',
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 30,
        elevation: 4,
    },
    subjectOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    subjectOptionActive: {
        backgroundColor: COLORS.surfaceContainerLow,
    },
    subjectOptionText: {
        fontSize: 14,
        color: COLORS.onSurface,
    },
    descLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    attachBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    attachText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 13,
    },
    descriptionInput: {
        minHeight: 130,
        textAlignVertical: 'top',
    },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.surfaceContainerLow,
        borderRadius: 12,
    },
    attachmentName: {
        flex: 1,
        fontSize: 12,
        color: COLORS.onSurface,
    },
    pollSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        shadowColor: COLORS.onSurface,
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 30,
        elevation: 4,
    },
    pollHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    pollTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.secondary,
        fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    },
    pollAddBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(183,0,77,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pollOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    pollOptionInput: {
        flex: 1,
        backgroundColor: COLORS.surfaceContainerHigh,
        borderRadius: 9999,
        height: 44,
        paddingHorizontal: 16,
        fontSize: 14,
        color: COLORS.onSurface,
    },
    submitWrapper: {
        marginTop: 24,
    },
    submitBtn: {
        borderRadius: 9999,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    },
});
