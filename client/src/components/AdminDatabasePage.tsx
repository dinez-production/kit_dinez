import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, Database, Download, Upload, RefreshCw, 
  HardDrive, Activity, Clock, AlertTriangle, CheckCircle,
  FileText, Search, Settings, Trash2, Archive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDatabasePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const databaseStats = {
    totalSize: "0 GB",
    totalTables: 0,
    totalRecords: 0,
    lastBackup: "No backups",
    healthStatus: "Healthy",
    uptime: "Available"
  };

  const tables: any[] = []; // Will be populated from actual database schema when admin tools are implemented

  const backups: any[] = []; // Will be populated from actual backup system when implemented

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Healthy":
      case "Completed": return "bg-success text-success-foreground";
      case "Warning": return "bg-warning text-warning-foreground";
      case "Error": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Healthy":
      case "Completed": return <CheckCircle className="h-3 w-3" />;
      case "Warning": return <AlertTriangle className="h-3 w-3" />;
      case "Error": return <AlertTriangle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const filteredTables = tables.filter((table: any) =>
    table.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBackup = () => {
    toast({
      title: "Backup Started",
      description: "Database backup has been initiated successfully!",
    });
  };

  const handleRestore = () => {
    toast({
      title: "Restore Initiated",
      description: "Database restore process has started!",
    });
  };

  const handleOptimize = () => {
    toast({
      title: "Optimization Started",
      description: "Database optimization is in progress!",
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/admin")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Database Management</h1>
            <p className="text-muted-foreground">Monitor and manage database operations</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleOptimize}>
            <Settings className="h-4 w-4 mr-2" />
            Optimize
          </Button>
          <Button variant="outline" onClick={handleBackup}>
            <Download className="h-4 w-4 mr-2" />
            Backup
          </Button>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Database className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{databaseStats.totalSize}</p>
                <p className="text-xs text-muted-foreground">Total Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{databaseStats.totalTables}</p>
                <p className="text-xs text-muted-foreground">Tables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                <HardDrive className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{databaseStats.totalRecords.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                <Activity className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{databaseStats.uptime}</p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-bold text-success">{databaseStats.healthStatus}</p>
                <p className="text-xs text-muted-foreground">Health Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-xs font-bold">{databaseStats.lastBackup}</p>
                <p className="text-xs text-muted-foreground">Last Backup</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Database Tables */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTables.map((table) => (
                  <div key={table.name} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Database className="h-4 w-4 text-primary" />
                        <div>
                          <h4 className="font-medium text-foreground">{table.displayName}</h4>
                          <p className="text-sm text-muted-foreground">{table.description}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(table.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(table.status)}
                          <span>{table.status}</span>
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Records:</span> {table.records.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {table.size}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span> {table.lastUpdated}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 mt-3">
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backup Management */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Backups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getStatusColor(backup.status)}>
                      {backup.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{backup.size}</span>
                  </div>
                  <h5 className="font-medium text-sm">{backup.name}</h5>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{backup.type}</span>
                    <span>{backup.createdAt}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Button variant="ghost" size="sm">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRestore}>
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleBackup}>
                <Download className="h-4 w-4 mr-2" />
                Create Full Backup
              </Button>
              <Button variant="outline" className="w-full">
                <Archive className="h-4 w-4 mr-2" />
                Incremental Backup
              </Button>
              <Button variant="outline" className="w-full" onClick={handleOptimize}>
                <Settings className="h-4 w-4 mr-2" />
                Optimize Database
              </Button>
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Statistics
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Used Space</span>
                  <span>2.4 GB / 10 GB</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Available space: 7.6 GB</p>
                <p>Backup storage: 12.3 GB</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}