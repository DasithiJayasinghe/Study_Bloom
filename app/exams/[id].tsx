import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { StudyBloomColors } from '@/constants/theme';
import { useExams } from '@/contexts/ExamContext';
import { Exam, PRIORITY_COLORS, FileAttachment } from '@/services/examTypes';
import { examService } from '@/services/examService';

const { width, height } = Dimensions.get('window');

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric' 
  });
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedExam, fetchExam, deleteExam, updateProgress, uploadFile, deleteFile, isLoading } = useExams();

  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPast: boolean; totalMs: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchExam(id);
      }
    }, [id])
  );

  useEffect(() => {
    if (!selectedExam) return;

    const updateCountdown = () => {
      const newCountdown = examService.getCountdown(selectedExam.date, selectedExam.time);
      setCountdown(newCountdown);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedExam]);

  const handleEdit = () => {
    router.push(`/exams/edit/${id}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Exam',
      'Are you sure you want to delete this exam? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExam(id!);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete exam');
            }
          },
        },
      ]
    );
  };

  const handleProgressChange = async (newProgress: number) => {
    try {
      await updateProgress(id!, Math.min(100, Math.max(0, newProgress)));
    } catch (error) {
      Alert.alert('Error', 'Failed to update progress');
    }
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);
      
      await uploadFile(id!, file.uri, file.name, file.mimeType || 'application/octet-stream');
      Alert.alert('Success', 'File uploaded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = (filename: string) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(id!, filename);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete file');
            }
          },
        },
      ]
    );
  };

  const handlePreviewFile = async (file: FileAttachment) => {
    try {
      setDownloadingFile(file.filename);
      
      const url = examService.getFileUrl(id!, file.filename);
      const token = await examService.getAuthToken();
      
      if (!token) {
        Alert.alert('Error', 'Please login again to view files.');
        return;
      }
      
      // Add token as query parameter for browser access
      const urlWithToken = `${url}?token=${encodeURIComponent(token)}`;
      
      console.log('Attempting to open file:', file.originalName, 'Type:', file.mimeType);
      
      if (file.mimeType.startsWith('image/')) {
        // For images, download and show in modal
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_${file.originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const cacheDir = Paths.cache;
        const destinationFile = new ExpoFile(cacheDir, safeFileName);
        
        try {
          if (destinationFile.exists) {
            destinationFile.delete();
          }
        } catch (e) {
          // Ignore deletion errors
        }
        
        const downloadedFile = await ExpoFile.downloadFileAsync(urlWithToken, destinationFile, {
          idempotent: true,
        });
        
        if (!downloadedFile.exists) {
          throw new Error('Failed to download image');
        }
        
        setPreviewFile(file);
        setPreviewUrl(downloadedFile.uri);
      } else {
        // For PDFs and other documents, open directly in browser
        // This will use the device's built-in PDF viewer or download handler
        const result = await WebBrowser.openBrowserAsync(urlWithToken, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
        console.log('WebBrowser result:', result);
      }
    } catch (error: any) {
      console.error('Preview file error:', error);
      const message = error.message || 'Failed to open file. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setDownloadingFile(null);
    }
  };
  
  // Download file to device and open with native app
  const handleDownloadAndOpen = async (file: FileAttachment) => {
    try {
      setDownloadingFile(file.filename);
      
      const url = examService.getFileUrl(id!, file.filename);
      const token = await examService.getAuthToken();
      
      if (!token) {
        Alert.alert('Error', 'Please login again to download files.');
        return;
      }
      
      const urlWithToken = `${url}?token=${encodeURIComponent(token)}`;
      
      // Download to cache
      const timestamp = Date.now();
      const safeFileName = `${timestamp}_${file.originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const cacheDir = Paths.cache;
      const destinationFile = new ExpoFile(cacheDir, safeFileName);
      
      const downloadedFile = await ExpoFile.downloadFileAsync(urlWithToken, destinationFile, {
        idempotent: true,
      });
      
      if (!downloadedFile.exists) {
        throw new Error('Failed to download file');
      }
      
      // Try to open with Linking first
      const canOpen = await Linking.canOpenURL(downloadedFile.uri);
      if (canOpen) {
        await Linking.openURL(downloadedFile.uri);
      } else {
        // Fallback to share for saving
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadedFile.uri, {
            mimeType: file.mimeType,
            dialogTitle: `Save ${file.originalName}`,
          });
        } else {
          Alert.alert('Downloaded', 'File saved to app cache.');
        }
      }
    } catch (error: any) {
      console.error('Download file error:', error);
      Alert.alert('Error', 'Failed to download file. Please try again.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl('');
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'document-text';
    if (mimeType.includes('word')) return 'document';
    return 'document-outline';
  };

  if (isLoading && !selectedExam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={StudyBloomColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedExam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={StudyBloomColors.error} />
          <Text style={styles.errorText}>Exam not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor = PRIORITY_COLORS[selectedExam.priority];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Countdown Card */}
        <View style={styles.countdownCard}>
          <LinearGradient
            colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.countdownGradient}
          >
            {countdown ? (
              <>
                <Text style={styles.countdownLabel}>
                  {countdown.isPast ? 'Exam Completed' : 'Time until exam'}
                </Text>
                {!countdown.isPast && (
                  <View style={styles.countdownGrid}>
                    <View style={styles.countdownItem}>
                      <Text style={styles.countdownNumber}>{countdown.days}</Text>
                      <Text style={styles.countdownUnit}>Days</Text>
                    </View>
                    <View style={styles.countdownItem}>
                      <Text style={styles.countdownNumber}>{countdown.hours}</Text>
                      <Text style={styles.countdownUnit}>Hours</Text>
                    </View>
                    <View style={styles.countdownItem}>
                      <Text style={styles.countdownNumber}>{countdown.minutes}</Text>
                      <Text style={styles.countdownUnit}>Min</Text>
                    </View>
                    <View style={styles.countdownItem}>
                      <Text style={styles.countdownNumber}>{countdown.seconds}</Text>
                      <Text style={styles.countdownUnit}>Sec</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noDateContainer}>
                <Ionicons name="calendar-outline" size={32} color="#FFF" />
                <Text style={styles.countdownLabel}>Date Not Set</Text>
                <Text style={styles.noDateText}>Edit this exam to set a date and time</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Subject & Priority */}
        <View style={styles.headerSection}>
          <View style={styles.subjectRow}>
            <Text style={styles.subject}>{selectedExam.subject}</Text>
            {selectedExam.isRepeat && (
              <View style={styles.repeatTag}>
                <Ionicons name="refresh" size={14} color={StudyBloomColors.error} />
                <Text style={styles.repeatTagText}>Repeat</Text>
              </View>
            )}
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {selectedExam.priority.charAt(0).toUpperCase() + selectedExam.priority.slice(1)} Priority
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar" size={20} color={StudyBloomColors.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {selectedExam.date ? formatDate(selectedExam.date) : 'Not set'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time" size={20} color={StudyBloomColors.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {selectedExam.time ? formatTime(selectedExam.time) : 'Not set'}
              </Text>
            </View>
          </View>

          {selectedExam.location && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="location" size={20} color={StudyBloomColors.primary} />
              </View>
              <View>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{selectedExam.location}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Progress Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Study Progress</Text>
          
          <View style={styles.progressSection}>
            <View style={styles.progressBarLarge}>
              <View 
                style={[
                  styles.progressFillLarge, 
                  { width: `${selectedExam.progress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>{selectedExam.progress}%</Text>
          </View>

          <View style={styles.progressButtons}>
            <TouchableOpacity 
              style={styles.progressBtn}
              onPress={() => handleProgressChange(selectedExam.progress - 10)}
            >
              <Ionicons name="remove" size={20} color={StudyBloomColors.primary} />
            </TouchableOpacity>
            
            {[0, 25, 50, 75, 100].map(value => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickProgressBtn,
                  selectedExam.progress === value && styles.quickProgressBtnActive
                ]}
                onPress={() => handleProgressChange(value)}
              >
                <Text style={[
                  styles.quickProgressText,
                  selectedExam.progress === value && styles.quickProgressTextActive
                ]}>
                  {value}%
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={styles.progressBtn}
              onPress={() => handleProgressChange(selectedExam.progress + 10)}
            >
              <Ionicons name="add" size={20} color={StudyBloomColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          {selectedExam.notes ? (
            <Text style={styles.notesText}>{selectedExam.notes}</Text>
          ) : (
            <Text style={styles.emptyNotes}>No notes added yet. Tap edit to add notes.</Text>
          )}
        </View>

        {/* Files Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Attachments</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={handleUploadFile}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={StudyBloomColors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color={StudyBloomColors.primary} />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {selectedExam.fileAttachments.length > 0 ? (
            <View style={styles.filesList}>
              {selectedExam.fileAttachments.map((file, index) => (
                <View key={index} style={styles.fileItem}>
                  <TouchableOpacity 
                    style={styles.fileInfo}
                    onPress={() => handlePreviewFile(file)}
                    disabled={downloadingFile === file.filename}
                  >
                    <View style={styles.fileIconWrap}>
                      {downloadingFile === file.filename ? (
                        <ActivityIndicator size="small" color={StudyBloomColors.primary} />
                      ) : (
                        <Ionicons 
                          name={getFileIcon(file.mimeType) as any} 
                          size={24} 
                          color={StudyBloomColors.primary} 
                        />
                      )}
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.originalName}</Text>
                      <Text style={styles.fileSize}>
                        {downloadingFile === file.filename ? 'Opening...' : formatFileSize(file.size)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.fileActions}>
                    <TouchableOpacity 
                      style={styles.fileActionBtn}
                      onPress={() => handleDownloadAndOpen(file)}
                      disabled={downloadingFile === file.filename}
                    >
                      <Ionicons name="download-outline" size={20} color={StudyBloomColors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fileActionBtn}
                      onPress={() => handleDeleteFile(file.filename)}
                    >
                      <Ionicons name="trash-outline" size={20} color={StudyBloomColors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyFiles}>
              <Ionicons name="folder-open-outline" size={40} color={StudyBloomColors.lightGray} />
              <Text style={styles.emptyFilesText}>No files attached</Text>
              <Text style={styles.emptyFilesHint}>
                Upload lecture notes, syllabus, or past papers
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="pencil" size={20} color="#FFF" />
            <Text style={styles.editButtonText}>Edit Exam</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color={StudyBloomColors.error} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewFile}
        transparent
        animationType="fade"
        onRequestClose={closePreview}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={closePreview}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>{previewFile?.originalName}</Text>
          {previewUrl && (
            <Image 
              source={{ uri: previewUrl }} 
              style={styles.previewImage}
              resizeMode="contain"
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
    backgroundColor: '#FFF5F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: StudyBloomColors.gray,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: StudyBloomColors.primary,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  countdownCard: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  countdownGradient: {
    padding: 24,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  countdownItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 70,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  countdownUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  noDateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  noDateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  subject: {
    fontSize: 28,
    fontWeight: '800',
    color: StudyBloomColors.black,
  },
  repeatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: StudyBloomColors.error + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  repeatTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: StudyBloomColors.error,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: StudyBloomColors.tertiary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: StudyBloomColors.gray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBarLarge: {
    height: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillLarge: {
    height: '100%',
    backgroundColor: StudyBloomColors.primary,
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: StudyBloomColors.primary,
    textAlign: 'center',
  },
  progressButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  progressBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: StudyBloomColors.tertiary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickProgressBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  quickProgressBtnActive: {
    backgroundColor: StudyBloomColors.primary,
  },
  quickProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: StudyBloomColors.gray,
  },
  quickProgressTextActive: {
    color: '#FFF',
  },
  notesText: {
    fontSize: 15,
    color: StudyBloomColors.black,
    lineHeight: 22,
  },
  emptyNotes: {
    fontSize: 14,
    color: StudyBloomColors.gray,
    fontStyle: 'italic',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudyBloomColors.tertiary + '20',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.primary,
  },
  filesList: {
    gap: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 10,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: StudyBloomColors.tertiary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  fileSize: {
    fontSize: 12,
    color: StudyBloomColors.gray,
    marginTop: 2,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileActionBtn: {
    padding: 8,
  },
  fileDeleteBtn: {
    padding: 8,
  },
  emptyFiles: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyFilesText: {
    fontSize: 15,
    fontWeight: '600',
    color: StudyBloomColors.gray,
    marginTop: 8,
  },
  emptyFilesHint: {
    fontSize: 13,
    color: StudyBloomColors.lightGray,
    marginTop: 4,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: StudyBloomColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: StudyBloomColors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewTitle: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 70,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: width - 32,
    height: height * 0.7,
  },
});
