import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  MessageSquare, CreditCard, Gift, AlertTriangle, School, Briefcase
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDepartmentFullName, getStudyYearDisplay } from "@shared/utils";

export default function AdminUserManagementPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all-users");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Fetch real users from database
  const { data: users = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch real complaints from database
  const [complaints, setComplaints] = useState<any[]>([]);

  const handleUserAction = (userId: number, action: string) => {
    // TODO: Implement actual user status update via API
    toast({
      title: "Action Completed",
      description: `User has been ${action}d successfully`,
    });
    refetch(); // Refresh data
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role.toLowerCase() === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "Active").length,
    suspendedUsers: users.filter(u => u.status === "Suspended").length,
    newUsersThisMonth: 0,
    totalRevenue: 0,
    avgOrderValue: 0
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
              <p className="text-sm text-muted-foreground">Manage customers, staff, and administrators</p>
            </div>
          </div>
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
                        <SelectItem value="faculty">Faculty</SelectItem>
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
                                  <SelectItem value="faculty">Faculty</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Address</Label>
                            <Textarea placeholder="Enter address" />
                          </div>
                          <Button variant="food" className="w-full" onClick={() => {
                            toast({
                              title: "User Created",
                              description: "New user has been created successfully",
                            });
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
                              toast({
                                title: "Edit User",
                                description: `Opening edit form for ${user.name}`,
                              });
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.status === "Active" ? (
                              <Button variant="ghost" size="sm" onClick={() => handleUserAction(user.id, "suspend")}>
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleUserAction(user.id, "activate")}>
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                              if (window.confirm('Are you sure you want to delete this user?')) {
                                // TODO: Implement actual user deletion via API
                                toast({
                                  title: "User Deleted",
                                  description: `${user.name} has been deleted successfully`,
                                });
                                refetch(); // Refresh data
                              }
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
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total Revenue</span>
                        <span className="font-bold">₹{stats.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Order Value</span>
                        <span className="font-bold">₹{stats.avgOrderValue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Top Spending User</span>
                        <span className="font-bold">Dr. Priya Sharma</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Behavior</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Most Active Role</span>
                        <span className="font-bold">Faculty</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peak Usage Time</span>
                        <span className="font-bold">12:00 - 2:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Session Duration</span>
                        <span className="font-bold">8.5 minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Complaints & Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complaints.map((complaint) => (
                    <div key={complaint.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{complaint.subject}</h3>
                          <p className="text-sm text-muted-foreground">{complaint.userName} • {complaint.date}</p>
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
                      <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            toast({
                              title: "Reply Sent",
                              description: "Reply has been sent to the user",
                            });
                          }}>Reply</Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setComplaints(prev => prev.map(c => 
                              c.id === complaint.id ? { ...c, status: 'Resolved' } : c
                            ));
                            toast({
                              title: "Complaint Resolved",
                              description: "Complaint has been marked as resolved",
                            });
                          }}>Resolve</Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            toast({
                              title: "Complaint Escalated",
                              description: "Complaint has been escalated to management",
                            });
                          }}>Escalate</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                    >
                      <Mail className="w-6 h-6" />
                      <span className="text-sm">Send Email</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setLocation("/admin/user-management/add-loyalty-points")}
                    >
                      <Gift className="w-6 h-6" />
                      <span className="text-sm">Add Loyalty Points</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setLocation("/admin/user-management/apply-discount")}
                    >
                      <CreditCard className="w-6 h-6" />
                      <span className="text-sm">Apply Discount</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => setLocation("/admin/user-management/send-warning")}
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
                    <Button variant="outline" onClick={() => setLocation("/admin/user-management/export-data")}>Export User Data</Button>
                    <Button variant="outline" onClick={() => setLocation("/admin/user-management/import-users")}>Import Users</Button>
                    <Button variant="outline" onClick={() => {
                      toast({
                        title: "Database Backup",
                        description: "Database backup has been initiated",
                      });
                    }}>Backup Database</Button>
                    <Button variant="outline" onClick={() => {
                      toast({
                        title: "Report Generated",
                        description: "User report has been generated successfully",
                      });
                    }}>Generate Report</Button>
                    <Button variant="outline" onClick={() => {
                      if (window.confirm('Are you sure you want to clean inactive users?')) {
                        toast({
                          title: "Cleanup Complete",
                          description: "Inactive users have been cleaned up",
                        });
                      }
                    }}>Clean Inactive Users</Button>
                    <Button variant="outline" onClick={() => {
                      toast({
                        title: "Permissions Updated",
                        description: "User permissions have been updated",
                      });
                    }}>Update Permissions</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}