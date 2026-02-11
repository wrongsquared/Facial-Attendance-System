import { useEffect, useState } from "react";
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
  Calendar,
  CheckCircle2,
  XCircle,

} from "lucide-react";
import { Progress } from "./ui/progress";
import { useAuth } from "../cont/AuthContext";
import { TodaysLessons, AttendanceRecord, WeeklyLesson, OverallLessonsStat, ModuleStat } from "../types/studentdash";
import {
  getTodaysLessons,
  getOverallLessons,
  getStatsByModule,
  getRecentHistory,
  getWeeklyTimetable,
} from "../services/api";
import { Navbar } from "./Navbar";
interface StudentDashboardProps {
  onLogout: () => void;
  onNavigateToAttendanceHistory: () => void;
  onNavigateToTimetable: () => void;
  onNavigateToProfile: () => void;
  onNavigateToProgress: () => void;
  onOpenNotifications: () => void;
}

export function StudentDashboard({
  onLogout,
  onNavigateToAttendanceHistory,
  onNavigateToTimetable,
  onNavigateToProfile,
  onNavigateToProgress,
  onOpenNotifications
}: StudentDashboardProps) {
  const today = new Date();
  const todaysdate = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })


  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todaysClasses, setTodaysClasses] = useState<TodaysLessons[]>([]);
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
          todaysData,
          overallLessonsData,
          moduleStatsData,
          historyData,
          weeklyData,
        ] = await Promise.all([
          getTodaysLessons(token),
          getOverallLessons(token),
          getStatsByModule(token),
          getRecentHistory(token),
          getWeeklyTimetable(token),
        ]);

        //Set all states at once
        setTodaysClasses(todaysData);
        setOverallAttendanceStats(overallLessonsData);
        setSubjectStats(moduleStatsData);
        setRecentHistory(historyData);
        setWeeklyLessons(weeklyData);

      } catch (err) {
        console.error("Failed to load dashboard:", err);
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

      <Navbar title="Student Portal" onNavigateToProfile={onNavigateToProfile} onOpenNotifications={onOpenNotifications} />


      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 min-h-[275px]">

          <Card className="flex flex-col h-full overflow-hidden">
            {loading ? (
              <div 
                className="animate-hard-pulse w-full" 
                style={{ flex: 1, height:'100%' ,minHeight: '275px' }} 
              />
            ) : (
              <>
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
              </>
          )}
          </Card>

          {/* Card 2: Timetable */}
          <Card className="flex flex-col h-full overflow-hidden">
              {loading ? (
              <div 
                className="animate-hard-pulse w-full" 
                style={{ flex: 1, height:'100%' ,minHeight: '275px' }} 
              />
            ) : (
              <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Timetable</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1">
                <div className="space-y-3 max-h-32 overflow-y-auto pr-2">

                  {/* Check if the entire week is empty */}
                  {Object.values(weeklySchedule).every((arr) => arr.length === 0) ? (
                    <p className="text-xs text-gray-400 text-center mt-4">
                      No classes upcoming this week.
                    </p>
                  ) : (
                    /* Map throug the days of the week */
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
            </>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[350px]">
          {/* Upcoming Classes */}
          <Card className="flex flex-col h-full overflow-hidden">
          {loading ? (
              <div 
                className="animate-hard-pulse rounded-xl" 
                style={{ flex: 1, height:'100%' ,minHeight: '300px' }} 
              />
            ) : (
              <>
            <CardHeader>
              <CardTitle>Upcoming Classes Today ({todaysdate})</CardTitle>
              <CardDescription>Your scheduled classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysClasses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No classes today.</p>
                ) : (
                  todaysClasses.map((classItem) => (
                    <div key={classItem.lessonID} className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{classItem.ModuleCode} - {classItem.ModuleName}  {classItem.lessonType}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            {new Date(classItem.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {" - "}
                            {new Date(classItem.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{classItem.location}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            </>
            )}
          </Card>

          {/* Attendance by Subject */}
          <Card className="flex flex-col h-full overflow-hidden">
            {loading ? (
              <div 
                className="animate-hard-pulse w-full" 
                style={{ flex: 1, height:'100%' ,minHeight: '275px' }} 
              />
            ) : (
              <>
            <CardHeader>
              <CardTitle>Attendance Taken by Module</CardTitle>
              <CardDescription>
                Your attendance rate per Module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {subjectStats.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No past lessons recorded.</p>
                ) : (
                  subjectStats.map((stat, index) => (
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
          </>
            )}
          </Card>

          {/* Recent Attendance History */}
          <Card className="lg:col-span-2">
              {loading ? (
              /* We make this one slightly taller (e.g., 300px) because history is a list */
              <div 
                className="animate-hard-pulse rounded-xl" 
                style={{ height: '300px', width: '100%' }} 
              />
            ) : (
              <>
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
            </>
            )}
          </Card>
        </div>
      </main>

    </div>
  );
}