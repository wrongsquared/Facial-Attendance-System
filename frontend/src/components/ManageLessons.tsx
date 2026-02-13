import { useState, useEffect, JSX } from "react";
import { ChevronLeft, ChevronRight, Search, ArrowLeft, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";

import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { LessonData } from "../types/adminlesson";
import { getAdminLessonList, testAdminAccess } from "../services/api";

interface ManageLessonsProps {
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToCreateLesson?: () => void;
  onNavigateToUpdateLesson?: (lessonData: LessonData) => void;
  refreshTrigger?: number; // Add refresh trigger prop
}

export function ManageLessons({
  onBack,
  onLogout,
  onNavigateToProfile,
  onNavigateToCreateLesson,
  onNavigateToUpdateLesson,
  refreshTrigger,
}: ManageLessonsProps): JSX.Element {
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 30;


  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setLoading(false);
    return;
    }
    const fetchLessons = async () => {
      setLoading(true);
      try {


        // First test admin access

        // const adminTest = await testAdminAccess(token);

        // Convert Date to YYYY-MM-DD format
        let dateStr = "";
        if (selectedDate) {
          dateStr = selectedDate.toLocaleDateString("en-CA");
        }

        const data = await getAdminLessonList(token, dateStr, dateStr);
        setLessons(data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching lessons:', error);
        // Set empty array on error to prevent crashes
        setLessons([]);
        setLoading(false);
      }
    };

    fetchLessons();
  }, [token, refreshTrigger, selectedDate]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, moduleFilter, lessonTypeFilter, selectedDate]);

  // Filter lessons based on search, module filter, and lesson type filter
  const filteredLessons = lessons.filter(lesson => {
    // Search functionality with null checks
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      (lesson.moduleCode && lesson.moduleCode.toLowerCase().includes(searchLower)) ||
      (lesson.moduleName && lesson.moduleName.toLowerCase().includes(searchLower)) ||
      (lesson.lessonType && lesson.lessonType.toLowerCase().includes(searchLower)) ||
      (lesson.building && lesson.building.toLowerCase().includes(searchLower)) ||
      (lesson.room && lesson.room.toLowerCase().includes(searchLower)) ||
      (lesson.lecturerName && lesson.lecturerName.toLowerCase().includes(searchLower));

    // Module filter
    const matchesModule = moduleFilter === "all" || lesson.moduleCode === moduleFilter;

    // Lesson type filter  
    const matchesLessonType = lessonTypeFilter === "all" || lesson.lessonType === lessonTypeFilter;

    return matchesSearch && matchesModule && matchesLessonType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLessons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLessons = filteredLessons.slice(startIndex, startIndex + itemsPerPage);

  // Get unique modules and lesson types for filters
  const uniqueModules = Array.from(new Set(lessons.map(lesson => lesson.moduleCode)));
  const uniqueLessonTypes = Array.from(new Set(lessons.map(lesson => lesson.lessonType)));

  const handleAddLesson = () => {
    if (onNavigateToCreateLesson) {
      onNavigateToCreateLesson();
    }
  };

  const handleEditLesson = (lessonId: string) => {
    const lesson = lessons.find(l => l.lessonID === lessonId);
    if (lesson && onNavigateToUpdateLesson) {
      onNavigateToUpdateLesson(lesson);
    }
  };

  const handleModuleFilterChange = (value: string) => {
    setModuleFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleLessonTypeFilterChange = (value: string) => {
    setLessonTypeFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };



  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Lessons</h1>
          <p className="text-gray-600 mt-1">Create, edit, and manage lesson schedules</p>
        </div>

        {/* Lessons Table */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Lessons</CardTitle>
            <CardDescription>
              Create, edit, and manage lesson schedules for all modules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filter Header */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by module, lesson type, or location..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>

              {/* Module Filter */}
              <Select value={moduleFilter} onValueChange={handleModuleFilterChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Module Code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {uniqueModules.filter(Boolean).map(moduleCode => (
                    <SelectItem key={moduleCode} value={moduleCode}>
                      {moduleCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Lesson Type Filter */}
              <Select value={lessonTypeFilter} onValueChange={handleLessonTypeFilterChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Lesson Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueLessonTypes.filter(Boolean).map(lessonType => (
                    <SelectItem key={lessonType} value={lessonType}>
                      {lessonType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-[180px]">
                    {selectedDate ? formatDate(selectedDate) : "Select Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedDate(undefined)}
                      >
                        Clear Date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Add New Lesson Button */}
              <Button onClick={handleAddLesson} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add New Lesson
              </Button>
            </div>

            {/* Lessons Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Lesson ID</TableHead>
                    <TableHead className="text-center">Module</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-center">Time</TableHead>
                    <TableHead className="text-center">Building</TableHead>
                    <TableHead className="text-center">Room</TableHead>
                    <TableHead className="text-center">Lecturer</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-gray-500 py-8"
                      >
                        Loading lessons...
                      </TableCell>
                    </TableRow>
                  ) : paginatedLessons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No lessons found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLessons.map((lesson) => {
                      const startTime = formatDateTime(lesson.startDateTime);
                      const endTime = formatDateTime(lesson.endDateTime);

                      return (
                        <TableRow key={lesson.lessonID}>
                          <TableCell className="font-medium text-center">{lesson.lessonID}</TableCell>
                          <TableCell className="text-center">
                            <div className="font-medium">{lesson.moduleCode} - {lesson.moduleName}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {lesson.lessonType}
                          </TableCell>
                          <TableCell className="text-center">{startTime.date}</TableCell>
                          <TableCell className="text-center">
                            <div className="text-sm">
                              {startTime.time} - {endTime.time}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-medium">{lesson.building || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-medium">{lesson.room || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-sm">{lesson.lecturerName || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditLesson(lesson.lessonID)}
                              >
                                Update 
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex items-center justify-center gap-4 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}