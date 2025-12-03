import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash, 
  GripVertical, Video, ChevronDown, ChevronUp, Upload, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCourses } from '@/contexts/CourseContext';
import { categories } from '@/data/mockData';
import type { Course } from '@/types';

interface SectionFormData {
  id: string;
  title: string;
  description: string;
  videos: VideoFormData[];
  isExpanded: boolean;
  isNew?: boolean;
}

interface VideoFormData {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
  file?: File;
  isNew?: boolean;
}

export function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { getCourseById, updateCourse, addSection, updateSection, deleteSection, addVideo, updateVideo, deleteVideo, error, clearError } = useCourses();

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Course Details
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [price, setPrice] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Sections & Videos
  const [sections, setSections] = useState<SectionFormData[]>([]);

  // Fetch course data
  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) return;
      setIsLoadingCourse(true);
      try {
        const fetchedCourse = await getCourseById(courseId);
        setCourse(fetchedCourse);
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setIsLoadingCourse(false);
      }
    };
    loadCourse();
  }, [courseId, getCourseById]);

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setShortDescription(course.shortDescription);
      setDescription(course.description);
      setCategory(course.category);
      setLevel(course.level);
      setPrice(course.price.toString());
      setThumbnail(course.thumbnail);
      setIsPublished(course.isPublished);
      setSections(course.sections.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        videos: s.videos.map(v => ({
          id: v.id,
          title: v.title,
          description: v.description || '',
          duration: v.duration,
          url: v.url,
        })),
        isExpanded: false,
      })));
    }
  }, [course]);

  if (isLoadingCourse) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Button onClick={() => navigate('/creator/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const addNewSection = () => {
    setSections([...sections, {
      id: `temp-section-${Date.now()}`,
      title: '',
      description: '',
      videos: [],
      isExpanded: true,
      isNew: true,
    }]);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<SectionFormData>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  const handleDeleteSection = async (sectionId: string, isNew?: boolean) => {
    if (!course) return;
    if (confirm('Are you sure you want to delete this section?')) {
      try {
        if (!isNew) {
          await deleteSection(course.id, sectionId);
        }
        setSections(sections.filter(s => s.id !== sectionId));
      } catch (err) {
        console.error('Failed to delete section:', err);
      }
    }
  };

  const addVideoToSection = (sectionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { 
            ...s, 
            videos: [...s.videos, {
              id: `temp-video-${Date.now()}`,
              title: '',
              description: '',
              duration: 0,
              url: '',
              isNew: true,
            }]
          } 
        : s
    ));
  };

  const handleUpdateVideo = (sectionId: string, videoId: string, updates: Partial<VideoFormData>) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { 
            ...s, 
            videos: s.videos.map(v => 
              v.id === videoId ? { ...v, ...updates } : v
            )
          } 
        : s
    ));
  };

  const handleDeleteVideo = async (sectionId: string, videoId: string, isNew?: boolean) => {
    if (!course) return;
    try {
      if (!isNew) {
        await deleteVideo(course.id, sectionId, videoId);
      }
      setSections(sections.map(s => 
        s.id === sectionId 
          ? { ...s, videos: s.videos.filter(v => v.id !== videoId) } 
          : s
      ));
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const handleVideoUpload = (sectionId: string, videoId: string, file: File) => {
    handleUpdateVideo(sectionId, videoId, { 
      file,
      duration: Math.floor(Math.random() * 600) + 300,
    });
  };

  const handleSave = async () => {
    if (!course) return;
    
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Update course details
      await updateCourse(course.id, {
        title,
        shortDescription,
        description,
        category,
        level,
        price: parseFloat(price),
        thumbnail,
        isPublished,
      });

      // Handle sections and videos
      for (const sectionData of sections) {
        if (sectionData.isNew) {
          // Add new section (courseId, title, order)
          const newSection = await addSection(course.id, sectionData.title, sections.indexOf(sectionData) + 1);

          // Add videos to new section using FormData
          for (let j = 0; j < sectionData.videos.length; j++) {
            const videoData = sectionData.videos[j];
            const formData = new FormData();
            formData.append('title', videoData.title);
            formData.append('description', videoData.description || '');
            formData.append('order', String(j + 1));
            if (videoData.file) {
              formData.append('video', videoData.file);
            }
            await addVideo(course.id, newSection.id, formData);
          }
        } else {
          // Update existing section (courseId, sectionId, title)
          await updateSection(course.id, sectionData.id, sectionData.title, sectionData.description);

          // Handle videos
          for (let j = 0; j < sectionData.videos.length; j++) {
            const videoData = sectionData.videos[j];
            if (videoData.isNew) {
              const formData = new FormData();
              formData.append('title', videoData.title);
              formData.append('description', videoData.description || '');
              formData.append('order', String(j + 1));
              if (videoData.file) {
                formData.append('video', videoData.file);
              }
              await addVideo(course.id, sectionData.id, formData);
            } else {
              // updateVideo(courseId, sectionId, videoId, updates)
              await updateVideo(course.id, sectionData.id, videoData.id, {
                title: videoData.title,
                description: videoData.description,
                order: j + 1,
              });
            }
          }
        }
      }

      navigate('/creator/dashboard');
    } catch (err) {
      console.error('Failed to update course:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/creator/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Course</h1>
            <p className="text-muted-foreground">{course.title}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Error Alert */}
      {(submitError || error) && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex items-center justify-between">
            {submitError || error}
            <Button variant="ghost" size="sm" onClick={() => { setSubmitError(null); clearError(); }}>Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="details">
        <TabsList className="mb-6">
          <TabsTrigger value="details">Course Details</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>Update the basic information about your course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Input
                  id="shortDescription"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  maxLength={150}
                />
                <p className="text-xs text-muted-foreground">{shortDescription.length}/150</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-32"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail URL</Label>
                  <Input
                    id="thumbnail"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div>
                  <Label htmlFor="publish">Publish Course</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this course visible to students
                  </p>
                </div>
                <Switch
                  id="publish"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Content</CardTitle>
                  <CardDescription>Manage sections and videos</CardDescription>
                </div>
                <Button onClick={addNewSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No sections yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add sections to organize your course content
                  </p>
                  <Button onClick={addNewSection}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Section
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 p-4 bg-muted/50">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                        <Badge variant="secondary">Section {sectionIndex + 1}</Badge>
                        {section.isNew && <Badge variant="outline">New</Badge>}
                        <Input
                          placeholder="Section title..."
                          value={section.title}
                          onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateSection(section.id, { isExpanded: !section.isExpanded })}
                        >
                          {section.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteSection(section.id, section.isNew)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>

                      {section.isExpanded && (
                        <div className="p-4 space-y-4">
                          <Input
                            placeholder="Section description (optional)"
                            value={section.description}
                            onChange={(e) => handleUpdateSection(section.id, { description: e.target.value })}
                          />

                          <Separator />

                          <div className="space-y-3">
                            {section.videos.map((video, videoIndex) => (
                              <div key={video.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-2" />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {videoIndex + 1}
                                    </Badge>
                                    {video.isNew && <Badge variant="outline" className="text-xs">New</Badge>}
                                    <Input
                                      placeholder="Video title..."
                                      value={video.title}
                                      onChange={(e) => handleUpdateVideo(section.id, video.id, { title: e.target.value })}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {video.isNew ? (
                                      <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                                        <Upload className="h-4 w-4" />
                                        <span className="text-sm">
                                          {video.file ? video.file.name : 'Upload Video'}
                                        </span>
                                        <input
                                          type="file"
                                          accept="video/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleVideoUpload(section.id, video.id, file);
                                            }
                                          }}
                                        />
                                      </label>
                                    ) : (
                                      <Badge variant="secondary">
                                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDeleteVideo(section.id, video.id, video.isNew)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => addVideoToSection(section.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Video
                          </Button>
                        </div>
                      )}
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
