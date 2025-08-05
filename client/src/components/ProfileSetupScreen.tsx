import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, CheckCircle, School, Briefcase, Calendar, Phone, Hash, Building } from "lucide-react";
import { DEPARTMENTS, getDepartmentFullName, calculateCurrentStudyYear, isStudentPassed, validateRegisterNumber, validateStaffId } from "@shared/utils";

const profileSetupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["student", "staff"], { required_error: "Please select your role" }),
  
  // Student fields
  registerNumber: z.string().optional(),
  department: z.string().optional(),
  passingOutYear: z.number().optional(),
  
  // Staff fields
  staffId: z.string().optional(),
}).refine((data) => {
  if (data.role === "student") {
    if (!data.registerNumber || !data.department || !data.passingOutYear) {
      return false;
    }
    // Validate register number format
    const validation = validateRegisterNumber(data.registerNumber);
    return validation.isValid;
  }
  if (data.role === "staff") {
    if (!data.staffId) {
      return false;
    }
    // Validate staff ID format
    const validation = validateStaffId(data.staffId);
    return validation.isValid;
  }
  return true;
}, {
  message: "Please fill all required fields correctly for your role",
});

type ProfileSetupForm = z.infer<typeof profileSetupSchema>;

interface ProfileSetupScreenProps {
  userEmail: string;
  userName: string;
  onComplete: (userData: any) => void;
}

export default function ProfileSetupScreen({ userEmail, userName, onComplete }: ProfileSetupScreenProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      name: userName || "",
      phoneNumber: "",
      role: undefined,
      registerNumber: "",
      department: "",
      passingOutYear: undefined,
      staffId: "",
    },
  });

  const watchedRole = form.watch("role");
  const watchedRegisterNumber = form.watch("registerNumber");

  // Auto-fill department and joining year when register number is entered
  const handleRegisterNumberChange = (value: string) => {
    form.setValue("registerNumber", value);
    
    if (value.length >= 10) {
      const validation = validateRegisterNumber(value);
      if (validation.isValid && validation.joiningYear && validation.department) {
        form.setValue("department", validation.department);
        // Don't auto-set passing out year, let user choose
      }
    }
  };

  const onSubmit = async (data: ProfileSetupForm) => {
    setIsSubmitting(true);
    
    try {
      // Check if register number or staff ID already exists
      if (data.role === "student" && data.registerNumber) {
        const existingUser = await fetch(`/api/users/by-register/${data.registerNumber}`);
        if (existingUser.ok) {
          toast({
            title: "Registration Number Already Exists",
            description: "This register number is already registered. Please login instead.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      if (data.role === "staff" && data.staffId) {
        const existingUser = await fetch(`/api/users/by-staff/${data.staffId}`);
        if (existingUser.ok) {
          toast({
            title: "Staff ID Already Exists",
            description: "This staff ID is already registered. Please login instead.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Calculate academic data for students
      let userData: any = {
        email: userEmail,
        name: data.name,
        phoneNumber: data.phoneNumber,
        role: data.role,
        isProfileComplete: true,
      };

      if (data.role === "student" && data.registerNumber && data.department && data.passingOutYear) {
        const validation = validateRegisterNumber(data.registerNumber);
        if (validation.isValid && validation.joiningYear) {
          const currentStudyYear = calculateCurrentStudyYear(validation.joiningYear, data.passingOutYear);
          const isPassed = isStudentPassed(validation.joiningYear, data.passingOutYear);
          
          userData = {
            ...userData,
            registerNumber: data.registerNumber,
            department: data.department,
            joiningYear: validation.joiningYear,
            passingOutYear: data.passingOutYear,
            currentStudyYear,
            isPassed,
          };
        }
      }

      if (data.role === "staff" && data.staffId) {
        userData.staffId = data.staffId;
      }

      // Create user in database
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const newUser = await response.json();
        
        // Store user data in localStorage
        const userDisplayData = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phoneNumber: newUser.phoneNumber,
          ...(newUser.role === "student" && {
            registerNumber: newUser.registerNumber,
            department: newUser.department,
            currentStudyYear: newUser.currentStudyYear,
            isPassed: newUser.isPassed,
          }),
          ...(newUser.role === "staff" && {
            staffId: newUser.staffId,
          }),
        };
        
        localStorage.setItem('user', JSON.stringify(userDisplayData));
        
        toast({
          title: "Profile Setup Complete!",
          description: `Welcome ${data.role === "student" ? "Student" : "Staff Member"} ${data.name}!`,
        });
        
        onComplete(userDisplayData);
        setLocation("/home");
      } else {
        const error = await response.json();
        toast({
          title: "Setup Failed",
          description: error.message || "Failed to complete profile setup. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const passingOutYears = Array.from({ length: 10 }, (_, i) => currentYear + i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
            <p className="text-muted-foreground">
              Welcome! Please provide your details to set up your account.
            </p>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                    Basic Information
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your phone number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I am a</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="student">
                              <div className="flex items-center">
                                <School className="w-4 h-4 mr-2" />
                                Student
                              </div>
                            </SelectItem>
                            <SelectItem value="staff">
                              <div className="flex items-center">
                                <Briefcase className="w-4 h-4 mr-2" />
                                Staff
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Student Fields */}
                {watchedRole === "student" && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold flex items-center">
                      <School className="w-5 h-5 mr-2 text-primary" />
                      Student Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="registerNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Register Number</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., 711523CSE055"
                              onChange={(e) => handleRegisterNumberChange(e.target.value)}
                              className="font-mono"
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">
                            Format: 7115 + joining year + department + roll number
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(DEPARTMENTS).map(([code, name]) => (
                                <SelectItem key={code} value={code}>
                                  {code} - {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="passingOutYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passing Out Year</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your passing out year" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {passingOutYears.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Staff Fields */}
                {watchedRole === "staff" && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Briefcase className="w-5 h-5 mr-2 text-primary" />
                      Staff Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="staffId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Staff ID</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., 000001"
                              className="font-mono"
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">
                            6-digit staff ID number
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Setting up..." : "Complete Setup"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}