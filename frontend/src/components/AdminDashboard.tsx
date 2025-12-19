import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  Users,
  BookOpen,
  TrendingUp,
  LogOut,
  Settings,
  UserPlus,
  Bell,
  ClipboardCheck,
  UserX,
  Fingerprint,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { useAuth } from "../cont/AuthContext"; 
import { useEffect, useState } from "react";
import { getAdminProfile, 
        getAdminStats,
        AdminStats,
      CourseAttention,
      getCoursesRequiringAttention,
      getRecentUsers, 
      UserManagementItem} from "../services/api";

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateToManageUsers: () => void;
  onNavigateToManageUserProfile: () => void;
  onNavigateToBiometricProfile: () => void;
  onNavigateToAttendanceRecords: () => void;
  onNavigateToReports: () => void;
}


const recentUsers = [
  {
    id: 1,
    name: "Emma Thompson",
    email: "emma.thompson@uow.edu.au",
    role: "Student",
    status: "active",
    joined: "28 Oct 2025",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@uow.edu.au",
    role: "Lecturer",
    status: "active",
    joined: "27 Oct 2025",
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah.johnson@uow.edu.au",
    role: "Student",
    status: "active",
    joined: "26 Oct 2025",
  },
  {
    id: 4,
    name: "David Park",
    email: "david.park@uow.edu.au",
    role: "Student",
    status: "pending",
    joined: "26 Oct 2025",
  },
];


export function AdminDashboard({
  onLogout,
  onNavigateToManageUsers,
  onNavigateToManageUserProfile,
  onNavigateToBiometricProfile,
  onNavigateToAttendanceRecords,
  onNavigateToReports,
}: AdminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentU, setrecentU] = useState<UserManagementItem[]>([]);

  const [lowAttendanceCourses, setLowAttendanceCourses] = useState<CourseAttention[]>([]);
  useEffect(() => {
    const fetchDashboardData = async () =>{
      if (!token) return;
    
      try{
        const [
          profileData,
          dbdata,
          attentionData,
          recentUs
        ] = await Promise.all([
          getAdminProfile(token),
          getAdminStats(token),
          getCoursesRequiringAttention(token),
          getRecentUsers(token)
        ]);
      setProfile(profileData);
      setStats(dbdata);
      setLowAttendanceCourses(attentionData);
      setrecentU(recentUs);
      }
      catch (err) {
          console.error("Failed to load dashboard:", err);
          // Optional: setError(true) to show a "Retry" button
        } finally {
          //Stop loading only when EVERYTHING is finished (or failed)
          setLoading(false);
        }
      };
      fetchDashboardData();
    }, [token]);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl">Attendify</h1>
              <p className="text-sm text-gray-600">
                Admin Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>{profile?.name ?? "Undefined Name"}</p>
                <p className="text-sm text-gray-600">
                  {profile?.role ?? "Undefined"}
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={onLogout}>
                    Log out
                  </AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">
                    Overall Attendance Rate
                  </CardTitle>
                  <TrendingUp className={`h-4 w-4 text-blue-600`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.overall_attendance_rate ?? 0}%</div>
                  <p className="text-xs text-green-600 mt-1">
                    {stats?.trend_attendance ?? "No data"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">
                    Monthly Absences
                  </CardTitle>
                  <UserX className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">
                    {stats?.monthly_absences ?? 0}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {stats?.trend_absences ?? "No data"}
                  </p>
                </CardContent>
                </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">
                    Total Active Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">
                    {stats?.total_active_users ?? 0}
                  </div>
                  {/* The Green Trend Text */}
                  <p className="text-xs text-green-600 mt-1">
                    {stats?.trend_users ?? "No data"}
                  </p>
                </CardContent>
              </Card>

            {/* CARD 4: Attendance Records (With Buttons) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">
                  Attendance Records and Report
                </CardTitle>
                <ClipboardCheck className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl">
                  {stats?.total_records ?? 0}
                </div>
                {/* The Green Trend Text */}
                <p className="text-xs text-green-600 mb-3">
                  {stats?.trend_records ?? "No data"}
                </p>

                {/* Navigation Buttons */}
                <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      // Ensure this prop is passed in AdminDashboard({ ... })
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
                  {/*
                  { {stat.hasButtons && (
                    <div className="mt-4 space-y-2">
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
                  )}*/}

            
          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Low Attendance Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Modules Requiring Attention</CardTitle>
              <CardDescription>
                Modules with attendance below 80%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowAttendanceCourses.length === 0 ? (
                    <p className="text-gray-500">No Entry.</p>
                  ) : (
                  lowAttendanceCourses.map((modules) => (
                  <div
                    key={modules.module_code}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {modules.module_code}
                        </p>
                        <p className="text-sm text-gray-600">
                          {modules.module_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {modules.lecturer_name}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {modules.attendance_rate}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                      <Users className="h-4 w-4" />
                      <span>{modules.student_count} students</span>
                    </div>
                  </div>
                )))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
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
                  onClick={onNavigateToBiometricProfile}
                >
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Manage Biometric Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Recent user registrations and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="recent">
              <TabsList className="mb-4">
                <TabsTrigger value="recent">
                  Recent Users
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending Approval
                </TabsTrigger>
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
                    {recentU.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                    recentU.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.joined_date}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onNavigateToManageUsers}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="pending">
                <div className="text-center py-8 text-gray-600">
                  <p>No pending user approvals</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}