import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Award, Play, Star, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/contexts/CourseContext';

export function LandingPage() {
  const { courses } = useCourses();
  const featuredCourses = courses.slice(0, 3);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const totalCourses = courses.length;
  const totalStudents = courses.reduce((acc, course) => acc + (course.totalStudents || 0), 0);
  const uniqueCreators = new Set(courses.map(course => course.creatorId).filter(Boolean)).size;
  const averageRating = courses.length
    ? courses.reduce((acc, course) => acc + (course.rating || 0), 0) / courses.length
    : 0;

  const stats = [
    { value: formatCompact(totalStudents), label: totalStudents === 1 ? 'Learner' : 'Learners' },
    { value: totalCourses.toLocaleString(), label: totalCourses === 1 ? 'Course' : 'Courses' },
    { value: uniqueCreators.toLocaleString(), label: uniqueCreators === 1 ? 'Creator' : 'Creators' },
    { value: averageRating ? averageRating.toFixed(1) : 'N/A', label: 'Average Rating' },
  ];

  const headlineLearnerCount = totalStudents ? formatCompact(totalStudents) : 'New';

  const features = [
    {
      icon: BookOpen,
      title: 'Learn at Your Pace',
      description: 'Access courses anytime, anywhere. Learn on your schedule with lifetime access to purchased courses.',
    },
    {
      icon: Users,
      title: 'Expert Instructors',
      description: 'Learn from industry experts who bring real-world experience and practical knowledge to every lesson.',
    },
    {
      icon: Award,
      title: 'Earn Certificates',
      description: 'Complete courses and earn certificates to showcase your new skills to employers and clients.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-primary/5 via-background to-background py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <Badge className="mb-4" variant="secondary">
                <Sparkles className="w-3 h-3 mr-1" />
                Start learning today
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Unlock Your Potential with{' '}
                <span className="bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  EduSphere
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
                Transform your career with world-class online courses. Learn from industry experts, 
                build real-world skills, and join a community of millions of learners.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="xl" asChild>
                  <Link to="/register">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/courses">
                    <Play className="mr-2 h-5 w-5" />
                    Browse Courses
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800"
                  alt="Students learning"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                        <Play className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Join {headlineLearnerCount} learners</p>
                        <p className="text-white/70 text-sm">Start your journey today</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Choose Your Path Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Path</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you want to learn new skills or share your expertise, EduSphere has you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
              <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">I want to Learn</h3>
                <p className="text-muted-foreground mb-6">
                  Access thousands of courses from top instructors. Learn at your own pace and earn certificates.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                    Unlimited course access
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                    Learn from experts
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                    Track your progress
                  </li>
                </ul>
                <Button asChild className="w-full">
                  <Link to="/register?role=user">
                    Start Learning
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
              <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">I want to Teach</h3>
                <p className="text-muted-foreground mb-6">
                  Share your knowledge with the world. Create courses, build your audience, and earn money.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                    Easy course creation
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                    Reach millions of students
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                    Earn from your expertise
                  </li>
                </ul>
                <Button asChild className="w-full">
                  <Link to="/register?role=creator">
                    Start Teaching
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose EduSphere?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We provide the tools and resources you need to succeed in your learning journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Courses</h2>
              <p className="text-muted-foreground">Explore our most popular courses</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/courses">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.map((course) => (
              <Card key={course.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative overflow-hidden">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Badge className="absolute top-4 left-4" variant="secondary">
                    {course.category}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {course.shortDescription}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{course.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({course.totalStudents.toLocaleString()})
                      </span>
                    </div>
                    <p className="text-lg font-bold text-primary">${course.price}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are already transforming their careers with EduSphere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" variant="secondary" asChild>
              <Link to="/register">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <Link to="/courses">Explore Courses</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
