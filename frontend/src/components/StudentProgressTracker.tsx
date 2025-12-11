import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import {
  BookOpen,
  LogOut,
  Bell,
  ArrowLeft,
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

interface StudentProgressTrackerProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
}

type ModuleProgress = {
  moduleCode: string;
  moduleName: string;
  progress: number;
  goal: number;
  status: "On Track" | "At Risk";
};

// Mock data for student progress
const allModules: ModuleProgress[] = [
  {
    moduleCode: "CSCI334",
    moduleName: "Database Systems",
    progress: 92,
    goal: 85,
    status: "On Track",
  },
  {
    moduleCode: "CSCI203",
    moduleName: "Algorithms",
    progress: 77,
    goal: 85,
    status: "At Risk",
  },
  {
    moduleCode: "CSCI251",
    moduleName: "Software Engineering",
    progress: 100,
    goal: 85,
    status: "On Track",
  },
  {
    moduleCode: "ISIT312",
    moduleName: "Big Data Management",
    progress: 88,
    goal: 85,
    status: "On Track",
  },
  {
    moduleCode: "CSCI205",
    moduleName: "Operating Systems",
    progress: 75,
    goal: 80,
    status: "At Risk",
  },
  {
    moduleCode: "CSCI311",
    moduleName: "Mobile Computing",
    progress: 90,
    goal: 85,
    status: "On Track",
  },
];

const MODULES_PER_PAGE = 4;

export function StudentProgressTracker({
  onLogout,
  onBack,
  onNavigateToProfile,
}: StudentProgressTrackerProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate overall progress
  const overallProgress = Math.round(
    allModules.reduce((sum, module) => sum + module.progress, 0) /
      allModules.length
  );

  // Calculate overall goal (average of all module goals)
  const overallGoal = Math.round(
    allModules.reduce((sum, module) => sum + module.goal, 0) /
      allModules.length
  );

  // Determine color for overall progress
  const overallProgressColor =
    overallProgress >= overallGoal ? "#22c55e" : "#ef4444"; // green or red

  // Pagination
  const totalPages = Math.ceil(allModules.length / MODULES_PER_PAGE);
  const startIndex = (currentPage - 1) * MODULES_PER_PAGE;
  const endIndex = startIndex + MODULES_PER_PAGE;
  const currentModules = allModules.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
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
                Student Portal
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
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>John Smith</p>
                <p className="text-sm text-gray-600">
                  Student ID: 7891011
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

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Progress Tracker</h2>
          <p className="text-gray-600">
            Track your attendance progress across all modules
          </p>
        </div>

        {/* Progress Card */}
        <Card className="max-w-4xl mx-auto">
          <CardContent className="pt-8">
            {/* Circular Progress Bar */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-48 h-48 mb-4">
                <svg className="w-48 h-48 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#e5e7eb"
                    strokeWidth="16"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke={overallProgressColor}
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 88 * (1 - overallProgress / 100)
                    }`}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl">{overallProgress}%</span>
                  <span className="text-sm text-gray-600 mt-1">
                    Overall
                  </span>
                </div>
              </div>

              {/* Quarter Display */}
              <p className="text-lg text-gray-700">
                2025 Quarter (Oct - Dec)
              </p>
            </div>

            {/* Progress by Module */}
            <div className="mt-8">
              <h3 className="text-xl mb-6">Progress by Module</h3>
              <div className="space-y-6">
                {currentModules.map((module) => {
                  // Determine color for module progress: blue if above goal, red if below
                  const moduleProgressColor =
                    module.progress >= module.goal ? "#2563eb" : "#ef4444";

                  return (
                    <div
                      key={module.moduleCode}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium">
                            {module.moduleCode} - {module.moduleName}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <p className="text-sm text-gray-600">
                            Goal: {module.goal}%
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              module.status === "On Track"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            Status: {module.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={module.progress}
                          indicatorColor={moduleProgressColor}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium min-w-[50px] text-right">
                          {module.progress}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}