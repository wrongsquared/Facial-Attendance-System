import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Calendar, Clock, BookOpen, CheckCircle2, XCircle, LogOut, Bell } from 'lucide-react';
import { Progress } from './ui/progress';
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

interface StudentDashboardProps {
  onLogout: () => void;
}

const upcomingClasses = [
  { id: 1, subject: 'CSCI334 - Database Systems', time: '9:00 AM - 11:00 AM', location: 'Building 3, Room 205', date: 'Today' },
  { id: 2, subject: 'CSCI251 - Software Engineering', time: '2:00 PM - 4:00 PM', location: 'Building 1, Room 101', date: 'Today' },
  { id: 3, subject: 'CSCI203 - Algorithms', time: '10:00 AM - 12:00 PM', location: 'Building 3, Room 308', date: 'Tomorrow' },
];

const weeklySchedule = [
  { day: 'Monday', classes: ['CSCI334 - 9:00 AM', 'CSCI251 - 2:00 PM'] },
  { day: 'Tuesday', classes: ['CSCI203 - 10:00 AM', 'CSCI334 - 1:00 PM'] },
  { day: 'Wednesday', classes: ['CSCI251 - 9:00 AM'] },
  { day: 'Thursday', classes: ['CSCI203 - 10:00 AM', 'CSCI334 - 3:00 PM'] },
  { day: 'Friday', classes: ['CSCI251 - 2:00 PM'] },
];

const attendanceHistory = [
  { id: 1, subject: 'CSCI334 - Database Systems', date: '28 Oct 2025', status: 'present' },
  { id: 2, subject: 'CSCI251 - Software Engineering', date: '28 Oct 2025', status: 'present' },
  { id: 3, subject: 'CSCI203 - Algorithms', date: '27 Oct 2025', status: 'present' },
  { id: 4, subject: 'CSCI334 - Database Systems', date: '26 Oct 2025', status: 'absent' },
  { id: 5, subject: 'CSCI251 - Software Engineering', date: '26 Oct 2025', status: 'present' },
];

const subjectStats = [
  { subject: 'CSCI334 - Database Systems', attended: 11, total: 12, percentage: 92 },
  { subject: 'CSCI251 - Software Engineering', attended: 13, total: 13, percentage: 100 },
  { subject: 'CSCI203 - Algorithms', attended: 10, total: 13, percentage: 77 },
];

export function StudentDashboard({ onLogout }: StudentDashboardProps) {
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
              <p className="text-sm text-gray-600">Student Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>John Smith</p>
                <p className="text-sm text-gray-600">Student ID: 7654321</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Overall Attendance</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">89.5%</div>
              <p className="text-xs text-gray-600 mt-1">34 of 38 classes attended</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Timetable</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {weeklySchedule.map((schedule) => (
                  <div key={schedule.day} className="flex items-start gap-2">
                    <span className="text-xs font-medium min-w-[60px]">{schedule.day}:</span>
                    <div className="flex flex-col gap-1">
                      {schedule.classes.map((classInfo, idx) => (
                        <span key={idx} className="text-xs text-gray-600">{classInfo}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Progress Tracker</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">89%</div>
              <p className="text-xs text-gray-600 mt-1">Course completion rate</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Classes Today</CardTitle>
              <CardDescription>Your scheduled classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingClasses.map((classItem) => (
                  <div key={classItem.id} className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{classItem.subject}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{classItem.time}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{classItem.location}</p>
                      </div>
                      <Badge variant={classItem.date === 'Today' ? 'default' : 'secondary'}>
                        {classItem.date}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance by Subject */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Taken by Subject</CardTitle>
              <CardDescription>Your attendance rate per subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {subjectStats.map((stat) => (
                  <div key={stat.subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{stat.subject}</p>
                      <span className="text-sm">{stat.percentage}%</span>
                    </div>
                    <Progress value={stat.percentage} className="h-2" />
                    <p className="text-xs text-gray-600">
                      {stat.attended} of {stat.total} classes attended
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Attendance History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Attendance History</CardTitle>
              <CardDescription>Your recent class attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendanceHistory.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {record.status === 'present' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{record.subject}</p>
                        <p className="text-sm text-gray-600">{record.date}</p>
                      </div>
                    </div>
                    <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                      {record.status === 'present' ? 'Present' : 'Absent'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}