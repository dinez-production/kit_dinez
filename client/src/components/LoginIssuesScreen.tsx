import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertCircle, CheckCircle, Send, Phone, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const loginIssueSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phoneNumber: z.string().min(10, "Valid phone number is required").optional().or(z.literal("")),
  registerNumber: z.string().optional().or(z.literal("")),
  staffId: z.string().optional().or(z.literal("")),
  userType: z.enum(["student", "staff"]),
  issueType: z.enum([
    "forgot_email",
    "account_locked", 
    "email_changed",
    "registration_problem",
    "other"
  ]),
  description: z.string().min(10, "Please provide a detailed description (at least 10 characters)"),
});

type LoginIssueForm = z.infer<typeof loginIssueSchema>;

interface LoginIssuesScreenProps {
  onBackToLogin: () => void;
}

export default function LoginIssuesScreen({ onBackToLogin }: LoginIssuesScreenProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<LoginIssueForm>({
    resolver: zodResolver(loginIssueSchema),
    defaultValues: {
      userType: "student",
      issueType: "forgot_email",
    },
  });

  const userType = watch("userType");
  const issueType = watch("issueType");

  const submitIssueMutation = useMutation({
    mutationFn: async (data: LoginIssueForm) => {
      // Remove userType from the data as it's not part of the schema
      const { userType, ...issueData } = data;
      return apiRequest("/api/login-issues", {
        method: "POST",
        body: JSON.stringify(issueData),
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Issue Reported Successfully",
        description: "We've received your report and will get back to you soon.",
      });
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Unable to submit your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginIssueForm) => {
    submitIssueMutation.mutate(data);
  };

  const issueTypeOptions = [
    { value: "forgot_email", label: "Forgot Email Address", description: "Can't remember which email I used to register" },
    { value: "account_locked", label: "Account Locked", description: "My account seems to be locked or suspended" },
    { value: "email_changed", label: "Email Changed", description: "I changed my email and can't sign in" },
    { value: "registration_problem", label: "Registration Problem", description: "Having trouble during registration process" },
    { value: "other", label: "Other Issue", description: "Different login-related problem" },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Report Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for reporting this issue. Our admin team will review your request and contact you soon.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You should receive a response within 24-48 hours.
              </p>
              <Button onClick={onBackToLogin} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Report Login Issue</CardTitle>
          <p className="text-muted-foreground">
            Having trouble logging in? Tell us about it and we'll help you resolve the issue.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter your full name"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label>I am a *</Label>
                <RadioGroup
                  value={userType}
                  onValueChange={(value) => setValue("userType", value as "student" | "staff")}
                  className="flex space-x-6 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student">Student</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="staff" />
                    <Label htmlFor="staff">Staff Member</Label>
                  </div>
                </RadioGroup>
              </div>

              {userType === "student" ? (
                <div>
                  <Label htmlFor="registerNumber">Register Number</Label>
                  <Input
                    id="registerNumber"
                    {...register("registerNumber")}
                    placeholder="Enter your register number (e.g., 21CS001)"
                  />
                  {errors.registerNumber && (
                    <p className="text-sm text-red-500 mt-1">{errors.registerNumber.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <Label htmlFor="staffId">Staff ID</Label>
                  <Input
                    id="staffId"
                    {...register("staffId")}
                    placeholder="Enter your staff ID (e.g., 123456)"
                  />
                  {errors.staffId && (
                    <p className="text-sm text-red-500 mt-1">{errors.staffId.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="email"
                    {...register("email")}
                    type="email"
                    placeholder="your.email@example.com (optional)"
                    className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    {...register("phoneNumber")}
                    type="tel"
                    placeholder="Your phone number (optional)"
                    className={`pl-10 ${errors.phoneNumber ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.phoneNumber.message}</p>
                )}
              </div>
            </div>

            {/* Issue Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Issue Details</h3>
              
              <div>
                <Label htmlFor="issueType">Type of Issue *</Label>
                <Select
                  value={issueType}
                  onValueChange={(value) => setValue("issueType", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Please describe your issue in detail. Include any error messages you've seen, steps you've tried, and when the problem started."
                  rows={4}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Submit Section */}
            <div className="flex flex-col space-y-4 pt-4">
              <Button 
                type="submit" 
                disabled={!isValid || submitIssueMutation.isPending}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitIssueMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
              
              <Button variant="outline" onClick={onBackToLogin} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </form>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Need Immediate Help?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              For urgent issues, you can also contact the admin directly at the college IT help desk 
              or visit the admin office during working hours (9 AM - 5 PM).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}