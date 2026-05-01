import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { folderService, FolderItem } from '../../services/folderService';
import { helpRequestService } from '../../services/helpRequestService';

const COLORS = {
  primary: '#D81B60',
  secondary: '#9C27B0',
  tertiary: '#FF80AB',
  background: '#F3E5F5',
  white: '#FFFFFF',
  text: '#211826',
  muted: '#7A6A78',
  border: '#E8D8E8',
  inputBg: '#F0CFF2',
  softCard: '#FAF6FA',
  danger: '#D81B60',
  placeholder: '#B795B9',
};

type ValidationErrors = {
  subject?: string;
  questionTitle?: string;
  questionDetails?: string;
};

type SelectedAttachment = {
  uri: string;
  name: string;
  type: string;
};

export default function CreateHelpRequestScreen() {
  const [subject, setSubject] = useState('');
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionDetails, setQuestionDetails] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [folderLoading, setFolderLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const data = await folderService.getMyFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Folder Error', error.message || 'Failed to load folders');
    } finally {
      setFolderLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFolderLoading(true);
      loadFolders();
    }, [loadFolders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFolders();
  }, [loadFolders]);

  const validateForm = () => {
    const newErrors: ValidationErrors = {};

    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!questionTitle.trim()) {
      newErrors.questionTitle = 'Question title is required';
    }

    if (!questionDetails.trim()) {
      newErrors.questionDetails = 'Question details are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const requestMediaPermission = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow gallery access to upload attachments.'
      );
      return false;
    }

    return true;
  };

  const handlePickImage = async () => {
    const granted = await requestMediaPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (result.canceled) return;

    const pickedFiles: SelectedAttachment[] = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName || `attachment-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }));

    setAttachments((prev) => [...prev, ...pickedFiles].slice(0, 5));
  };

  const handlePickScreenshot = async () => {
    await handlePickImage();
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('questionTitle', questionTitle.trim());
      formData.append('questionDetails', questionDetails.trim());
      formData.append('isUrgent', String(isUrgent));

      if (selectedFolder) {
        formData.append('folder', selectedFolder);
      }

      attachments.forEach((file, index) => {
        formData.append('attachments', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      });

      await helpRequestService.createHelpRequest(formData);

      Alert.alert('Success', 'Help request created successfully', [
        {
          text: 'OK',
          onPress: () => router.replace('/help-request' as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Submit Error', error.message || 'Failed to create help request');
    } finally {
      setSubmitting(false);
    }

    let folderId = selectedFolder;

    if (!folderId) {
      const folders = await folderService.getMyFolders();
      let defaultFolder = folders.find(f => f.name === 'New Folder');

    if (!defaultFolder) {
      defaultFolder = await folderService.createFolder('New Folder');
    }

    folderId = defaultFolder._id;
   }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>New Help Request</Text>

          <TouchableOpacity style={styles.iconButton} activeOpacity={0.85}>
            <Ionicons name="time-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.topLabel}>GET SUPPORT</Text>
        <Text style={styles.bigTitle}>What do you need help with?</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
            }}
            placeholder="Enter subject (Coding, Maths, Science...)"
            placeholderTextColor={COLORS.placeholder}
            style={[styles.input, errors.subject && styles.inputError]}
          />
          {errors.subject ? <Text style={styles.errorText}>{errors.subject}</Text> : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Question Title</Text>
          <TextInput
            value={questionTitle}
            onChangeText={(text) => {
              setQuestionTitle(text);
              if (errors.questionTitle) {
                setErrors((prev) => ({ ...prev, questionTitle: undefined }));
              }
            }}
            placeholder="Enter a short, descriptive title..."
            placeholderTextColor={COLORS.placeholder}
            style={[styles.input, errors.questionTitle && styles.inputError]}
          />
          {errors.questionTitle ? (
            <Text style={styles.errorText}>{errors.questionTitle}</Text>
          ) : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Question Details</Text>
          <TextInput
            value={questionDetails}
            onChangeText={(text) => {
              setQuestionDetails(text);
              if (errors.questionDetails) {
                setErrors((prev) => ({ ...prev, questionDetails: undefined }));
              }
            }}
            placeholder="Type your question here..."
            placeholderTextColor={COLORS.placeholder}
            multiline
            textAlignVertical="top"
            style={[styles.textArea, errors.questionDetails && styles.inputError]}
          />
          {errors.questionDetails ? (
            <Text style={styles.errorText}>{errors.questionDetails}</Text>
          ) : null}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Attachments</Text>

          <View style={styles.attachmentRow}>
            <TouchableOpacity style={styles.attachmentBox} onPress={handlePickImage}>
              <Ionicons name="cloud-upload-outline" size={28} color={COLORS.primary} />
              <Text style={styles.attachmentBoxText}>UPLOAD</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachmentBox} onPress={handlePickScreenshot}>
              <Ionicons name="scan-outline" size={28} color={COLORS.primary} />
              <Text style={styles.attachmentBoxText}>SCREEN</Text>
            </TouchableOpacity>

            {attachments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {attachments.map((file, index) => (
                  <View key={`${file.uri}-${index}`} style={styles.previewWrapper}>
                    <Image source={{ uri: file.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeAttachmentBtn}
                      onPress={() => removeAttachment(index)}
                    >
                      <Ionicons name="close" size={14} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>

        <View style={styles.folderCard}>
          <View style={styles.folderHeader}>
            <Ionicons name="folder" size={18} color="#5A3D47" />
            <Text style={styles.folderHeaderText}>Add to Folder</Text>
          </View>

          {folderLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 14 }} />
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedFolder}
                onValueChange={(value) => setSelectedFolder(value)}
                style={styles.picker}
              >
                <Picker.Item label="Select a folder (optional)" value="" />
                {folders.map((folder) => (
                  <Picker.Item
                    key={folder._id}
                    label={folder.name}
                    value={folder._id}
                  />
                ))}
              </Picker>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.push('/help-request/folders' as any)}
          >
            <Text style={styles.createFolderText}>+ Create New Folder</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.urgentCard}>
          <View style={styles.urgentLeft}>
            <View style={styles.urgentIconCircle}>
              <MaterialIcons name="priority-high" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.urgentText}>Mark as Urgent</Text>
          </View>

          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: '#E4D3E8', true: '#E6B3E6' }}
            thumbColor={COLORS.white}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          disabled={submitting}
          onPress={handleSubmit}
          style={[
            styles.submitButtonWrapper,
            submitting && { opacity: 0.7 },
          ]}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitButton}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Send Request</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topLabel: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  bigTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 42,
    marginBottom: 28,
  },
  formGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A2D37',
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 36,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 170,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: COLORS.danger,
  },
  errorText: {
    marginTop: 8,
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentBox: {
    width: 96,
    height: 116,
    borderRadius: 24,
    backgroundColor: '#F7EDF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  attachmentBoxText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 112,
    height: 112,
    borderRadius: 24,
  },
  removeAttachmentBtn: {
    position: 'absolute',
    right: -8,
    top: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderCard: {
    marginTop: 8,
    marginBottom: 22,
    backgroundColor: COLORS.softCard,
    borderRadius: 30,
    padding: 20,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  folderHeaderText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#4A2D37',
  },
  pickerWrapper: {
    backgroundColor: '#EDD3F2',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
  },
  picker: {
    color: COLORS.text,
  },
  createFolderText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  urgentCard: {
    backgroundColor: COLORS.softCard,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  urgentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F6D7E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  urgentText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  submitButtonWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
    marginBottom: 18,
  },
  submitButton: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#E5BBC6',
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#4A2D37',
    fontSize: 17,
    fontWeight: '600',
  },
});