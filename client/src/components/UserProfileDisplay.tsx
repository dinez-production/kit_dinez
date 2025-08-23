import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, School, Briefcase, Hash, Calendar, GraduationCap, Building } from "lucide-react";
import { getDepartmentFullName, getStudyYearDisplay } from "@shared/utils";

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string;
  // Student fields
  registerNumber?: string;
  department?: string;
  currentStudyYear?: number;
  isPassed?: boolean;
  // Staff fields
  staffId?: string;
}

interface UserProfileDisplayProps {
  user: UserData;
}

export default function UserProfileDisplay({ user }: UserProfileDisplayProps) {
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'student':
        return { label: 'Student', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'staff':
        return { label: 'Staff', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'super_admin':
        return { label: 'Super Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
      case 'canteen_owner':
        return { label: 'Canteen Owner', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
      default:
        return { label: role, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
    }
  };

  const roleDisplay = getRoleDisplay(user.role);

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="font-medium">{user.name}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="font-medium text-sm">{user.email}</span>
          </div>
          
          {user.phoneNumber && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Phone</span>
              <span className="font-medium">{user.phoneNumber}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge className={roleDisplay.color}>
              {roleDisplay.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Student Information */}
      {user.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <School className="w-5 h-5 mr-2" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.registerNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Register Number</span>
                <span className="font-mono font-medium">{user.registerNumber}</span>
              </div>
            )}
            
            {user.department && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Department</span>
                <div className="text-right">
                  <div className="font-medium">{user.department}</div>
                  <div className="text-xs text-muted-foreground">
                    {getDepartmentFullName(user.department)}
                  </div>
                </div>
              </div>
            )}
            
            {user.currentStudyYear && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Year</span>
                <Badge variant="outline">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {getStudyYearDisplay(user.currentStudyYear)} Year
                </Badge>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={user.isPassed 
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }>
                {user.isPassed ? 'Alumni' : 'Active Student'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Information */}
      {user.role === 'staff' && user.staffId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Staff Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Staff ID</span>
              <span className="font-mono font-medium">{user.staffId}</span>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}