import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Star, Clock, BookOpen, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCourses } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { categories } from '@/data/mockData';
import type { Purchase } from '@/types';
import { formatDuration } from '@/lib/utils';

export function UserDashboard() {
  const { courses, fetchCourses, getUserPurchases, isLoading, error, clearError } = useCourses();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [userPurchases, setUserPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  // Fetch courses and user purchases on mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const loadPurchases = async () => {
      if (user) {
        setPurchasesLoading(true);
        try {
          const purchases = await getUserPurchases();
          setUserPurchases(purchases);
        } catch (err) {
          console.error('Failed to load purchases:', err);
        } finally {
          setPurchasesLoading(false);
        }
      }
    };
    loadPurchases();
  }, [user, getUserPurchases]);

  const purchasedCourseIds = userPurchases.map(p => p.courseId);

  const filteredCourses = useMemo(() => {
    let filtered = courses.filter(course => course.isPublished);

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        course =>
          course.title.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter(course => course.category === category);
    }

    // Level filter
    if (level !== 'all') {
      filtered = filtered.filter(course => course.level === level);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.totalStudents - a.totalStudents);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    return filtered;
  }, [courses, search, category, level, sortBy]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center justify-between">
          <p className="text-destructive">{error}</p>
          <Button variant="ghost" size="sm" onClick={clearError}>Dismiss</Button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore Courses</h1>
        <p className="text-muted-foreground">
          Discover courses from expert instructors and start learning today
        </p>
      </div>

      {/* My Courses Section */}
      {purchasesLoading ? (
        <div className="mb-12 flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : userPurchases.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Continue Learning</h2>
            <Button variant="ghost" asChild>
              <Link to="/my-courses">View All</Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPurchases.slice(0, 3).map((purchase) => (
              <Card key={purchase.id} className="group overflow-hidden">
                <div className="relative">
                  <img
                    src={purchase.course?.thumbnail}
                    alt={purchase.course?.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button asChild>
                      <Link to={`/courses/${purchase.courseId}/learn`}>
                        <Play className="h-4 w-4 mr-2" />
                        Continue
                      </Link>
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-1 mb-2">{purchase.course?.title}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${purchase.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {purchase.progress.percentage}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-6">
        Showing {filteredCourses.length} courses
      </p>

      {/* Course Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => {
            const isPurchased = purchasedCourseIds.includes(course.id);
            
            return (
              <Link
                key={course.id}
                to={isPurchased ? `/courses/${course.id}/learn` : `/courses/${course.id}`}
              >
                <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="relative overflow-hidden">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-3 left-3" variant="secondary">
                      {course.category}
                    </Badge>
                    {isPurchased && (
                      <Badge className="absolute top-3 right-3 bg-green-500">
                        Purchased
                      </Badge>
                    )}
                    <Badge 
                      className="absolute bottom-3 right-3" 
                      variant={course.level === 'beginner' ? 'default' : course.level === 'intermediate' ? 'secondary' : 'outline'}
                    >
                      {course.level}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.shortDescription}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(course.totalDuration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {course.totalVideos} videos
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{course.rating}</span>
                      <span className="text-muted-foreground text-sm">
                        ({course.totalStudents.toLocaleString()})
                      </span>
                    </div>
                    {!isPurchased && (
                      <p className="text-xl font-bold text-primary">${course.price}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        </div>
      )}

      {filteredCourses.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
