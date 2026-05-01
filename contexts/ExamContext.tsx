import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { examService } from '@/services/examService';
import {
  Exam,
  ExamFormData,
  ExamFilter,
  ExamSortBy,
  SortOrder,
  FileAttachment,
  ExamMark,
} from '@/services/examTypes';

interface ExamContextType {
  exams: Exam[];
  isLoading: boolean;
  error: string | null;
  selectedExam: Exam | null;
  filter: ExamFilter;
  sortBy: ExamSortBy;
  sortOrder: SortOrder;
  searchQuery: string;
  examsByDate: { [date: string]: Exam[] };
  
  // Actions
  fetchExams: () => Promise<void>;
  fetchExam: (id: string) => Promise<Exam>;
  createExam: (data: ExamFormData) => Promise<Exam>;
  updateExam: (id: string, data: Partial<ExamFormData>) => Promise<Exam>;
  deleteExam: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: number) => Promise<void>;
  updateMarks: (id: string, marks: { obtained: number; total: number; grade?: string }) => Promise<Exam>;
  toggleRepeat: (id: string, isRepeat: boolean) => Promise<Exam>;
  createRepeatExam: (id: string) => Promise<Exam>;
  uploadFile: (examId: string, fileUri: string, fileName: string, mimeType: string) => Promise<FileAttachment>;
  deleteFile: (examId: string, filename: string) => Promise<void>;
  fetchCalendarData: (month?: number, year?: number) => Promise<void>;
  
  // Setters
  setFilter: (filter: ExamFilter) => void;
  setSortBy: (sortBy: ExamSortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  setSelectedExam: (exam: Exam | null) => void;
  clearError: () => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

interface ExamProviderProps {
  children: ReactNode;
}

export function ExamProvider({ children }: ExamProviderProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filter, setFilter] = useState<ExamFilter>('all');
  const [sortBy, setSortBy] = useState<ExamSortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [examsByDate, setExamsByDate] = useState<{ [date: string]: Exam[] }>({});

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await examService.getExams(searchQuery, filter, sortBy, sortOrder);
      setExams(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch exams';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filter, sortBy, sortOrder]);

  const fetchExam = useCallback(async (id: string): Promise<Exam> => {
    setIsLoading(true);
    setError(null);
    try {
      const exam = await examService.getExam(id);
      setSelectedExam(exam);
      return exam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch exam';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createExam = useCallback(async (data: ExamFormData): Promise<Exam> => {
    setIsLoading(true);
    setError(null);
    try {
      const exam = await examService.createExam(data);
      setExams(prev =>
        [...prev, exam].sort((a, b) => {
          const ta = new Date(a.date ?? 0).getTime();
          const tb = new Date(b.date ?? 0).getTime();
          return ta - tb;
        })
      );
      return exam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create exam';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateExam = useCallback(async (id: string, data: Partial<ExamFormData>): Promise<Exam> => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedExam = await examService.updateExam(id, data);
      setExams(prev => prev.map(exam => exam._id === id ? updatedExam : exam));
      if (selectedExam?._id === id) {
        setSelectedExam(updatedExam);
      }
      return updatedExam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update exam';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedExam]);

  const deleteExam = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await examService.deleteExam(id);
      setExams(prev => prev.filter(exam => exam._id !== id));
      if (selectedExam?._id === id) {
        setSelectedExam(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete exam';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedExam]);

  const updateProgress = useCallback(async (id: string, progress: number): Promise<void> => {
    setError(null);
    try {
      const updatedExam = await examService.updateProgress(id, progress);
      setExams(prev => prev.map(exam => exam._id === id ? updatedExam : exam));
      if (selectedExam?._id === id) {
        setSelectedExam(updatedExam);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update progress';
      setError(message);
      throw err;
    }
  }, [selectedExam]);

  const updateMarks = useCallback(async (
    id: string,
    marks: { obtained: number; total: number; grade?: string }
  ): Promise<Exam> => {
    setError(null);
    try {
      const updatedExam = await examService.updateMarks(id, marks);
      setExams(prev => prev.map(exam => exam._id === id ? updatedExam : exam));
      if (selectedExam?._id === id) {
        setSelectedExam(updatedExam);
      }
      return updatedExam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update marks';
      setError(message);
      throw err;
    }
  }, [selectedExam]);

  const toggleRepeat = useCallback(async (id: string, isRepeat: boolean): Promise<Exam> => {
    setError(null);
    try {
      const updatedExam = await examService.toggleRepeat(id, isRepeat);
      setExams(prev => prev.map(exam => exam._id === id ? updatedExam : exam));
      if (selectedExam?._id === id) {
        setSelectedExam(updatedExam);
      }
      return updatedExam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update repeat status';
      setError(message);
      throw err;
    }
  }, [selectedExam]);

  const createRepeatExam = useCallback(async (id: string): Promise<Exam> => {
    setError(null);
    try {
      const newRepeatExam = await examService.createRepeatExam(id);
      setExams(prev => [...prev, newRepeatExam]);
      return newRepeatExam;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create repeat exam';
      setError(message);
      throw err;
    }
  }, []);

  const uploadFile = useCallback(async (
    examId: string,
    fileUri: string,
    fileName: string,
    mimeType: string
  ): Promise<FileAttachment> => {
    setError(null);
    try {
      const file = await examService.uploadFile(examId, fileUri, fileName, mimeType);
      // Refresh exam to get updated file list
      const updatedExam = await examService.getExam(examId);
      setExams(prev => prev.map(exam => exam._id === examId ? updatedExam : exam));
      if (selectedExam?._id === examId) {
        setSelectedExam(updatedExam);
      }
      return file;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      throw err;
    }
  }, [selectedExam]);

  const deleteFile = useCallback(async (examId: string, filename: string): Promise<void> => {
    setError(null);
    try {
      await examService.deleteFile(examId, filename);
      // Refresh exam to get updated file list
      const updatedExam = await examService.getExam(examId);
      setExams(prev => prev.map(exam => exam._id === examId ? updatedExam : exam));
      if (selectedExam?._id === examId) {
        setSelectedExam(updatedExam);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      setError(message);
      throw err;
    }
  }, [selectedExam]);

  const fetchCalendarData = useCallback(async (month?: number, year?: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await examService.getExamsForCalendar(month, year);
      setExamsByDate(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch calendar data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: ExamContextType = {
    exams,
    isLoading,
    error,
    selectedExam,
    filter,
    sortBy,
    sortOrder,
    searchQuery,
    examsByDate,
    fetchExams,
    fetchExam,
    createExam,
    updateExam,
    deleteExam,
    updateProgress,
    updateMarks,
    toggleRepeat,
    createRepeatExam,
    uploadFile,
    deleteFile,
    fetchCalendarData,
    setFilter,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setSelectedExam,
    clearError,
  };

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExams() {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error('useExams must be used within an ExamProvider');
  }
  return context;
}
