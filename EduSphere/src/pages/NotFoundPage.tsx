import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <h1 className="text-[150px] font-bold text-muted-foreground/20 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
          Don't worry, let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Here are some helpful links:
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link to="/courses" className="text-primary hover:underline">
              Browse Courses
            </Link>
            <Link to="/login" className="text-primary hover:underline">
              Sign In
            </Link>
            <Link to="/register" className="text-primary hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
