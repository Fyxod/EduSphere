export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    bio?: string;
    role: 'user' | 'creator';
    createdAt: string;
    token?: string;
}

export interface Creator extends User {
    role: 'creator';
    bio?: string;
    totalCourses?: number;
    totalStudents?: number;
    totalRevenue?: number;
    averageRating?: number;
}

export interface Student extends User {
    role: 'user';
    purchasedCourses: string[];
}

export interface Video {
    id: string;
    title: string;
    description?: string;
    duration: number;
    url: string;
    order: number;
    sectionId: string;
}

export interface Section {
    id: string;
    title: string;
    description?: string;
    order: number;
    courseId: string;
    videos: Video[];
    videosCount?: number;
    totalDuration?: number;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    shortDescription: string;
    thumbnail: string;
    price: number;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    creatorId: string;
    creator?: Creator;
    sections: Section[];
    sectionsCount?: number;
    totalDuration: number;
    totalVideos: number;
    totalStudents: number;
    rating: number;
    revenue?: number;
    createdAt: string;
    updatedAt: string;
    isPublished: boolean;
}

export interface Purchase {
    id: string;
    courseId: string;
    userId: string;
    user?: User;
    course?: Course;
    purchasedAt: string;
    progress: {
        completedVideos: string[];
        lastWatchedVideoId?: string;
        percentage: number;
    };
}

export interface CourseFilters {
    search?: string;
    category?: string;
    level?: string;
    sortBy?: 'newest' | 'oldest' | 'popular' | 'alphabetical' | 'price-low' | 'price-high';
    priceRange?: {
        min: number;
        max: number;
    };
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
