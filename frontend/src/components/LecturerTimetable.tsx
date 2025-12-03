import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Calendar,
  BookOpen,
  LogOut,
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

type MonthEvent = {
  date: Date;
  label: string; // e.g. "ISIT 312"
  time: string; // e.g. "2:00 PM – 4:00 PM"
  location: string; // e.g. "Building 3, Room 205"
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

// Mock data for timetable
const dailySchedule = [
  {
    time: "9:00 AM - 11:00 AM",
    subject: "CSCI334 - Database Systems",
    room: "Building 3, Room 205",
    type: "Lecture",
  },
  {
    time: "2:00 PM - 4:00 PM",
    subject: "CSCI203 - Algorithms",
    room: "Building 1, Room 310",
    type: "Tutorial",
  },
];

const weeklySchedule = [
  {
    day: "Monday",
    classes: [
      {
        time: "9:00AM - 11:00AM",
        courseCode: "CSCI334 - T01",
        subject: "Database Systems",
        room: "HQ BLK A | LAB A.517A/A.517B",
        type: "Lecture",
      },
    ],
  },
  {
    day: "Tuesday",
    classes: [
      {
        time: "2:00PM - 4:00PM",
        courseCode: "CSCI203 - T02",
        subject: "Algorithms",
        room: "Building 1 | Room 310",
        type: "Tutorial",
      },
    ],
  },
  {
    day: "Wednesday",
    classes: [
      {
        time: "9:00AM - 11:00AM",
        courseCode: "CSCI334 - T02",
        subject: "Database Systems",
        room: "HQ BLK A | LAB A.517A/A.517B",
        type: "Lab",
      },
    ],
  },
  {
    day: "Thursday",
    classes: [
      {
        time: "2:00PM - 4:00PM",
        courseCode: "CSCI203 - L01",
        subject: "Algorithms",
        room: "Building 1 | Room 310",
        type: "Lecture",
      },
    ],
  },
  {
    day: "Friday",
    classes: [
      {
        time: "11:00AM - 1:00PM",
        courseCode: "CSCI334 - T03",
        subject: "Database Systems",
        room: "HQ BLK A | Room A.G19",
        type: "Tutorial",
      },
    ],
  },
];

// Events for the monthly calendar
const monthEvents: MonthEvent[] = [
  {
    date: new Date(2025, 10, 10), // 10 Nov 2025
    label: "ISIT 312",
    time: "2:00 PM – 4:00 PM",
    location: "Building 3, Room 205",
  },
  {
    date: new Date(2025, 10, 19),
    label: "ISIT 312",
    time: "2:00 PM – 4:00 PM",
    location: "Building 3, Room 205",
  },
  {
    date: new Date(2025, 10, 23),
    label: "ISIT 312",
    time: "2:00 PM – 4:00 PM",
    location: "Building 3, Room 205",
  },
];

const monthNames = [
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

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

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
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(2025, 11, 1), // December 1, 2025
  );
  const [currentWeekStart, setCurrentWeekStart] =
    useState<Date>(
      new Date(2025, 11, 1), // December 1, 2025
    );
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(2025, 10, 1), // November 2025 for the screenshot-style view
  );

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

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  // Weekly helpers (week starts on Sunday)
  const getWeekDates = () => {
    const dates: Date[] = [];
    const weekStart = new Date(currentWeekStart);

    // Adjust to Sunday (start of week)
    const day = weekStart.getDay(); // 0 = Sunday
    weekStart.setDate(weekStart.getDate() - day);

    // Generate Sunday → Saturday (7 days)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const formatWeekRange = () => {
    const dates = getWeekDates();
    const firstDay = dates[0];
    const lastDay = dates[6];

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return `Week: ${firstDay.getDate()} ${
      months[firstDay.getMonth()]
    } ${firstDay.getFullYear()} - ${lastDay.getDate()} ${
      months[lastDay.getMonth()]
    } ${lastDay.getFullYear()}`;
  };

  const getDayName = (date: Date) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  const getClassesForDay = (dayName: string) => {
    const dayData = weeklySchedule.find(
      (d) => d.day === dayName,
    );
    return dayData ? dayData.classes : [];
  };

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
                Lecturer Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
              onClick={onNavigateToProfile}
            >
              <Avatar>
                <AvatarFallback>DR</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Dr. Rachel Wong</p>
                <p className="text-sm text-gray-600">
                  Computer Science
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
                  {dailySchedule.map((classItem, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">
                            {classItem.subject}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {classItem.time}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {classItem.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{classItem.room}</span>
                      </div>
                    </div>
                  ))}
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
                    onClick={handlePreviousWeek}
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
                    const dayName = getDayName(date);
                    const classes = getClassesForDay(dayName);
                    const dayAbbreviation = dayName.slice(0, 3);

                    return (
                      <div key={dayName} className="flex items-start gap-4">
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

                        {classes.length > 0 ? (
                          <div className="flex-1 space-y-3">
                            {classes.map((classItem, idx) => (
                              <div
                                key={idx}
                                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <p className="font-medium">
                                  {classItem.courseCode}
                                </p>
                                <p className="text-sm text-gray-700 mt-1">
                                  {classItem.subject}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {classItem.time}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {classItem.room}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 p-4 border rounded-lg bg-gray-50">
                            <p className="text-sm text-gray-600">
                              {dayName === "Sunday"
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
                    {monthNames[currentMonth.getMonth()]}{" "}
                    {currentMonth.getFullYear()}
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
                    {[
                      "SUN",
                      "MON",
                      "TUE",
                      "WED",
                      "THU",
                      "FRI",
                      "SAT",
                    ].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-y-6 text-sm">
                    {getMonthGrid(currentMonth).map((cell) => {
                      const { date, isCurrentMonth } = cell;
                      const events = monthEvents.filter((e) =>
                        isSameDay(e.date, date),
                      );

                      return (
                        <div
                          key={date.toISOString()}
                          className="flex flex-col items-center gap-1"
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

                          {events.map((event, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs leading-tight text-center font-semibold"
                            >
                              {event.label}
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