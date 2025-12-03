import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Star, Users, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCourses } from '@/contexts/CourseContext';
import { categories } from '@/data/mockData';
import { formatDuration } from '@/lib/utils';

export function BrowseCoursesPage() {
  const { courses, fetchCourses, isLoading } = useCourses();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (search) filters.search = search;
    if (selectedCategory && selectedCategory !== 'all') filters.category = selectedCategory;
    if (sortBy) filters.sort = sortBy;
    
    fetchCourses(filters);
  }, [selectedCategory, sortBy, fetchCourses]);

  const handleSearch = () => {
    const filters: Record<string, string> = {};
    if (search) filters.search = search;
    if (selectedCategory && selectedCategory !== 'all') filters.category = selectedCategory;
    if (sortBy) filters.sort = sortBy;
    
    fetchCourses(filters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Courses</h1>
        <p className="text-muted-foreground">
          Discover courses to advance your skills and career
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>

        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No courses found</h2>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-4">
            {courses.length} course{courses.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden group">
                  <CardHeader className="p-0">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-2 left-2">
                        {course.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {course.shortDescription}
                    </p>
                    {course.creator && (
                      <p className="text-xs text-muted-foreground mb-2">
                        By {course.creator.name}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{course.rating?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{course.totalStudents || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(course.totalDuration || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      ${course.price.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {course.level}
                    </Badge>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
