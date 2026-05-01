export interface FileAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Reminder {
  time: string;
  type: '1_hour' | '1_day' | '3_days' | '1_week' | 'custom';
  notified: boolean;
}

export interface ExamMark {
  obtained: number;
  total: number;
  grade?: string;
  addedAt: string;
}

export interface Exam {
  _id: string;
  userId: string;
  subject: string;
  date?: string;
  time?: string;
  location: string;
  priority: 'easy' | 'medium' | 'hard';
  progress: number;
  notes: string;
  fileAttachments: FileAttachment[];
  reminders: Reminder[];
  isCompleted: boolean;
  isRepeat?: boolean;
  originalExamId?: string;
  marks?: ExamMark;
  createdAt: string;
  updatedAt: string;
}

export interface ExamFormData {
  subject: string;
  date: Date;
  time: string;
  location?: string;
  priority: 'easy' | 'medium' | 'hard';
  progress?: number;
  notes?: string;
  reminders?: Reminder[];
  marks?: ExamMark;
}

export interface ExamsResponse {
  success: boolean;
  exams: Exam[];
  message?: string;
}

export interface ExamResponse {
  success: boolean;
  exam: Exam;
  message?: string;
}

export interface ExamsByDate {
  [date: string]: Exam[];
}

export interface CalendarResponse {
  success: boolean;
  examsByDate: ExamsByDate;
  message?: string;
}

export type ExamFilter = 'all' | 'upcoming' | 'past' | 'repeat';
export type ExamSortBy = 'date' | 'subject' | 'priority' | 'progress';
export type SortOrder = 'asc' | 'desc';

export const PRIORITY_COLORS = {
  easy: '#4CAF50',
  medium: '#FFC107',
  hard: '#FF5252',
} as const;

export const PRIORITY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
} as const;
