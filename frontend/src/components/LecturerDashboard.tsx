import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Calendar, Users, BookOpen, ClipboardCheck, LogOut, Plus, Bell } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
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
} from './ui/alert-dialog';

interface LecturerDashboardProps {
  onLogout: () => void;
}

const todayClasses = [
  { id: 1, subject: 'CSCI334 - Database Systems', time: '9:00 AM - 11:00 AM', location: 'Building 3, Room 205', enrolled: 45, attended: 42 },
  { id: 2, subject: 'CSCI203 - Algorithms', time: '2:00 PM - 4:00 PM', location: 'Building 1, Room 310', enrolled: 38, attended: 0 },
];

const recentSessions = [
  { id: 1, subject: 'CSCI334 - Database Systems', date: '28 Oct 2025', time: '9:00 AM', attended: 42, total: 45, percentage: 93 },
  { id: 2, subject: 'CSCI203 - Algorithms', date: '27 Oct 2025', time: '2:00 PM', attended: 35, total: 38, percentage: 92 },
  { id: 3, subject: 'CSCI334 - Database Systems', date: '26 Oct 2025', time: '9:00 AM', attended: 40, total: 45, percentage: 89 },
  { id: 4, subject: 'CSCI203 - Algorithms', date: '25 Oct 2025', time: '2:00 PM', attended: 36, total: 38, percentage: 95 },
];

const courses = [
  { id: 1, code: 'CSCI334', name: 'Database Systems', enrolled: 45, avgAttendance: 91 },
  { id: 2, code: 'CSCI203', name: 'Algorithms', enrolled: 38, avgAttendance: 94 },
];

const weeklySchedule = [
  { day: 'Monday', classes: [{ subject: 'CSCI334', time: '9:00 AM - 11:00 AM', room: 'B3-205' }] },
  { day: 'Tuesday', classes: [{ subject: 'CSCI203', time: '2:00 PM - 4:00 PM', room: 'B1-310' }] },
  { day: 'Wednesday', classes: [{ subject: 'CSCI334', time: '9:00 AM - 11:00 AM', room: 'B3-205' }] },
  { day: 'Thursday', classes: [{ subject: 'CSCI203', time: '2:00 PM - 4:00 PM', room: 'B1-310' }] },
  { day: 'Friday', classes: [{ subject: 'CSCI334', time: '11:00 AM - 1:00 PM', room: 'B3-205' }] },
];

export function LecturerDashboard({ onLogout }: LecturerDashboardProps) {
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
              <p className="text-sm text-gray-600">Lecturer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>DR</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Dr. Rachel Wong</p>
                <p className="text-sm text-gray-600">Computer Science</p>
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
                  <AlertDialogAction onClick={onLogout}>Log out</AlertDialogAction>
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
              <CardTitle className="text-sm">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">2</div>
              <p className="text-xs text-gray-600 mt-1">Active courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Average Attendance</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">92.5%</div>
              <p className="text-xs text-gray-600 mt-1">Across all courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Timetable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weeklySchedule.map((daySchedule) => (
                  <div key={daySchedule.day} className="flex items-start gap-2 text-xs">
                    <span className="font-medium w-16 shrink-0">{daySchedule.day.slice(0, 3)}</span>
                    <div className="flex-1">
                      {daySchedule.classes.map((cls, idx) => (
                        <div key={idx} className="text-gray-600">
                          {cls.subject} • {cls.time} • {cls.room}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Attendance Records</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">4</div>
              <p className="text-xs text-gray-600 mt-1">Recent sessions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Class Today */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Class Today</CardTitle>
                  <CardDescription>Classes scheduled for today</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayClasses.map((classItem) => (
                  <div key={classItem.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{classItem.subject}</p>
                        <p className="text-sm text-gray-600 mt-1">{classItem.time}</p>
                        <p className="text-sm text-gray-600">{classItem.location}</p>
                      </div>
                      {classItem.attended > 0 ? (
                        <Badge>Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                    {classItem.attended > 0 ? (
                      <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                        <span className="text-green-700">Attendance recorded</span>
                        <span className="text-green-700">{classItem.attended}/{classItem.enrolled} present</span>
                      </div>
                    ) : (
                      <Button className="w-full" variant="outline" size="sm">
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Take Attendance
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* My Courses */}
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>Overview of your courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{course.code}</p>
                        <p className="text-sm text-gray-600">{course.name}</p>
                      </div>
                      <Badge variant="outline">{course.avgAttendance}% attendance</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                      <Users className="h-4 w-4" />
                      <span>{course.enrolled} students enrolled</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Attendance records from recent classes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.subject}</TableCell>
                    <TableCell>{session.date}</TableCell>
                    <TableCell>{session.time}</TableCell>
                    <TableCell>{session.attended}</TableCell>
                    <TableCell>{session.total}</TableCell>
                    <TableCell>
                      <Badge variant={session.percentage >= 90 ? 'default' : 'secondary'}>
                        {session.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}