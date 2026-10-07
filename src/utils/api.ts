import { Course, StudentProfile, QuizQuestion, QuizSessionResult, AdminStats, AppConfig } from '../types/index.js';

const GATEKEEPER_KEY = 'PIZA-HOUSE';

export function getStoredKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('piza_access_key') || sessionStorage.getItem('piza_access_key') || '';
}

export function setStoredKey(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('piza_access_key', key);
  sessionStorage.setItem('piza_access_key', key);
}

export function clearStoredKey() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('piza_access_key');
  sessionStorage.removeItem('piza_access_key');
}

export function getStoredAdminKey(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('piza_admin_key') || '';
}

export function setStoredAdminKey(key: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('piza_admin_key', key);
}

export function clearStoredAdminKey() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('piza_admin_key');
}

export function getStoredProfileId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('piza_active_profile_id') || '';
}

export function setStoredProfileId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('piza_active_profile_id', id);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const key = getStoredKey() || GATEKEEPER_KEY;
  const adminKey = getStoredAdminKey();

  const headers: Record<string, string> = {
    'x-piza-key': key,
    ...(options.headers as Record<string, string> || {}),
  };

  if (adminKey) {
    headers['x-admin-key'] = adminKey;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearStoredKey();
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur (${res.status})`);
  }

  return res.json();
}

export const api = {
  // Gatekeeper Auth
  verifyGatekeeper: async (passphrase: string): Promise<{ success: boolean; token: string }> => {
    const res = await fetch('/api/auth/gatekeeper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Clé invalide');
    }
    const data = await res.json();
    setStoredKey(data.token);
    return data;
  },

  // Admin Auth
  verifyAdmin: async (pin: string): Promise<{ success: boolean; adminToken: string }> => {
    const key = getStoredKey() || GATEKEEPER_KEY;
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-piza-key': key,
      },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Code Superviseur invalide');
    }
    const data = await res.json();
    setStoredAdminKey(data.adminToken);
    return data;
  },

  // Profiles
  getProfiles: () => request<StudentProfile[]>('/api/profiles'),
  createProfile: (data: { name: string; avatar: string; grade: string }) =>
    request<StudentProfile>('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateProfile: (id: string, data: Partial<StudentProfile>) =>
    request<StudentProfile>(`/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteProfile: (id: string) =>
    request<{ success: boolean }>(`/api/profiles/${id}`, {
      method: 'DELETE',
    }),

  // Courses
  getCourses: (profileId?: string, includeArchived?: boolean) => {
    const query = new URLSearchParams();
    if (profileId) query.set('profileId', profileId);
    if (includeArchived) query.set('includeArchived', 'true');
    return request<Course[]>(`/api/courses?${query.toString()}`);
  },
  getCourse: (id: string) => request<Course>(`/api/courses/${id}`),
  analyzeCourse: async (formData: FormData): Promise<{ course: Course; fromCache: boolean; message: string }> => {
    const key = getStoredKey() || GATEKEEPER_KEY;
    const res = await fetch('/api/courses/analyze', {
      method: 'POST',
      headers: {
        'x-piza-key': key,
      },
      body: formData,
    });
    if (res.status === 401) {
      clearStoredKey();
      throw new Error('AUTH_REQUIRED');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur lors de l\'analyse');
    }
    return res.json();
  },
  updateCourse: (id: string, data: Partial<Course>) =>
    request<Course>(`/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteCourse: (id: string) =>
    request<{ success: boolean }>(`/api/courses/${id}`, {
      method: 'DELETE',
    }),

  // Quiz Generation
  generateQuiz: (courseId: string, params: { formats: string[]; count: number; mode: string }) =>
    request<{ questions: QuizQuestion[]; source: string }>(`/api/courses/${courseId}/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),

  // Activity & Sessions
  recordSession: (data: any) =>
    request<{ session: QuizSessionResult; profile: StudentProfile; levelUp: boolean; newBadges: any[] }>('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getSessions: () => request<QuizSessionResult[]>('/api/activity'),

  // Admin supervision & Config
  getAdminStats: () => request<AdminStats>('/api/admin/stats'),
  getConfig: () => request<AppConfig>('/api/admin/config'),
  updateConfig: (data: { aiModel: string }) =>
    request<AppConfig>('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  changeAdminPin: (data: { currentPin: string; newPin: string }) =>
    request<{ success: boolean; message: string }>('/api/admin/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  restoreBackup: (data: any) =>
    request<{ success: boolean; message: string }>('/api/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
};
