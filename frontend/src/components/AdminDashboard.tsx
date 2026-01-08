import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Users,
  TrendingUp,
  UserPlus,
  ClipboardCheck,
  UserX,
  Fingerprint,
  FileEdit,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from "../cont/AuthContext"; 
import { useEffect, useState } from "react";
import { AdminStats, CourseAttention, UserManagementItem } from "../types/admindash";
import {
  getAdminStats,
  getCoursesRequiringAttention,
  getRecentUsers,
} from "../services/api";
import { Navbar } from "./Navbar";

interface AdminDashboardProps {
  onLogout?: () => void;
  onNavigateToManageUsers: () => void;
  onNavigateToManageUserProfile: () => void;
  onNavigateToManageCustomGoals: () => void;
  onNavigateToBiometricProfile: () => void;
  onNavigateToAttendanceRecords: () => void;
  onNavigateToReports: () => void;
  onNavigateToProfile?: () => void;
}

export function AdminDashboard({
  onNavigateToManageUsers,
  onNavigateToManageUserProfile,
  onNavigateToManageCustomGoals,
  onNavigateToBiometricProfile,
  onNavigateToAttendanceRecords,
  onNavigateToProfile,
  onNavigateToReports,
}: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentU, setRecentU] = useState<UserManagementItem[]>([]);
  const [lowAttendanceCourses, setLowAttendanceCourses] = useState<CourseAttention[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        const [dbdata, attentionData, recentUs] = await Promise.all([
          getAdminStats(token),
          getCoursesRequiringAttention(token),
          getRecentUsers(token),
        ]);

        setStats(dbdata);
        setLowAttendanceCourses(attentionData);
        setRecentU(recentUs);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Overall Attendance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Overall Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats?.overall_attendance_rate ?? 0}%</div>
              <p className="text-xs text-green-600 mt-1">
                {stats?.trend_attendance ?? "No data"}
              </p>
            </CardContent>
          </Card>

          {/* Monthly Absences */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Monthly Absences</CardTitle>
              <UserX className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats?.monthly_absences ?? 0}</div>
              <p className="text-xs text-green-600 mt-1">
                {stats?.trend_absences ?? "No data"}
              </p>
            </CardContent>
          </Card>

          {/* Total Active Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Active Users</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats?.total_active_users ?? 0}</div>
              <p className="text-xs text-green-600 mt-1">
                {stats?.trend_users ?? "No data"}
              </p>
            </CardContent>
          </Card>

          {/* Attendance Records */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Attendance Records and Report</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onNavigateToAttendanceRecords}
                >
                  View Attendance Record
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onNavigateToReports}
                >
                  View Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Low Attendance Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Modules Requiring Attention</CardTitle>
              <CardDescription>Modules with attendance below 80%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowAttendanceCourses.length === 0 ? (
                  <p className="text-gray-500">No Entry.</p>
                ) : (
                  lowAttendanceCourses.map((module) => (
                    <div key={module.module_code} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{module.module_code}</p>
                          <p className="text-sm text-gray-600">{module.module_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{module.lecturer_name}</p>
                        </div>
                        <Badge variant="destructive">{module.attendance_rate}%</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                        <Users className="h-4 w-4" />
                        <span>{module.student_count} students</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start h-18"
                  variant="outline"
                  onClick={onNavigateToManageUsers}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage User Account
                </Button>
                <Button
                  className="w-full justify-start h-18"
                  variant="outline"
                  onClick={onNavigateToManageUserProfile}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage User Profile
                </Button>
                <Button
                  className="w-full justify-start h-18"
                  variant="outline"
                  onClick={onNavigateToManageCustomGoals}
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Manage Custom Goals
                </Button>
                <Button
                  className="w-full justify-start h-18"
                  variant="outline"
                  onClick={onNavigateToBiometricProfile}
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Manage Biometric Data
                </Button>
                {onNavigateToProfile && (
                  <Button
                    className="w-full justify-start h-18"
                    variant="outline"
                    onClick={onNavigateToProfile}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Recent user registrations and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="recent">
                <TabsList className="mb-4">
                  <TabsTrigger value="recent">Recent Users</TabsTrigger>
                </TabsList>
                <TabsContent value="recent">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentU.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === "active" ? "default" : "secondary"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.joined}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={onNavigateToManageUsers}>
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}