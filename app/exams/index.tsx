import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, DateData } from 'react-native-calendars';
import { StudyBloomColors } from '@/constants/theme';
import { useExams } from '@/contexts/ExamContext';
import { Exam, PRIORITY_COLORS, ExamFilter } from '@/services/examTypes';
import { examService } from '@/services/examService';

const { width } = Dimensions.get('window');

type ViewMode = 'list' | 'calendar' | 'marks';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
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

interface ExamCardProps {
  exam: Exam;
  onPress: () => void;
}

function ExamCard({ exam, onPress }: ExamCardProps) {
  const [countdown, setCountdown] = useState(
    exam.date && exam.time ? examService.getCountdown(exam.date, exam.time) : null
  );

  useEffect(() => {
    if (!exam.date || !exam.time) return;
    
    const interval = setInterval(() => {
      setCountdown(examService.getCountdown(exam.date!, exam.time!));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [exam.date, exam.time]);

  const priorityColor = PRIORITY_COLORS[exam.priority];
  const hasDateSet = !!exam.date;

  return (
    <TouchableOpacity style={styles.examCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
      <View style={styles.examCardContent}>
        <View style={styles.examHeader}>
          <View style={styles.subjectContainer}>
            <Text style={styles.examSubject} numberOfLines={1}>{exam.subject}</Text>
            {exam.isRepeat && (
              <View style={styles.repeatBadge}>
                <Ionicons name="refresh" size={10} color={StudyBloomColors.error} />
                <Text style={styles.repeatBadgeText}>Repeat</Text>
              </View>
            )}
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {exam.priority.charAt(0).toUpperCase() + exam.priority.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.examDetails}>
          {hasDateSet ? (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={14} color={StudyBloomColors.gray} />
                <Text style={styles.detailText}>{formatDate(exam.date!)}</Text>
              </View>
              {exam.time && (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={StudyBloomColors.gray} />
                  <Text style={styles.detailText}>{formatTime(exam.time)}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={StudyBloomColors.warning} />
              <Text style={[styles.detailText, { color: StudyBloomColors.warning, fontStyle: 'italic' }]}>
                Tap to set date & time
              </Text>
            </View>
          )}
          {exam.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={StudyBloomColors.gray} />
              <Text style={styles.detailText} numberOfLines={1}>{exam.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.examFooter}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${exam.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{exam.progress}%</Text>
          </View>

          {countdown && !countdown.isPast && (
            <View style={styles.countdownBadge}>
              <Ionicons name="alarm-outline" size={12} color={StudyBloomColors.primary} />
              <Text style={styles.countdownText}>
                {countdown.days > 0 ? `${countdown.days}d ` : ''}
                {countdown.hours}h {countdown.minutes}m
              </Text>
            </View>
          )}
          {countdown && countdown.isPast && (
            <View style={[styles.countdownBadge, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={[styles.countdownText, { color: '#4CAF50' }]}>Completed</Text>
            </View>
          )}
          {!hasDateSet && (
            <View style={[styles.countdownBadge, { backgroundColor: StudyBloomColors.warning + '20' }]}>
              <Ionicons name="alert-circle-outline" size={12} color={StudyBloomColors.warning} />
              <Text style={[styles.countdownText, { color: StudyBloomColors.warning }]}>Pending</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Mark Card Component for Marks Tab
interface MarkCardProps {
  exam: Exam;
  onAddMark: (exam: Exam) => void;
}

function MarkCard({ exam, onAddMark }: MarkCardProps) {
  const priorityColor = PRIORITY_COLORS[exam.priority];
  const percentage = exam.marks ? ((exam.marks.obtained / exam.marks.total) * 100).toFixed(1) : null;
  
  const getGradeColor = (pct: number) => {
    if (pct >= 80) return '#4CAF50';
    if (pct >= 60) return '#8BC34A';
    if (pct >= 50) return '#FFC107';
    if (pct >= 40) return '#FF9800';
    return '#FF5252';
  };

  return (
    <View style={styles.markCard}>
      <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
      <View style={styles.markCardContent}>
        <View style={styles.markHeader}>
          <Text style={styles.markSubject} numberOfLines={1}>{exam.subject}</Text>
          <Text style={styles.markDate}>{formatDate(exam.date ?? '')}</Text>
        </View>
        
        {exam.marks ? (
          <View style={styles.markDetails}>
            <View style={styles.markScoreContainer}>
              <Text style={styles.markScore}>
                {exam.marks.obtained}/{exam.marks.total}
              </Text>
              <View style={[styles.percentageBadge, { backgroundColor: getGradeColor(parseFloat(percentage!)) + '20' }]}>
                <Text style={[styles.percentageText, { color: getGradeColor(parseFloat(percentage!)) }]}>
                  {percentage}%
                </Text>
              </View>
              {exam.marks.grade && (
                <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(parseFloat(percentage!)) }]}>
                  <Text style={styles.gradeText}>{exam.marks.grade}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addMarkButton}
            onPress={() => onAddMark(exam)}
          >
            <Ionicons name="add-circle-outline" size={18} color={StudyBloomColors.primary} />
            <Text style={styles.addMarkText}>Add Marks</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ExamPlannerScreen() {
  const { 
    exams, 
    isLoading, 
    error, 
    fetchExams, 
    filter, 
    setFilter, 
    searchQuery, 
    setSearchQuery,
    examsByDate,
    fetchCalendarData,
    updateMarks,
    toggleRepeat,
    createRepeatExam,
    deleteExam,
  } = useExams();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedExamForMark, setSelectedExamForMark] = useState<Exam | null>(null);
  const [markObtained, setMarkObtained] = useState('');
  const [markTotal, setMarkTotal] = useState('100');
  const [markGrade, setMarkGrade] = useState('');

  // Auto-fetch exams when filter changes
  useEffect(() => {
    fetchExams();
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchExams();
      const now = new Date();
      fetchCalendarData(now.getMonth() + 1, now.getFullYear());
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExams();
    setRefreshing(false);
  };

  const handleExamPress = (exam: Exam) => {
    router.push(`/exams/${exam._id}`);
  };

  const handleAddExam = () => {
    router.push('/exams/add');
  };

  const handleMonthChange = (month: DateData) => {
    fetchCalendarData(month.month, month.year);
  };

  // Get past exams for marks tab (exams where the date+time has passed)
  const pastExams = exams.filter(exam => {
    // Parse the stored date (comes as ISO string in UTC)
    const storedDate = new Date(exam.date ?? '');
    
    // Extract the date components from UTC
    const year = storedDate.getUTCFullYear();
    const month = storedDate.getUTCMonth();
    const day = storedDate.getUTCDate();
    
    // Parse the time
    let hours = 0, minutes = 0;
    if (exam.time) {
      const timeParts = exam.time.split(':').map(Number);
      hours = timeParts[0] || 0;
      minutes = timeParts[1] || 0;
    }
    
    // Create exam datetime in local timezone
    const examDateTime = new Date(year, month, day, hours, minutes, 0, 0);
    const now = new Date();
    
    // Exam is past if its datetime has passed
    return examDateTime.getTime() < now.getTime();
  });

  // Calculate marks statistics
  const examsWithMarks = pastExams.filter(e => e.marks);
  const repeatExams = exams.filter(e => e.isRepeat);
  const totalObtained = examsWithMarks.reduce((sum, e) => sum + (e.marks?.obtained || 0), 0);
  const totalPossible = examsWithMarks.reduce((sum, e) => sum + (e.marks?.total || 0), 0);
  const overallPercentage = totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(1) : '0';

  const handleAddMark = (exam: Exam) => {
    setSelectedExamForMark(exam);
    setMarkObtained(exam.marks?.obtained?.toString() || '');
    setMarkTotal(exam.marks?.total?.toString() || '100');
    setMarkGrade(exam.marks?.grade || '');
    setShowMarkModal(true);
  };

  const handleSaveMark = async () => {
    if (!selectedExamForMark) return;
    
    const obtained = parseFloat(markObtained);
    const total = parseFloat(markTotal);
    
    if (isNaN(obtained) || isNaN(total) || obtained < 0 || total <= 0 || obtained > total) {
      Alert.alert('Invalid Marks', 'Please enter valid marks (obtained should be between 0 and total)');
      return;
    }

    try {
      await updateMarks(selectedExamForMark._id, {
        obtained,
        total,
        grade: markGrade.trim() || undefined,
      });
      
      const percentage = (obtained / total) * 100;
      
      setShowMarkModal(false);
      setSelectedExamForMark(null);
      setMarkObtained('');
      setMarkTotal('100');
      setMarkGrade('');
      
      // If mark is below 50%, offer to add to repeat exams
      if (percentage < 50) {
        Alert.alert(
          'Add to Repeat Exams?',
          `You scored ${percentage.toFixed(1)}% which is below 50%. Would you like to create a repeat exam for this subject?`,
          [
            { text: 'No', style: 'cancel', onPress: () => fetchExams() },
            { 
              text: 'Create Repeat Exam', 
              onPress: async () => {
                try {
                  await createRepeatExam(selectedExamForMark._id);
                  Alert.alert('Success', 'Repeat exam created! You can find it in the Repeat Exams section and add date/time when ready.');
                } catch (err) {
                  Alert.alert('Error', 'Failed to create repeat exam.');
                }
                fetchExams();
              }
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Marks saved successfully!');
        fetchExams();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save marks. Please try again.');
    }
  };

  const markedDates: { [key: string]: any } = {};
  Object.keys(examsByDate).forEach(date => {
    const examsOnDate = examsByDate[date];
    const priorities = examsOnDate.map(e => e.priority);
    const hasHard = priorities.includes('hard');
    const hasMedium = priorities.includes('medium');
    
    markedDates[date] = {
      marked: true,
      dotColor: hasHard ? PRIORITY_COLORS.hard : hasMedium ? PRIORITY_COLORS.medium : PRIORITY_COLORS.easy,
      selected: selectedDate === date,
      selectedColor: StudyBloomColors.primary + '30',
    };
  });

  const selectedDateExams = selectedDate ? (examsByDate[selectedDate] || []) : [];

  const filters: { label: string; value: ExamFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Past', value: 'past' },
    { label: 'Repeat', value: 'repeat' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={StudyBloomColors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exams..."
            placeholderTextColor={StudyBloomColors.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchExams}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchExams(); }}>
              <Ionicons name="close-circle" size={20} color={StudyBloomColors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons 
            name="list" 
            size={20} 
            color={viewMode === 'list' ? '#FFF' : StudyBloomColors.gray} 
          />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={viewMode === 'calendar' ? '#FFF' : StudyBloomColors.gray} 
          />
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'marks' && styles.toggleButtonActive]}
          onPress={() => setViewMode('marks')}
        >
          <Ionicons 
            name="school" 
            size={20} 
            color={viewMode === 'marks' ? '#FFF' : StudyBloomColors.gray} 
          />
          <Text style={[styles.toggleText, viewMode === 'marks' && styles.toggleTextActive]}>
            Marks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips (List View Only) */}
      {viewMode === 'list' && (
        <View style={styles.filterContainer}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={StudyBloomColors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={StudyBloomColors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchExams}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={exams}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ExamCard exam={item} onPress={() => handleExamPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons 
                  name={filter === 'repeat' ? 'refresh-circle-outline' : 'book-outline'} 
                  size={64} 
                  color={StudyBloomColors.tertiary} 
                />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'repeat' ? 'No repeat exams' : 
                 filter === 'past' ? 'No past exams' :
                 filter === 'upcoming' ? 'No upcoming exams' :
                 'No exams yet!'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'repeat' 
                  ? 'When you score below 50%, you can add the exam here for a retry'
                  : 'Add your first exam to start planning your success'}
              </Text>
              {filter !== 'repeat' && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddExam}>
                  <LinearGradient
                    colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addFirstGradient}
                  >
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.addFirstText}>Add Your First Exam</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      ) : viewMode === 'calendar' ? (
        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={handleMonthChange}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: '#FFF5F8',
              calendarBackground: '#FFF',
              textSectionTitleColor: StudyBloomColors.gray,
              selectedDayBackgroundColor: StudyBloomColors.primary,
              selectedDayTextColor: '#FFF',
              todayTextColor: StudyBloomColors.primary,
              dayTextColor: StudyBloomColors.black,
              textDisabledColor: '#d9e1e8',
              dotColor: StudyBloomColors.primary,
              arrowColor: StudyBloomColors.primary,
              monthTextColor: StudyBloomColors.black,
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '500',
            }}
            style={styles.calendar}
          />

          {selectedDate && (
            <View style={styles.selectedDateSection}>
              <Text style={styles.selectedDateTitle}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              {selectedDateExams.length > 0 ? (
                <FlatList
                  data={selectedDateExams}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <ExamCard exam={item} onPress={() => handleExamPress(item)} />
                  )}
                  style={styles.selectedDateList}
                />
              ) : (
                <Text style={styles.noExamsText}>No exams on this date</Text>
              )}
            </View>
          )}
        </View>
      ) : (
        /* Marks View */
        <ScrollView 
          style={styles.marksContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Overall Statistics */}
          <View style={styles.statsCard}>
            <LinearGradient
              colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statsGradient}
            >
              <View style={styles.statsContent}>
                <Text style={styles.statsTitle}>Overall Performance</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{examsWithMarks.length}</Text>
                    <Text style={styles.statLabel}>Exams Graded</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{totalObtained}/{totalPossible}</Text>
                    <Text style={styles.statLabel}>Total Marks</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{overallPercentage}%</Text>
                    <Text style={styles.statLabel}>Average</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Repeat Exams Section */}
          {repeatExams.length > 0 && (
            <View style={styles.repeatSection}>
              <View style={styles.repeatHeader}>
                <Ionicons name="refresh-circle" size={24} color={StudyBloomColors.error} />
                <Text style={styles.repeatTitle}>Repeat Exams ({repeatExams.length})</Text>
              </View>
              {repeatExams.map((exam) => (
                <TouchableOpacity 
                  key={exam._id} 
                  style={styles.repeatCard}
                  onPress={() => router.push(`/exams/${exam._id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.repeatCardContent}>
                    <Text style={styles.repeatSubject}>{exam.subject}</Text>
                    {exam.date ? (
                      <Text style={styles.repeatDate}>
                        {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {exam.time ? ` at ${exam.time}` : ''}
                      </Text>
                    ) : (
                      <Text style={styles.repeatPending}>Tap to add date & time</Text>
                    )}
                  </View>
                  <View style={styles.repeatActions}>
                    <TouchableOpacity 
                      style={styles.editRepeatButton}
                      onPress={() => router.push(`/exams/edit/${exam._id}`)}
                    >
                      <Ionicons name="create-outline" size={20} color={StudyBloomColors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.removeRepeatButton}
                      onPress={() => {
                        Alert.alert(
                          'Delete Repeat Exam?',
                          `Delete ${exam.subject}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Delete', 
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await deleteExam(exam._id);
                                  fetchExams();
                                } catch (err) {
                                  Alert.alert('Error', 'Failed to delete repeat exam.');
                                }
                              }
                            },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={StudyBloomColors.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Past Exams List */}
          <Text style={styles.marksSectionTitle}>Add Marks</Text>
          {pastExams.length > 0 ? (
            pastExams.map((exam) => (
              <MarkCard key={exam._id} exam={exam} onAddMark={handleAddMark} />
            ))
          ) : (
            <View style={styles.emptyMarksContainer}>
              <Ionicons name="school-outline" size={64} color={StudyBloomColors.tertiary} />
              <Text style={styles.emptyMarksTitle}>No Completed Exams</Text>
              <Text style={styles.emptyMarksSubtitle}>
                Your completed exams will appear here so you can add marks
              </Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB - Only show on list and calendar views */}
      {viewMode !== 'marks' && (
        <TouchableOpacity style={styles.fab} onPress={handleAddExam} activeOpacity={0.8}>
          <LinearGradient
            colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Add Marks Modal */}
      <Modal
        visible={showMarkModal}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowMarkModal(false); }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Marks</Text>
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowMarkModal(false); }}>
                    <Ionicons name="close" size={24} color={StudyBloomColors.gray} />
                  </TouchableOpacity>
                </View>

                {selectedExamForMark && (
                  <Text style={styles.modalSubject}>{selectedExamForMark.subject}</Text>
                )}

                <View style={styles.markInputRow}>
                  <View style={styles.markInputGroup}>
                    <Text style={styles.markInputLabel}>Obtained</Text>
                    <TextInput
                      style={styles.markInput}
                      value={markObtained}
                      onChangeText={setMarkObtained}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={StudyBloomColors.lightGray}
                      returnKeyType="next"
                    />
                  </View>
                  <Text style={styles.markDivider}>/</Text>
                  <View style={styles.markInputGroup}>
                    <Text style={styles.markInputLabel}>Total</Text>
                    <TextInput
                      style={styles.markInput}
                      value={markTotal}
                      onChangeText={setMarkTotal}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor={StudyBloomColors.lightGray}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.gradeInputGroup}>
                  <Text style={styles.markInputLabel}>Grade (Optional)</Text>
                  <TextInput
                    style={styles.gradeInput}
                    value={markGrade}
                    onChangeText={setMarkGrade}
                    placeholder="e.g., A+, B, Pass"
                    placeholderTextColor={StudyBloomColors.lightGray}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                <TouchableOpacity style={styles.saveMarkButton} onPress={() => { Keyboard.dismiss(); handleSaveMark(); }}>
                  <LinearGradient
                    colors={[StudyBloomColors.primary, StudyBloomColors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveMarkGradient}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveMarkText}>Save Marks</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: StudyBloomColors.black,
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: StudyBloomColors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.gray,
  },
  toggleTextActive: {
    color: '#FFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: StudyBloomColors.lightGray,
  },
  filterChipActive: {
    backgroundColor: StudyBloomColors.primary,
    borderColor: StudyBloomColors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: StudyBloomColors.gray,
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  examCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  priorityIndicator: {
    width: 4,
  },
  examCardContent: {
    flex: 1,
    padding: 14,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  examSubject: {
    fontSize: 17,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginRight: 8,
    flexShrink: 1,
  },
  subjectContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: StudyBloomColors.error + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  repeatBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: StudyBloomColors.error,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  examDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: StudyBloomColors.gray,
  },
  examFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: StudyBloomColors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: StudyBloomColors.gray,
    minWidth: 35,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudyBloomColors.tertiary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: StudyBloomColors.primary,
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
    fontSize: 16,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: StudyBloomColors.primary,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: StudyBloomColors.tertiary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  addFirstGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  addFirstText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    flex: 1,
  },
  calendar: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedDateSection: {
    flex: 1,
    padding: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginBottom: 12,
  },
  selectedDateList: {
    flex: 1,
  },
  noExamsText: {
    fontSize: 15,
    color: StudyBloomColors.gray,
    textAlign: 'center',
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Mark Card Styles
  markCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  markCardContent: {
    flex: 1,
    padding: 14,
  },
  markHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  markSubject: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginRight: 8,
  },
  markDate: {
    fontSize: 13,
    color: StudyBloomColors.gray,
  },
  markDetails: {
    marginTop: 4,
  },
  markScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markScore: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  addMarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addMarkText: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.primary,
  },
  // Marks View Styles
  marksContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  marksSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginBottom: 12,
    marginTop: 8,
  },
  // Repeat Exams Styles
  repeatSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: StudyBloomColors.error + '30',
  },
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  repeatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: StudyBloomColors.error,
  },
  repeatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: StudyBloomColors.error + '10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  repeatCardContent: {
    flex: 1,
  },
  repeatSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: StudyBloomColors.black,
  },
  repeatMark: {
    fontSize: 13,
    color: StudyBloomColors.error,
    marginTop: 2,
  },
  repeatDate: {
    fontSize: 12,
    color: StudyBloomColors.gray,
    marginTop: 2,
  },
  repeatPending: {
    fontSize: 12,
    color: StudyBloomColors.warning,
    fontStyle: 'italic',
    marginTop: 2,
  },
  repeatActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editRepeatButton: {
    padding: 4,
  },
  removeRepeatButton: {
    padding: 4,
  },
  statsCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: StudyBloomColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statsGradient: {
    padding: 20,
  },
  statsContent: {
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  marksList: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyMarksContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyMarksTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMarksSubtitle: {
    fontSize: 15,
    color: StudyBloomColors.gray,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    marginTop: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: StudyBloomColors.black,
  },
  modalSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: StudyBloomColors.gray,
    marginBottom: 24,
  },
  markInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  markInputGroup: {
    alignItems: 'center',
  },
  markInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: StudyBloomColors.gray,
    marginBottom: 8,
  },
  markInput: {
    width: 100,
    height: 56,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: StudyBloomColors.black,
  },
  markDivider: {
    fontSize: 32,
    fontWeight: '300',
    color: StudyBloomColors.gray,
    marginHorizontal: 16,
    marginTop: 24,
  },
  gradeInputGroup: {
    marginBottom: 24,
  },
  gradeInput: {
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: StudyBloomColors.black,
  },
  saveMarkButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveMarkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveMarkText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
});
