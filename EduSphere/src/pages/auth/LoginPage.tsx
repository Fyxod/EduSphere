import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Mail, Lock, Loader2, User, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'creator' ? 'creator' : 'user';
  const [role, setRole] = useState<'user' | 'creator'>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      navigate(role === 'creator' ? '/creator/dashboard' : '/dashboard');
    } catch {
      // Error is handled in context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/5 via-background to-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              EduSphere
            </span>
          </Link>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to continue your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(localError || error) && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{localError || error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={role} onValueChange={(v) => setRole(v as 'user' | 'creator')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user">
                  <User className="h-4 w-4 mr-2" />
                  Student
                </TabsTrigger>
                <TabsTrigger value="creator">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Creator
                </TabsTrigger>
              </TabsList>
              <TabsContent value="user">
                <p className="text-sm text-muted-foreground text-center py-2">
                  Sign in as a student to access your courses
                </p>
              </TabsContent>
              <TabsContent value="creator">
                <p className="text-sm text-muted-foreground text-center py-2">
                  Sign in as a creator to manage your courses
                </p>
              </TabsContent>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to={`/register?role=${role}`} className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
