import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "lookup" | "verify" | "show-email" | "change-email";

const lookupSchema = z.object({
  identifier: z.string().min(1, "Please enter your register number or staff ID"),
});

const verifySchema = z.object({
  phoneNumber: z.string().min(10, "Please enter your phone number"),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address"),
});

type LookupForm = z.infer<typeof lookupSchema>;
type VerifyForm = z.infer<typeof verifySchema>;
type ChangeEmailForm = z.infer<typeof changeEmailSchema>;

interface ForgotEmailScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotEmailScreen({ onBackToLogin }: ForgotEmailScreenProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("lookup");
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lookupForm = useForm<LookupForm>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { identifier: "" },
  });

  const verifyForm = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { phoneNumber: "" },
  });

  const changeEmailForm = useForm<ChangeEmailForm>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "" },
  });

  const handleLookup = async (data: LookupForm) => {
    setIsLoading(true);
    try {
      let response;
      // Try register number first (student format check)
      if (data.identifier.match(/^7115\d{2}[A-Za-z]{3}\d{3}$/)) {
        response = await fetch(`/api/users/by-register/${data.identifier}`);
      } 
      // Try staff ID (6 digits)
      else if (data.identifier.match(/^\d{6}$/)) {
        response = await fetch(`/api/users/by-staff/${data.identifier}`);
      }
      // Generic lookup - try both endpoints
      else {
        response = await fetch(`/api/users/by-register/${data.identifier}`);
        if (!response.ok) {
          response = await fetch(`/api/users/by-staff/${data.identifier}`);
        }
      }

      if (response.ok) {
        const user = await response.json();
        setUserData(user);
        setStep("verify");
        toast({
          title: "User Found",
          description: "Please verify your phone number to continue",
        });
      } else {
        toast({
          title: "User Not Found",
          description: "This register number or staff ID is not registered. Please register first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to search for user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (data: VerifyForm) => {
    setIsLoading(true);
    try {
      if (userData.phoneNumber === data.phoneNumber) {
        setStep("show-email");
        toast({
          title: "Verification Successful",
          description: "Your phone number has been verified",
        });
      } else {
        toast({
          title: "Phone Number Mismatch",
          description: "The phone number you entered doesn't match our records",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "Unable to verify phone number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async (data: ChangeEmailForm) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.newEmail }),
      });

      if (response.ok) {
        toast({
          title: "Email Updated Successfully",
          description: "Your email has been updated. Please sign in with your new Google account.",
        });
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        const error = await response.json();
        toast({
          title: "Update Failed",
          description: error.message || "Unable to update email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Update Error",
        description: "Unable to update email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case "lookup":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Search className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Find Your Account</h2>
              <p className="text-muted-foreground">
                Enter your register number or staff ID to recover your email
              </p>
            </div>

            <Form {...lookupForm}>
              <form onSubmit={lookupForm.handleSubmit(handleLookup)} className="space-y-4">
                <FormField
                  control={lookupForm.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Register Number or Staff ID</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter register number (7115XXABC123) or staff ID (123456)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Searching..." : "Find Account"}
                </Button>
              </form>
            </Form>
          </div>
        );

      case "verify":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verify Phone Number</h2>
              <p className="text-muted-foreground">
                Enter your phone number to verify your identity
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Account found for: <strong>{userData?.name}</strong>
                <br />
                Role: <strong>{userData?.role}</strong>
              </AlertDescription>
            </Alert>

            <Form {...verifyForm}>
              <form onSubmit={verifyForm.handleSubmit(handleVerify)} className="space-y-4">
                <FormField
                  control={verifyForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter your registered phone number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep("lookup")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        );

      case "show-email":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your Email Address</h2>
              <p className="text-muted-foreground">
                Here's the email associated with your account
              </p>
            </div>

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div><strong>Name:</strong> {userData?.name}</div>
                  <div><strong>Email:</strong> {userData?.email}</div>
                  <div><strong>Role:</strong> {userData?.role}</div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button onClick={onBackToLogin} className="w-full">
                Back to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setStep("change-email")}
                className="w-full"
              >
                Lost Access to This Email?
              </Button>
            </div>
          </div>
        );

      case "change-email":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Mail className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Update Email Address</h2>
              <p className="text-muted-foreground">
                Enter your new email address that you can access
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> After updating your email, you'll need to sign in with your new Google account. Your profile data and order history will remain intact.
              </AlertDescription>
            </Alert>

            <Form {...changeEmailForm}>
              <form onSubmit={changeEmailForm.handleSubmit(handleChangeEmail)} className="space-y-4">
                <FormField
                  control={changeEmailForm.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter your new email address" type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep("show-email")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Email"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <Button variant="ghost" onClick={onBackToLogin} className="flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-primary text-lg font-bold">KIT</span>
        </div>
        <div className="w-[100px]"></div> {/* Spacer for centering */}
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-md mx-auto">
          <Card className="shadow-card">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold">Forgot Email?</CardTitle>
              <p className="text-muted-foreground">
                Don't worry, we'll help you recover your account
              </p>
            </CardHeader>
            
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Need help? Contact support for assistance
        </p>
      </div>
    </div>
  );
}