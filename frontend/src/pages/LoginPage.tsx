import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem } from '@/components/ui/form';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';
import { cn } from '@/lib/utils';

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

interface FormErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get the intended destination from navigation state
  const from = (location.state as { from?: string })?.from || '/';

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

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
    // Clear field-specific error
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const hasUrlParams =
    searchParams.get('email') &&
    (searchParams.get('pass') || searchParams.get('password'));

  // If URL parameters are present and we're loading, show a simple loading screen
  if (hasUrlParams && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
        {/* Subtle floating orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 dark:bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/8 dark:bg-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/8 dark:bg-indigo-400/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/50 dark:bg-white/10 backdrop-blur-md rounded-2xl mb-6 shadow-lg border border-gray-200/30 dark:border-gray-600/30">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/80 to-purple-500/80 dark:from-blue-400/80 dark:to-purple-400/80 rounded-lg rotate-45"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
              FileDash
            </h1>
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-800 dark:text-white">
                  Logging you in...
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Authenticating with URL credentials
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If URL params are present but login failed, show error
  if (hasUrlParams && error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
        {/* Subtle floating orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 dark:bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/8 dark:bg-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/8 dark:bg-indigo-400/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/50 dark:bg-white/10 backdrop-blur-md rounded-2xl mb-6 shadow-lg border border-gray-200/30 dark:border-gray-600/30">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/80 to-purple-500/80 dark:from-blue-400/80 dark:to-purple-400/80 rounded-lg rotate-45"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
              FileDash
            </h1>
            <div className="space-y-4">
              <AlertCircle className="h-8 w-8 mx-auto text-red-500 dark:text-red-400" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-red-600 dark:text-red-400">
                  Login Failed
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {error}
                </p>
                <Button
                  onClick={() => navigate('/login', { replace: true })}
                  className="mt-4 bg-blue-600/80 hover:bg-blue-600/90 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 backdrop-blur-md border border-blue-500/30 dark:border-blue-400/30 rounded-2xl text-white"
                >
                  Try Manual Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900">
      {/* Subtle floating orbs for background effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 dark:bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/8 dark:bg-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/8 dark:bg-indigo-400/15 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Subtle stars effect */}
      <div className="absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-gray-400/30 dark:bg-gray-300/20 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main login card with glassmorphism */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/70 dark:bg-black/20 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/50 dark:bg-white/10 backdrop-blur-md rounded-2xl mb-6 shadow-lg border border-gray-200/30 dark:border-gray-600/30">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/80 to-purple-500/80 dark:from-blue-400/80 dark:to-purple-400/80 rounded-lg rotate-45"></div>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              FileDash
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Enter your credentials to access your files
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-4 text-sm text-red-600 dark:text-red-300 bg-red-50/80 dark:bg-red-500/10 border border-red-200/50 dark:border-red-400/20 rounded-2xl backdrop-blur-md">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Email Field */}
              <FormField>
                <FormItem>
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) =>
                          handleInputChange('email', e.target.value)
                        }
                        disabled={isLoading}
                        className={cn(
                          'h-14 px-4 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/30 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-400/60 dark:focus:border-blue-400/50 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200',
                          errors.email &&
                            'border-red-400/60 dark:border-red-400/50 focus:border-red-400/80 dark:focus:border-red-400/60'
                        )}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-600 dark:text-red-400 text-sm ml-1">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </FormItem>
              </FormField>

              {/* Password Field */}
              <FormField>
                <FormItem>
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) =>
                          handleInputChange('password', e.target.value)
                        }
                        disabled={isLoading}
                        className={cn(
                          'h-14 px-4 pr-12 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/30 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:border-blue-400/60 dark:focus:border-blue-400/50 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200',
                          errors.password &&
                            'border-red-400/60 dark:border-red-400/50 focus:border-red-400/80 dark:focus:border-red-400/60'
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-gray-100/50 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {showPassword ? 'Hide password' : 'Show password'}
                        </span>
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-red-600 dark:text-red-400 text-sm ml-1">
                        {errors.password}
                      </p>
                    )}
                  </div>
                </FormItem>
              </FormField>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-blue-600/80 hover:bg-blue-600/90 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 backdrop-blur-md border border-blue-500/30 dark:border-blue-400/30 rounded-2xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
