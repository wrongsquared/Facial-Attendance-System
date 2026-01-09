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
import { getLecDailyTimetable, getLecturerMonthlyTimetable, getLecWeeklyTimetable } from "../services/api";
import { DailyTimetable, MonthlyTimetable, WeeklyTimetable } from "../types/lecturerinnards";
import { useAuth } from "../cont/AuthContext";
interface LecturerTimetableProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
}

type ViewMode = "daily" | "weekly" | "monthly";

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};


// Helper function to format date (daily view)
const formatDate = (date: Date) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${days[date.getDay()]}, ${date.getDate()} ${
    months[date.getMonth()]
  } ${date.getFullYear()}`;
};

const getMonthGrid = (monthDate: Date): MonthCell[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingWeekday = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: MonthCell[] = [];

  // Previous month days (to fill first row)
  for (let i = startingWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({
      date: new Date(year, month - 1, day),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  // Next month days to fill remaining cells (multiple of 7)
  const totalCells = Math.ceil(cells.length / 7) * 7;
  for (let day = 1; cells.length < totalCells; day++) {
    cells.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return cells;
};

export function LecturerTimetable({
  onLogout,
  onBack,
  onNavigateToProfile,
}: LecturerTimetableProps) {
  const { token } = useAuth()
  const [dailyLessons, setDailyLessons] = useState<DailyTimetable[]>([]);
  const [weeklyLessons, setWeeklyLessons] = useState<WeeklyTimetable[]>([]);
  const [monthlyLessons, setMonthlyLessons] = useState<MonthlyTimetable[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); 
    // Adjust to get Sunday (0) as start, or subtract day to get previous Sunday
    d.setDate(d.getDate() - day);
    return d;
  };
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    // Month is 0-indexed, so add 1. Pad with 0 if needed.
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        if ( viewMode=== "monthly"){
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth() + 1; // JS is 0-11, Python needs 1-12
          
          const data = await getLecturerMonthlyTimetable(token, year, month);
          setMonthlyLessons(data);
        }
        else if (viewMode=== "weekly"){
          const startofWeek = getStartOfWeek(currentDate);
          const datePI = formatDateForAPI(startofWeek)
          const weekData = await getLecWeeklyTimetable(token, datePI);
          setWeeklyLessons(weekData);
        }
        else{
          const dateStr = formatDateForAPI(currentDate);
          const data = await getLecDailyTimetable(token, dateStr);
          setDailyLessons(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, viewMode, currentDate, currentMonth]);

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    // 1. Create a CLONE of the date
    const next = new Date(currentDate);
    // 2. Add 7 days to the clone
    next.setDate(next.getDate() + 7);
    // 3. Set the state to the NEW object
    setCurrentDate(next);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    
    //Calculate Start of Week (Sun)
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    
    // Generate 7 days
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };

  const formatWeekRange = () => {
    const dates = getWeekDates();
    
    // Grab First (Sun) and Last (Sat)
    const start = dates[0];
    const end = dates[6];

    // Format helper
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    
    // Return string
    return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`;
  };

  const handleJumpToDaily = (targetDate: Date) => {
    setCurrentDate(targetDate);
    setViewMode("daily");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Lecturer Portal" onNavigateToProfile={onNavigateToProfile} />

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
              <div className="flex gap-2 mt-4">
                {/* Daily */}
                <Button
                  type="button"
                  size="sm"
                  className={`rounded-xl px-6 text-sm font-medium border !border-blue-600
      ${
        viewMode === "daily"
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-white text-blue-600 hover:bg-blue-50"
      }
    `}
                  onClick={() => setViewMode("daily")}
                >
                  Daily
                </Button>

                {/* Weekly */}
                <Button
                  type="button"
                  size="sm"
                  className={`rounded-xl px-6 text-sm font-medium border !border-blue-600
      ${
        viewMode === "weekly"
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-white text-blue-600 hover:bg-blue-50"
      }
    `}
                  onClick={() => setViewMode("weekly")}
                >
                  Weekly
                </Button>

                {/* Monthly */}
                <Button
                  type="button"
                  size="sm"
                  className={`rounded-xl px-6 text-sm font-medium border !border-blue-600
      ${
        viewMode === "monthly"
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-white text-blue-600 hover:bg-blue-50"
      }
    `}
                  onClick={() => setViewMode("monthly")}
                >
                  Monthly
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Daily View */}
            {viewMode === "daily" && (
              <div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviousDay}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-sm">
                    {formatDate(currentDate)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextDay}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                   {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading timetable...</div>
                    ) : dailyLessons.length === 0 ? (
                      /* --- THIS IS THE NEW NO CLASS MESSAGE --- */
                      <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-gray-50 text-center">
                        <Calendar className="h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-gray-600 font-medium">No classes scheduled for today.</p>
                        <p className="text-sm text-gray-400">Enjoy your day!</p>
                      </div>
                    ) : (
                    
                      dailyLessons.map((classDay, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium">
                        {classDay.module_code} - {classDay.lesson_type}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {classDay.module_name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {classDay.start_time} - {classDay.end_time}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {classDay.location}
                      </p>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevWeek}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-sm">{formatWeekRange()}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextWeek}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-6">
                  {getWeekDates().map((date) => {
                    //Get Day Name strings
                    const dayAbbreviation = date.toLocaleDateString('en-US', { weekday: 'short' });
                  
                    // FILTER: Find lessons specific to THIS date in the loop
                    // We compare YYYY-MM-DD strings to avoid Timezone issues
                    const dayLessons = weeklyLessons.filter((l) => {
                      // API string: "2025-12-30T09:00:00" -> "2025-12-30"
                      const currentDayNum = date.getDate(); 
                      const apiDayNum = parseInt(l.date_of_day, 10);
                      return currentDayNum === apiDayNum;
                    });
                  
                    return (
                      <div key={date.toISOString()} className="flex items-start gap-4">

                        {/* Date Bubble */}
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xs">
                              {dayAbbreviation}
                            </div>
                            <div className="font-medium">
                              {date.getDate()}
                            </div>
                          </div>
                        </div>
                    
                        {/* Content Area */}
                        {dayLessons.length > 0 ? (
                          <div className="flex-1 space-y-3">
                            {dayLessons.map((classItem, idx) => {
                              return (
                                <div
                                  key={idx} 
                                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <p className="font-medium">
                                    {classItem.module_code} - {classItem.lesson_type}
                                  </p>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {classItem.module_name}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {classItem.start_time} - {classItem.end_time}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1 uppercase">
                                    {classItem.location || "Location TBD"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex-1 p-4 border rounded-lg bg-gray-50">
                            <p className="text-sm text-gray-600">
                              {date.getDay() ===0
                                ? "No school on Sunday"
                                : "No Classes Scheduled"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly View */}
            {viewMode === "monthly" && (
              <div>
                {/* Month header with arrows */}
                <div className="mb-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <p className="font-medium">
                    {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </p>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  {/* Weekday header */}
                  <div className="grid grid-cols-7 text-xs font-medium text-gray-500 mb-4 text-center">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-y-6 text-sm">
                    {getMonthGrid(currentMonth).map((cell, idx) => {
                      // Safety Check: If cell is just padding (null date)
                      if (!cell.date) return <div key={idx} className="min-h-[60px]"></div>;

                      const { date, isCurrentMonth } = cell;

                      // Format the Cell Date to "YYYY-MM-DD"
                      // We construct this manually to match the API string exactly
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const cellDateStr = `${year}-${month}-${day}`; // e.g., "2025-12-01"

                      const dayLessons = monthlyLessons.filter(
                        (l) => l.date_of_month === cellDateStr
                      );

                      return (
                        <div
                            key={cellDateStr}
                            // 1. Add the click handler here
                            onClick={() => handleJumpToDaily(date)} 
                            // 2. Add cursor-pointer and hover effects
                            className="flex flex-col items-center gap-1 min-h-[60px] cursor-pointer hover:bg-gray-100 rounded-lg transition-colors p-1"
                          >
                          <span
                            className={`text-sm ${
                              isCurrentMonth
                                ? "text-gray-900"
                                : "text-gray-300"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {dayLessons.map((lesson, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] w-full text-center truncate cursor-default"
                              title={lesson.module_code}
                            >
                              {lesson.module_code}
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