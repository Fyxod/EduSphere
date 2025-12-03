import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CourseProvider } from '@/contexts/CourseContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { UserDashboard } from '@/pages/user/UserDashboard';
import { BrowseCoursesPage } from '@/pages/user/BrowseCoursesPage';
import { CourseDetailPage } from '@/pages/user/CourseDetailPage';
import { CoursePlayerPage } from '@/pages/user/CoursePlayerPage';
import { UserProfilePage } from '@/pages/user/UserProfilePage';
import { MyCoursesPage } from '@/pages/user/MyCoursesPage';
import { CreatorDashboard } from '@/pages/creator/CreatorDashboard';
import { CreateCoursePage } from '@/pages/creator/CreateCoursePage';
import { EditCoursePage } from '@/pages/creator/EditCoursePage';
import { CreatorProfilePage } from '@/pages/creator/CreatorProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import './App.css';

// Protected route wrapper for authenticated users
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('user' | 'creator')[] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={user.role === 'creator' ? '/creator/dashboard' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}

// Public route - redirect if authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'creator' ? '/creator/dashboard' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LandingPage />} />
        
        {/* Auth Routes */}
        <Route
          path="login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* User Routes */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="courses" element={<BrowseCoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route
          path="courses/:courseId/learn"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <CoursePlayerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-courses"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <MyCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Creator Routes */}
        <Route
          path="creator/dashboard"
          element={
            <ProtectedRoute allowedRoles={['creator']}>
              <CreatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="creator/courses/new"
          element={
            <ProtectedRoute allowedRoles={['creator']}>
              <CreateCoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="creator/courses/:courseId/edit"
          element={
            <ProtectedRoute allowedRoles={['creator']}>
              <EditCoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="creator/profile"
          element={
            <ProtectedRoute allowedRoles={['creator']}>
              <CreatorProfilePage />
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CourseProvider>
            <AppRoutes />
          </CourseProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
