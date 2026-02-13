import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { getTimetableRange } from "../services/api";
import { WeeklyLesson } from "../types/studentdash";
import { useAuth } from "../cont/AuthContext";

interface Props {
  onBack: () => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
  onOpenNotifications: () => void;
}
export function StudentTimetable({ onBack, onNavigateToProfile, onOpenNotifications }: Props) {
  const { token } = useAuth();

  // State
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [lessons, setLessons] = useState<WeeklyLesson[]>([]);
  const [loading, setLoading] = useState(false);

  const parseDateExact = (isoString: string) => {
    if (!isoString) return new Date();
    const [datePart, timePart] = isoString.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart ? timePart.split(":").map(Number) : [0, 0];

    // Note: Month is 0-indexed in JS (Jan=0, Dec=11)
    return new Date(year, month - 1, day, hour, minute);
  };
  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      
      setLoading(true);
      try {
        // Calculate range based on view
        const range = getFetchRange();

        // Call API
        const data = await getTimetableRange(token, range.start.toISOString(), range.end.toISOString());
        setLessons(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, viewMode, currentDate, currentMonth]);

  const getFetchRange = () => {
    const start = new Date();
    const end = new Date();

    if (viewMode === "daily") {
      start.setTime(currentDate.getTime());
      start.setHours(0, 0, 0, 0);
      end.setTime(currentDate.getTime());
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === "weekly") {
      const day = currentDate.getDay(); // 0 (Sun) - 6 (Sat)
      start.setTime(currentDate.getTime());
      start.setDate(currentDate.getDate() - day); // Go to Sunday
      start.setHours(0, 0, 0, 0);

      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6); // Go to Saturday
      end.setHours(23, 59, 59, 999);
    } else {
      // Monthly
      start.setTime(currentMonth.getTime());
      start.setDate(1); // 1st
      start.setHours(0, 0, 0, 0);

      end.setTime(currentMonth.getTime());
      end.setMonth(currentMonth.getMonth() + 1);
      end.setDate(0); // Last day
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };


  const handleNext = () => {
    if (viewMode === "daily") {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 1);
      setCurrentDate(next);
    } else if (viewMode === "weekly") {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentMonth);
      next.setMonth(currentMonth.getMonth() + 1);
      setCurrentMonth(next);
    }
  };
  const handlePrev = () => {
    if (viewMode === "daily") {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 1);
      setCurrentDate(prev);
    } else if (viewMode === "weekly") {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 7);
      setCurrentDate(prev);
    } else {
      const prev = new Date(currentMonth);
      prev.setMonth(currentMonth.getMonth() - 1);
      setCurrentMonth(prev);
    }
  };
  const formatTime = (isoString: string) => {
    // Use the helper to prevent +8 hours shift
    const date = parseDateExact(isoString);

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  const getMonthGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    // Previous month filler
    for (let i = 0; i < firstDay; i++) grid.push({ date: null, isCurrent: false });
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        date: new Date(year, month, i),
        isCurrent: true
      });
    }
    return grid;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Helper for Weekly View Dates
  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day); // Sunday

    for (let i = 0; i < 7; i++) {
      dates.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Student Portal" onNavigateToProfile={onNavigateToProfile} onOpenNotifications={onOpenNotifications} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Timetable Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                My Timetable
              </CardTitle>
              <CardDescription className="mt-2">
                View your class schedule
              </CardDescription>

              {/* VIEW TABS */}
              <div className="flex gap-2 mt-4">
                {["daily", "weekly", "monthly"].map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    className={`rounded-xl px-6 text-sm font-medium border !border-blue-600 capitalize
                      ${viewMode === mode
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-white text-blue-600 hover:bg-blue-50"}`}
                    onClick={() => setViewMode(mode as any)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* DAILY VIEW */}
            {viewMode === "daily" && (
              <div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-sm font-medium">
                    {currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading timetable...</div>
                  ) : lessons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-gray-50 text-center">
                      <Calendar className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-gray-600 font-medium">No classes scheduled for today.</p>
                      <p className="text-sm text-gray-400">Enjoy your day!</p>
                    </div>
                  ) : (
                    lessons.map((lesson) => (
                      <div key={lesson.lessonID} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <p className="font-bold text-gray-900">{lesson.module_code} - {lesson.lesson_type}</p>
                        <p className="text-sm text-gray-700 mt-1">{lesson.module_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 uppercase">{lesson.location || "TBD"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Weekly View */}
            {viewMode === "weekly" && (
              <div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                  <p className="text-sm font-medium">
                    {getWeekDates()[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {getWeekDates()[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                </div>

                <div className="space-y-6">
                  {getWeekDates().map((date) => {
                    // Filter lessons for this specific day in the loop
                    const dayLessons = lessons.filter(l => {
                      // Get the raw date string from API (e.g. "2025-12-31")
                      const lessonDateStr = l.start_time.split("T")[0];

                      // Build the column's date string manually (YYYY-MM-DD)
                      // This avoids timezone shifts entirely
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const columnDateStr = `${year}-${month}-${day}`;

                      return lessonDateStr === columnDateStr;
                    });
                    const dayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

                    return (
                      <div key={date.toISOString()} className="flex items-start gap-4">
                        {/* Date Bubble */}
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xs">{dayAbbr}</div>
                            <div className="font-medium">{date.getDate()}</div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-3">
                          {dayLessons.length > 0 ? (
                            dayLessons.map((lesson) => (
                              <div key={lesson.lessonID} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <p className="font-bold text-gray-900">{lesson.module_code} - {lesson.lesson_type}</p>
                                <p className="text-sm text-gray-700 mt-1">{lesson.module_name}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                </p>
                                <p className="text-sm text-gray-600 mt-1 uppercase">{lesson.location || "TBD"}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 border rounded-lg bg-gray-50">
                              <p className="text-sm text-gray-600">
                                No Classes Scheduled
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly View */}
            {viewMode === "monthly" && (
              <div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                  <p className="font-medium">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</p>
                  <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="grid grid-cols-7 text-xs font-medium text-gray-500 mb-4 text-center">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => <div key={d}>{d}</div>)}
                  </div>

                  <div className="grid grid-cols-7 gap-y-6 text-sm">
                    {getMonthGrid().map((cell, idx) => {
                      if (!cell.date) return <div key={idx}></div>;

                      const dayLessons = lessons.filter(l => {
                        if (!cell.date) return false;

                        // Raw API Date
                        const lessonDateStr = l.start_time.split("T")[0];

                        // Raw Grid Cell Date
                        const year = cell.date.getFullYear();
                        const month = String(cell.date.getMonth() + 1).padStart(2, '0');
                        const day = String(cell.date.getDate()).padStart(2, '0');
                        const cellDateStr = `${year}-${month}-${day}`;

                        return lessonDateStr === cellDateStr;
                      });

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-1 min-h-[60px] cursor-pointer hover:bg-blue-50 rounded-lg p-2 transition-colors"
                          onClick={() => {
                            if (cell.date && cell.isCurrent) {
                              setCurrentDate(cell.date);
                              setViewMode("daily");
                            }
                          }}
                        >
                          <span className={`text-sm ${cell.isCurrent ? "text-gray-900" : "text-gray-300"}`}>
                            {cell.date.getDate()}
                          </span>

                          {/* Badges for classes */}
                          {dayLessons.map(l => (
                            <div key={l.lessonID} className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] w-full text-center truncate">
                              {l.module_code}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </main>
    </div>
  );
}