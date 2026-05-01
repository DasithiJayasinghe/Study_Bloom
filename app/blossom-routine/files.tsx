import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type BlossomLibraryFile,
  type LibraryCategory,
  useBlossomFiles,
} from '@/contexts/BlossomFilesContext';
import { BlossomRoutineShell } from '@/components/blossom-routine/BlossomRoutineShell';
import { StudyBloomColors } from '@/constants/theme';

/** Mockup pink: CTA text, dashed border, Habit tags, pressed tint */
const FILE_ACCENT_PINK = '#E91E63';

const PURPLE = '#5E35B1';

const UPLOAD_CONTEXTS = [
  { id: 'habit', label: 'Habit — workout / meal plan', icon: 'leaf' as const },
  { id: 'goal', label: 'Goal — exam / project files', icon: 'flag' as const },
  { id: 'mood', label: 'Mood — journal attachments', icon: 'heart' as const },
];

type LibFilter = 'all' | LibraryCategory;

const LIB_FILTERS: { key: LibFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'goals', label: 'Goals' },
  { key: 'habits', label: 'Habits' },
  { key: 'mood', label: 'Mood' },
];

function contextIdToCategory(id: string): LibraryCategory {
  if (id === 'habit') return 'habits';
  if (id === 'goal') return 'goals';
  return 'mood';
}

/** Android: hand off to the system PDF viewer. iOS uses in-app WebView so Apple Books is not used. */
async function openPdfInSystemViewer(uri: string): Promise<void> {
  const contentUri = await FileSystem.getContentUriAsync(uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/pdf',
  });
}

/** iOS WKWebView needs read access to the file’s folder for local `file://` PDFs. */
function iosPdfAllowingReadAccessURL(fileUri: string): string {
  const path = fileUri.split('?')[0];
  const last = path.lastIndexOf('/');
  if (last <= 0) return path;
  return path.slice(0, last);
}

export default function BlossomFilesScreen() {
  const insets = useSafeAreaInsets();
  const { library, addLibraryFile, removeLibraryFile } = useBlossomFiles();
  const [uploadContext, setUploadContext] = useState(UPLOAD_CONTEXTS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [libFilter, setLibFilter] = useState<LibFilter>('all');
  const [imagePreview, setImagePreview] = useState<{ uri: string; name: string } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ uri: string; name: string } | null>(null);

  const uploadCategory = useMemo(() => contextIdToCategory(uploadContext.id), [uploadContext.id]);

  const visibleLibrary = useMemo(() => {
    if (libFilter === 'all') return library;
    return library.filter((f) => f.filter === libFilter);
  }, [library, libFilter]);

  const openFile = useCallback(async (row: BlossomLibraryFile) => {
    if (!row.uri) {
      Alert.alert(
        'Sample file',
        'This placeholder has no file on your device. Upload a PDF or image to preview it here.'
      );
      return;
    }
    if (row.kind === 'image') {
      setImagePreview({ uri: row.uri, name: row.name });
      return;
    }
    if (Platform.OS === 'ios') {
      setPdfPreview({ uri: row.uri, name: row.name });
      return;
    }
    try {
      await openPdfInSystemViewer(row.uri);
    } catch {
      Alert.alert('Could not open PDF', 'Pick the file again or install a PDF viewer app.');
    }
  }, []);

  const confirmDelete = useCallback(
    (row: BlossomLibraryFile) => {
      Alert.alert('Remove file?', `"${row.name}" will be removed from your library.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeLibraryFile(row.id),
        },
      ]);
    },
    [removeLibraryFile]
  );

  const pickPdf = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const name = file.name ?? 'document.pdf';
      const uri = file.uri;
      if (!uri) {
        Alert.alert('Could not read file', 'Try another PDF.');
        return;
      }
      addLibraryFile(name, '📄', uploadCategory, uri, 'pdf');
    } catch {
      Alert.alert('Could not open files', 'Try again in a moment.');
    }
  }, [addLibraryFile, uploadCategory]);

  const pickFromGallery = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to attach images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const base =
        asset.fileName ??
        uri.split('/').pop()?.split('?')[0] ??
        `image_${Date.now()}.jpg`;
      const lower = base.toLowerCase();
      const name =
        lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')
          ? base
          : `${base}.jpg`;
      addLibraryFile(name, '🖼️', uploadCategory, uri, 'image');
    } catch {
      Alert.alert('Could not open gallery', 'Try again in a moment.');
    }
  }, [addLibraryFile, uploadCategory]);

  return (
    <BlossomRoutineShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 UPLOAD A FILE</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name={uploadContext.icon} size={20} color="#2E7D32" />
            <Text style={styles.dropdownText} numberOfLines={1}>
              {uploadContext.label}
            </Text>
            <Ionicons name="chevron-down" size={20} color={PURPLE} />
          </TouchableOpacity>

          <View style={styles.uploadZone}>
            <Text style={styles.paperclipEmoji} accessibilityLabel="">
              📎
            </Text>
            <Text style={styles.tapPink}>Tap a format below</Text>
            <Text style={styles.uploadSub}>
              PDF opens in your PDF viewer · JPG / PNG preview here. Files are saved under the category above and in
              All.
            </Text>
            <View style={styles.badgeRow}>
              <TouchableOpacity
                style={[styles.badge, styles.badgePdf]}
                onPress={pickPdf}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Choose PDF from files"
              >
                <Text style={styles.badgePdfText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.badge, styles.badgeBlue]}
                onPress={pickFromGallery}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Choose JPG from gallery"
              >
                <Text style={styles.badgeBlueText}>JPG</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.badge, styles.badgeBlue]}
                onPress={pickFromGallery}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Choose PNG from gallery"
              >
                <Text style={styles.badgeBlueText}>PNG</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📁 MY FILE LIBRARY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.libFilterRow}
          >
            {LIB_FILTERS.map((f) => {
              const on = libFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.libPill, on && styles.libPillOn]}
                  onPress={() => setLibFilter(f.key)}
                >
                  <Text style={[styles.libPillText, on && styles.libPillTextOn]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {visibleLibrary.length === 0 ? (
            <Text style={styles.empty}>No files in this category yet.</Text>
          ) : (
            visibleLibrary.map((row) => (
              <View key={row.id} style={styles.fileRow}>
                <TouchableOpacity
                  style={styles.fileRowMain}
                  onPress={() => openFile(row)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${row.name}`}
                >
                  <Text style={styles.fileEmoji}>{row.emoji}</Text>
                  <View style={styles.fileMid}>
                    <Text style={styles.fileName}>{row.name}</Text>
                    <Text style={styles.fileMeta}>{row.meta}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.habitTag}>
                  <Text style={styles.habitTagText}>{row.tag}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(row)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${row.name}`}
                >
                  <Ionicons name="trash-outline" size={22} color={FILE_ACCENT_PINK} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={pickerOpen} animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Attach to</Text>
            {UPLOAD_CONTEXTS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.modalRow}
                onPress={() => {
                  setUploadContext(c);
                  setPickerOpen(false);
                }}
              >
                <Ionicons name={c.icon} size={22} color={PURPLE} />
                <Text style={styles.modalRowText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={imagePreview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreview(null)}
      >
        <View style={styles.imagePreviewRoot}>
          <View style={[styles.imagePreviewHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.imagePreviewTitle} numberOfLines={1}>
              {imagePreview?.name}
            </Text>
            <TouchableOpacity
              style={styles.imagePreviewClose}
              onPress={() => setImagePreview(null)}
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          {imagePreview ? (
            <Image
              source={{ uri: imagePreview.uri }}
              style={styles.imagePreviewImage}
              contentFit="contain"
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={pdfPreview !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPdfPreview(null)}
      >
        <View style={styles.pdfPreviewRoot}>
          <View style={[styles.pdfPreviewHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.pdfPreviewTitle} numberOfLines={1}>
              {pdfPreview?.name}
            </Text>
            <TouchableOpacity
              style={styles.pdfPreviewClose}
              onPress={() => setPdfPreview(null)}
              accessibilityLabel="Close PDF"
            >
              <Ionicons name="close" size={28} color={StudyBloomColors.black} />
            </TouchableOpacity>
          </View>
          {pdfPreview ? (
            <WebView
              source={{ uri: pdfPreview.uri }}
              style={styles.pdfWebView}
              originWhitelist={['*']}
              allowingReadAccessToURL={iosPdfAllowingReadAccessURL(pdfPreview.uri)}
            />
          ) : null}
        </View>
      </Modal>
    </BlossomRoutineShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PURPLE,
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF9C4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: FILE_ACCENT_PINK,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  uploadZone: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: FILE_ACCENT_PINK,
    backgroundColor: '#FCE4EC',
  },
  paperclipEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  tapPink: {
    fontSize: 17,
    fontWeight: '800',
    color: FILE_ACCENT_PINK,
    textAlign: 'center',
  },
  uploadSub: {
    marginTop: 8,
    fontSize: 13,
    color: PURPLE,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgePdf: {
    backgroundColor: FILE_ACCENT_PINK,
  },
  badgePdfText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  badgeBlue: {
    backgroundColor: '#E3F2FD',
  },
  badgeBlueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1565C0',
  },
  libFilterRow: {
    gap: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  libPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: '#FFF',
  },
  libPillOn: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  libPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: PURPLE,
  },
  libPillTextOn: {
    color: '#FFF',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
    borderRadius: 16,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    marginBottom: 10,
    gap: 8,
  },
  fileRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  deleteBtn: {
    padding: 6,
  },
  fileEmoji: {
    fontSize: 28,
  },
  fileMid: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  fileMeta: {
    fontSize: 12,
    color: StudyBloomColors.gray,
    marginTop: 2,
  },
  habitTag: {
    backgroundColor: FILE_ACCENT_PINK,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  habitTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  empty: {
    textAlign: 'center',
    color: StudyBloomColors.gray,
    paddingVertical: 16,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PURPLE,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  modalRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  modalClose: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: FILE_ACCENT_PINK,
  },
  imagePreviewRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  imagePreviewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  imagePreviewClose: {
    padding: 4,
  },
  imagePreviewImage: {
    flex: 1,
    width: '100%',
  },
  pdfPreviewRoot: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  pdfPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: StudyBloomColors.lightGray,
  },
  pdfPreviewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  pdfPreviewClose: {
    padding: 4,
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
});
