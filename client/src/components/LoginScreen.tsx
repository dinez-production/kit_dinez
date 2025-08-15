import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signInWithGoogle, signInWithGoogleRedirect, handleGoogleRedirect } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import ProfileSetupScreen from "./ProfileSetupScreen";
import ForgotEmailScreen from "./ForgotEmailScreen";
import LoginIssuesScreen from "./LoginIssuesScreen";

export default function LoginScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotEmail, setShowForgotEmail] = useState(false);
  const [showLoginIssues, setShowLoginIssues] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState<{
    email: string;
    name: string;
  } | null>(null);

  // Handle Google OAuth redirect result
  useEffect(() => {
    handleGoogleRedirect()
      .then(async (result) => {
        if (result) {
          toast({ title: "Google sign-in successful!" });
          await handleUserAuthentication(result.user);
        }
      })
      .catch((error) => {
        toast({ 
          title: "Google sign-in failed", 
          description: error.errorMessage || "Authentication failed",
          variant: "destructive" 
        });
      });
  }, []);

  const handleUserAuthentication = async (user: any) => {
    try {
      // Check if user exists in database
      const userResponse = await fetch(`/api/users/by-email/${user.email}`);
      
      if (userResponse.ok) {
        // User exists, check if profile is complete
        const userData = await userResponse.json();
        
        if (userData.isProfileComplete) {
          // Profile is complete, login normally
          const userDisplayData = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            phoneNumber: userData.phoneNumber,
            ...(userData.role === "student" && {
              registerNumber: userData.registerNumber,
              department: userData.department,
              currentStudyYear: userData.currentStudyYear,
              isPassed: userData.isPassed,
            }),
            ...(userData.role === "staff" && {
              staffId: userData.staffId,
            }),
          };
          
          // Use the proper login function to maintain authentication state
          login(userDisplayData);
          
          // Redirect based on role
          if (userData.role === 'super_admin') {
            toast({ title: "Welcome Super Admin!", description: "Access to all system controls" });
            setLocation("/admin");
          } else if (userData.role === 'canteen_owner') {
            toast({ title: "Welcome Canteen Owner!", description: "Manage your canteen operations" });
            setLocation("/canteen-owner-dashboard");
          } else {
            toast({ title: `Welcome ${userData.role === 'staff' ? 'Staff' : 'Student'}!`, description: "Explore delicious menu options" });
            setLocation("/home");
          }
        } else {
          // Profile exists but incomplete, redirect to setup
          setNeedsProfileSetup({
            email: user.email,
            name: user.displayName || '',
          });
        }
      } else if (userResponse.status === 404) {
        // User doesn't exist - check for special admin accounts
        if (user.email === 'kitcanteen1@gmail.com') {
          // Create super admin
          const adminUser = {
            email: user.email,
            name: user.displayName || 'Super Admin',
            phoneNumber: '',
            role: 'super_admin',
            isProfileComplete: true,
          };
          
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminUser)
          });
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            login({
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
            });
            toast({ title: "Welcome Super Admin!", description: "Access to all system controls" });
            setLocation("/admin");
          }
        } else if (user.email === 'kitcanteenowner@gmail.com') {
          // Create canteen owner
          const ownerUser = {
            email: user.email,
            name: user.displayName || 'Canteen Owner',
            phoneNumber: '',
            role: 'canteen_owner',
            isProfileComplete: true,
          };
          
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ownerUser)
          });
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            login({
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
            });
            toast({ title: "Welcome Canteen Owner!", description: "Manage your canteen operations" });
            setLocation("/canteen-owner-dashboard");
          }
        } else {
          // New regular user - needs profile setup
          setNeedsProfileSetup({
            email: user.email,
            name: user.displayName || '',
          });
        }
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "Failed to authenticate user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      
      if (result.user) {
        toast({ title: "Successfully signed in!" });
        await handleUserAuthentication(result.user);
      }
    } catch (error: any) {
      // Google sign-in error - handle specific error cases
      
      if (error.code === 'auth/unauthorized-domain') {
        toast({ 
          title: "Domain Authorization Required", 
          description: "Please add this domain to Firebase Console authorized domains",
          variant: "destructive" 
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast({ 
          title: "Popup blocked", 
          description: "Redirecting to Google sign-in page...",
        });
        try {
          await signInWithGoogleRedirect();
        } catch (redirectError) {
          // Redirect error - show user-friendly message
          toast({ 
            title: "Authentication failed", 
            description: "Unable to sign in with Google",
            variant: "destructive" 
          });
        }
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast({ 
          title: "Sign-in cancelled", 
          description: "You closed the sign-in window",
        });
      } else {
        toast({ 
          title: "Sign-in failed", 
          description: error.message || "Unable to sign in with Google",
          variant: "destructive" 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show forgot email screen if requested
  if (showForgotEmail) {
    return (
      <ForgotEmailScreen 
        onBackToLogin={() => setShowForgotEmail(false)}
      />
    );
  }

  // Show login issues screen if requested
  if (showLoginIssues) {
    return (
      <LoginIssuesScreen 
        onBackToLogin={() => setShowLoginIssues(false)}
      />
    );
  }

  // Show profile setup screen if needed
  if (needsProfileSetup) {
    return (
      <ProfileSetupScreen
        userEmail={needsProfileSetup.email}
        userName={needsProfileSetup.name}
        onComplete={(userData) => {
          setNeedsProfileSetup(null);
          // User will be redirected by ProfileSetupScreen
        }}
        onBackToLogin={() => setNeedsProfileSetup(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex justify-center items-center p-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-primary text-lg font-bold">KIT</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome to KIT-Canteen
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to order your favorite food
          </p>

          {/* Email login */}
          <Card className="shadow-card">
            <CardContent className="p-6">
              <Button
                onClick={handleGoogleSignIn}
                variant="food"
                size="mobile"
                className="w-full"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
{isLoading ? "Signing in..." : "Continue with College Email"}
              </Button>
              
              <div className="mt-4 space-y-2 text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowForgotEmail(true)}
                  className="w-full text-primary hover:text-primary/80"
                >
                  Forgot your email? Click here
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowLoginIssues(true)}
                  className="w-full text-orange-600 hover:text-orange-600/80"
                >
                  Having login issues? Report here
                </Button>
              </div>
            </CardContent>
          </Card>


        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <span className="text-primary underline">Terms of Service</span> and{" "}
          <span className="text-primary underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}