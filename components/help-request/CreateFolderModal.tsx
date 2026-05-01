import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#D81B60',
  secondary: '#9C27B0',
  tertiary: '#FF80AB',
  background: '#F3E5F5',
  white: '#FFFFFF',
  text: '#211826',
  muted: '#7A6A78',
  inputBg: '#F0DDF2',
  border: '#E8D8E8',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (folderName: string) => Promise<void>;
};

export default function CreateFolderModal({
  visible,
  onClose,
  onCreate,
}: Props) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      await onCreate(folderName.trim());
      setFolderName('');
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color="#4A2D37" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="folder-open" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Create New Folder</Text>
          <Text style={styles.subtitle}>Organize your requests by subject</Text>

          <Text style={styles.label}>FOLDER IDENTITY</Text>

          <TextInput
            value={folderName}
            onChangeText={(text) => {
              setFolderName(text);
              if (error) setError('');
            }}
            placeholder="Folder Name (e.g., Physics, History)"
            placeholderTextColor="#A88BA8"
            style={[styles.input, error ? styles.inputError : null]}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.createBtnWrapper}
            onPress={handleCreate}
            disabled={creating}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createBtn}
            >
              {creating ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.createBtnText}>Create</Text>
                  <Ionicons name="add-circle" size={18} color={COLORS.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFF9FC',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#D81B60',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F8D9E8',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#5A3D47',
    textAlign: 'center',
    marginBottom: 26,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: COLORS.primary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  errorText: {
    marginTop: 8,
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  createBtnWrapper: {
    marginTop: 24,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 22,
  },
  createBtn: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  cancelText: {
    textAlign: 'center',
    color: '#7A3354',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});