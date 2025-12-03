import { Link } from 'react-router-dom';
import { BookOpen, Github, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">EduSphere</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Empowering learners worldwide with quality education. Learn from the best instructors and advance your career.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com/fyxod" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/in/parthkatiyar/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="font-semibold mb-4">Explore</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/courses" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link to="/courses?category=Development" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Development
                </Link>
              </li>
              <li>
                <Link to="/courses?category=Design" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Design
                </Link>
              </li>
              <li>
                <Link to="/courses?category=Marketing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Marketing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/creators" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Become a Creator
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EduSphere. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
