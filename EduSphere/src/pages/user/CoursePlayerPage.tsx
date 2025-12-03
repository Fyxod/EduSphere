import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Check, ChevronLeft, ChevronRight, 
  CheckCircle, Circle, List, X, Loader2, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward, Settings,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useCourses } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Course, Purchase } from '@/types';
import { videoApi, progressApi } from '@/services/api';
import type { VideoMetadata } from '@/services/api';

const STREAM_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per request
const FALLBACK_MIME_TYPE = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';

export function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { getCourseById, getUserPurchases, updateProgress, removeProgress, checkPurchase, purchases } = useCourses();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [streamReloadKey, setStreamReloadKey] = useState(0);
  
  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [useMediaSource, setUseMediaSource] = useState(() => typeof window !== 'undefined' && typeof MediaSource !== 'undefined');
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const fileSizeRef = useRef(0);
  const chunkPointerRef = useRef(0);
  const isFetchingChunkRef = useRef(false);
  const pendingSeekByteRef = useRef<number | null>(null);
  const isClearingBufferRef = useRef(false);
  const hasStartedPlaybackRef = useRef(false);
  const mediaSourceCleanupRef = useRef<(() => void) | null>(null);
  const sourceBufferUpdateHandlerRef = useRef<(() => void) | null>(null);
  
  const localPurchase = useMemo(() => {
    if (!courseId) return null;
    return purchases.find((p) => p.courseId === courseId) || null;
  }, [purchases, courseId]);

  const fetchVideoMetadata = useCallback(async (videoId: string): Promise<VideoMetadata> => {
    const response = await videoApi.getMetadata(videoId);
    if (!response.success || !response.data?.metadata) {
      throw new Error('Unable to load video metadata');
    }
    return response.data.metadata;
  }, []);

  const fetchSegment = useCallback(async (videoId: string, start: number, end: number) => {
    const url = videoApi.getSegmentUrl(videoId, start, end);
    const result = await fetch(url);
    if (!result.ok) {
      throw new Error('Failed to fetch video fragment');
    }
    return result.arrayBuffer();
  }, []);

  const cleanupMediaSource = useCallback(() => {
    if (sourceBufferRef.current && sourceBufferUpdateHandlerRef.current) {
      sourceBufferRef.current.removeEventListener('updateend', sourceBufferUpdateHandlerRef.current);
    }

    if (sourceBufferRef.current) {
      try {
        sourceBufferRef.current.abort();
      } catch (error) {
        console.warn('Failed aborting source buffer', error);
      }
      sourceBufferRef.current = null;
    }

    if (mediaSourceCleanupRef.current) {
      mediaSourceCleanupRef.current();
      mediaSourceCleanupRef.current = null;
    }

    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === 'open') {
          mediaSourceRef.current.endOfStream();
        }
      } catch (error) {
        console.warn('Failed closing media source', error);
      }
      mediaSourceRef.current = null;
    }

    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }

    if (sourceBufferUpdateHandlerRef.current) {
      sourceBufferUpdateHandlerRef.current = null;
    }

    fileSizeRef.current = 0;
    chunkPointerRef.current = 0;
    pendingSeekByteRef.current = null;
    isClearingBufferRef.current = false;
    isFetchingChunkRef.current = false;
    hasStartedPlaybackRef.current = false;
  }, []);

  const appendNextChunk = useCallback(async () => {
    if (!useMediaSource) return;
    const activeVideoId = currentVideoId;
    if (!activeVideoId || !sourceBufferRef.current || !mediaSourceRef.current) return;
    if (isFetchingChunkRef.current || sourceBufferRef.current.updating) return;
    if (!fileSizeRef.current) return;

    if (chunkPointerRef.current >= fileSizeRef.current) {
      if (mediaSourceRef.current.readyState === 'open') {
        try {
          mediaSourceRef.current.endOfStream();
        } catch (error) {
          console.warn('Failed to close media source', error);
        }
      }
      return;
    }

    isFetchingChunkRef.current = true;

    try {
      const start = chunkPointerRef.current;
      const end = Math.min(start + STREAM_CHUNK_SIZE - 1, fileSizeRef.current - 1);
      const chunkBuffer = await fetchSegment(activeVideoId, start, end);
      if (!sourceBufferRef.current) {
        return;
      }
      if (activeVideoId !== currentVideoId) {
        return;
      }
      sourceBufferRef.current.appendBuffer(chunkBuffer);
      chunkPointerRef.current = end + 1;
      if (!hasStartedPlaybackRef.current) {
        hasStartedPlaybackRef.current = true;
        setIsVideoLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch video fragment', error);
      setVideoError('Failed to fetch video fragment. Please try again.');
      setIsVideoLoading(false);
    } finally {
      isFetchingChunkRef.current = false;
    }
  }, [currentVideoId, fetchSegment, useMediaSource]);

  const handleSourceBufferUpdateEnd = useCallback(() => {
    if (!useMediaSource) return;
    if (isClearingBufferRef.current) {
      isClearingBufferRef.current = false;
      if (pendingSeekByteRef.current !== null) {
        chunkPointerRef.current = pendingSeekByteRef.current;
        pendingSeekByteRef.current = null;
      }
      appendNextChunk();
      return;
    }

    if (chunkPointerRef.current >= fileSizeRef.current) {
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        try {
          mediaSourceRef.current.endOfStream();
        } catch (error) {
          console.warn('Failed closing media source', error);
        }
      }
      return;
    }

    appendNextChunk();
  }, [appendNextChunk, useMediaSource]);

  const clearSourceBufferForSeek = useCallback(() => {
    if (!useMediaSource || !sourceBufferRef.current || !mediaSourceRef.current) return;
    isClearingBufferRef.current = true;
    try {
      sourceBufferRef.current.abort();
      const removeEnd = mediaSourceRef.current.duration || Number.POSITIVE_INFINITY;
      sourceBufferRef.current.remove(0, removeEnd);
    } catch (error) {
      console.error('Failed to clear buffer for seek', error);
      isClearingBufferRef.current = false;
    }
  }, [useMediaSource]);

  const handleFragmentedSeek = useCallback(() => {
    if (!useMediaSource || !videoRef.current || duration <= 0 || !fileSizeRef.current) return;
    const ratio = videoRef.current.currentTime / duration;
    const targetByte = Math.min(
      fileSizeRef.current - 1,
      Math.max(0, Math.floor(fileSizeRef.current * ratio))
    );
    pendingSeekByteRef.current = targetByte;
    hasStartedPlaybackRef.current = false;
    setIsVideoLoading(true);
    clearSourceBufferForSeek();
  }, [duration, clearSourceBufferForSeek, useMediaSource]);

  // Fetch course and purchase data
  useEffect(() => {
    const loadData = async () => {
      if (!courseId || !user) return;
      
      setPageLoading(true);
      try {
        const [courseData, remotePurchases, hasPurchased] = await Promise.all([
          getCourseById(courseId),
          getUserPurchases(),
          checkPurchase(courseId)
        ]);
        
        setCourse(courseData);
        
        if (hasPurchased && remotePurchases) {
          const userPurchase = remotePurchases.find(p => p.courseId === courseId);
          setPurchase(userPurchase || null);
        }
      } catch (err) {
        console.error('Failed to load course data:', err);
      } finally {
        setPageLoading(false);
      }
    };
    loadData();
  }, [courseId, user, getCourseById, getUserPurchases, checkPurchase]);

  // Flatten all videos for navigation
  const allVideos = useMemo(() => {
    if (!course) return [];
    return course.sections.flatMap(section => 
      section.videos.map(video => ({
        ...video,
        sectionTitle: section.title,
      }))
    );
  }, [course]);

  const currentVideo = useMemo(() => {
    if (!allVideos.length) return null;
    if (!currentVideoId) return allVideos[0];
    return allVideos.find(v => v.id === currentVideoId) || allVideos[0];
  }, [allVideos, currentVideoId]);

  // Set initial video when data loads
  useEffect(() => {
    if (allVideos.length > 0 && !currentVideoId) {
      const lastWatched = purchase?.progress.lastWatchedVideoId;
      setCurrentVideoId(lastWatched || allVideos[0].id);
    }
  }, [allVideos, currentVideoId, purchase]);

  // Video player controls
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      setIsMuted(value === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.muted = false;
        videoRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = percent * duration;
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [duration]);

  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    }
  }, [duration]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  // Handle mouse movement for controls visibility
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleProgress = useCallback(() => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const targetDuration = videoRef.current.duration || duration || 1;
      if (targetDuration > 0) {
        setBuffered(Math.min(100, (bufferedEnd / targetDuration) * 100));
      }
    }
  }, [duration]);

  const handleVideoError = useCallback(() => {
    setVideoError('Failed to load video. Please try again.');
    setIsVideoLoading(false);
  }, []);

  // Update last watched video when video changes
  useEffect(() => {
    if (courseId && currentVideoId) {
      progressApi.updateLastWatched(courseId, currentVideoId).catch(console.error);
    }
  }, [courseId, currentVideoId]);

  // Reset video state when video changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsVideoLoading(true);
    setVideoError(null);
    setBuffered(0);
  }, [currentVideoId, streamReloadKey]);

  useEffect(() => {
    let cancelled = false;

    const initializeStream = async () => {
      if (!currentVideoId || !videoRef.current) return;

      cleanupMediaSource();
      setVideoError(null);
      setIsVideoLoading(true);

      // Helper to fallback to direct streaming
      const fallbackToDirectStream = () => {
        if (cancelled || !videoRef.current) return;
        setUseMediaSource(false);
        const directUrl = videoApi.getStreamUrl(currentVideoId);
        videoRef.current.src = directUrl;
        videoRef.current.load();
      };

      // Check MediaSource support for the video's MIME type
      const canUseMediaSource = useMediaSource && typeof MediaSource !== 'undefined';

      if (!canUseMediaSource) {
        fallbackToDirectStream();
        return;
      }

      try {
        const metadata = await fetchVideoMetadata(currentVideoId);
        if (cancelled) return;

        fileSizeRef.current = metadata.size;
        if (metadata.duration) {
          setDuration(metadata.duration);
        } else if (currentVideo) {
          setDuration(currentVideo.duration);
        }

        // Check if browser supports this MIME type for MediaSource
        const mimeType = metadata.mimeType || FALLBACK_MIME_TYPE;
        const isSupported = MediaSource.isTypeSupported(mimeType) || MediaSource.isTypeSupported('video/mp4');
        
        if (!isSupported) {
          console.warn('MediaSource does not support MIME type, falling back to direct stream');
          fallbackToDirectStream();
          return;
        }

        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;
        const objectUrl = URL.createObjectURL(mediaSource);
        videoObjectUrlRef.current = objectUrl;
        videoRef.current.src = objectUrl;
        videoRef.current.load();

        const handleSourceOpen = () => {
          if (!mediaSourceRef.current || mediaSourceRef.current.readyState !== 'open') return;
          try {
            // Try the reported mimeType first, then fall back to plain video/mp4
            let usedMimeType = mimeType;
            if (!MediaSource.isTypeSupported(usedMimeType)) {
              usedMimeType = 'video/mp4';
            }
            const sourceBuffer = mediaSourceRef.current.addSourceBuffer(usedMimeType);
            sourceBufferRef.current = sourceBuffer;
            const updateHandler = () => handleSourceBufferUpdateEnd();
            sourceBufferUpdateHandlerRef.current = updateHandler;
            sourceBuffer.addEventListener('updateend', updateHandler);
            chunkPointerRef.current = 0;
            pendingSeekByteRef.current = null;
            appendNextChunk();
          } catch (error) {
            console.error('SourceBuffer init failed, falling back to direct stream', error);
            cleanupMediaSource();
            fallbackToDirectStream();
          }
        };

        mediaSource.addEventListener('sourceopen', handleSourceOpen);
        mediaSourceCleanupRef.current = () => {
          mediaSource.removeEventListener('sourceopen', handleSourceOpen);
        };
      } catch (error) {
        if (!cancelled) {
          // Fallback to direct streaming on metadata fetch error
          console.warn('Metadata fetch failed, falling back to direct stream', error);
          fallbackToDirectStream();
        }
      }
    };

    initializeStream();

    return () => {
      cancelled = true;
      cleanupMediaSource();
    };
  }, [currentVideoId, currentVideo, streamReloadKey, appendNextChunk, cleanupMediaSource, fetchVideoMetadata, handleSourceBufferUpdateEnd, useMediaSource]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.addEventListener('seeking', handleFragmentedSeek);
    return () => {
      element.removeEventListener('seeking', handleFragmentedSeek);
    };
  }, [handleFragmentedSeek]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          skip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, skip, handleVolumeChange, volume]);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Button onClick={() => navigate('/dashboard')}>Browse Courses</Button>
        </div>
      </div>
    );
  }

  const activePurchase = purchase || localPurchase;

  if (!activePurchase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">You haven't purchased this course</h1>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>View Course</Button>
        </div>
      </div>
    );
  }

  const currentVideoIndex = currentVideo
    ? allVideos.findIndex(v => v.id === currentVideo.id)
    : -1;
  const previousVideo = currentVideoIndex > 0 ? allVideos[currentVideoIndex - 1] : null;
  const nextVideo = currentVideoIndex >= 0 && currentVideoIndex < allVideos.length - 1
    ? allVideos[currentVideoIndex + 1]
    : null;

  const completedVideos = activePurchase.progress.completedVideos;
  const isVideoCompleted = (videoId: string) => completedVideos.includes(videoId);

  const handleVideoEnd = async () => {
    setIsPlaying(false);
    // Auto-mark as complete when video ends
    if (courseId && currentVideoId && !completedVideos.includes(currentVideoId)) {
      try {
        await updateProgress(courseId, currentVideoId);
        const refreshedPurchases = await getUserPurchases();
        const updatedPurchase = refreshedPurchases.find(p => p.courseId === courseId);
        if (updatedPurchase) {
          setPurchase(updatedPurchase);
        }
      } catch (err) {
        console.error('Failed to auto-mark video complete:', err);
      }
    }
    // Auto-play next video
    if (nextVideo) {
      setCurrentVideoId(nextVideo.id);
    }
  };

  const handleVideoSelect = (videoId: string) => {
    setCurrentVideoId(videoId);
  };

  const handleMarkComplete = async () => {
    if (courseId && currentVideo) {
      setIsMarkingComplete(true);
      try {
        await updateProgress(courseId, currentVideo.id);
        // Refresh purchase data to update completed videos list
        const refreshedPurchases = await getUserPurchases();
        const updatedPurchase = refreshedPurchases.find(p => p.courseId === courseId);
        if (updatedPurchase) {
          setPurchase(updatedPurchase);
        }
      } catch (err) {
        console.error('Failed to mark video complete:', err);
      } finally {
        setIsMarkingComplete(false);
      }
    }
  };

  const handleMarkIncomplete = async () => {
    if (courseId && currentVideo) {
      setIsMarkingComplete(true);
      try {
        await removeProgress(courseId, currentVideo.id);
        // Refresh purchase data to update completed videos list
        const refreshedPurchases = await getUserPurchases();
        const updatedPurchase = refreshedPurchases.find(p => p.courseId === courseId);
        if (updatedPurchase) {
          setPurchase(updatedPurchase);
        }
      } catch (err) {
        console.error('Failed to mark video incomplete:', err);
      } finally {
        setIsMarkingComplete(false);
      }
    }
  };

  const handleNextVideo = () => {
    if (nextVideo) {
      setCurrentVideoId(nextVideo.id);
    }
  };

  const handlePreviousVideo = () => {
    if (previousVideo) {
      setCurrentVideoId(previousVideo.id);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        sidebarOpen ? "mr-0 lg:mr-80" : "mr-0"
      )}>
        {/* Video Player */}
        <div 
          ref={containerRef}
          className="relative bg-black aspect-video group"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Video Element */}
          {currentVideo && (
            <video
              ref={videoRef}
              key={`${currentVideoId}-${streamReloadKey}`}
              className="w-full h-full object-contain"
              preload="metadata"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onProgress={handleProgress}
              onEnded={handleVideoEnd}
              onError={handleVideoError}
              onWaiting={() => setIsVideoLoading(true)}
              onCanPlay={() => setIsVideoLoading(false)}
              onClick={togglePlay}
            />
          )}

          {/* Loading Spinner */}
          {isVideoLoading && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
          )}

          {/* Error State */}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center text-white">
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 mx-auto">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-lg mb-4">{videoError}</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setVideoError(null);
                    setIsVideoLoading(true);
                    cleanupMediaSource();
                    setStreamReloadKey((prev) => prev + 1);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Play/Pause Overlay */}
          {!isPlaying && !isVideoLoading && !videoError && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <div className="h-20 w-20 rounded-full bg-primary/90 flex items-center justify-center shadow-lg hover:bg-primary transition-colors">
                <Play className="h-10 w-10 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Video Controls */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}>
            {/* Progress Bar */}
            <div 
              className="relative h-1 bg-white/30 rounded-full mb-4 cursor-pointer group/progress"
              onClick={handleSeek}
            >
              {/* Buffered */}
              <div 
                className="absolute h-full bg-white/50 rounded-full"
                style={{ width: `${buffered}%` }}
              />
              {/* Progress */}
              <div 
                className="absolute h-full bg-primary rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Seek Knob */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" fill="currentColor" />
                  ) : (
                    <Play className="h-5 w-5" fill="currentColor" />
                  )}
                </Button>

                {/* Skip Back */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => skip(-10)}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                {/* Skip Forward */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => skip(10)}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/volume">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={toggleMute}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-1 accent-primary"
                    />
                  </div>
                </div>

                {/* Time Display */}
                <span className="text-white text-sm ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Playback Speed */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 text-xs"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {playbackRate}x
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <DropdownMenuItem
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={cn(playbackRate === rate && "bg-primary/10")}
                      >
                        {rate}x {rate === 1 && "(Normal)"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Toggle Sidebar Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 transition-opacity duration-300",
              showControls || !isPlaying ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </Button>
        </div>

        {/* Video Controls */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousVideo}
                disabled={!previousVideo}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextVideo}
                disabled={!nextVideo}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <Button
              variant={isVideoCompleted(currentVideo?.id || '') ? 'secondary' : 'default'}
              size="sm"
              onClick={isVideoCompleted(currentVideo?.id || '') ? handleMarkIncomplete : handleMarkComplete}
              disabled={isMarkingComplete}
            >
              {isMarkingComplete ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isVideoCompleted(currentVideo?.id || '') ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Mark as Incomplete
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Complete
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Video Info */}
        <div className="flex-1 overflow-y-auto p-6">
          <span className="text-sm text-muted-foreground">{currentVideo?.sectionTitle}</span>
          <h1 className="text-2xl font-bold mt-1 mb-4">{currentVideo?.title}</h1>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">About this video</h3>
                <p className="text-muted-foreground">
                  {currentVideo?.description || 'No description available for this video.'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <p className="font-medium">{formatDuration(currentVideo?.duration || 0)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Section</span>
                  <p className="font-medium">{currentVideo?.sectionTitle}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Video</span>
                  <p className="font-medium">{currentVideoIndex + 1} of {allVideos.length}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p className="font-medium">
                    {isVideoCompleted(currentVideo?.id || '') ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Completed
                      </span>
                    ) : (
                      <span className="text-muted-foreground">In Progress</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Course Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {completedVideos.length} of {allVideos.length} videos completed
                    </span>
                    <span className="font-medium">{activePurchase.progress.percentage}%</span>
                  </div>
                  <Progress value={activePurchase.progress.percentage} className="h-2" />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="shortcuts" className="space-y-4">
              <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Play/Pause</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>
                    <span className="text-muted-foreground">or</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">K</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Rewind 10s</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Forward 10s</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">→</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Volume Up</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">↑</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Volume Down</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">↓</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Mute/Unmute</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">M</kbd>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>Fullscreen</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">F</kbd>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-80 bg-background border-l transform transition-transform duration-300 z-50 overflow-hidden",
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold line-clamp-1">{course.title}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{activePurchase.progress.percentage}%</span>
              </div>
                <Progress value={activePurchase.progress.percentage} />
            </div>
          </div>

          {/* Course Content */}
          <div className="flex-1 overflow-y-auto">
            <Accordion type="multiple" defaultValue={course.sections.map(s => s.id)}>
              {course.sections.map((section) => {
                const completedCount = section.videos.filter(v => isVideoCompleted(v.id)).length;
                const totalCount = section.videos.length || section.videosCount || 0;

                return (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="text-left">
                        <p className="font-medium text-sm">{section.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {completedCount}/{totalCount} completed
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2">
                      <ul className="space-y-1 px-2">
                        {section.videos.map((video) => {
                          const isActive = video.id === currentVideoId;
                          const isCompleted = isVideoCompleted(video.id);

                          return (
                            <li key={video.id}>
                              <button
                                onClick={() => handleVideoSelect(video.id)}
                                className={cn(
                                  "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors",
                                  isActive ? "bg-primary/10" : "hover:bg-muted"
                                )}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                ) : isActive ? (
                                  <Play className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm line-clamp-2",
                                    isActive && "font-medium text-primary"
                                  )}>
                                    {video.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDuration(video.duration)}
                                  </p>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
