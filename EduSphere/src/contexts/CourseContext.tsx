import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Course, Section, Video, Purchase } from '@/types';
import { courseApi, sectionApi, videoApi, purchaseApi, progressApi, creatorApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface CourseContextType {
  courses: Course[];
  purchases: Purchase[];
  isLoading: boolean;
  error: string | null;
  fetchCourses: (filters?: CourseFilters) => Promise<void>;
  addCourse: (course: CreateCourseData) => Promise<Course>;
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  addSection: (courseId: string, title: string, order?: number) => Promise<Section>;
  updateSection: (courseId: string, sectionId: string, title: string, description?: string) => Promise<void>;
  deleteSection: (courseId: string, sectionId: string) => Promise<void>;
  addVideo: (courseId: string, sectionId: string, formData: FormData) => Promise<Video>;
  updateVideo: (courseId: string, sectionId: string, videoId: string, updates: { title?: string; description?: string; order?: number }) => Promise<void>;
  deleteVideo: (courseId: string, sectionId: string, videoId: string) => Promise<void>;
  purchaseCourse: (courseId: string) => Promise<void>;
  getCourseById: (courseId: string) => Promise<Course | null>;
  getCreatorCourses: () => Promise<Course[]>;
  getUserPurchases: () => Promise<Purchase[]>;
  updateProgress: (courseId: string, videoId: string) => Promise<void>;
  removeProgress: (courseId: string, videoId: string) => Promise<void>;
  checkPurchase: (courseId: string) => Promise<boolean>;
  clearError: () => void;
}

interface CourseFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

interface CreateCourseData {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  thumbnail?: string;
  price: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  isPublished?: boolean;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

// Transform API course to frontend Course type
const transformCourse = (apiCourse: Record<string, unknown>): Course => {
  const creator = apiCourse.creator as Record<string, unknown> | string | undefined;
  const courseId = (apiCourse._id as string) || (apiCourse.id as string);

  let computedTotalVideos = 0;
  let computedTotalDuration = 0;

  const sectionsRaw = (apiCourse.sections as Array<Record<string, unknown>>) || [];
  const sections = sectionsRaw.map((section): Section => {
    const sectionId = (section.id as string) || (section._id as string);
    const videosRaw = (section.videos as Array<Record<string, unknown> | string>) || [];

    let sectionDurationFromVideos = 0;
    const videos = videosRaw.map((video): Video => {
      if (typeof video === 'string') {
        return {
          id: video,
          title: '',
          duration: 0,
          url: '',
          order: 0,
          sectionId: sectionId,
        };
      }

      const videoId = (video.id as string) || (video._id as string);
      const duration = Number(video.duration) || 0;
      sectionDurationFromVideos += duration;

      return {
        id: videoId,
        title: (video.title as string) || '',
        description: video.description as string | undefined,
        duration,
        url: `/api/videos/stream/${videoId}`,
        order: Number(video.order) || 0,
        sectionId,
      };
    });

    const providedVideosCount = Number(section.videosCount);
    const videosCount = Number.isFinite(providedVideosCount)
      ? Math.max(providedVideosCount, videos.length)
      : videos.length;

    const providedSectionDuration = Number(section.totalDuration);
    const sectionDuration = Number.isFinite(providedSectionDuration)
      ? Math.max(providedSectionDuration, sectionDurationFromVideos)
      : sectionDurationFromVideos;

    computedTotalVideos += videosCount;
    computedTotalDuration += sectionDuration;

    return {
      id: sectionId,
      title: (section.title as string) || 'Untitled Section',
      description: section.description as string | undefined,
      order: Number(section.order) || 0,
      courseId,
      videos,
      videosCount,
      totalDuration: sectionDuration,
    };
  });

  const providedTotalVideos = Number(
    apiCourse.totalVideos ?? apiCourse.videosCount
  );
  const totalVideos = Number.isFinite(providedTotalVideos)
    ? Math.max(providedTotalVideos, computedTotalVideos)
    : computedTotalVideos;

  const providedTotalDuration = Number(apiCourse.totalDuration);
  const totalDuration = Number.isFinite(providedTotalDuration)
    ? Math.max(providedTotalDuration, computedTotalDuration)
    : computedTotalDuration;

  const totalStudents = Number(
    apiCourse.totalStudents ?? apiCourse.studentsCount
  ) || 0;

  const rating = Number(apiCourse.rating) || 0;

  const rawShortDescription = ((apiCourse.shortDescription as string) || '').trim();
  const fallbackDescription = ((apiCourse.description as string) || '').trim();
  let shortDescription = rawShortDescription.length > 0 ? rawShortDescription : fallbackDescription;
  if (shortDescription.length > 160) {
    shortDescription = `${shortDescription.slice(0, 157)}...`;
  }

  const creatorId =
    typeof creator === 'object' && creator !== null
      ? (creator._id as string)
      : (creator as string) || '';

  const creatorData =
    typeof creator === 'object' && creator !== null
      ? {
          id: creator._id as string,
          name: (creator.name as string) || 'Creator',
          email: creator.email as string,
          role: 'creator' as const,
          avatar:
            (creator.avatar as string) ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${(creator.name as string) || 'Creator'}`,
          bio: creator.bio as string | undefined,
          createdAt: creator.createdAt as string,
          totalCourses: Number.isFinite(Number(creator.totalCourses))
            ? Number(creator.totalCourses)
            : undefined,
          totalStudents: Number.isFinite(Number(creator.totalStudents))
            ? Number(creator.totalStudents)
            : undefined,
          totalRevenue: Number.isFinite(Number(creator.totalRevenue))
            ? Number(creator.totalRevenue)
            : undefined,
          averageRating: Number.isFinite(Number(creator.averageRating))
            ? Number(creator.averageRating)
            : undefined,
        }
      : undefined;

  const providedSectionsCount = Number(apiCourse.sectionsCount);
  const sectionsCount = Number.isFinite(providedSectionsCount)
    ? Math.max(providedSectionsCount, sections.length)
    : sections.length;

  const revenueValue = Number(apiCourse.revenue);
  const revenue = Number.isFinite(revenueValue) ? revenueValue : undefined;

  const allowedLevels: Course['level'][] = ['beginner', 'intermediate', 'advanced'];
  const rawLevel = typeof apiCourse.level === 'string' ? apiCourse.level.toLowerCase() : '';
  const level = allowedLevels.includes(rawLevel as Course['level'])
    ? (rawLevel as Course['level'])
    : 'beginner';

  return {
    id: courseId,
    title: (apiCourse.title as string) || 'Untitled Course',
    description: (apiCourse.description as string) || '',
    shortDescription,
    thumbnail: (apiCourse.thumbnail as string) || '/placeholder-course.jpg',
    price: Number(apiCourse.price) || 0,
    category: (apiCourse.category as string) || 'General',
    level,
    creatorId,
    creator: creatorData,
    sections,
    sectionsCount,
    totalDuration,
    totalVideos,
    totalStudents,
    rating,
    revenue,
    createdAt: (apiCourse.createdAt as string) || new Date().toISOString(),
    updatedAt: (apiCourse.updatedAt as string) || new Date().toISOString(),
    isPublished:
      (apiCourse.isPublished as boolean) ?? (apiCourse.published as boolean) ?? false,
  };
};

// Transform API purchase to frontend Purchase type
const transformPurchase = (apiPurchase: Record<string, unknown>): Purchase => {
  const course = apiPurchase.course as Record<string, unknown> | undefined;
  const fallbackCourseId =
    (apiPurchase.courseId as string) || (apiPurchase.course as string) || '';

  const resolvedCourseId = course
    ? ((course._id as string) || (course.id as string) || (course.courseId as string) || fallbackCourseId)
    : fallbackCourseId;

  const normalizedCourse = course
    ? {
        ...course,
        _id: (course._id as string) || (course.id as string) || (course.courseId as string) || fallbackCourseId,
      }
    : undefined;

  // Extract progress from API response if available
  const apiProgress = apiPurchase.progress as Record<string, unknown> | undefined;
  const completedVideos = (apiProgress?.completedVideos as string[]) || [];
  const percentage = (apiProgress?.percentage as number) || 0;

  return {
    id: (apiPurchase._id as string) || (apiPurchase.id as string),
    courseId: resolvedCourseId,
    userId: (apiPurchase.user as string) || (apiPurchase.userId as string) || '',
    course: normalizedCourse ? transformCourse(normalizedCourse) : undefined,
    purchasedAt: (apiPurchase.purchasedAt as string) || (apiPurchase.createdAt as string) || new Date().toISOString(),
    progress: {
      completedVideos,
      percentage,
    },
  };
};

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchCourses = useCallback(async (filters: CourseFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await courseApi.getCourses(filters);
      if (response.success && response.data?.courses) {
        setCourses((response.data.courses as unknown as Array<Record<string, unknown>>).map(transformCourse));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const addCourse = useCallback(async (data: CreateCourseData): Promise<Course> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await courseApi.createCourse(data);
      if (response.success && response.data) {
        // Backend returns course data directly in response.data, not response.data.course
        const courseData = (response.data as Record<string, unknown>).id ? response.data : (response.data as Record<string, unknown>).course;
        const newCourse = transformCourse(courseData as unknown as Record<string, unknown>);
        setCourses(prev => [...prev, newCourse]);
        return newCourse;
      }
      throw new Error('Failed to create course');
    } catch (err) {
      let message = 'Failed to create course';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errObj = err as Record<string, unknown>;
        if (typeof errObj.message === 'string') {
          message = errObj.message;
        } else if (errObj.error && typeof errObj.error === 'object') {
          const errorInner = errObj.error as Record<string, unknown>;
          if (typeof errorInner.message === 'string') {
            message = errorInner.message;
          }
        }
      }
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCourse = useCallback(async (courseId: string, updates: Partial<Course>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await courseApi.updateCourse(courseId, {
        title: updates.title,
        shortDescription: updates.shortDescription,
        description: updates.description,
        category: updates.category,
        thumbnail: updates.thumbnail,
        price: updates.price,
        isPublished: updates.isPublished,
      });
      if (response.success && response.data?.course) {
        const updatedCourse = transformCourse(response.data.course as unknown as Record<string, unknown>);
        setCourses(prev => prev.map(course => 
          course.id === courseId ? updatedCourse : course
        ));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update course';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCourse = useCallback(async (courseId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await courseApi.deleteCourse(courseId);
      if (response.success) {
        setCourses(prev => prev.filter(course => course.id !== courseId));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete course';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSection = useCallback(async (courseId: string, title: string, order?: number): Promise<Section> => {
    setError(null);
    try {
      const response = await sectionApi.addSection(courseId, title, order);
      if (response.success && response.data) {
        // Backend returns section data directly in response.data
        const apiSection = (response.data as Record<string, unknown>).id ? response.data : (response.data as Record<string, unknown>).section;
        const sectionData = apiSection as unknown as Record<string, unknown>;
        const newSection: Section = {
          id: (sectionData._id as string) || (sectionData.id as string),
          title: sectionData.title as string,
          description: sectionData.description as string | undefined,
          order: sectionData.order as number,
          courseId,
          videos: [],
        };
        setCourses(prev => prev.map(course => {
          if (course.id !== courseId) {
            return course;
          }

          const currentCount = course.sectionsCount ?? course.sections.length;

          return {
            ...course,
            sections: [...course.sections, newSection],
            sectionsCount: currentCount + 1,
          };
        }));
        return newSection;
      }
      throw new Error('Failed to add section');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add section';
      setError(message);
      throw err;
    }
  }, []);

  const updateSection = useCallback(async (courseId: string, sectionId: string, title: string, description?: string): Promise<void> => {
    setError(null);
    try {
      const response = await sectionApi.updateSection(courseId, sectionId, title, description);
      if (response.success) {
        setCourses(prev => prev.map(course => ({
          ...course,
          sections: course.sections.map(section =>
            section.id === sectionId ? { ...section, title, description } : section
          ),
        })));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update section';
      setError(message);
      throw err;
    }
  }, []);

  const deleteSection = useCallback(async (courseId: string, sectionId: string): Promise<void> => {
    setError(null);
    try {
      const response = await sectionApi.deleteSection(courseId, sectionId);
      if (response.success) {
        setCourses(prev => prev.map(course => {
          if (course.id !== courseId) {
            return course;
          }

          const sectionToRemove = course.sections.find(section => section.id === sectionId);
          const removedVideosCount = sectionToRemove
            ? sectionToRemove.videosCount ?? sectionToRemove.videos.length
            : 0;
          const removedDuration = sectionToRemove
            ? sectionToRemove.totalDuration ??
              sectionToRemove.videos.reduce((acc, video) => acc + (video.duration || 0), 0)
            : 0;

          const remainingSections = course.sections.filter(section => section.id !== sectionId);
          const currentCount = course.sectionsCount ?? course.sections.length;

          return {
            ...course,
            sections: remainingSections,
            sectionsCount: Math.max(0, currentCount - 1),
            totalVideos: Math.max(0, course.totalVideos - removedVideosCount),
            totalDuration: Math.max(0, course.totalDuration - removedDuration),
          };
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete section';
      setError(message);
      throw err;
    }
  }, []);

  const addVideo = useCallback(async (courseId: string, sectionId: string, formData: FormData): Promise<Video> => {
    setError(null);
    try {
      const response = await videoApi.addVideo(courseId, sectionId, formData);
      if (response.success && response.data) {
        // Backend returns video data directly in response.data
        const apiVideo = (response.data as Record<string, unknown>).id ? response.data : (response.data as Record<string, unknown>).video;
        const videoData = apiVideo as unknown as Record<string, unknown>;
        const newVideo: Video = {
          id: (videoData._id as string) || (videoData.id as string),
          title: videoData.title as string,
          description: videoData.description as string | undefined,
          duration: videoData.duration as number,
          url: videoData.url as string || `/api/videos/stream/${(videoData._id as string) || (videoData.id as string)}`,
          order: videoData.order as number,
          sectionId: sectionId,
        };
        
        setCourses(prev => prev.map(course => {
          if (course.id !== courseId) return course;

          return {
            ...course,
            sections: course.sections.map(section => {
              if (section.id !== sectionId) {
                return section;
              }

              const updatedVideos = [...section.videos, newVideo];
              const baseVideosCount = section.videosCount ?? section.videos.length;
              const baseDuration = section.totalDuration ?? section.videos.reduce((acc, video) => acc + (video.duration || 0), 0);

              return {
                ...section,
                videos: updatedVideos,
                videosCount: baseVideosCount + 1,
                totalDuration: baseDuration + newVideo.duration,
              };
            }),
            totalVideos: course.totalVideos + 1,
            totalDuration: course.totalDuration + newVideo.duration,
          };
        }));
        
        return newVideo;
      }
      throw new Error('Failed to add video');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add video';
      setError(message);
      throw err;
    }
  }, []);

  const updateVideo = useCallback(async (courseId: string, sectionId: string, videoId: string, updates: { title?: string; description?: string; order?: number }): Promise<void> => {
    setError(null);
    try {
      const response = await videoApi.updateVideo(courseId, sectionId, videoId, updates);
      if (response.success) {
        setCourses(prev => prev.map(course => ({
          ...course,
          sections: course.sections.map(section => ({
            ...section,
            videos: section.videos.map(video =>
              video.id === videoId ? { ...video, ...updates } : video
            ),
          })),
        })));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update video';
      setError(message);
      throw err;
    }
  }, []);

  const deleteVideo = useCallback(async (courseId: string, sectionId: string, videoId: string): Promise<void> => {
    setError(null);
    try {
      const response = await videoApi.deleteVideo(courseId, sectionId, videoId);
      if (response.success) {
        setCourses(prev => prev.map(course => {
          if (course.id !== courseId) {
            return course;
          }

          let removedDuration = 0;
          let removed = false;

          const updatedSections = course.sections.map(section => {
            if (section.id !== sectionId) {
              return section;
            }

            const videoToRemove = section.videos.find(v => v.id === videoId);
            const remainingVideos = section.videos.filter(v => v.id !== videoId);

            if (videoToRemove) {
              removedDuration = videoToRemove.duration || 0;
              removed = true;
            }

            const baseVideosCount = section.videosCount ?? section.videos.length;
            const baseDuration = section.totalDuration ?? section.videos.reduce((acc, video) => acc + (video.duration || 0), 0);

            return {
              ...section,
              videos: remainingVideos,
              videosCount: Math.max(0, baseVideosCount - (videoToRemove ? 1 : 0)),
              totalDuration: Math.max(0, baseDuration - (videoToRemove ? videoToRemove.duration || 0 : 0)),
            };
          });

          return {
            ...course,
            sections: updatedSections,
            totalVideos: Math.max(0, course.totalVideos - (removed ? 1 : 0)),
            totalDuration: Math.max(0, course.totalDuration - removedDuration),
          };
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete video';
      setError(message);
      throw err;
    }
  }, []);

  const purchaseCourse = useCallback(async (courseId: string): Promise<void> => {
    setError(null);
    try {
      const response = await purchaseApi.purchaseCourse(courseId);
      if (response.success && response.data) {
        const data = response.data as Record<string, unknown>;
        const purchasePayload = (data.purchase as Record<string, unknown>) || data;
        const apiPurchase = purchasePayload as Record<string, unknown>;
        const newPurchase: Purchase = {
          id: (apiPurchase._id as string) || (apiPurchase.id as string),
          courseId: (apiPurchase.course as string) || (apiPurchase.courseId as string) || courseId,
          userId: (apiPurchase.user as string) || (apiPurchase.userId as string) || '',
          purchasedAt: (apiPurchase.purchasedAt as string) || (apiPurchase.createdAt as string) || new Date().toISOString(),
          progress: {
            completedVideos: [],
            percentage: 0,
          },
        };
        setPurchases(prev => [...prev, newPurchase]);
        setCourses(prev => prev.map(course => 
          course.id === courseId 
            ? { ...course, totalStudents: course.totalStudents + 1 }
            : course
        ));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to purchase course';
      setError(message);
      throw err;
    }
  }, []);

  const getCourseById = useCallback(async (courseId: string): Promise<Course | null> => {
    // First check local cache
    const localCourse = courses.find(c => c.id === courseId);
    const hasInlineVideos = localCourse?.sections.some(section => section.videos && section.videos.length > 0) ?? false;
    if (localCourse && hasInlineVideos) {
      return localCourse;
    }
    
    // Fetch from API
    try {
      const response = await courseApi.getCourse(courseId);
      if (response.success && response.data) {
        // Backend returns course data directly in response.data, not response.data.course
        const courseData = (response.data as Record<string, unknown>).id ? response.data : response.data.course;
        const course = transformCourse(courseData as unknown as Record<string, unknown>);
        // Update local cache
        setCourses(prev => {
          const exists = prev.find(c => c.id === courseId);
          if (exists) {
            return prev.map(c => c.id === courseId ? course : c);
          }
          return [...prev, course];
        });
        return course;
      }
      return localCourse ?? null;
    } catch {
      return localCourse ?? null;
    }
  }, [courses]);

  const getCreatorCourses = useCallback(async (): Promise<Course[]> => {
    try {
      const response = await creatorApi.getCourses();
      if (response.success && response.data?.courses) {
        return (response.data.courses as unknown as Array<Record<string, unknown>>).map(transformCourse);
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const getUserPurchases = useCallback(async (): Promise<Purchase[]> => {
    try {
      const response = await purchaseApi.getPurchases();
      if (response.success && response.data?.purchases) {
        const purchaseList = (response.data.purchases as unknown as Array<Record<string, unknown>>).map(transformPurchase);
        setPurchases(purchaseList);
        return purchaseList;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      getUserPurchases();
    } else {
      setPurchases([]);
    }
  }, [isAuthenticated, getUserPurchases]);

  const updateProgress = useCallback(async (courseId: string, videoId: string): Promise<void> => {
    try {
      const response = await progressApi.completeVideo(courseId, videoId);
      if (response.success && response.data?.progress) {
        const apiProgress = response.data.progress as unknown as Record<string, unknown>;
        const completedVideos = apiProgress.completedVideos as string[];
        
        setPurchases(prev => prev.map(purchase => {
          if (purchase.courseId !== courseId) return purchase;
          
          const course = courses.find(c => c.id === courseId);
          const totalVideos = course?.totalVideos || 1;
          const percentage = Math.round((completedVideos.length / totalVideos) * 100);
          
          return {
            ...purchase,
            progress: {
              completedVideos,
              lastWatchedVideoId: videoId,
              percentage,
            },
          };
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update progress';
      setError(message);
    }
  }, [courses]);

  const removeProgress = useCallback(async (courseId: string, videoId: string): Promise<void> => {
    try {
      const response = await progressApi.uncompleteVideo(courseId, videoId);
      if (response.success) {
        setPurchases(prev => prev.map(purchase => {
          if (purchase.courseId !== courseId) return purchase;
          
          const completedVideos = purchase.progress.completedVideos.filter(id => id !== videoId);
          const course = courses.find(c => c.id === courseId);
          const totalVideos = course?.totalVideos || 1;
          const percentage = Math.round((completedVideos.length / totalVideos) * 100);
          
          return {
            ...purchase,
            progress: {
              ...purchase.progress,
              completedVideos,
              percentage,
            },
          };
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove progress';
      setError(message);
    }
  }, [courses]);

  const checkPurchase = useCallback(async (courseId: string): Promise<boolean> => {
    try {
      const response = await purchaseApi.checkPurchase(courseId);
      if (!response.success || !response.data) {
        return false;
      }

      const data = response.data as Record<string, unknown>;
      if (typeof data.hasPurchased === 'boolean') {
        return data.hasPurchased;
      }

      if (typeof data.purchased === 'boolean') {
        return data.purchased;
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  return (
    <CourseContext.Provider value={{
      courses,
      purchases,
      isLoading,
      error,
      fetchCourses,
      addCourse,
      updateCourse,
      deleteCourse,
      addSection,
      updateSection,
      deleteSection,
      addVideo,
      updateVideo,
      deleteVideo,
      purchaseCourse,
      getCourseById,
      getCreatorCourses,
      getUserPurchases,
      updateProgress,
      removeProgress,
      checkPurchase,
      clearError,
    }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
}
