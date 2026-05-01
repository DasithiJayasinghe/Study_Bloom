import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exam, Reminder } from './examTypes';
import { authService } from './authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

const NOTIFICATION_IDS_KEY = 'exam_notification_ids';
const NOTIFICATIONS_LIST_KEY = 'studybloom_notifications_list';
const HELP_REQUEST_NOTIFIED_KEY = 'help_request_notified_ids';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  examId?: string;
  postId?: string;
  examSubject?: string;
  type: 'reminder' | 'exam_today' | 'exam_tomorrow' | 'general' | 'help_request_accepted' | 'new_comment';
  helpRequestId?: string;
  read: boolean;
  createdAt: string;
  scheduledFor?: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('exam-reminders', {
        name: 'Exam Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D81B60',
      });
    }

    return true;
  },

  // Schedule a notification for an exam reminder
  async scheduleExamReminder(
    exam: Exam,
    reminder: Reminder
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const reminderDate = new Date(reminder.time);
      const now = new Date();

      // Don't schedule if reminder time has passed
      if (reminderDate <= now) {
        return null;
      }

      const title = `📚 Exam Reminder: ${exam.subject}`;
      const body = this.getReminderMessage(exam, reminder);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { examId: exam._id, type: 'exam_reminder' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: 'exam-reminders',
        },
      });

      // Store notification ID for later cancellation
      await this.storeNotificationId(exam._id, notificationId);

      // Add to notifications list for display
      await this.addToNotificationsList({
        id: notificationId,
        title,
        body,
        examId: exam._id,
        examSubject: exam.subject,
        type: 'reminder',
        read: false,
        createdAt: new Date().toISOString(),
        scheduledFor: reminderDate.toISOString(),
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  },

  // Get reminder message based on type
  getReminderMessage(exam: Exam, reminder: Reminder): string {
    const examDate = exam.date ? new Date(exam.date) : new Date();
    const formattedDate = examDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const messages: Record<string, string> = {
      '1_hour': `Your exam is in 1 hour at ${exam.time}! ${exam.location ? `Location: ${exam.location}` : ''}`,
      '1_day': `Your exam is tomorrow (${formattedDate}) at ${exam.time}. Time to review! 📖`,
      '3_days': `${exam.subject} exam is in 3 days (${formattedDate}). Keep studying! 💪`,
      '1_week': `${exam.subject} exam is next week (${formattedDate}). Start preparing! 🎯`,
      'custom': `Reminder: ${exam.subject} exam on ${formattedDate} at ${exam.time}`,
    };

    return messages[reminder.type] || messages['custom'];
  },

  // Schedule all reminders for an exam
  async scheduleAllReminders(exam: Exam): Promise<void> {
    // Cancel existing reminders first
    await this.cancelExamReminders(exam._id);

    // Schedule new reminders
    for (const reminder of exam.reminders) {
      if (!reminder.notified) {
        await this.scheduleExamReminder(exam, reminder);
      }
    }
  },

  // Cancel all notifications for an exam
  async cancelExamReminders(examId: string): Promise<void> {
    try {
      const storedIds = await this.getStoredNotificationIds();
      const examNotificationIds = storedIds[examId] || [];

      for (const notificationId of examNotificationIds) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }

      // Remove from storage
      delete storedIds[examId];
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(storedIds));
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  },

  // Store notification ID for an exam
  async storeNotificationId(examId: string, notificationId: string): Promise<void> {
    const storedIds = await this.getStoredNotificationIds();
    if (!storedIds[examId]) {
      storedIds[examId] = [];
    }
    storedIds[examId].push(notificationId);
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(storedIds));
  },

  // Get stored notification IDs
  async getStoredNotificationIds(): Promise<Record<string, string[]>> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  },

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
  },

  async getNotifiedHelpRequestIds(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(HELP_REQUEST_NOTIFIED_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async storeNotifiedHelpRequestId(requestId: string): Promise<void> {
    try {
      const existing = await this.getNotifiedHelpRequestIds();
      if (!existing.includes(requestId)) {
        existing.push(requestId);
        await AsyncStorage.setItem(HELP_REQUEST_NOTIFIED_KEY, JSON.stringify(existing));
      }
    } catch (error) {
      console.error('Failed to store notified help request id:', error);
    }
  },

  async checkAcceptedHelpRequestNotifications(helpRequests: any[]): Promise<void> {
    try {
      const notifiedIds = await this.getNotifiedHelpRequestIds();

      for (const request of helpRequests) {
        const isAccepted =
          request?.status === 'accepted' || !!request?.acceptedBy;

        if (!request?._id || !isAccepted) continue;

        if (notifiedIds.includes(request._id)) continue;

        const acceptedByName =
          typeof request.acceptedBy === 'object' && request.acceptedBy?.fullName
            ? request.acceptedBy.fullName
            : 'Another student';

        await this.addToNotificationsList({
          id: `help_request_accepted_${request._id}`,
          title: '💬 Help Request Accepted!',
          body: `"${request.questionTitle}" was accepted by ${acceptedByName}.`,
          helpRequestId: request._id,
          type: 'help_request_accepted',
          read: false,
          createdAt: new Date().toISOString(),
        });

        await this.storeNotifiedHelpRequestId(request._id);
      }
    } catch (error) {
      console.error('Failed to check help request notifications:', error);
    }
  },

  // Add listener for notification responses
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  // Add listener for received notifications
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  },

  // ==========================================
  // Notifications List Management (for display)
  // ==========================================

  // Get all notifications for display
  async getNotificationsList(): Promise<AppNotification[]> {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATIONS_LIST_KEY);
      if (!data) return [];

      const notifications: AppNotification[] = JSON.parse(data);
      // Sort by createdAt descending (newest first)
      return notifications.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get notifications list:', error);
      return [];
    }
  },

  // Add notification to display list
  async addToNotificationsList(notification: AppNotification): Promise<void> {
    try {
      const notifications = await this.getNotificationsList();
      // Avoid duplicates
      const exists = notifications.some(n => n.id === notification.id);
      if (!exists) {
        notifications.unshift(notification);
        // Keep only last 50 notifications
        const trimmed = notifications.slice(0, 50);
        await AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(trimmed));
      }
    } catch (error) {
      console.error('Failed to add notification to list:', error);
    }
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const notifications = await this.getNotificationsList();
    return notifications.filter(n => !n.read).length;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getNotificationsList();
      const updated = notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      await AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));

      // Sync with backend
      await this.markAsReadBackend(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getNotificationsList();
      const updated = notifications.map(n => ({ ...n, read: true }));
      await AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));

      // Sync with backend
      try {
        const token = await authService.getToken();
        await fetch(`${API_URL}/notifications/mark-all-read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to mark all read on backend:', error);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  // Delete notification from list
  async deleteFromNotificationsList(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getNotificationsList();
      const filtered = notifications.filter(n => n.id !== notificationId);
      await AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(filtered));

      // Sync with backend
      try {
        const token = await authService.getToken();
        await fetch(`${API_URL}/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to delete on backend:', error);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  // Clear all notifications from list
  async clearNotificationsList(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_LIST_KEY);

      // Sync with backend
      try {
        const token = await authService.getToken();
        await fetch(`${API_URL}/notifications/clear-all`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to clear all on backend:', error);
      }
    } catch (error) {
      console.error('Failed to clear notifications list:', error);
    }
  },

  async clearLocalNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_LIST_KEY);
    } catch (error) {
      console.error('Failed to clear local notifications:', error);
    }
  },

  // Sync notifications with backend
  async fetchNotificationsFromBackend(): Promise<void> {
    try {
      const token = await authService.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const localNotifications = await this.getNotificationsList();
        const backendNotifIds = data.notifications.map((n: any) => n._id);

        // 1. Remove local copies of backend notifications that were deleted on server
        const updatedLocal = localNotifications.filter(localN => {
          const isBackendId = /^[0-9a-fA-F]{24}$/.test(localN.id);
          if (isBackendId && !backendNotifIds.includes(localN.id)) {
            return false;
          }
          return true;
        });

        // 2. Add or Update from backend
        let finalNotifications = [...updatedLocal];
        for (const notif of data.notifications) {
          const index = finalNotifications.findIndex(n => n.id === notif._id);

          if (index !== -1) {
            finalNotifications[index] = {
              ...finalNotifications[index],
              read: notif.read,
              title: notif.title,
              body: notif.body
            };
          } else {
            finalNotifications.unshift({
              id: notif._id,
              title: notif.title,
              body: notif.body,
              type: notif.type,
              postId: notif.postId,
              helpRequestId: notif.helpRequestId,
              examId: notif.examId,
              read: notif.read,
              createdAt: notif.createdAt,
            } as any);
          }
        }

        const trimmed = finalNotifications.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 50);

        await AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(trimmed));
      }
    } catch (error) {
      console.error('Failed to fetch notifications from backend:', error);
    }
  },

  async markAsReadBackend(notificationId: string): Promise<void> {
    try {
      const token = await authService.getToken();
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to mark read on backend:', error);
    }
  },

  // Check for upcoming exams and add notifications
  async checkUpcomingExams(exams: Exam[]): Promise<void> {
    const now = new Date();

    for (const exam of exams) {
      if (!exam.date || !exam.time) continue;

      const examDate = new Date(exam.date);
      const [hours, minutes] = exam.time.split(':').map(Number);

      const examDateTime = new Date(
        examDate.getUTCFullYear(),
        examDate.getUTCMonth(),
        examDate.getUTCDate(),
        hours,
        minutes
      );

      const hoursUntilExam = (examDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If exam is today (within 24 hours)
      if (hoursUntilExam > 0 && hoursUntilExam <= 24) {
        const notifications = await this.getNotificationsList();
        const alreadyNotified = notifications.some(
          n => n.examId === exam._id && n.type === 'exam_today'
        );

        if (!alreadyNotified) {
          await this.addToNotificationsList({
            id: `exam_today_${exam._id}_${Date.now()}`,
            title: '📚 Exam Today!',
            body: `${exam.subject} is today at ${exam.time}. You've got this!`,
            examId: exam._id,
            examSubject: exam.subject,
            type: 'exam_today',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // If exam is tomorrow (24-48 hours)
      if (hoursUntilExam > 24 && hoursUntilExam <= 48) {
        const notifications = await this.getNotificationsList();
        const alreadyNotified = notifications.some(
          n => n.examId === exam._id && n.type === 'exam_tomorrow'
        );

        if (!alreadyNotified) {
          await this.addToNotificationsList({
            id: `exam_tomorrow_${exam._id}_${Date.now()}`,
            title: '📅 Exam Tomorrow!',
            body: `${exam.subject} is tomorrow at ${exam.time}. Get a good night's sleep!`,
            examId: exam._id,
            examSubject: exam.subject,
            type: 'exam_tomorrow',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  },
};
