import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StudyBloomColors } from '@/constants/theme';
import { useExams } from '@/contexts/ExamContext';
import { ExamFormData, PRIORITY_COLORS, Reminder } from '@/services/examTypes';

type Priority = 'easy' | 'medium' | 'hard';

const reminderOptions: { label: string; value: Reminder['type'] }[] = [
  { label: '1 Hour Before', value: '1_hour' },
  { label: '1 Day Before', value: '1_day' },
  { label: '3 Days Before', value: '3_days' },
  { label: '1 Week Before', value: '1_week' },
];

export default function AddExamScreen() {
  const { createExam, isLoading } = useExams();

  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [notes, setNotes] = useState('');
  const [selectedReminders, setSelectedReminders] = useState<Reminder['type'][]>(['1_day']);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  const toggleReminder = (reminderType: Reminder['type']) => {
    setSelectedReminders(prev => {
      if (prev.includes(reminderType)) {
        return prev.filter(r => r !== reminderType);
      }
      return [...prev, reminderType];
    });
  };

  const calculateReminderTime = (examDate: Date, examTime: string, type: Reminder['type']): Date => {
    const [hours, minutes] = examTime.split(':').map(Number);
    const reminderDate = new Date(examDate);
    reminderDate.setHours(hours, minutes, 0, 0);

    switch (type) {
      case '1_hour':
        reminderDate.setHours(reminderDate.getHours() - 1);
        break;
      case '1_day':
        reminderDate.setDate(reminderDate.getDate() - 1);
        break;
      case '3_days':
        reminderDate.setDate(reminderDate.getDate() - 3);
        break;
      case '1_week':
        reminderDate.setDate(reminderDate.getDate() - 7);
        break;
    }
    return reminderDate;
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    const reminders: Reminder[] = selectedReminders.map(type => ({
      time: calculateReminderTime(date, time, type).toISOString(),
      type,
      notified: false,
    }));

    const examData: ExamFormData = {
      subject: subject.trim(),
      date,
      time,
      location: location.trim(),
      priority,
      progress: 0,
      notes: notes.trim(),
      reminders,
    };

    try {
      await createExam(examData);
      Alert.alert('Success', 'Exam added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create exam. Please try again.');
    }
  };

  const formatDateDisplay = (d: Date): string => {
    return d.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeDisplay = (t: string): string => {
    const [hours, minutes] = t.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const priorities: { value: Priority; label: string }[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Subject Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="book-outline" size={20} color={StudyBloomColors.gray} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Mathematics, Physics"
                placeholderTextColor={StudyBloomColors.lightGray}
                value={subject}
                onChangeText={setSubject}
              />
            </View>
          </View>

          {/* Date & Time Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={StudyBloomColors.primary} />
                <Text style={styles.pickerText}>{formatDateDisplay(date)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Time *</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={StudyBloomColors.primary} />
                <Text style={styles.pickerText}>{formatTimeDisplay(time)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={20} color={StudyBloomColors.gray} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Room 201, Building A"
                placeholderTextColor={StudyBloomColors.lightGray}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Priority Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority Level</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityOption,
                    priority === p.value && { 
                      backgroundColor: PRIORITY_COLORS[p.value] + '20',
                      borderColor: PRIORITY_COLORS[p.value],
                    }
                  ]}
                  onPress={() => setPriority(p.value)}
                >
                  <View 
                    style={[
                      styles.priorityDot, 
                      { backgroundColor: PRIORITY_COLORS[p.value] }
                    ]} 
                  />
                  <Text 
                    style={[
                      styles.priorityLabel,
                      priority === p.value && { color: PRIORITY_COLORS[p.value] }
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reminders */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reminders</Text>
            <View style={styles.reminderGrid}>
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reminderOption,
                    selectedReminders.includes(option.value) && styles.reminderOptionActive
                  ]}
                  onPress={() => toggleReminder(option.value)}
                >
                  <Ionicons 
                    name={selectedReminders.includes(option.value) ? 'notifications' : 'notifications-outline'} 
                    size={16} 
                    color={selectedReminders.includes(option.value) ? '#FFF' : StudyBloomColors.gray} 
                  />
                  <Text 
                    style={[
                      styles.reminderText,
                      selectedReminders.includes(option.value) && styles.reminderTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Study Notes</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any notes, topics to cover, or reminders..."
                placeholderTextColor={StudyBloomColors.lightGray}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={22} color="#FFF" />
                  <Text style={styles.submitText}>Add Exam</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal - iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerModalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerModalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.iosPickerContainer}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  textColor="#000000"
                  themeVariant="light"
                  style={styles.iosPicker}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker - Android */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker Modal - iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerModalTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerModalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.iosPickerContainer}>
                <DateTimePicker
                  value={(() => {
                    const [hours, minutes] = time.split(':').map(Number);
                    const d = new Date();
                    d.setHours(hours, minutes);
                    return d;
                  })()}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor="#000000"
                  themeVariant="light"
                  style={styles.iosPicker}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker - Android */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = time.split(':').map(Number);
            const d = new Date();
            d.setHours(hours, minutes);
            return d;
          })()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.black,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: StudyBloomColors.black,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  pickerText: {
    fontSize: 14,
    color: StudyBloomColors.black,
    fontWeight: '500',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    gap: 6,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.gray,
  },
  reminderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 6,
  },
  reminderOptionActive: {
    backgroundColor: StudyBloomColors.primary,
    borderColor: StudyBloomColors.primary,
  },
  reminderText: {
    fontSize: 13,
    fontWeight: '500',
    color: StudyBloomColors.gray,
  },
  reminderTextActive: {
    color: '#FFF',
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  pickerModalCancel: {
    fontSize: 16,
    color: StudyBloomColors.gray,
  },
  pickerModalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: StudyBloomColors.primary,
  },
  iosPicker: {
    height: 200,
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
