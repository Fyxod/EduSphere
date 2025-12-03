import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Camera, DollarSign, BookOpen, 
  Users, Star, TrendingUp, ExternalLink, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
import type { Course, Purchase } from '@/types';

interface SocialLinks {
  website: string;
  twitter: string;
  linkedin: string;
  youtube: string;
}

export function CreatorProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getCreatorCourses, getUserPurchases, error, clearError } = useCourses();
  const [isSaving, setIsSaving] = useState(false);
  const [creatorCourses, setCreatorCourses] = useState<Course[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar] = useState(user?.avatar || '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    website: '',
    twitter: '',
    linkedin: '',
    youtube: '',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user || user.role !== 'creator') return;
      setIsLoadingData(true);
      try {
        const [courses, userPurchases] = await Promise.all([
          getCreatorCourses(),
          getUserPurchases(),
        ]);
        setCreatorCourses(courses);
        setPurchases(userPurchases);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [user, getCreatorCourses, getUserPurchases]);

  if (!user || user.role !== 'creator') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You need to be logged in as a creator to view this page.</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const publishedCourses = creatorCourses.filter(c => c.isPublished);
  const totalStudents = creatorCourses.reduce((acc, course) => acc + (course.totalStudents || 0), 0);
  const totalRevenue = purchases
    .filter(p => creatorCourses.some(c => c.id === p.courseId))
    .reduce((acc, p) => {
      const course = creatorCourses.find(c => c.id === p.courseId);
      return acc + (course?.price || 0);
    }, 0);
  const averageRating = creatorCourses.reduce((acc, course) => acc + course.rating, 0) / (creatorCourses.length || 1);

  // Get recent buyers (students who purchased courses)
  const recentBuyers = purchases
    .filter(p => creatorCourses.some(c => c.id === p.courseId))
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
    .slice(0, 10)
    .map(p => ({
      ...p,
      course: creatorCourses.find(c => c.id === p.courseId),
    }));

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // In a real app, this would update the user profile via API
  };

  const stats = [
    {
      title: 'Total Courses',
      value: creatorCourses.length.toString(),
      subtext: `${publishedCourses.length} published`,
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Students',
      value: totalStudents.toLocaleString(),
      subtext: '+12% from last month',
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      subtext: '+8% from last month',
      icon: DollarSign,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Average Rating',
      value: averageRating.toFixed(1),
      subtext: `From ${totalStudents} reviews`,
      icon: Star,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/creator/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Creator Profile</h1>
          <p className="text-muted-foreground">Manage your profile and view statistics</p>
        </div>
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

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold">{stat.value}</h3>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="students">Recent Students</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Picture Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>This will be displayed on your courses</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback className="text-3xl">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold">{name}</h3>
                  <Badge variant="secondary">Creator</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell students about yourself..."
                    className="min-h-24"
                  />
                  <p className="text-xs text-muted-foreground">{bio.length}/500 characters</p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Social Links</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        placeholder="https://yourwebsite.com"
                        value={socialLinks.website}
                        onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter</Label>
                      <Input
                        id="twitter"
                        placeholder="@username"
                        value={socialLinks.twitter}
                        onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        placeholder="linkedin.com/in/username"
                        value={socialLinks.linkedin}
                        onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="youtube">YouTube</Label>
                      <Input
                        id="youtube"
                        placeholder="youtube.com/@channel"
                        value={socialLinks.youtube}
                        onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>All courses you have created</CardDescription>
            </CardHeader>
            <CardContent>
              {creatorCourses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first course to start teaching</p>
                  <Button onClick={() => navigate('/creator/courses/new')}>
                    Create Course
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {creatorCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-24 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{course.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                            {course.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {course.totalStudents || 0} students
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ★ {course.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${course.price}</p>
                        <p className="text-sm text-muted-foreground">
                          {(course.sectionsCount ?? course.sections.length)} sections
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/creator/courses/${course.id}/edit`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Recent Students</CardTitle>
              <CardDescription>Students who recently purchased your courses</CardDescription>
            </CardHeader>
            <CardContent>
              {recentBuyers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No students yet</h3>
                  <p className="text-muted-foreground">When students purchase your courses, they'll appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBuyers.map((buyer) => (
                    <div
                      key={buyer.id}
                      className="flex items-center gap-4 p-4 rounded-lg border"
                    >
                      <Avatar>
                        <AvatarFallback>S</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">Student</p>
                        <p className="text-sm text-muted-foreground">
                          Purchased <span className="font-medium">{buyer.course?.title}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">+${buyer.course?.price || 0}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(buyer.purchasedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
