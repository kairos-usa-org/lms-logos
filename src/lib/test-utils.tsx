import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  organization_id: 'test-org-id',
  role: 'learner',
  profile_data: {
    first_name: 'Test',
    last_name: 'User',
  },
  points: 0,
  level: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  id: 'test-org-id',
  name: 'Test Organization',
  slug: 'test-org',
  branding_config: {},
  theme_config: {},
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const createMockCourse = (overrides = {}) => ({
  id: 'test-course-id',
  organization_id: 'test-org-id',
  title: 'Test Course',
  description: 'A test course for testing purposes',
  content: {
    lessons: [],
    quizzes: [],
  },
  created_by: 'test-user-id',
  status: 'draft',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const createMockLesson = (overrides = {}) => ({
  id: 'test-lesson-id',
  course_id: 'test-course-id',
  title: 'Test Lesson',
  content: {
    type: 'text',
    text: 'This is a test lesson content.',
  },
  order_index: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const createMockQuiz = (overrides = {}) => ({
  id: 'test-quiz-id',
  course_id: 'test-course-id',
  title: 'Test Quiz',
  questions: [
    {
      id: 'q1',
      question: 'What is 2 + 2?',
      type: 'multiple-choice',
      options: ['3', '4', '5', '6'],
      correct_answer: '4',
    },
  ],
  passing_score: 70,
  time_limit: 30,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const createMockBadge = (overrides = {}) => ({
  id: 'test-badge-id',
  organization_id: 'test-org-id',
  name: 'Test Badge',
  description: 'A test badge for testing purposes',
  icon_url: 'https://example.com/badge.png',
  points_required: 100,
  level: 1,
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

// Mock API responses
export const mockApiResponse = <T,>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
});

// Mock Supabase response
export const mockSupabaseResponse = <T,>(
  data: T | null,
  error: any = null
) => ({
  data,
  error,
  count: null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

// Test helpers for async operations
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// Mock file upload
export const createMockFile = (
  name = 'test.txt',
  type = 'text/plain',
  content = 'test content'
) => {
  const file = new File([content], name, { type });
  return file;
};

// Mock FormData
export const createMockFormData = (data: Record<string, any>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

// Mock URL
export const mockUrl = (pathname = '/', searchParams = {}) => {
  const url = new URL('http://localhost:3000' + pathname);
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
};

// Cleanup after tests
export const cleanupTestEnvironment = () => {
  // Reset all mocks
  if (typeof jest !== 'undefined') {
    jest.clearAllMocks();
  }

  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();

  // Reset DOM
  document.body.innerHTML = '';
};
