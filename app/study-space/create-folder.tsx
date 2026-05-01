import React, { useState } from 'react';
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
import { router } from 'expo-router';
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

export default function CreateFolderScreen() {
    const [folderName, setFolderName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('✨');
    const [selectedColor, setSelectedColor] = useState('#FFB7CE');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!folderName.trim()) {
            Alert.alert('Missing Name', 'Please give your folder a name 📂');
            return;
        }

        try {
            setIsCreating(true);
            await studySpaceService.createFolder({
                name: folderName,
                icon: selectedIcon,
                color: selectedColor
            });
            router.back();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create folder. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Create New Folder ✨</Text>
                <Text style={styles.subtitle}>Organize your study gems 💕</Text>

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
                    style={[styles.createButton, isCreating && { opacity: 0.7 }]}
                    onPress={handleCreate}
                    disabled={isCreating}
                >
                    {isCreating ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.createButtonText}>Create Folder 💖</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={isCreating}
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
    createButton: {
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
    createButtonText: {
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
