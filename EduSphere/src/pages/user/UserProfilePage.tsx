import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, Calendar, BookOpen, Award, 
  Settings, Camera, Play, Clock, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
import type { Purchase } from '@/types';
import { formatDuration } from '@/lib/utils';

export function UserProfilePage() {
  const { user } = useAuth();
  const { getUserPurchases } = useCourses();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  useEffect(() => {
    const loadPurchases = async () => {
      if (!user) return;
      
      setPurchasesLoading(true);
      try {
        const userPurchases = await getUserPurchases();
        setPurchases(userPurchases);
      } catch (err) {
        console.error('Failed to load purchases:', err);
      } finally {
        setPurchasesLoading(false);
      }
    };
    loadPurchases();
  }, [user, getUserPurchases]);

  if (!user) {
    return null;
  }

  const completedCourses = purchases.filter(p => p.progress.percentage === 100);
  const inProgressCourses = purchases.filter(p => p.progress.percentage > 0 && p.progress.percentage < 100);

  const stats = [
    { icon: BookOpen, label: 'Enrolled Courses', value: purchases.length },
    { icon: Award, label: 'Completed', value: completedCourses.length },
    { icon: Play, label: 'In Progress', value: inProgressCourses.length },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute bottom-0 right-0 rounded-full"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-1 justify-center md:justify-start">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
                <div className="flex items-center gap-1 justify-center md:justify-start">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Courses Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Courses ({purchases.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgressCourses.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedCourses.length})</TabsTrigger>
        </TabsList>

        {purchasesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TabsContent value="all">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchases.map((purchase) => (
                  <CourseCard key={purchase.id} purchase={purchase} />
                ))}
          </div>
          {purchases.length === 0 && (
            <EmptyState 
              message="You haven't enrolled in any courses yet"
              action={{ label: "Browse Courses", href: "/dashboard" }}
            />
          )}
            </TabsContent>

            <TabsContent value="in-progress">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressCourses.map((purchase) => (
                  <CourseCard key={purchase.id} purchase={purchase} />
                ))}
              </div>
              {inProgressCourses.length === 0 && (
                <EmptyState message="No courses in progress" />
              )}
            </TabsContent>

            <TabsContent value="completed">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCourses.map((purchase) => (
                  <CourseCard key={purchase.id} purchase={purchase} />
                ))}
              </div>
              {completedCourses.length === 0 && (
                <EmptyState message="No completed courses yet" />
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

interface CourseCardProps {
  purchase: {
    id: string;
    courseId: string;
    course?: {
      id: string;
      title: string;
      thumbnail: string;
      totalDuration: number;
      totalVideos: number;
    };
    progress: {
      percentage: number;
      completedVideos: string[];
    };
  };
}

function CourseCard({ purchase }: CourseCardProps) {
  if (!purchase.course) return null;

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={purchase.course.thumbnail}
          alt={purchase.course.title}
          className="w-full h-40 object-cover"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button asChild>
            <Link to={`/courses/${purchase.course.id}/learn`}>
              <Play className="h-4 w-4 mr-2" />
              Continue
            </Link>
          </Button>
        </div>
        {purchase.progress.percentage === 100 && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            Completed
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-2 mb-3">{purchase.course.title}</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(purchase.course.totalDuration)}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {purchase.course.totalVideos} videos
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{purchase.progress.percentage}%</span>
          </div>
          <Progress value={purchase.progress.percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  message: string;
  action?: {
    label: string;
    href: string;
  };
}

function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {action && (
        <Button asChild>
          <Link to={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
