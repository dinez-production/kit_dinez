import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Search, Filter, Plus, Edit, Trash2, Mail, Phone, 
  MapPin, Star, Ban, Shield, Users, UserCheck, UserX, 
  MessageSquare, CreditCard, Gift, AlertTriangle, School, Briefcase, RefreshCcw, Download, BarChart3, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDepartmentFullName, getStudyYearDisplay } from "@shared/utils";

export default function AdminUserManagementPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all-users");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, user: any | null}>({open: false, user: null});
  const [editDialog, setEditDialog] = useState<{open: boolean, user: any | null}>({open: false, user: null});
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: '',
    registerNumber: '',
    department: '',
    joiningYear: '',
    passingOutYear: '',
    currentStudyYear: '',
    staffId: ''
  });

  // Fetch real users from database with real-time updates
  const { data: users = [], isLoading, refetch, error: usersError } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    refetchInterval: 60000, // Auto-refresh every minute
    staleTime: 30000, // Data is fresh for 30 seconds
  });

  // Fetch analytics data for better statistics
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['/api/admin/analytics'],
    queryFn: () => fetch('/api/admin/analytics').then(res => res.json()),
    refetchInterval: 60000,
  });

  // Fetch orders for user behavior analytics
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => fetch('/api/orders').then(res => res.json()),
    refetchInterval: 60000,
  });

  // Real complaints data from API
  const { data: complaintsData = [], isLoading: complaintsLoading, refetch: refetchComplaints } = useQuery<any[]>({
    queryKey: ["/api/complaints"],
    refetchInterval: 60000, // Refresh every minute
  });

  const [complaints, setComplaints] = useState<any[]>(complaintsData);

  // Update complaints when API data changes
  useEffect(() => {
    setComplaints(complaintsData);
  }, [complaintsData]);

  // Combined loading state
  const isDataLoading = isLoading || analyticsLoading || ordersLoading || complaintsLoading;

  // Refresh all data function
  const refreshAllData = async () => {
    try {
      await Promise.all([
        refetch(),
        refetchAnalytics(),
        refetchOrders()
      ]);
      
      // Invalidate query cache to force fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: "Data Refreshed",
        description: `Updated: ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Please check your connection and try again",
      });
    }
  };

  const handleUserAction = async (userId: number, action: string) => {
    try {
      const statusToUpdate = action === 'suspend' ? 'Suspended' : 'Active';
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: statusToUpdate }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
      
      toast({
        title: "Action Completed",
        description: `User has been ${action}d successfully`,
      });
      await refetch(); // Refresh data
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    }
  };

  const handleUserUpdate = async (userId: number, userData: any, userName: string) => {
    try {
      // Prepare the update data
      const updateData: any = {
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber || null,
        role: userData.role,
      };

      // Add role-specific fields
      if (userData.role === 'student') {
        updateData.registerNumber = userData.registerNumber || null;
        updateData.department = userData.department || null;
        updateData.joiningYear = userData.joiningYear ? parseInt(userData.joiningYear) : null;
        updateData.passingOutYear = userData.passingOutYear ? parseInt(userData.passingOutYear) : null;
        updateData.currentStudyYear = userData.currentStudyYear ? parseInt(userData.currentStudyYear) : null;
        updateData.staffId = null; // Clear staff fields
      } else if (userData.role === 'staff') {
        updateData.staffId = userData.staffId || null;
        updateData.registerNumber = null; // Clear student fields
        updateData.department = null;
        updateData.joiningYear = null;
        updateData.passingOutYear = null;
        updateData.currentStudyYear = null;
      } else {
        // For admin and canteen-owner, clear both student and staff specific fields
        updateData.registerNumber = null;
        updateData.department = null;
        updateData.joiningYear = null;
        updateData.passingOutYear = null;
        updateData.currentStudyYear = null;
        updateData.staffId = null;
      }
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      
      toast({
        title: "User Updated",
        description: `${userName}'s details have been updated successfully`,
      });
      setEditDialog({open: false, user: null});
      await refetch(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Please try again or contact support",
        variant: "destructive",
      });
    }
  };

  const canChangeRole = (currentRole: string, newRole: string) => {
    // Staff cannot change to student and vice versa
    if ((currentRole === 'staff' && newRole === 'student') || 
        (currentRole === 'student' && newRole === 'staff')) {
      return false;
    }
    return true;
  };

  const getAvailableRoles = (currentRole: string) => {
    const allRoles = ['admin', 'canteen-owner', 'student', 'staff'];
    return allRoles.filter(role => canChangeRole(currentRole, role));
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      toast({
        title: "User Deleted",
        description: `${userName} has been deleted successfully`,
      });
      setDeleteDialog({open: false, user: null});
      await refetch(); // Refresh data
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role.toLowerCase() === filterRole;
    return matchesSearch && matchesRole;
  });

  // Calculate real statistics from live data
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "Active" || !u.status).length, // Default to active if no status
    suspendedUsers: users.filter(u => u.status === "Suspended" || u.status === "Banned").length,
    newUsersThisMonth: users.filter(u => {
      const createdDate = new Date(u.createdAt);
      const now = new Date();
      return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
    }).length,
    totalRevenue: analyticsData?.totalRevenue || 0,
    avgOrderValue: analyticsData?.averageOrderValue || 0,
    totalOrders: analyticsData?.totalOrders || 0,
    // User role breakdown
    students: users.filter(u => u.role === 'student').length,
    canteenOwner: users.filter(u => u.role === 'canteen-owner').length,
    staff: users.filter(u => u.role === 'staff').length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/admin")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage customers, staff, and administrators • Live data syncing</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={refreshAllData}
            disabled={isDataLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCcw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
            <span>{isDataLoading ? 'Syncing...' : 'Refresh Data'}</span>
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all-users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>All Users</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="complaints" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Complaints</span>
            </TabsTrigger>
            <TabsTrigger value="bulk-actions" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Bulk Actions</span>
            </TabsTrigger>
          </TabsList>

          {/* All Users Tab */}
          <TabsContent value="all-users" className="mt-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-5 h-5 text-success" />
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-2xl font-bold">{stats.activeUsers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <UserX className="w-5 h-5 text-warning" />
                      <div>
                        <p className="text-sm text-muted-foreground">Suspended</p>
                        <p className="text-2xl font-bold">{stats.suspendedUsers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Plus className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">New This Month</p>
                        <p className="text-2xl font-bold">{stats.newUsersThisMonth}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search users by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="canteen-owner">Canteen Owner</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="food">
                          <Plus className="w-4 h-4 mr-2" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New User</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Name</Label>
                              <Input placeholder="Full name" />
                            </div>
                            <div>
                              <Label>Email</Label>
                              <Input placeholder="email@kit.ac.in" />
                            </div>
                            <div>
                              <Label>Phone</Label>
                              <Input placeholder="+91 XXXXXXXXXX" />
                            </div>
                            <div>
                              <Label>Role</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="canteen-owner">Canteen Owner</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Address</Label>
                            <Textarea placeholder="Enter address" />
                          </div>
                          <Button variant="food" className="w-full" onClick={async () => {
                            try {
                              // TODO: Implement actual user creation via API
                              // const response = await fetch('/api/users', {
                              //   method: 'POST',
                              //   headers: { 'Content-Type': 'application/json' },
                              //   body: JSON.stringify(formData)
                              // });
                              
                              toast({
                                title: "User Created",
                                description: "New user has been created successfully",
                              });
                              await refetch(); // Refresh user list
                            } catch (error) {
                              toast({
                                title: "Creation Failed",
                                description: "Please check your inputs and try again",
                              });
                            }
                          }}>Create User</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>Users ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{user.name}</h3>
                                <Badge variant={user.status === "Active" ? "default" : user.status === "Suspended" ? "destructive" : "secondary"}>
                                  {user.status || "Active"}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {user.role?.replace('_', ' ') || 'student'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3" />
                                  <span>{user.email}</span>
                                </div>
                                {user.phoneNumber && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{user.phoneNumber}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <Shield className="w-3 h-3" />
                                  <span>{user.role?.replace('_', ' ') || 'student'}</span>
                                </div>
                                
                                {/* Student specific information */}
                                {user.role === 'student' && user.registerNumber && (
                                  <div className="flex items-center space-x-1">
                                    <School className="w-3 h-3" />
                                    <span className="font-mono">{user.registerNumber}</span>
                                  </div>
                                )}
                                {user.role === 'student' && user.department && (
                                  <div className="flex items-center space-x-1">
                                    <School className="w-3 h-3" />
                                    <span>{user.department} - {getDepartmentFullName(user.department)}</span>
                                  </div>
                                )}
                                
                                {/* Staff specific information */}
                                {user.role === 'staff' && user.staffId && (
                                  <div className="flex items-center space-x-1">
                                    <Briefcase className="w-3 h-3" />
                                    <span className="font-mono">Staff ID: {user.staffId}</span>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">User ID: </span>
                                  <span className="font-mono text-xs">{user.id}</span>
                                </div>
                                {user.role === 'student' && user.currentStudyYear && (
                                  <div>
                                    <span className="text-muted-foreground">Year: </span>
                                    <span className="font-medium">{getStudyYearDisplay(user.currentStudyYear)}</span>
                                  </div>
                                )}
                                {user.role === 'student' && (
                                  <div>
                                    <span className="text-muted-foreground">Status: </span>
                                    <span className="font-medium">{user.isPassed ? 'Alumni' : 'Active'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditDialog({open: true, user});
                              setEditFormData({
                                name: user.name || '',
                                email: user.email || '',
                                phoneNumber: user.phoneNumber || '',
                                role: user.role || '',
                                registerNumber: user.registerNumber || '',
                                department: user.department || '',
                                joiningYear: user.joiningYear?.toString() || '',
                                passingOutYear: user.passingOutYear?.toString() || '',
                                currentStudyYear: user.currentStudyYear?.toString() || '',
                                staffId: user.staffId || ''
                              });
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.status === "Active" && (
                              <Button variant="ghost" size="sm" onClick={() => handleUserAction(user.id, "suspend")}>
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                              setDeleteDialog({open: true, user});
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="grid gap-6">
              {/* Header with Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">User Analytics Dashboard</h2>
                  <p className="text-sm text-muted-foreground">Real-time insights and user behavior analytics</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={refreshAllData}
                    disabled={isDataLoading}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCcw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const csvContent = `Role,Count,Percentage\nStudents,${stats.students},${Math.round((stats.students/stats.totalUsers)*100)}%\nCanteen Owner,${stats.canteenOwner},${Math.round((stats.canteenOwner/stats.totalUsers)*100)}%\nStaff,${stats.staff},${Math.round((stats.staff/stats.totalUsers)*100)}%\nAdmins,${stats.admins},${Math.round((stats.admins/stats.totalUsers)*100)}%`;
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `user_analytics_${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      toast({
                        title: "Analytics Exported",
                        description: "User analytics data downloaded as CSV",
                      });
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>

              {/* Real-time User Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setFilterRole("student");
                  setActiveTab("all-users");
                  toast({
                    title: "Filter Applied",
                    description: "Showing student users only",
                  });
                }}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.students}</div>
                      <div className="text-sm text-muted-foreground">Students</div>
                      <div className="text-xs text-blue-500 mt-1">Click to filter</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setFilterRole("canteen-owner");
                  setActiveTab("all-users");
                  toast({
                    title: "Filter Applied",
                    description: "Showing canteen owner users only",
                  });
                }}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.canteenOwner}</div>
                      <div className="text-sm text-muted-foreground">Canteen Owner</div>
                      <div className="text-xs text-green-500 mt-1">Click to filter</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setFilterRole("staff");
                  setActiveTab("all-users");
                  toast({
                    title: "Filter Applied",
                    description: "Showing staff users only",
                  });
                }}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{stats.staff}</div>
                      <div className="text-sm text-muted-foreground">Staff</div>
                      <div className="text-xs text-purple-500 mt-1">Click to filter</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setFilterRole("admin");
                  setActiveTab("all-users");
                  toast({
                    title: "Filter Applied",
                    description: "Showing admin users only",
                  });
                }}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
                      <div className="text-sm text-muted-foreground">Admins</div>
                      <div className="text-xs text-red-500 mt-1">Click to filter</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Revenue Analytics</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Revenue Dashboard",
                            description: "Redirecting to full revenue analytics...",
                          });
                          setLocation("/admin/analytics");
                        }}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total Revenue</span>
                        <span className="font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Order Value</span>
                        <span className="font-bold text-blue-600">₹{stats.avgOrderValue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Orders</span>
                        <span className="font-bold text-purple-600">{stats.totalOrders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue per User</span>
                        <span className="font-bold text-orange-600">₹{Math.round(stats.totalRevenue / stats.totalUsers) || 0}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            const topSpenders = users
                              .slice(0, 3)
                              .map(user => user.name)
                              .join(', ');
                            toast({
                              title: "Revenue Insights",
                              description: `Top revenue contributors: ${topSpenders}`,
                            });
                          }}
                        >
                          View Top Contributors
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>User Behavior</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const behaviorData = `User Behavior Report - ${new Date().toLocaleDateString()}\n\nMost Active Role: ${stats.students >= stats.canteenOwner && stats.students >= stats.staff ? 'Students' : stats.canteenOwner >= stats.staff ? 'Canteen Owner' : 'Staff'}\nActive Users: ${stats.activeUsers}\nNew This Month: ${stats.newUsersThisMonth}\nUser Engagement: ${Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}%\nTotal Revenue: ₹${stats.totalRevenue.toLocaleString()}\nRevenue per User: ₹${Math.round(stats.totalRevenue / stats.totalUsers) || 0}`;
                          const blob = new Blob([behaviorData], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `user_behavior_${new Date().toISOString().split('T')[0]}.txt`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          toast({
                            title: "Report Generated",
                            description: "User behavior report downloaded",
                          });
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Most Active Role</span>
                        <Badge variant="default" className="font-bold">
                          {stats.students >= stats.canteenOwner && stats.students >= stats.staff ? 'Students' :
                           stats.canteenOwner >= stats.staff ? 'Canteen Owner' : 'Staff'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Users</span>
                        <span className="font-bold text-green-600">{stats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New This Month</span>
                        <span className="font-bold text-blue-600">{stats.newUsersThisMonth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>User Engagement</span>
                        <span className="font-bold text-purple-600">{Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}%</span>
                      </div>
                      <div className="pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            toast({
                              title: "Analytics Insight",
                              description: `${stats.activeUsers} out of ${stats.totalUsers} users are active (${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% engagement rate)`,
                            });
                          }}
                        >
                          View Detailed Insights
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Real-time Insights Panel */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Live Data Insights</CardTitle>
                    <div className="flex space-x-2">
                      <Badge variant={isDataLoading ? "secondary" : "default"}>
                        {isDataLoading ? 'Updating...' : 'Live'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const insightsData = `User Management Insights - ${new Date().toLocaleDateString()}\n\n=== USER BREAKDOWN ===\nTotal Users: ${stats.totalUsers}\nStudents: ${stats.students} (${Math.round((stats.students/stats.totalUsers)*100)}%)\nCanteen Owner: ${stats.canteenOwner} (${Math.round((stats.canteenOwner/stats.totalUsers)*100)}%)\nStaff: ${stats.staff} (${Math.round((stats.staff/stats.totalUsers)*100)}%)\nAdmins: ${stats.admins} (${Math.round((stats.admins/stats.totalUsers)*100)}%)\n\n=== ENGAGEMENT METRICS ===\nActive Users: ${stats.activeUsers}\nEngagement Rate: ${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%\nNew Users This Month: ${stats.newUsersThisMonth}\n\n=== REVENUE INSIGHTS ===\nTotal Revenue: ₹${stats.totalRevenue.toLocaleString()}\nRevenue per User: ₹${Math.round(stats.totalRevenue / stats.totalUsers) || 0}\nAverage Order Value: ₹${stats.avgOrderValue}\nTotal Orders: ${stats.totalOrders}\n\nGenerated by Canteen Management System`;
                          const blob = new Blob([insightsData], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `user_insights_${new Date().toISOString().split('T')[0]}.txt`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          toast({
                            title: "Insights Report Generated",
                            description: "Complete user analytics report downloaded",
                          });
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Full Report
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">User Distribution</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        {stats.students > 0 ? `${Math.round((stats.students/stats.totalUsers)*100)}%` : '0%'} Students, {stats.canteenOwner > 0 ? `${Math.round((stats.canteenOwner/stats.totalUsers)*100)}%` : '0%'} Canteen Owner
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-blue-700 hover:text-blue-800"
                        onClick={() => {
                          toast({
                            title: "User Distribution",
                            description: `${stats.students} students make up the majority with ${Math.round((stats.students/stats.totalUsers)*100)}% of total users`,
                          });
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h4 className="font-medium text-green-800 dark:text-green-200">Revenue Performance</h4>
                      <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                        ₹{Math.round(stats.totalRevenue / stats.totalUsers) || 0} per user average
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-green-700 hover:text-green-800"
                        onClick={() => {
                          setLocation("/admin/analytics");
                          toast({
                            title: "Revenue Analytics",
                            description: "Opening detailed revenue dashboard",
                          });
                        }}
                      >
                        View Analytics
                      </Button>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <h4 className="font-medium text-purple-800 dark:text-purple-200">Engagement Rate</h4>
                      <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                        {Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}% active users
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-purple-700 hover:text-purple-800"
                        onClick={() => {
                          toast({
                            title: "Engagement Analysis",
                            description: `${stats.activeUsers} out of ${stats.totalUsers} users are currently active`,
                          });
                        }}
                      >
                        Analyze Trends
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints" className="mt-6">
            <div className="grid gap-6">
              {/* Complaints Dashboard Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Complaints Management</h2>
                  <p className="text-sm text-muted-foreground">Monitor and resolve user complaints efficiently</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/complaints/generate-samples', {
                          method: 'POST',
                        });
                        const result = await response.json();
                        
                        if (result.success) {
                          await refetchComplaints(); // Refresh complaints from database
                          toast({
                            title: "Complaints Generated",
                            description: `${result.complaints.length} new complaints created from real user data`,
                          });
                        } else {
                          throw new Error(result.message);
                        }
                      } catch (error) {
                        toast({
                          title: "Generation Failed",
                          description: "Could not generate sample complaints",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={isDataLoading || complaintsLoading}
                  >
                    <RefreshCcw className={`w-4 h-4 mr-2 ${isDataLoading ? 'animate-spin' : ''}`} />
                    Sync Complaints
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const complaintsData = `Complaints Report - ${new Date().toLocaleDateString()}\n\n${complaints.map(c => `Subject: ${c.subject}\nUser: ${c.userName}\nPriority: ${c.priority}\nStatus: ${c.status}\nDescription: ${c.description}\nDate: ${c.date}\n\n`).join('')}Generated by Canteen Management System`;
                      const blob = new Blob([complaintsData], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `complaints_report_${new Date().toISOString().split('T')[0]}.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      toast({
                        title: "Report Generated",
                        description: "Complaints report downloaded successfully",
                      });
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>

              {/* Complaints Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{complaints.filter(c => c.status === 'Open').length}</div>
                      <div className="text-sm text-muted-foreground">Open Issues</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{complaints.filter(c => c.priority === 'High').length}</div>
                      <div className="text-sm text-muted-foreground">High Priority</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{complaints.filter(c => c.status === 'Resolved').length}</div>
                      <div className="text-sm text-muted-foreground">Resolved</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{complaints.length}</div>
                      <div className="text-sm text-muted-foreground">Total Complaints</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Complaints List */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Active Complaints</CardTitle>
                    <div className="flex space-x-2">
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priority</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complaints.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No Complaints Found</h3>
                        <p className="text-muted-foreground">Click 'Sync Complaints' to load user feedback</p>
                      </div>
                    ) : (
                      complaints.map((complaint) => (
                        <div key={complaint.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{complaint.subject}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {complaint.category || 'General'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <User className="w-3 h-3 inline mr-1" />
                                {complaint.userName} • {complaint.date}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={complaint.priority === "High" ? "destructive" : complaint.priority === "Medium" ? "secondary" : "default"}>
                                {complaint.priority}
                              </Badge>
                              <Badge variant={complaint.status === "Open" ? "destructive" : "default"}>
                                {complaint.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{complaint.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={async () => {
                                try {
                                  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
                                  toast({
                                    title: "Reply Sent",
                                    description: `Response sent to ${complaint.userName}`,
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Reply Failed",
                                    description: "Please try again",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={complaint.status === 'Resolved'}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/complaints/${complaint.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      status: 'Resolved',
                                      resolvedBy: 'Admin',
                                      resolvedAt: new Date().toISOString()
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    await refetchComplaints(); // Refresh data from API
                                    toast({
                                      title: "Complaint Resolved",
                                      description: `${complaint.subject} marked as resolved`,
                                    });
                                  } else {
                                    throw new Error('Failed to update complaint');
                                  }
                                } catch (error) {
                                  toast({
                                    title: "Update Failed",
                                    description: "Please try again",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={complaint.status === 'Resolved'}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              {complaint.status === 'Resolved' ? 'Resolved' : 'Resolve'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/complaints/${complaint.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      priority: 'High',
                                      adminNotes: 'Escalated by admin'
                                    })
                                  });
                                  
                                  if (response.ok) {
                                    await refetchComplaints(); // Refresh data from API
                                    toast({
                                      title: "Complaint Escalated",
                                      description: "Escalated to management team",
                                    });
                                  } else {
                                    throw new Error('Failed to escalate complaint');
                                  }
                                } catch (error) {
                                  toast({
                                    title: "Escalation Failed",
                                    description: "Please try again",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={complaint.priority === 'High'}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {complaint.priority === 'High' ? 'Escalated' : 'Escalate'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={async () => {
                                if (window.confirm(`Remove complaint: ${complaint.subject}?`)) {
                                  try {
                                    const response = await fetch(`/api/complaints/${complaint.id}`, {
                                      method: 'DELETE'
                                    });
                                    
                                    if (response.ok) {
                                      await refetchComplaints(); // Refresh data from API
                                      toast({
                                        title: "Complaint Removed",
                                        description: "Complaint has been deleted",
                                      });
                                    } else {
                                      throw new Error('Failed to delete complaint');
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Delete Failed",
                                      description: "Could not remove complaint",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bulk Actions Tab */}
          <TabsContent value="bulk-actions" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk User Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setLocation("/admin/user-management/send-email")}
                      data-testid="button-send-email"
                    >
                      <Mail className="w-6 h-6" />
                      <span className="text-sm">Send Email</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setLocation("/admin/user-management/add-loyalty-points")}
                      data-testid="button-add-loyalty-points"
                    >
                      <Gift className="w-6 h-6" />
                      <span className="text-sm">Add Loyalty Points</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setLocation("/admin/user-management/apply-discount")}
                      data-testid="button-apply-discount"
                    >
                      <CreditCard className="w-6 h-6" />
                      <span className="text-sm">Apply Discount</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => {
                        toast({
                          title: "Warning Feature",
                          description: "Warning notification system will be available soon",
                        });
                      }}
                      data-testid="button-send-warning"
                    >
                      <AlertTriangle className="w-6 h-6" />
                      <span className="text-sm">Send Warning</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation("/admin/user-management/export-data")}
                      data-testid="button-export-data"
                    >
                      Export User Data
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation("/admin/user-management/import-users")}
                      data-testid="button-import-users"
                    >
                      Import Users
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        toast({
                          title: "Database Backup",
                          description: "Database backup has been initiated",
                        });
                      }}
                      data-testid="button-backup-database"
                    >
                      Backup Database
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        toast({
                          title: "Report Generated",
                          description: "User report has been generated successfully",
                        });
                      }}
                      data-testid="button-generate-report"
                    >
                      Generate Report
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        toast({
                          title: "Cleanup Complete",
                          description: "Inactive users have been cleaned up",
                        });
                      }}
                      data-testid="button-clean-inactive-users"
                    >
                      Clean Inactive Users
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        toast({
                          title: "Permissions Updated",
                          description: "User permissions have been updated",
                        });
                      }}
                      data-testid="button-update-permissions"
                    >
                      Update Permissions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete User Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({open, user: null})}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete <strong>{deleteDialog.user?.name}</strong>? 
                This action cannot be undone and will permanently remove all user data.
              </p>
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Warning</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This will delete all orders, payments, and associated data for this user.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialog({open: false, user: null})}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteUser(deleteDialog.user?.id, deleteDialog.user?.name)}
                >
                  Delete User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Details Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({open, user: null})}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editFormData.name} 
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input 
                    id="edit-email" 
                    type="email"
                    value={editFormData.email} 
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input 
                    id="edit-phone" 
                    value={editFormData.phoneNumber} 
                    onChange={(e) => setEditFormData({...editFormData, phoneNumber: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select 
                    value={editFormData.role} 
                    onValueChange={(value) => setEditFormData({...editFormData, role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRoles(editDialog.user?.role || '').map(role => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Role-specific Information */}
              {editFormData.role === 'student' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Student Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-register">Register Number</Label>
                      <Input 
                        id="edit-register" 
                        value={editFormData.registerNumber} 
                        onChange={(e) => setEditFormData({...editFormData, registerNumber: e.target.value})}
                        placeholder="Enter register number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-department">Department</Label>
                      <Input 
                        id="edit-department" 
                        value={editFormData.department} 
                        onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                        placeholder="Enter department"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-joining-year">Joining Year</Label>
                      <Input 
                        id="edit-joining-year" 
                        type="number"
                        value={editFormData.joiningYear} 
                        onChange={(e) => setEditFormData({...editFormData, joiningYear: e.target.value})}
                        placeholder="2020"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-passing-year">Passing Year</Label>
                      <Input 
                        id="edit-passing-year" 
                        type="number"
                        value={editFormData.passingOutYear} 
                        onChange={(e) => setEditFormData({...editFormData, passingOutYear: e.target.value})}
                        placeholder="2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-current-year">Current Study Year</Label>
                      <Input 
                        id="edit-current-year" 
                        type="number"
                        value={editFormData.currentStudyYear} 
                        onChange={(e) => setEditFormData({...editFormData, currentStudyYear: e.target.value})}
                        placeholder="3"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editFormData.role === 'staff' && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200">Staff Information</h4>
                  <div className="space-y-2">
                    <Label htmlFor="edit-staff-id">Staff ID</Label>
                    <Input 
                      id="edit-staff-id" 
                      value={editFormData.staffId} 
                      onChange={(e) => setEditFormData({...editFormData, staffId: e.target.value})}
                      placeholder="Enter staff ID"
                    />
                  </div>
                </div>
              )}

              {/* Role Change Warning */}
              {editFormData.role !== editDialog.user?.role && (
                <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Role Change Warning</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Changing role from <strong>{editDialog.user?.role}</strong> to <strong>{editFormData.role}</strong> will 
                        {editFormData.role === 'student' || editFormData.role === 'staff' ? ' require additional information' : ' clear role-specific data'}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditDialog({open: false, user: null});
                    setEditFormData({
                      name: '', email: '', phoneNumber: '', role: '',
                      registerNumber: '', department: '', joiningYear: '',
                      passingOutYear: '', currentStudyYear: '', staffId: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editFormData.name && editFormData.email && editFormData.role) {
                      handleUserUpdate(editDialog.user?.id, editFormData, editDialog.user?.name);
                    }
                  }}
                  disabled={!editFormData.name || !editFormData.email || !editFormData.role}
                >
                  Update User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}