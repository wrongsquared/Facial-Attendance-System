import { useEffect, useState } from "react";
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
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  XCircle,
  LogOut,
  Bell,
} from "lucide-react";
import { Progress } from "./ui/progress";
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
import { NotificationAlerts } from "./NotificationAlerts";
import { useAuth } from "../cont/AuthContext"; 
import { 
  getStudentProfile, 
  lessonInfo, 
  getStudentTimetable, 
  TodaysLessons, 
  getTodaysLessons, 
  getOverallLessons, 
  OverallLessonsStat,
  ModuleStat,
  getStatsByModule,
  AttendanceRecord,
  getRecentHistory,
  WeeklyLesson,
  getWeeklyTimetable} from "../services/api";

interface StudentDashboardProps {
  onLogout: () => void;
  onNavigateToAttendanceHistory: () => void;
  onNavigateToTimetable: () => void;
  onNavigateToProfile: () => void;
  onNavigateToProgress: () => void;
}

export function StudentDashboard({
  onLogout,
  onNavigateToAttendanceHistory,
  onNavigateToTimetable,
  onNavigateToProfile,
  onNavigateToProgress,
}: StudentDashboardProps) {
  const today = new Date();
  const todaysdate = today.toLocaleDateString('en-GB',{
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const notificationAlerts = [
    {
      type: "not_recorded" as const,
      studentId: "7654321",
      studentName: "John Smith",
      module: "CSCI334 - Database Systems",
      date: "2025-12-09",
      attendanceStatus: "Not Recorded",
      reason: "No successful facial recognition check-in detected",
      attendanceMethod: "Facial Recognition",
      cameraLocation: "Building 3, Room 205",
      timestamp: "2025-12-09 09:15:30",
      suggestedAction:
        "Please re-attempt check-in or contact the administrator if you are in class.",
    },
    {
      type: "below_threshold" as const,
      studentId: "7654321",
      studentName: "John Smith",
      module: "CSCI203 - Algorithms",
      date: "2025-12-09",
      attendanceStatus: "At Risk",
      currentAttendance: 77,
      threshold: 85,
      recentSessionsMissed: 3,
      totalRecentSessions: 13,
      impact:
        "You are at risk of not meeting the minimum attendance requirement.",
      suggestedAction: "Attend upcoming classes.",
    },
  ];

  const { token, user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<lessonInfo[]>([])
  const [todaysClasses, setTodaysClasses] = useState<TodaysLessons[]>([])
  const [oAS, setOverallAttendanceStats] = useState<OverallLessonsStat>({
    total_lessons: 0,
    attended_lessons: 0,
    percentage: 0
  });
  const [subjectStats, setSubjectStats] = useState<ModuleStat[]>([]);
  const [recentHistory, setRecentHistory] = useState<AttendanceRecord[]>([]);
  const [weeklyLessons, setWeeklyLessons] = useState<WeeklyLesson[]>([]);

useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        const [
          lessonData, 
          profileData, 
          todaysData, 
          overallLessonsData,
          moduleStatsData ,
          historyData,
          weeklyData
        ] = await Promise.all([
          getStudentTimetable(token),
          getStudentProfile(token),
          getTodaysLessons(token),
          getOverallLessons(token),
          getStatsByModule(token),
          getRecentHistory(token),
          getWeeklyTimetable(token)
        ]);

        //Set all states at once
        setLessons(lessonData);
        setProfile(profileData);
        setTodaysClasses(todaysData);
        setOverallAttendanceStats(overallLessonsData);
        setSubjectStats(moduleStatsData);
        setRecentHistory(historyData);
        setWeeklyLessons(weeklyData);

      } catch (err) {
        console.error("Failed to load dashboard:", err);
        // Optional: setError(true) to show a "Retry" button
      } finally {
        //Stop loading only when EVERYTHING is finished (or failed)
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  // --- HELPER: Group by Day ---
  const groupWeeklySchedule = () => {
    const grouped: Record<string, WeeklyLesson[]> = {
      MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [], SUN: [],
    };

    // The backend already filtered for "Next 7 Days", so just loop and group
    weeklyLessons.forEach((lesson) => {
      const date = new Date(lesson.start_time);
      const dayName = date
        .toLocaleDateString("en-GB", { weekday: "short" })
        .toUpperCase();
      
      const key = dayName.substring(0, 3);

      if (grouped[key]) {
        grouped[key].push(lesson);
      }
    });

    return grouped;
  };
  const dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const weeklySchedule = groupWeeklySchedule();
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNotificationOpen(true)}
            >
              <Bell className="h-5 w-5" />
            </Button>
            <div
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
              onClick={onNavigateToProfile}
            >
              <Avatar>
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>{profile?.name ?? "Undefined Name"}</p>
                <p className="text-sm text-gray-600">
                  Student ID: {profile?.studentNum ?? "------"}
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
                  <AlertDialogDescription>Are you sure ?</AlertDialogDescription>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Card 1: Overall Attendance */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Overall Attendance</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1">
                <div className="text-6xl font-bold">{oAS.percentage}%</div>
                <p className="text-xs text-gray-600 mt-1">
                  {oAS.attended_lessons} of {oAS.total_lessons} classes attended
                </p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onNavigateToProgress}
                >
                  View Progress
                </Button>
              </div>
            </CardContent>
          </Card>

        {/* Card 2: Timetable */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Timetable</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1">
                <div className="space-y-3 max-h-32 overflow-y-auto pr-2">
                  
                  {/* 1. Check if the entire week is empty */}
                  {Object.values(weeklySchedule).every((arr) => arr.length === 0) ? (
                    <p className="text-xs text-gray-400 text-center mt-4">
                      No classes upcoming this week.
                    </p>
                  ) : (
                    /* 2. Map through MON, TUE, WED... */
                    dayOrder.map((day) => {
                      const lessonsForDay = weeklySchedule[day];

                      // If no lessons on this day, don't render the row
                      if (!lessonsForDay || lessonsForDay.length === 0) return null;

                      return (
                        <div key={day} className="flex items-baseline">
                          {/* Left Column: Day Name (Fixed width for alignment) */}
                          <div className="w-14 shrink-0">
                            <span className="text-m font-bold text-gray-900">
                              {day}:
                            </span>
                          </div>

                          {/* Right Column: List of Classes */}
                          <div className="flex flex-col gap-1 w-full">
                            {lessonsForDay.map((lesson) => {
                              // Format: 9:00 AM
                              const timeString = new Date(lesson.start_time).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              });
                              const endString = new Date(lesson.end_time).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              });

                              return (
                                <div key={lesson.lessonID} className="text-m text-gray-600 flex flex-wrap gap-1">
                                  {/* Format: CSCI334 - 9:00 AM */}
                                  <span className="text-gray-700 font-medium">{lesson.module_code}</span> 
                                  <span className="text-gray-400"> • </span>
                                  <span>
                                    {timeString} - {endString}
                                  </span>

                                  <span className="text-gray-400"> • </span>

                                  <span>
                                    {lesson.location || "TBD"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onNavigateToTimetable}
                >
                  View Timetable
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Classes Today ({todaysdate})</CardTitle>
              <CardDescription>Your scheduled classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysClasses.length === 0? (
                  <p className="text-gray-500 text-center py-4">No classes today.</p>
                ) : (
                  todaysClasses.map((classItem) => (
                    <div key={classItem.lessonID} className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{classItem.ModuleCode} - {classItem.ModuleName}  {classItem.lessonType}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                         {new Date(classItem.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         {" - "}
                         {new Date(classItem.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{classItem.location}</p>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance by Subject */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Taken by Subject</CardTitle>
              <CardDescription>
                Your attendance rate per subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {subjectStats.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No past lessons recorded.</p>
                  ) : (
                  subjectStats.map((stat, index) =>(
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">{stat.subject}</p>
                      <span className="text-sm">{stat.percentage}%</span>
                    </div>

                    <Progress value={stat.percentage} className="h-2" />

                    <p className="text-xs text-gray-600">
                      {stat.attended} of {stat.total} classes attended
                    </p>
                  </div>
                ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Attendance History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Attendance History</CardTitle>
              <CardDescription>
                Your recent class attendance records
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
              {recentHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent history found.</p>
                ) : (
                recentHistory.map((record) => (
                  <div
                    key={record.lessonID}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {record.status === "present" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}

                      <div>
                        <p className="font-medium">{record.subject}</p>
                        {new Date(record.date).toLocaleDateString('en-GB', {
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric'
                  })}
                      </div>
                    </div>

                    {record.status === "present" ? (
                      <Badge className="bg-green-600 text-white">Present</Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white">Absent</Badge>
                    )}
                  </div>
                ))
              )}
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onNavigateToAttendanceHistory}
                >
                  View Attendance History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Notification Alerts Dialog */}
      <NotificationAlerts
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        alerts={notificationAlerts}
      />
    </div>
  );
}