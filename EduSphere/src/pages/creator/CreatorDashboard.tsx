import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, BookOpen, Users, DollarSign, TrendingUp,
  MoreVertical, Edit, Trash, Eye, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
import type { Course } from '@/types';

export function CreatorDashboard() {
  const { user } = useAuth();
  const { getCreatorCourses, deleteCourse, isLoading, error, clearError } = useCourses();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const creatorCourses = await getCreatorCourses();
        setCourses(creatorCourses);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    loadCourses();
  }, [getCreatorCourses]);

  if (!user) return null;

  const totalStudents = courses.reduce((acc, course) => acc + (course.totalStudents || 0), 0);
  const totalRevenue = courses.reduce(
    (acc, course) => acc + (course.revenue ?? course.price * (course.totalStudents || 0)),
    0
  );
  const publishedCourses = courses.filter(c => c.isPublished).length;

  const stats = [
    { 
      icon: BookOpen, 
      label: 'Total Courses', 
      value: courses.length,
      description: `${publishedCourses} published`,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      icon: Users, 
      label: 'Total Students', 
      value: totalStudents.toLocaleString(),
      description: 'Enrolled in your courses',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      icon: DollarSign, 
      label: 'Total Revenue', 
      value: `$${totalRevenue.toLocaleString()}`,
      description: 'Lifetime earnings',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    { 
      icon: TrendingUp, 
      label: 'Avg. Rating', 
      value: courses.length > 0 
        ? (courses.reduce((acc, c) => acc + c.rating, 0) / courses.length).toFixed(1)
        : '0',
      description: 'Across all courses',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
  ];

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      setIsDeleting(courseId);
      try {
        await deleteCourse(courseId);
        setCourses(courses.filter(c => c.id !== courseId));
      } catch (err) {
        console.error('Failed to delete course:', err);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage your courses and track performance</p>
        </div>
        <Button asChild>
          <Link to="/creator/courses/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="ghost" size="sm" onClick={clearError}>Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Courses Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Courses</CardTitle>
            <Badge variant="secondary">{courses.length} courses</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first course and start sharing your knowledge
              </p>
              <Button asChild>
                <Link to="/creator/courses/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div 
                  key={course.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-20 w-32 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{course.title}</h3>
                      <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {course.shortDescription}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{course.totalVideos} videos</span>
                      <span>{course.sectionsCount ?? course.sections.length} sections</span>
                      <span>{course.totalStudents} students</span>
                      <span>${course.price}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/courses/${course.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/creator/courses/${course.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/creator/courses/${course.id}/students`}>
                          <Users className="h-4 w-4 mr-2" />
                          Students
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={isDeleting === course.id}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        {isDeleting === course.id ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
