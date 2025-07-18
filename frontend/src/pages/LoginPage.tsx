import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Label } from '@/components/ui/label';
import { Folder, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get the intended destination from navigation state
  const from = (location.state as { from?: string })?.from || '/';

  // Check for URL parameters and auto-login immediately
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const passwordParam =
      searchParams.get('pass') || searchParams.get('password');

    if (emailParam && passwordParam) {
      // Set loading state immediately
      setIsLoading(true);
      setError(null);

      // Attempt login immediately without showing the form
      const performLogin = async () => {
        try {
          const response = await apiService.post<LoginResponse>('/auth/login', {
            email: emailParam,
            password: passwordParam,
          });

          if (response.token) {
            // Store the token
            apiService.setToken(response.token);

            // Show success message
            toast.success('Successfully logged in via URL!');

            // Redirect immediately to the intended destination
            navigate(from, { replace: true });
          }
        } catch (err) {
          const error = err as { response?: { data?: { message?: string } } };
          const errorMessage =
            error.response?.data?.message ||
            'Auto-login failed. Please check your credentials.';
          setError(errorMessage);
          toast.error(errorMessage);
          setIsLoading(false);
        }
      };

      performLogin();
    }
  }, [searchParams, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.post<LoginResponse>('/auth/login', {
        email: form.email,
        password: form.password,
      });

      if (response.token) {
        // Store the token
        apiService.setToken(response.token);

        // Show success message
        toast.success('Successfully logged in!');

        // Redirect to intended destination or home page
        navigate(from, { replace: true });
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage =
        error.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const hasUrlParams =
    searchParams.get('email') &&
    (searchParams.get('pass') || searchParams.get('password'));

  // If URL parameters are present and we're loading, show a simple loading screen
  if (hasUrlParams && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Folder className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">FileDash</span>
            </div>
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Logging you in...</p>
                <p className="text-sm text-muted-foreground">
                  Authenticating with URL credentials
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If URL params are present but login failed, show error
  if (hasUrlParams && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Folder className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">FileDash</span>
            </div>
            <div className="space-y-4">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-destructive">
                  Login Failed
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  onClick={() => navigate('/login', { replace: true })}
                  variant="outline"
                  className="mt-4"
                >
                  Try Manual Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Folder className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">FileDash</span>
          </div>
          <CardTitle className="text-xl">Sign in to your account</CardTitle>
          <CardDescription>
            Enter your credentials to access your files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="cursor-pointer">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@filedash.local"
                value={form.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="cursor-pointer">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <div>
              <p>Default admin credentials:</p>
              <p className="text-xs mt-1">
                Email: admin@filedash.local
                <br />
                Password: admin123
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
