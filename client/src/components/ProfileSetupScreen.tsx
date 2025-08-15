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
import { User, CheckCircle, School, Briefcase, Calendar, Phone, Hash, Building, Check, X, AlertCircle } from "lucide-react";
import { DEPARTMENTS, getDepartmentFullName, calculateCurrentStudyYear, isStudentPassed, validateRegisterNumber, validateStaffId } from "@shared/utils";

const profileSetupSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s.'-]+$/, "Name can only contain letters, spaces, periods, hyphens, and apostrophes"),
  phoneNumber: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .regex(/^[+]?[0-9\s\-()]+$/, "Phone number can only contain numbers, spaces, hyphens, parentheses, and plus sign"),
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
  onBackToLogin: () => void;
}

export default function ProfileSetupScreen({ userEmail, userName, onComplete, onBackToLogin }: ProfileSetupScreenProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    mode: "onChange", // Enable real-time validation
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
  const watchedName = form.watch("name");
  const watchedPhoneNumber = form.watch("phoneNumber");
  const watchedStaffId = form.watch("staffId");
  const watchedDepartment = form.watch("department");
  const watchedPassingOutYear = form.watch("passingOutYear");

  // Real-time validation helpers
  const getNameValidation = (name: string) => {
    if (!name) return { isValid: false, message: "Name is required" };
    if (name.length < 2) return { isValid: false, message: "Name must be at least 2 characters" };
    if (name.length > 50) return { isValid: false, message: "Name must be less than 50 characters" };
    if (!/^[a-zA-Z\s.'-]+$/.test(name)) return { isValid: false, message: "Name can only contain letters, spaces, periods, hyphens, and apostrophes" };
    return { isValid: true, message: "Valid name format" };
  };

  const getPhoneValidation = (phone: string) => {
    if (!phone) return { isValid: false, message: "Phone number is required" };
    if (phone.length < 10) return { isValid: false, message: "Phone number must be at least 10 digits" };
    if (phone.length > 15) return { isValid: false, message: "Phone number must be less than 15 digits" };
    if (!/^[+]?[0-9\s\-()]+$/.test(phone)) return { isValid: false, message: "Phone number can only contain numbers, spaces, hyphens, parentheses, and plus sign" };
    return { isValid: true, message: "Valid phone number format" };
  };

  const getRegisterNumberValidation = (registerNumber: string) => {
    if (!registerNumber && watchedRole === "student") return { isValid: false, message: "Register number is required" };
    if (!registerNumber) return { isValid: null, message: "" };
    const validation = validateRegisterNumber(registerNumber);
    return {
      isValid: validation.isValid,
      message: validation.isValid ? "Valid register number format" : validation.error || "Invalid format"
    };
  };

  const getStaffIdValidation = (staffId: string) => {
    if (!staffId && watchedRole === "staff") return { isValid: false, message: "Staff ID is required" };
    if (!staffId) return { isValid: null, message: "" };
    const validation = validateStaffId(staffId);
    return {
      isValid: validation.isValid,
      message: validation.isValid ? "Valid staff ID format" : validation.error || "Invalid format"
    };
  };

  const getDepartmentValidation = (department: string) => {
    if (!department && watchedRole === "student") return { isValid: false, message: "Department is required" };
    if (!department) return { isValid: null, message: "" };
    return { isValid: true, message: "Department selected" };
  };

  const getPassingOutYearValidation = (year: number | undefined) => {
    if (!year && watchedRole === "student") return { isValid: false, message: "Passing out year is required" };
    if (!year) return { isValid: null, message: "" };
    return { isValid: true, message: "Passing out year selected" };
  };

  // Get validation status for each field
  const nameValidation = getNameValidation(watchedName || "");
  const phoneValidation = getPhoneValidation(watchedPhoneNumber || "");
  const registerNumberValidation = getRegisterNumberValidation(watchedRegisterNumber || "");
  const staffIdValidation = getStaffIdValidation(watchedStaffId || "");
  const departmentValidation = getDepartmentValidation(watchedDepartment || "");
  const passingOutYearValidation = getPassingOutYearValidation(watchedPassingOutYear);

  // Auto-fill department and joining year when register number is entered
  const handleRegisterNumberChange = (value: string) => {
    // Normalize to uppercase for consistency
    const normalizedValue = value.toUpperCase();
    form.setValue("registerNumber", normalizedValue);
    
    if (normalizedValue.length >= 10) {
      const validation = validateRegisterNumber(normalizedValue);
      if (validation.isValid && validation.joiningYear && validation.department) {
        form.setValue("department", validation.department);
        // Don't auto-set passing out year, let user choose
      }
    }
  };

  // Handle staff ID changes with normalization
  const handleStaffIdChange = (value: string) => {
    // Normalize to uppercase for consistency
    const normalizedValue = value.toUpperCase();
    form.setValue("staffId", normalizedValue);
  };

  const onSubmit = async (data: ProfileSetupForm) => {
    setIsSubmitting(true);
    
    try {
      // Check if register number or staff ID already exists (case-insensitive)
      if (data.role === "student" && data.registerNumber) {
        const normalizedRegisterNumber = data.registerNumber.toUpperCase();
        const existingUser = await fetch(`/api/users/by-register/${normalizedRegisterNumber}`);
        if (existingUser.ok) {
          toast({
            title: "Registration Number Already Exists",
            description: "This register number is already registered. Please use 'Forgot Email' or click 'Back to Login' to sign in with your existing account.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      if (data.role === "staff" && data.staffId) {
        const normalizedStaffId = data.staffId.toUpperCase();
        const existingUser = await fetch(`/api/users/by-staff/${normalizedStaffId}`);
        if (existingUser.ok) {
          toast({
            title: "Staff ID Already Exists",
            description: "This staff ID is already registered. Please use 'Forgot Email' or click 'Back to Login' to sign in with your existing account.",
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
        localStorage.setItem('session_timestamp', Date.now().toString());
        
        toast({
          title: "Profile Setup Complete!",
          description: `Welcome ${data.role === "student" ? "Student" : "Staff Member"} ${data.name}!`,
        });
        
        onComplete(userDisplayData);
        setLocation("/home");
      } else {
        const error = await response.json();
        let errorMessage = error.message || "Failed to complete profile setup. Please try again.";
        
        // Handle specific duplicate errors with better messaging
        if (error.message === "Register number is already registered") {
          errorMessage = "This register number is already registered with another account. Please check your register number or use 'Back to Login' to sign in.";
        } else if (error.message === "Staff ID is already registered") {
          errorMessage = "This staff ID is already registered with another account. Please check your staff ID or use 'Back to Login' to sign in.";
        } else if (error.message === "Email is already registered") {
          errorMessage = "This email is already registered with another account. Please use 'Back to Login' to sign in.";
        }
        
        toast({
          title: "Setup Failed",
          description: errorMessage,
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
                        <FormLabel className={nameValidation.isValid === false ? "text-red-600" : nameValidation.isValid === true ? "text-green-600" : ""}>
                          Full Name
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your full name"
                              className={`pr-10 ${nameValidation.isValid === false ? "border-red-500 focus:border-red-500" : nameValidation.isValid === true ? "border-green-500 focus:border-green-500" : ""}`}
                              data-testid="input-name"
                            />
                          </FormControl>
                          {nameValidation.isValid !== null && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {nameValidation.isValid ? (
                                <Check className="w-4 h-4 text-green-600" data-testid="icon-name-valid" />
                              ) : (
                                <X className="w-4 h-4 text-red-600" data-testid="icon-name-invalid" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${nameValidation.isValid === false ? "text-red-600" : nameValidation.isValid === true ? "text-green-600" : "text-gray-500"}`}>
                          {nameValidation.message}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={phoneValidation.isValid === false ? "text-red-600" : phoneValidation.isValid === true ? "text-green-600" : ""}>
                          Phone Number
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your phone number (e.g., +91 9876543210)"
                              className={`pr-10 ${phoneValidation.isValid === false ? "border-red-500 focus:border-red-500" : phoneValidation.isValid === true ? "border-green-500 focus:border-green-500" : ""}`}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          {phoneValidation.isValid !== null && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {phoneValidation.isValid ? (
                                <Check className="w-4 h-4 text-green-600" data-testid="icon-phone-valid" />
                              ) : (
                                <X className="w-4 h-4 text-red-600" data-testid="icon-phone-invalid" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${phoneValidation.isValid === false ? "text-red-600" : phoneValidation.isValid === true ? "text-green-600" : "text-gray-500"}`}>
                          {phoneValidation.message}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={form.formState.errors.role ? "text-red-600" : watchedRole ? "text-green-600" : ""}>
                          I am a
                        </FormLabel>
                        <div className="relative">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={`pr-10 ${form.formState.errors.role ? "border-red-500 focus:border-red-500" : watchedRole ? "border-green-500 focus:border-green-500" : ""}`} data-testid="select-role">
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
                          {watchedRole && (
                            <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                              <Check className="w-4 h-4 text-green-600" data-testid="icon-role-valid" />
                            </div>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${watchedRole ? "text-green-600" : "text-gray-500"}`}>
                          {watchedRole ? `${watchedRole === 'student' ? 'Student' : 'Staff'} role selected` : "Please select your role"}
                        </div>
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
                          <FormLabel className={registerNumberValidation.isValid === false ? "text-red-600" : registerNumberValidation.isValid === true ? "text-green-600" : ""}>
                            Register Number
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., 711523CSE055"
                                onChange={(e) => handleRegisterNumberChange(e.target.value)}
                                className={`font-mono pr-10 ${registerNumberValidation.isValid === false ? "border-red-500 focus:border-red-500" : registerNumberValidation.isValid === true ? "border-green-500 focus:border-green-500" : ""}`}
                                data-testid="input-register-number"
                              />
                            </FormControl>
                            {registerNumberValidation.isValid !== null && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {registerNumberValidation.isValid ? (
                                  <Check className="w-4 h-4 text-green-600" data-testid="icon-register-number-valid" />
                                ) : (
                                  <X className="w-4 h-4 text-red-600" data-testid="icon-register-number-invalid" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${registerNumberValidation.isValid === false ? "text-red-600" : registerNumberValidation.isValid === true ? "text-green-600" : "text-gray-500"}`}>
                            {registerNumberValidation.message || "Format: 7115 + joining year + department + roll number"}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={departmentValidation.isValid === false ? "text-red-600" : departmentValidation.isValid === true ? "text-green-600" : ""}>
                            Department
                          </FormLabel>
                          <div className="relative">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={`pr-10 ${departmentValidation.isValid === false ? "border-red-500 focus:border-red-500" : departmentValidation.isValid === true ? "border-green-500 focus:border-green-500" : ""}`} data-testid="select-department">
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
                            {departmentValidation.isValid === true && (
                              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                                <Check className="w-4 h-4 text-green-600" data-testid="icon-department-valid" />
                              </div>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${departmentValidation.isValid === false ? "text-red-600" : departmentValidation.isValid === true ? "text-green-600" : "text-gray-500"}`}>
                            {departmentValidation.message || "Select your department from the list"}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="passingOutYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={passingOutYearValidation.isValid === false ? "text-red-600" : passingOutYearValidation.isValid === true ? "text-green-600" : ""}>
                            Passing Out Year
                          </FormLabel>
                          <div className="relative">
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger className={`pr-10 ${passingOutYearValidation.isValid === false ? "border-red-500 focus:border-red-500" : passingOutYearValidation.isValid === true ? "border-green-500 focus:border-green-500" : ""}`} data-testid="select-passing-year">
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
                            {passingOutYearValidation.isValid === true && (
                              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                                <Check className="w-4 h-4 text-green-600" data-testid="icon-passing-year-valid" />
                              </div>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${passingOutYearValidation.isValid === false ? "text-red-600" : passingOutYearValidation.isValid === true ? "text-green-600" : "text-gray-500"}`}>
                            {passingOutYearValidation.message || "Select the year you expect to graduate"}
                          </div>
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
                          <FormLabel className={staffIdValidation.isValid === false ? "text-red-600" : staffIdValidation.isValid === true ? "text-green-600" : ""}>
                            Staff ID
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g., ABC123"
                                onChange={(e) => handleStaffIdChange(e.target.value)}
                                className={`font-mono pr-10 ${staffIdValidation.isValid === false ? "border-red-500 focus:border-red-500" : staffIdValidation.isValid === true ? "border-green-500 focus:border-green-500" : ""}`}
                                maxLength={6}
                                data-testid="input-staff-id"
                              />
                            </FormControl>
                            {staffIdValidation.isValid !== null && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {staffIdValidation.isValid ? (
                                  <Check className="w-4 h-4 text-green-600" data-testid="icon-staff-id-valid" />
                                ) : (
                                  <X className="w-4 h-4 text-red-600" data-testid="icon-staff-id-invalid" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${staffIdValidation.isValid === false ? "text-red-600" : staffIdValidation.isValid === true ? "text-green-600" : "text-gray-500"}`}>
                            {staffIdValidation.message || '3 letters + 3 numbers. Use "_" for missing letters (e.g., _AB123) or "0" for missing numbers (e.g., ABC012)'}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Form Status Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                  <h4 className="font-medium mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-blue-600" />
                    Form Completion Status
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Name:</span>
                      <div className="flex items-center">
                        {nameValidation.isValid ? (
                          <><Check className="w-3 h-3 text-green-600 mr-1" /> Valid</>
                        ) : nameValidation.isValid === false ? (
                          <><X className="w-3 h-3 text-red-600 mr-1" /> Invalid</>
                        ) : (
                          <span className="text-gray-500">Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Phone:</span>
                      <div className="flex items-center">
                        {phoneValidation.isValid ? (
                          <><Check className="w-3 h-3 text-green-600 mr-1" /> Valid</>
                        ) : phoneValidation.isValid === false ? (
                          <><X className="w-3 h-3 text-red-600 mr-1" /> Invalid</>
                        ) : (
                          <span className="text-gray-500">Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Role:</span>
                      <div className="flex items-center">
                        {watchedRole ? (
                          <><Check className="w-3 h-3 text-green-600 mr-1" /> Selected</>
                        ) : (
                          <span className="text-gray-500">Pending</span>
                        )}
                      </div>
                    </div>
                    {watchedRole === "student" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span>Register No:</span>
                          <div className="flex items-center">
                            {registerNumberValidation.isValid ? (
                              <><Check className="w-3 h-3 text-green-600 mr-1" /> Valid</>
                            ) : registerNumberValidation.isValid === false ? (
                              <><X className="w-3 h-3 text-red-600 mr-1" /> Invalid</>
                            ) : (
                              <span className="text-gray-500">Pending</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Department:</span>
                          <div className="flex items-center">
                            {departmentValidation.isValid ? (
                              <><Check className="w-3 h-3 text-green-600 mr-1" /> Selected</>
                            ) : (
                              <span className="text-gray-500">Pending</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Passing Year:</span>
                          <div className="flex items-center">
                            {passingOutYearValidation.isValid ? (
                              <><Check className="w-3 h-3 text-green-600 mr-1" /> Selected</>
                            ) : (
                              <span className="text-gray-500">Pending</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {watchedRole === "staff" && (
                      <div className="flex items-center justify-between">
                        <span>Staff ID:</span>
                        <div className="flex items-center">
                          {staffIdValidation.isValid ? (
                            <><Check className="w-3 h-3 text-green-600 mr-1" /> Valid</>
                          ) : staffIdValidation.isValid === false ? (
                            <><X className="w-3 h-3 text-red-600 mr-1" /> Invalid</>
                          ) : (
                            <span className="text-gray-500">Pending</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={onBackToLogin}
                    className="flex-1"
                    size="lg"
                    disabled={isSubmitting}
                    data-testid="button-back-to-login"
                  >
                    Back to Login
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    size="lg" 
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}