// API Service for EduSphere
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: {
        page: number;
        pages: number;
        total: number;
    };
}

// Get token from localStorage
const getToken = (): string | null => {
    const user = localStorage.getItem('edusphere_user');
    if (user) {
        try {
            const parsed = JSON.parse(user);
            return parsed.token || null;
        } catch {
            return null;
        }
    }
    return null;
};

// Create headers with optional auth
const createHeaders = (includeAuth: boolean = true, isFormData: boolean = false): HeadersInit => {
    const headers: HeadersInit = {};

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
};

// Generic fetch wrapper with error handling
const fetchApi = async <T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = true
): Promise<ApiResponse<T>> => {
    try {
        const isFormData = options.body instanceof FormData;
        const headers = createHeaders(includeAuth, isFormData);

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {}),
            },
        });

        const data = await response.json();

        if (!response.ok) {
            // Extract error message from various response formats
            let errorMessage = 'Something went wrong';
            if (typeof data.error === 'string') {
                errorMessage = data.error;
            } else if (data.error && typeof data.error === 'object' && data.error.message) {
                errorMessage = data.error.message;
            } else if (typeof data.message === 'string') {
                errorMessage = data.message;
            }

            const error = new Error(errorMessage) as Error & { status?: number };
            error.status = response.status;
            throw error;
        }

        return data;
    } catch (error) {
        // Handle fetch errors (network issues, CORS, server down)
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server. Please make sure the backend is running on port 3000.');
        }
        if (error instanceof Error) {
            throw new Error(error.message || 'Something went wrong');
        }
        throw new Error('Network error. Please check your connection.');
    }
};

// ==================== AUTH API ====================
export const authApi = {
    register: async (name: string, email: string, password: string, role: 'user' | 'creator' = 'user') => {
        return fetchApi<{ user: User; token: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role }),
        }, false);
    },

    login: async (email: string, password: string) => {
        return fetchApi<{ user: User; token: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }, false);
    },

    logout: async () => {
        return fetchApi('/auth/logout', {
            method: 'POST',
        });
    },

    getMe: async () => {
        return fetchApi<{ user: User }>('/auth/me');
    },
};

// ==================== USER API ====================
export const userApi = {
    getProfile: async () => {
        return fetchApi<{ user: User }>('/users/profile');
    },

    updateProfile: async (data: { name?: string; bio?: string; avatar?: string }) => {
        return fetchApi<{ user: User }>('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        return fetchApi('/users/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    getPurchasedCourses: async () => {
        return fetchApi<{ courses: Course[] }>('/users/purchases');
    },
};

// ==================== COURSE API ====================
export interface CourseFilters {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    creator?: string;
    page?: number;
    limit?: number;
    sort?: string;
}

export const courseApi = {
    getCourses: async (filters: CourseFilters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                params.append(key, String(value));
            }
        });
        const query = params.toString();
        return fetchApi<{ courses: Course[]; pagination: ApiResponse['pagination'] }>(
            `/courses${query ? `?${query}` : ''}`,
            {},
            false
        );
    },

    getCourse: async (id: string) => {
        return fetchApi<{ course: CourseWithDetails }>(`/courses/${id}`, {}, false);
    },

    createCourse: async (data: CreateCourseData) => {
        return fetchApi<{ course: Course }>('/courses', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateCourse: async (id: string, data: Partial<CreateCourseData>) => {
        return fetchApi<{ course: Course }>(`/courses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteCourse: async (id: string) => {
        return fetchApi(`/courses/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== SECTION API ====================
export const sectionApi = {
    addSection: async (courseId: string, title: string, order?: number) => {
        return fetchApi<{ section: Section }>(`/courses/${courseId}/sections`, {
            method: 'POST',
            body: JSON.stringify({ title, order }),
        });
    },

    updateSection: async (courseId: string, sectionId: string, title: string, description?: string) => {
        return fetchApi<{ section: Section }>(`/courses/${courseId}/sections/${sectionId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, description }),
        });
    },

    deleteSection: async (courseId: string, sectionId: string) => {
        return fetchApi(`/courses/${courseId}/sections/${sectionId}`, {
            method: 'DELETE',
        });
    },

    reorderSections: async (courseId: string, sectionIds: string[]) => {
        return fetchApi<{ sections: Section[] }>(`/courses/${courseId}/sections/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ sectionIds }),
        });
    },
};

// ==================== VIDEO API ====================
export const videoApi = {
    addVideo: async (courseId: string, sectionId: string, formData: FormData) => {
        return fetchApi<{ video: Video }>(`/courses/${courseId}/sections/${sectionId}/videos`, {
            method: 'POST',
            body: formData,
        });
    },

    updateVideo: async (courseId: string, sectionId: string, videoId: string, data: { title?: string; description?: string; order?: number }) => {
        return fetchApi<{ video: Video }>(`/courses/${courseId}/sections/${sectionId}/videos/${videoId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteVideo: async (courseId: string, sectionId: string, videoId: string) => {
        return fetchApi(`/courses/${courseId}/sections/${sectionId}/videos/${videoId}`, {
            method: 'DELETE',
        });
    },

    getStreamUrl: (videoId: string): string => {
        const token = getToken();
        return `${API_URL}/videos/stream/${videoId}${token ? `?token=${token}` : ''}`;
    },

    getSegmentUrl: (videoId: string, start: number, end: number): string => {
        const params = new URLSearchParams();
        params.append('start', String(Math.max(0, start)));
        params.append('end', String(Math.max(start, end)));
        const token = getToken();
        if (token) {
            params.append('token', token);
        }
        return `${API_URL}/videos/segments/${videoId}?${params.toString()}`;
    },

    getMetadata: async (videoId: string) => {
        return fetchApi<{ metadata: VideoMetadata }>(`/videos/metadata/${videoId}`);
    },
};

// ==================== PURCHASE API ====================
export const purchaseApi = {
    purchaseCourse: async (courseId: string) => {
        return fetchApi<{ purchase: Purchase }>('/purchases', {
            method: 'POST',
            body: JSON.stringify({ courseId }),
        });
    },

    getPurchases: async () => {
        return fetchApi<{ purchases: Purchase[] }>('/purchases');
    },

    checkPurchase: async (courseId: string) => {
        return fetchApi<{ hasPurchased: boolean; purchasedAt: string | null; rating: number | null }>(`/purchases/${courseId}/check`);
    },

    rateCourse: async (courseId: string, rating: number) => {
        return fetchApi<{ rating: number; courseRating: number; ratingsCount: number }>(`/purchases/${courseId}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating }),
        });
    },
};

// ==================== PROGRESS API ====================
export const progressApi = {
    completeVideo: async (courseId: string, videoId: string) => {
        return fetchApi<{ progress: Progress }>('/progress/complete-video', {
            method: 'POST',
            body: JSON.stringify({ courseId, videoId }),
        });
    },

    uncompleteVideo: async (courseId: string, videoId: string) => {
        return fetchApi<{ progress: Progress }>('/progress/uncomplete-video', {
            method: 'DELETE',
            body: JSON.stringify({ courseId, videoId }),
        });
    },

    getCourseProgress: async (courseId: string) => {
        return fetchApi<{ progress: Progress; percentage: number }>(`/progress/${courseId}`);
    },

    updateLastWatched: async (courseId: string, videoId: string) => {
        return fetchApi<{ progress: Progress }>('/progress/last-watched', {
            method: 'PUT',
            body: JSON.stringify({ courseId, videoId }),
        });
    },
};

// ==================== CREATOR API ====================
export const creatorApi = {
    getStats: async () => {
        return fetchApi<{
            totalCourses: number;
            totalStudents: number;
            totalRevenue: number;
            coursesStats: Array<{
                courseId: string;
                title: string;
                students: number;
                revenue: number;
            }>;
        }>('/creator/stats');
    },

    getCourses: async (page?: number, limit?: number) => {
        const params = new URLSearchParams();
        if (page) params.append('page', String(page));
        if (limit) params.append('limit', String(limit));
        const query = params.toString();
        return fetchApi<{ courses: Course[]; pagination: ApiResponse['pagination'] }>(
            `/creator/courses${query ? `?${query}` : ''}`
        );
    },

    getCreatorProfile: async (id: string) => {
        return fetchApi<{ creator: User; courses: Course[] }>(`/courses?creator=${id}`, {}, false);
    },
};

// ==================== UPLOAD API ====================
export const uploadApi = {
    uploadImage: async (file: File): Promise<ApiResponse<{ url: string }>> => {
        const formData = new FormData();
        formData.append('image', file);
        return fetchApi<{ url: string }>('/upload/image', {
            method: 'POST',
            body: formData,
        });
    },
};

// ==================== CATEGORIES API ====================
export const categoriesApi = {
    getCategories: async () => {
        return fetchApi<{ categories: string[] }>('/categories', {}, false);
    },
};

// ==================== TYPES ====================
export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'creator';
    avatar?: string;
    bio?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Course {
    _id: string;
    courseId: string;
    title: string;
    description: string;
    creator: User | string;
    category: string;
    thumbnail?: string;
    price: number;
    published: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Section {
    _id: string;
    title: string;
    course: string;
    order: number;
    videos?: Video[];
    createdAt: string;
    updatedAt: string;
}

export interface Video {
    _id: string;
    videoId: string;
    title: string;
    section: string;
    course: string;
    filename: string;
    duration: number;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface VideoMetadata {
    id: string;
    videoId: string;
    title: string;
    duration: number;
    size: number;
    mimeType: string;
    filename: string;
}

export interface CourseWithDetails extends Course {
    creator: User;
    sections: Section[];
    totalVideos: number;
    totalDuration: number;
}

export interface Purchase {
    _id: string;
    user: string;
    course: Course | string;
    amount: number;
    purchasedAt: string;
}

export interface Progress {
    _id: string;
    user: string;
    course: string;
    completedVideos: string[];
    lastWatchedVideo?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCourseData {
    title: string;
    shortDescription: string;
    description: string;
    category: string;
    thumbnail?: string;
    price: number;
    level?: 'beginner' | 'intermediate' | 'advanced';
    isPublished?: boolean;
}

// Default export
export default {
    auth: authApi,
    user: userApi,
    course: courseApi,
    section: sectionApi,
    video: videoApi,
    purchase: purchaseApi,
    progress: progressApi,
    creator: creatorApi,
    upload: uploadApi,
    categories: categoriesApi,
};
