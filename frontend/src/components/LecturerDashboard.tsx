import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

import { useAuth } from "../cont/AuthContext";
import { ClassAttendanceDetails } from "./ClassAttendanceDetails";
import { timetableEntry, ClassesToday, CourseOverview, recentSessionsLog } from "../types/lecturerdash";
import {
  getLecturerModulesCount,
  getLecturertimetable,
  getavgatt,
  getClassesToday,
  getCourseOverview,
  getrecentSessionslog
} from "../services/api";
import { Navbar } from "./Navbar";


interface LecturerDashboardProps {
  onLogout: () => void;
  onNavigateToReports: () => void;
  onNavigateToProfile: () => void;
  onNavigateToTimetable: () => void;
  onNavigateToRecords: () => void;
}


export function LecturerDashboard({
  onNavigateToReports,
  onNavigateToProfile,
  onNavigateToTimetable,
  onNavigateToRecords,
}: LecturerDashboardProps) {
  const today = new Date();
  const todaysdate = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const [, setLoading] = useState(true);
  const { token } = useAuth();

  const [totalModules, settotalModules] = useState(0);
  const [avgattM, setavgattM] = useState(0);

  const [timetable, settimetable] = useState<timetableEntry[]>([])
  const [todaysClasses, setTodaysClasses] = useState<ClassesToday[]>([]);
  const [courseovw, setCourseovw] = useState<CourseOverview[]>([]);
  const [recentSessionsLog, setrecentSessionsLog] = useState<recentSessionsLog[]>([]);
  const [selectedSession, setSelectedSession] = useState<recentSessionsLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleViewDetails = (session: recentSessionsLog) => {
    setSelectedSession(session);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedSession(null);
  };

  useEffect(() => {
    if (!token) return;
    const fetchDashboardData = async () => {
      try {
        const [
          ModulesCount,
          timetable,
          avgAttM,
          todayclasses,
          courseoview,
          recentSessionsLog
        ] = await Promise.all([
          getLecturerModulesCount(token),
          getLecturertimetable(token),
          getavgatt(token),
          getClassesToday(token),
          getCourseOverview(token),
          getrecentSessionslog(token)
        ]);
        settotalModules(ModulesCount.total_modules);
        settimetable(timetable);
        setavgattM(avgAttM.Average_attendance);
        setTodaysClasses(todayclasses);
        setCourseovw(courseoview);
        setrecentSessionsLog(recentSessionsLog);
      }
      catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [token]);
  const getWeeklySchedule = () => {
    const grouped: Record<string, timetableEntry[]> = {
      Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: []
    };

    timetable.forEach((lesson) => {
      // The backend sends "Mon", "Tue", etc.
      const day = lesson.day_of_week;

      if (grouped[day]) {
        grouped[day].push(lesson);
      }
    });

    return grouped;
  };

  const weeklySchedule = getWeeklySchedule();
  // Keys must match the backend's "strftime('%a')" format (Mon, Tue, Wed...)
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Lecturer Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                Total Active Modules
              </CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-bold">{totalModules}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                Average Attendance
              </CardTitle>
              <ClipboardCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-bold">{avgattM}%</div>
              <p className="text-xs text-gray-600 mt-1">
                Across all courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                Timetable
              </CardTitle>

              {/*Icon on right side */}
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>

            <CardContent>
              <div className="space-y-2 mb-4">
                {Object.values(weeklySchedule).every(arr => arr.length === 0) ? (
                  <p className="text-xs text-gray-400">No classes this week.</p>

                ) : (dayOrder.map((day) => {
                  const classes = weeklySchedule[day];
                  // Skip days with no classes
                  if (!classes || classes.length === 0) return null;

                  return (
                    <div
                      key={day}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className="font-medium w-16 shrink-0">
                        {day.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        {classes.map((cls, idx) => (
                          <div
                            key={idx}
                            className="text-gray-600"
                          >
                            {cls.module_code} • {cls.start_time} - {cls.end_time} •{" "}
                            {cls.location}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
                )}
              </div>

              {/* View timetable button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onNavigateToTimetable}
              >
                View Full Timetable
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                Attendance Records and Report
              </CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onNavigateToRecords}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Class Today */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Class Today  ({todaysdate})</CardTitle>
              <CardDescription>
                Classes scheduled for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysClasses.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No classes scheduled for today.
                  </p>
                ) : (
                  todaysClasses.map((classItem, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">
                            {classItem.module_code} - {classItem.module_name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {classItem.time_range}
                          </p>
                          <p className="text-sm text-gray-600">
                            {classItem.location}
                          </p>
                        </div>
                        <Badge
                          className={
                            classItem.status === 'Live'
                              ? "bg-green-600 hover:bg-green-700 text-white" // Live = Green
                              : classItem.status === 'Completed'
                                ? "bg-blue-600 hover:bg-blue-700 text-white"   // Completed = Blue
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200" // Pending = Gray
                          }
                        >
                          {classItem.status}
                        </Badge>
                      </div>
                      {classItem.status !== 'Pending' && (
                        <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                          <span className="text-green-700">
                            {classItem.status === 'Live' ? "Marking in progress..." : "Attendance recorded"}
                          </span>
                          <span className="text-green-700">
                            {classItem.attendance_display}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* My Courses */}
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>
                Overview of your courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseovw.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No courses found.
                  </p>
                ) : (
                  courseovw.map((course) => (
                    <div
                      key={course.module_code}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">
                            {course.module_code}
                          </p>
                          <p className="text-sm text-gray-600">
                            {course.module_name}
                          </p>
                        </div>
                        <Badge variant="outline" className={
                          course.overall_attendance_rate < 80
                            ? "border-red-200 text-red-700 bg-red-50"
                            : "border-green-200 text-green-700 bg-green-50"
                        }>
                          {course.overall_attendance_rate}% attendance
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                        <Users className="h-4 w-4" />
                        <span>
                          {course.students_enrolled} students enrolled
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Attendance records from recent classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessionsLog.length === 0 ? ( //Empty check
              <p className="text-sm text-gray-500 text-center py-4">
                No recent sessions found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lesson ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[200px]">Time</TableHead>
                    <TableHead className="w-[200px]">Attended</TableHead>
                    <TableHead className="w-[200px]">Total</TableHead>
                    <TableHead className="w-[200px]">Percentage</TableHead>
                    <TableHead className="text-center w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessionsLog.map((session, index) => (
                    <TableRow key={index}>
                      <TableCell>{session.lessonID}</TableCell>
                      <TableCell>{session.subject}</TableCell>
                      <TableCell>{session.date}</TableCell>
                      <TableCell>{session.time}</TableCell>
                      <TableCell>{session.attended}</TableCell>
                      <TableCell>{session.total}</TableCell>
                      <TableCell>
                        <Badge
                          className={`px-3 py-1 rounded-full text-white text-sm font-medium
    ${session.percentage >= 90
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-gray-200 text-gray-800"
                            }
  `}
                        >
                          {session.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(session)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Class Attendance Details Modal */}
      <ClassAttendanceDetails
        session={selectedSession}
        open={isDetailsOpen}
        onClose={handleCloseDetails}
      />
    </div>
  );
}