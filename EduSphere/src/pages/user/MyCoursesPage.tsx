import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Play, Clock, Loader2, CheckCircle } from 'lucide-react';
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
import type { Purchase } from '@/types';
import { formatDuration } from '@/lib/utils';

export function MyCoursesPage() {
  const { getUserPurchases, error, clearError } = useCourses();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [userPurchases, setUserPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPurchases = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const purchases = await getUserPurchases();
          setUserPurchases(purchases);
        } catch (err) {
          console.error('Failed to load purchases:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadPurchases();
  }, [user, getUserPurchases]);

  const filteredPurchases = useMemo(() => {
    let filtered = [...userPurchases];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        purchase =>
          purchase.course?.title.toLowerCase().includes(searchLower) ||
          purchase.course?.description.toLowerCase().includes(searchLower)
      );
    }

    // Progress filter
    if (filter === 'in-progress') {
      filtered = filtered.filter(
        purchase => purchase.progress.percentage > 0 && purchase.progress.percentage < 100
      );
    } else if (filter === 'completed') {
      filtered = filtered.filter(purchase => purchase.progress.percentage === 100);
    } else if (filter === 'not-started') {
      filtered = filtered.filter(purchase => purchase.progress.percentage === 0);
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort(
          (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
        );
        break;
      case 'progress':
        filtered.sort((a, b) => b.progress.percentage - a.progress.percentage);
        break;
      case 'alphabetical':
        filtered.sort((a, b) =>
          (a.course?.title || '').localeCompare(b.course?.title || '')
        );
        break;
    }

    return filtered;
  }, [userPurchases, search, filter, sortBy]);

  const stats = useMemo(() => {
    const total = userPurchases.length;
    const completed = userPurchases.filter(p => p.progress.percentage === 100).length;
    const inProgress = userPurchases.filter(
      p => p.progress.percentage > 0 && p.progress.percentage < 100
    ).length;
    const notStarted = userPurchases.filter(p => p.progress.percentage === 0).length;

    return { total, completed, inProgress, notStarted };
  }, [userPurchases]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center justify-between">
          <p className="text-destructive">{error}</p>
          <Button variant="ghost" size="sm" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Courses</h1>
        <p className="text-muted-foreground">
          Track your progress and continue learning
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-500">{stats.notStarted}</p>
            <p className="text-sm text-muted-foreground">Not Started</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="not-started">Not Started</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="progress">By Progress</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-6">
        Showing {filteredPurchases.length} of {userPurchases.length} courses
      </p>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {userPurchases.length === 0 ? "You haven't enrolled in any courses yet" : 'No courses match your filters'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {userPurchases.length === 0
              ? 'Start your learning journey by exploring our courses'
              : 'Try adjusting your search or filters'}
          </p>
          {userPurchases.length === 0 && (
            <Button asChild>
              <Link to="/courses">Browse Courses</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPurchases.map(purchase => (
            <Card key={purchase.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="relative">
                <img
                  src={purchase.course?.thumbnail}
                  alt={purchase.course?.title}
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button asChild>
                    <Link to={`/courses/${purchase.courseId}/learn`}>
                      <Play className="h-4 w-4 mr-2" />
                      {purchase.progress.percentage === 0 ? 'Start Course' : 'Continue'}
                    </Link>
                  </Button>
                </div>
                {purchase.progress.percentage === 100 && (
                  <Badge className="absolute top-3 right-3 bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
                <Badge className="absolute top-3 left-3" variant="secondary">
                  {purchase.course?.category}
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {purchase.course?.title}
                </h3>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(purchase.course?.totalDuration || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {purchase.course?.totalVideos || 0} videos
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${purchase.progress.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium min-w-[3rem] text-right">
                    {purchase.progress.percentage}%
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {purchase.progress.completedVideos.length} of {purchase.course?.totalVideos || 0} lessons completed
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
