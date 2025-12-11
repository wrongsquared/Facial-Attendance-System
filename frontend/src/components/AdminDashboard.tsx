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
  AlertCircle,
  LogOut,
  Settings,
  UserPlus,
  BookPlus,
  Bell,
  ClipboardCheck,
  UserX,
  FileText,
  Fingerprint,
  FileEdit,
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

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateToManageUsers: () => void;
  onNavigateToManageUserProfile: () => void;
  onNavigateToBiometricProfile: () => void;
  onNavigateToAttendanceRecords: () => void;
  onNavigateToReports: () => void;
}

const systemStats = [
  {
    label: "Overall Attendance Rate",
    value: "87.3%",
    change: "+2.1%",
    icon: TrendingUp,
    color: "text-blue-600",
  },
  {
    label: "Monthly Absences",
    value: 247,
    change: "-12",
    icon: UserX,
    color: "text-green-600",
  },
  {
    label: "Total Active Users",
    value: 2990,
    change: "+135",
    icon: Users,
    color: "text-purple-600",
  },
  {
    label: "Attendance Records and Report",
    value: "15.2K",
    change: "+1.3K",
    icon: ClipboardCheck,
    color: "text-orange-600",
    hasButtons: true,
  },
];

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

const lowAttendanceCourses = [
  {
    code: "CSCI101",
    name: "Introduction to Programming",
    attendance: 72,
    students: 65,
    lecturer: "Dr. Smith",
  },
  {
    code: "MATH201",
    name: "Calculus II",
    attendance: 75,
    students: 42,
    lecturer: "Prof. Johnson",
  },
];

const systemAlerts = [
  {
    id: 1,
    type: "warning",
    message: "CSCI101 has below 75% attendance rate",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "info",
    message: "4 new user registrations pending approval",
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "success",
    message: "System backup completed successfully",
    time: "1 day ago",
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
                <p>Admin User</p>
                <p className="text-sm text-gray-600">
                  System Administrator
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
          {systemStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">
                    {stat.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stat.value}</div>
                  <p className="text-xs text-green-600 mt-1">
                    {stat.change} from last month
                  </p>
                  {stat.hasButtons && (
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
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Low Attendance Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Courses Requiring Attention</CardTitle>
              <CardDescription>
                Courses with attendance below 80%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowAttendanceCourses.map((course) => (
                  <div
                    key={course.code}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {course.code}
                        </p>
                        <p className="text-sm text-gray-600">
                          {course.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {course.lecturer}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {course.attendance}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                      <Users className="h-4 w-4" />
                      <span>{course.students} students</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
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
                    {recentUsers.map((user) => (
                      <TableRow key={user.id}>
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
                        <TableCell>{user.joined}</TableCell>
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
                    ))}
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