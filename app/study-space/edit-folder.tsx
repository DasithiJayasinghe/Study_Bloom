import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { studySpaceService } from '../../services/studySpaceService';

// Palette for "The Ethereal Archivist"
const SCREEN_BG = '#F7EBF9'; // Soft lavender background
const CARD_BG = '#FFFFFF';
const ACCENT_PINK = '#D81B60';
const TEXT_DARK = '#2D0C26';
const SECONDARY_TEXT = '#8E7385';
const INPUT_BG = '#FEF7FA';

const icons = ['🌸', '📚', '✨', '💜', '📌', '💻', '💡'];
const colors = ['#FFB7CE', '#E1BEE7', '#B3E5FC', '#FFCCBC', '#C8E6C9', '#D7CCC8'];

export default function EditFolderScreen() {
    const { id } = useLocalSearchParams();
    const [folderName, setFolderName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('✨');
    const [selectedColor, setSelectedColor] = useState('#FFB7CE');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (id) {
            loadFolder();
        }
    }, [id]);

    const loadFolder = async () => {
        try {
            setIsLoading(true);
            const folder = await studySpaceService.getFolder(id as string);
            setFolderName(folder.name);
            setSelectedIcon(folder.icon);
            setSelectedColor(folder.color || '#FFB7CE');
        } catch (error) {
            Alert.alert('Error', 'Failed to load folder details.');
            router.back();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!folderName.trim()) {
            Alert.alert('Missing Name', 'Please give your folder a name 📂');
            return;
        }

        try {
            setIsSaving(true);
            await studySpaceService.updateFolder(id as string, {
                name: folderName,
                icon: selectedIcon,
                color: selectedColor
            });
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to update folder. Please try again.');
            console.error('Update folder error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={ACCENT_PINK} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Edit Folder ✨</Text>
                <Text style={styles.subtitle}>Update your organization 💕</Text>

                <View style={styles.section}>
                    <Text style={styles.label}>FOLDER NAME</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter folder name..."
                        placeholderTextColor="#C4B0C0"
                        value={folderName}
                        onChangeText={setFolderName}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>SELECT ICON</Text>
                    <View style={styles.iconRow}>
                        {icons.map((icon) => (
                            <TouchableOpacity
                                key={icon}
                                style={[
                                    styles.iconCircle,
                                    { backgroundColor: selectedColor + '15' },
                                    selectedIcon === icon && styles.iconCircleSelected,
                                    selectedIcon === icon && { borderColor: selectedColor }
                                ]}
                                onPress={() => setSelectedIcon(icon)}
                            >
                                <Text style={styles.iconText}>{icon}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>FOLDER COLOR</Text>
                    <View style={styles.colorRow}>
                        {colors.map((color) => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorOutline,
                                    selectedColor === color && { borderColor: color }
                                ]}
                                onPress={() => setSelectedColor(color)}
                            >
                                <View style={[styles.colorCircle, { backgroundColor: color }]} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

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

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={isSaving}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SCREEN_BG,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: CARD_BG,
        width: '100%',
        borderRadius: 50,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: TEXT_DARK,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: SECONDARY_TEXT,
        marginTop: 5,
        marginBottom: 30,
        textAlign: 'center',
    },
    section: {
        width: '100%',
        marginBottom: 25,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        color: '#BDBDBD',
        letterSpacing: 1,
        marginBottom: 10,
    },
    input: {
        backgroundColor: INPUT_BG,
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 15,
        fontSize: 16,
        color: TEXT_DARK,
    },
    iconRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 5,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF5F8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircleSelected: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#FFF0F5',
    },
    iconText: {
        fontSize: 20,
    },
    colorRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    colorOutline: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    saveButton: {
        backgroundColor: ACCENT_PINK,
        width: '100%',
        borderRadius: 30,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: ACCENT_PINK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        marginTop: 20,
    },
    cancelButtonText: {
        color: TEXT_DARK,
        fontSize: 16,
        fontWeight: '600',
    },
});
