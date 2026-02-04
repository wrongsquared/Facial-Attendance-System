import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext"; 
import { StudentProgressData } from "../types/studentinnards";
import { getStudentProgress } from "../services/api";

interface Props {
  onBack: () => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
  onOpenNotifications:() => void;
}

const MODS_PER_PAGE = 6; // 

export function StudentProgressTracker({ onBack, onOpenNotifications, onNavigateToProfile }: Props) {
  const { token } = useAuth();

  const [data, setData] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const result = await getStudentProgress(token);
        setData(result);
      } catch (err) {
        console.error("Failed to fetch progress", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) return <div className="p-10 text-center">Loading progress...</div>;
  if (!data) return <div className="p-10 text-center">No data available.</div>;

  const overallProgress = data.overall_percentage;
  const overallProgressColor = overallProgress >= 85 ? "#22c55e" : "#ef4444"; 

  // Pagination
  const allModules = data.modules;
  const totalPages = Math.ceil(allModules.length / MODS_PER_PAGE);
  const startIndex = (currentPage - 1) * MODS_PER_PAGE;

    // Map API data to the shape your JSX expects
  const currentModules = allModules.slice(startIndex, startIndex + MODS_PER_PAGE).map(mod => ({
    moduleCode: mod.module_code,
    moduleName: mod.module_name,
    progress: mod.attendance_percentage,
    goal: mod.goal_percentage,
    status: mod.status
  }));
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title= "Student Portal" onNavigateToProfile={onNavigateToProfile} onOpenNotifications={onOpenNotifications}/>
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
          <h2 className="text-3xl mb-2 text-center">Progress Tracker</h2>
          <p className="text-gray-600 text-center">
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
                    style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
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
                {data.quarter_label}
              </p>
            </div>

            {/* Progress by Module */}
            <div className="mt-8">
              <h3 className="text-xl mb-6">Progress by Module</h3>
              <div className="space-y-6">
                 {currentModules.map((module) => {
                  
                  // Determine color class for module progress
                  // Standard shadcn Progress uses classes, not hex codes
                  const isSuccess = module.progress >= module.goal;
                  const indicatorClass = isSuccess ? "bg-blue-600" : "bg-red-500";

                  return (
                    <div
                      key={module.moduleCode}
                      className="border rounded-lg p-4 bg-white shadow-sm"
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
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${indicatorClass}`}
                                style={{ width: `${module.progress}%` }} 
                            />
                        </div>
                        
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