import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Save, Upload, Plus, Trash, 
  GripVertical, Video, ChevronDown, ChevronUp
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
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
import { categories } from '@/data/mockData';

interface SectionFormData {
  id: string;
  title: string;
  description: string;
  videos: VideoFormData[];
  isExpanded: boolean;
}

interface VideoFormData {
  id: string;
  title: string;
  description: string;
  duration: number;
  file?: File;
}

export function CreateCoursePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addCourse, addSection, addVideo, error, clearError } = useCourses();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Course Details
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [price, setPrice] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Validation helpers
  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));
  
  const validationErrors = {
    title: title.length > 0 && title.length < 5 ? 'Title must be at least 5 characters' : '',
    shortDescription: shortDescription.length > 0 && shortDescription.length < 10 ? 'Short description must be at least 10 characters' : '',
    description: description.length > 0 && description.length < 20 ? 'Description must be at least 20 characters' : '',
    category: touched.category && !category ? 'Please select a category' : '',
    price: touched.price && (!price || parseFloat(price) < 0) ? 'Please enter a valid price' : '',
  };

  const hasValidationErrors = Object.values(validationErrors).some(err => err !== '');

  // Sections & Videos
  const [sections, setSections] = useState<SectionFormData[]>([]);

  const addNewSection = () => {
    setSections([...sections, {
      id: `temp-section-${Date.now()}`,
      title: '',
      description: '',
      videos: [],
      isExpanded: true,
    }]);
  };

  const updateSection = (sectionId: string, updates: Partial<SectionFormData>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  const deleteSection = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setSections(sections.filter(s => s.id !== sectionId));
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
            }]
          } 
        : s
    ));
  };

  const updateVideo = (sectionId: string, videoId: string, updates: Partial<VideoFormData>) => {
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

  const deleteVideo = (sectionId: string, videoId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, videos: s.videos.filter(v => v.id !== videoId) } 
        : s
    ));
  };

  const handleVideoUpload = async (sectionId: string, videoId: string, file: File) => {
    // Simulate upload - in real app, this would upload to server
    updateVideo(sectionId, videoId, { 
      file,
      duration: Math.floor(Math.random() * 600) + 300, // Random duration for demo
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Create the course (creatorId is handled by auth on backend)
      const course = await addCourse({
        title,
        shortDescription,
        description,
        category,
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        price: parseFloat(price),
        level,
        isPublished,
      });

      // Add sections and videos
      for (let i = 0; i < sections.length; i++) {
        const sectionData = sections[i];
        const section = await addSection(course.id, sectionData.title, i + 1);

        for (let j = 0; j < sectionData.videos.length; j++) {
          const videoData = sectionData.videos[j];
          
          // Use FormData for video upload
          const formData = new FormData();
          formData.append('title', videoData.title);
          formData.append('description', videoData.description || '');
          formData.append('order', String(j + 1));
          if (videoData.file) {
            formData.append('video', videoData.file);
          }
          
          await addVideo(course.id, section.id, formData);
        }
      }

      navigate('/creator/dashboard');
    } catch (err) {
      console.error('Failed to create course:', err);
      const message = err instanceof Error ? err.message : 
        (typeof err === 'object' && err !== null && 'message' in err) ? String((err as { message: unknown }).message) : 
        'Failed to create course';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToStep2 = title.length >= 5 && shortDescription.length >= 10 && description.length >= 20 && category && price && !hasValidationErrors;
  const canSubmit = sections.length > 0 && sections.every(s => s.title && s.videos.length > 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/creator/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Course</h1>
          <p className="text-muted-foreground">Step {step} of 2</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {/* Error Alert */}
      {(submitError || (typeof error === 'string' ? error : null)) && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex items-center justify-between">
            {submitError || error}
            <Button variant="ghost" size="sm" onClick={() => { setSubmitError(null); clearError(); }}>Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>Enter the basic information about your course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Complete Web Development Bootcamp"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => markTouched('title')}
                className={touched.title && validationErrors.title ? 'border-destructive' : ''}
              />
              {touched.title && validationErrors.title && (
                <p className="text-xs text-destructive">{validationErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description *</Label>
              <Input
                id="shortDescription"
                placeholder="A brief summary of your course (10-150 characters)"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                onBlur={() => markTouched('shortDescription')}
                maxLength={150}
                className={touched.shortDescription && validationErrors.shortDescription ? 'border-destructive' : ''}
              />
              <div className="flex justify-between">
                {touched.shortDescription && validationErrors.shortDescription ? (
                  <p className="text-xs text-destructive">{validationErrors.shortDescription}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-muted-foreground">{shortDescription.length}/150</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full Description *</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of what students will learn (min 20 characters)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => markTouched('description')}
                className={`min-h-32 ${touched.description && validationErrors.description ? 'border-destructive' : ''}`}
              />
              {touched.description && validationErrors.description && (
                <p className="text-xs text-destructive">{validationErrors.description}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); markTouched('category'); }}>
                  <SelectTrigger className={touched.category && validationErrors.category ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.category && validationErrors.category && (
                  <p className="text-xs text-destructive">{validationErrors.category}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
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
                <Label htmlFor="price">Price (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="99.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() => markTouched('price')}
                  min="0"
                  step="0.01"
                  className={touched.price && validationErrors.price ? 'border-destructive' : ''}
                />
                {touched.price && validationErrors.price && (
                  <p className="text-xs text-destructive">{validationErrors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail URL</Label>
                <Input
                  id="thumbnail"
                  placeholder="https://example.com/image.jpg"
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

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedToStep2}
              >
                Next: Add Content
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Content</CardTitle>
                  <CardDescription>Add sections and videos to your course</CardDescription>
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
                        <Input
                          placeholder="Section title..."
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateSection(section.id, { isExpanded: !section.isExpanded })}
                        >
                          {section.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteSection(section.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>

                      {section.isExpanded && (
                        <div className="p-4 space-y-4">
                          <Input
                            placeholder="Section description (optional)"
                            value={section.description}
                            onChange={(e) => updateSection(section.id, { description: e.target.value })}
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
                                    <Input
                                      placeholder="Video title..."
                                      value={video.title}
                                      onChange={(e) => updateVideo(section.id, video.id, { title: e.target.value })}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
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
                                    {video.duration > 0 && (
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
                                  onClick={() => deleteVideo(section.id, video.id)}
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

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                'Creating...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Course
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
