import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, Clock, Users, BookOpen, Play, Check, ShoppingCart, 
  Award, Globe, Shield, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useCourses } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Course } from '@/types';
import { formatDuration } from '@/lib/utils';
import { purchaseApi } from '@/services/api';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses, purchases, getCourseById, purchaseCourse, checkPurchase } = useCourses();
  const { isAuthenticated, user } = useAuth();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const hasLocalPurchase = useMemo(() => {
    if (!courseId) return false;
    return purchases.some((purchase) => purchase.courseId === courseId);
  }, [purchases, courseId]);

  const instructorStats = useMemo(() => {
    if (!course) {
      return {
        totalCourses: 0,
        totalStudents: 0,
        averageRating: 0,
      };
    }

    const createdByInstructor = courses.filter((c) => c.creatorId === course.creatorId);
    const combined = createdByInstructor.some((c) => c.id === course.id)
      ? createdByInstructor
      : [...createdByInstructor, course];

    if (combined.length === 0) {
      return {
        totalCourses: 1,
        totalStudents: course.totalStudents || 0,
        averageRating: course.rating || 0,
      };
    }

    const totalCoursesCount = combined.length;
    const totalStudentsCount = combined.reduce(
      (acc, current) => acc + (current.totalStudents || 0),
      0
    );
    const averageRating = totalCoursesCount
      ? combined.reduce((acc, current) => acc + (current.rating || 0), 0) /
        totalCoursesCount
      : 0;

    return {
      totalCourses: totalCoursesCount,
      totalStudents: totalStudentsCount,
      averageRating,
    };
  }, [course, courses]);

  // Fetch course and purchase status
  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;

      setPageLoading(true);
      try {
        const courseData = await getCourseById(courseId);
        setCourse(courseData);

        if (courseData && isAuthenticated && user && user.id !== courseData.creatorId) {
          const purchaseStatus = await checkPurchase(courseId);
          setIsPurchased(purchaseStatus || hasLocalPurchase);
          
          // Fetch user's rating
          try {
            const response = await purchaseApi.checkPurchase(courseId);
            if (response.data?.rating) {
              setUserRating(response.data.rating);
            }
          } catch {
            // Ignore rating fetch errors
          }
        } else {
          setIsPurchased(false);
        }
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setPageLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, getCourseById, checkPurchase, isAuthenticated, user, hasLocalPurchase]);

  useEffect(() => {
    if (hasLocalPurchase) {
      setIsPurchased(true);
    }
  }, [hasLocalPurchase]);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Button onClick={() => navigate('/dashboard')}>Browse Courses</Button>
      </div>
    );
  }

  const isCreator = Boolean(user && user.role === 'creator' && user.id === course.creatorId);
  const sectionsCount = course.sectionsCount ?? course.sections.length;
  const hasPurchase = isPurchased || hasLocalPurchase;

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate('/login?role=user');
      return;
    }

    if (!course) return;

    if (isCreator) {
      setShowPurchaseDialog(false);
      return;
    }

    setIsPurchasing(true);
    try {
      await purchaseCourse(course.id);
      setIsPurchased(true);
      setShowPurchaseDialog(false);
      navigate(`/courses/${course.id}/learn`);
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRating = async (rating: number) => {
    if (!course || !courseId) return;
    
    setIsSubmittingRating(true);
    try {
      const response = await purchaseApi.rateCourse(courseId, rating);
      if (response.success && response.data) {
        setUserRating(rating);
        // Update course rating in state
        setCourse(prev => prev ? {
          ...prev,
          rating: response.data!.courseRating,
        } : null);
      }
    } catch (err) {
      console.error('Rating failed:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const features = [
    { icon: Clock, text: `${formatDuration(course.totalDuration)} of content` },
    {
      icon: BookOpen,
      text: `${sectionsCount} section${sectionsCount === 1 ? '' : 's'} • ${course.totalVideos} video${course.totalVideos === 1 ? '' : 's'}`,
    },
    { icon: Globe, text: 'Access anywhere' },
    { icon: Award, text: 'Certificate of completion' },
    { icon: Shield, text: 'Lifetime access' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-linear-to-r from-gray-900 to-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Badge className="mb-4">{course.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-gray-300 mb-6">{course.shortDescription}</p>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">{course.rating?.toFixed(1)}</span>
                  <span className="text-gray-400">
                    ({course.totalStudents.toLocaleString()} students)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="h-4 w-4" />
                  {formatDuration(course.totalDuration)}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <BookOpen className="h-4 w-4" />
                  {course.totalVideos} videos
                </div>
                <Badge variant="outline" className="border-gray-500 text-gray-300">
                  {course.level}
                </Badge>
              </div>

              <p className="text-gray-400">
                {isCreator ? (
                  <span className="text-primary font-medium">Created by you</span>
                ) : (
                  <>
                    Created by{' '}
                    <span className="text-primary font-medium">
                      {course.creator?.name ?? 'Unknown creator'}
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Purchase Card (Desktop) */}
            <div className="hidden lg:block">
              <Card className="sticky top-24">
                <div className="relative">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-lg">
                    <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold">${course.price}</span>
                  </div>

                  {isCreator ? (
                    <Button className="w-full mb-4" size="lg" variant="outline" disabled>
                      Created by you
                    </Button>
                  ) : hasPurchase ? (
                    <Button className="w-full mb-4" size="lg" asChild>
                      <Link to={`/courses/${course.id}/learn`}>
                        <Play className="h-4 w-4 mr-2" />
                        Continue Learning
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      className="w-full mb-4" 
                      size="lg"
                      onClick={() => setShowPurchaseDialog(true)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                  )}

                  <Separator className="my-4" />

                  <h4 className="font-semibold mb-3">This course includes:</h4>
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <feature.icon className="h-4 w-4 text-primary" />
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Purchase Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">${course.price}</p>
          </div>
          {isCreator ? (
            <Button variant="outline" disabled>
              Created by you
            </Button>
          ) : hasPurchase ? (
            <Button asChild>
              <Link to={`/courses/${course.id}/learn`}>
                <Play className="h-4 w-4 mr-2" />
                Continue
              </Link>
            </Button>
          ) : (
            <Button onClick={() => setShowPurchaseDialog(true)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy Now
            </Button>
          )}
        </div>
      </div>

      {/* Course Content */}
      <div className="container mx-auto px-4 py-12 pb-24 lg:pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section>
              <h2 className="text-2xl font-bold mb-4">About this course</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                {course.description}
              </p>
            </section>

            {/* What you'll learn */}
            <section>
              <h2 className="text-2xl font-bold mb-4">What you'll learn</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  'Build real-world projects from scratch',
                  'Master modern development techniques',
                  'Learn industry best practices',
                  'Get hands-on experience',
                  'Build a professional portfolio',
                  'Prepare for job interviews',
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Course Content */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Course Content</h2>
                <p className="text-sm text-muted-foreground">
                  {sectionsCount} sections • {course.totalVideos} videos • {formatDuration(course.totalDuration)}
                </p>
              </div>

              <Accordion type="multiple" className="border rounded-lg">
                {course.sections.map((section) => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-semibold">{section.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {(section.videosCount ?? section.videos.length)} videos
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <ul className="space-y-2">
                        {section.videos.map((video) => (
                          <li key={video.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <Play className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{video.title}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDuration(video.duration)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Rate This Course - only show for purchased courses */}
            {hasPurchase && !isCreator && (
              <section>
                <h2 className="text-2xl font-bold mb-4">Rate This Course</h2>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <p className="text-muted-foreground mb-4">
                        {userRating 
                          ? "Thanks for your feedback! You can update your rating anytime."
                          : "How would you rate this course? Your feedback helps other learners."
                        }
                      </p>
                      <div className="flex gap-2 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            disabled={isSubmittingRating}
                            className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
                          >
                            <Star 
                              className={`h-8 w-8 transition-colors ${
                                (hoverRating !== null ? star <= hoverRating : star <= (userRating || 0))
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                      {userRating && (
                        <p className="text-sm text-muted-foreground">
                          Your rating: {userRating} star{userRating !== 1 ? 's' : ''}
                        </p>
                      )}
                      {isSubmittingRating && (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Submitting...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Instructor */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Instructor</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={course.creator?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${course.creator?.name ?? 'Instructor'}`}
                      alt={course.creator?.name ?? 'Instructor'}
                      className="h-20 w-20 rounded-full"
                    />
                    <div>
                      <h3 className="text-lg font-semibold">{isCreator ? 'You' : course.creator?.name ?? 'Instructor'}</h3>
                      <p className="text-muted-foreground text-sm mb-2">
                        {course.creator?.bio || 'This instructor has not added a bio yet.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {instructorStats.averageRating
                            ? `${instructorStats.averageRating.toFixed(1)} rating`
                            : 'No ratings yet'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {instructorStats.totalStudents.toLocaleString()} students
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {instructorStats.totalCourses.toLocaleString()} courses
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>
              You're about to purchase "{course.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="h-20 w-32 object-cover rounded-lg"
              />
              <div>
                <h4 className="font-semibold">{course.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {isCreator ? 'By you' : `By ${course.creator?.name ?? 'Unknown creator'}`}
                </p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center">
              <span>Total</span>
              <span className="text-2xl font-bold">${course.price}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={isPurchasing || isCreator}>
              {isCreator ? 'Created by you' : isPurchasing ? 'Processing...' : 'Complete Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
