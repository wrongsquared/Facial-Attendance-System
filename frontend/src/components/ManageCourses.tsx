import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
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
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getCampusCourses, deleteCourse } from "../services/api";

interface CourseData {
  courseID: number;
  courseCode: string;
  courseName?: string;
  campusID?: number;
}

interface ManageCoursesProps {
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToCreateCourse?: () => void;
  onNavigateToUpdateCourse?: (courseData: CourseData) => void;
  refreshTrigger?: number;
}

export function ManageCourses({
  onBack,
  onLogout,
  onNavigateToProfile,
  onNavigateToCreateCourse,
  onNavigateToUpdateCourse,
  refreshTrigger,
}: ManageCoursesProps) {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [courseToDelete, setCourseToDelete] = useState<CourseData | null>(null);

  const { token } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        const data = await getCampusCourses(token);
        setCourses(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setLoading(false);
      }
    };

    fetchCourses();
  }, [token, refreshTrigger]);

  // Filter courses based on search and course filter
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.courseName && course.courseName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = courseFilter === "all" || course.courseCode === courseFilter;

    return matchesSearch && matchesCourse;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + itemsPerPage);

  const handleAddCourse = () => {
    if (onNavigateToCreateCourse) {
      onNavigateToCreateCourse();
    }
  };

  const handleEditCourse = (courseId: number) => {
    const course = courses.find(c => c.courseID === courseId);
    if (course && onNavigateToUpdateCourse) {
      onNavigateToUpdateCourse(course);
    }
  };

  const handleDeleteClick = (courseId: number) => {
    const course = courses.find(c => c.courseID === courseId);
    if (course) {
      setCourseToDelete(course);
    }
  };

  const confirmDelete = async () => {
    if (!courseToDelete || !token) return;

    try {
      await deleteCourse(courseToDelete.courseID, token);

      // Remove the course from local state
      setCourses(prevCourses =>
        prevCourses.filter(course => course.courseID !== courseToDelete.courseID)
      );

      // Close dialog and reset state
      setCourseToDelete(null);

      alert('Course deleted successfully!');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses data...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Manage Courses</h1>
          <p className="text-gray-600 mt-1">Create, edit, and manage academic courses</p>
        </div>

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Courses</CardTitle>
            <CardDescription>
              Create, edit, and manage academic courses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filter Header */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by course code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Course Filter */}
              <div className="w-48">
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.courseID} value={course.courseCode}>
                        {course.courseCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add New Course Button */}
              <Button onClick={handleAddCourse} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Course
              </Button>
            </div>

            {/* Courses Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Course ID</TableHead>
                    <TableHead className="text-center">Course Code</TableHead>
                    <TableHead className="text-center">Course Name</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500 py-8"
                      >
                        Loading courses...
                      </TableCell>
                    </TableRow>
                  ) : paginatedCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No courses found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCourses.map((course) => (
                      <TableRow key={course.courseID}>
                        <TableCell className="font-medium text-center">{course.courseID}</TableCell>
                        <TableCell className="font-medium text-center">{course.courseCode}</TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">{course.courseName || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCourse(course.courseID)}
                            >
                              Update Course
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(course.courseID)}
                                >
                                  Delete Course
                                </Button>
                              </AlertDialogTrigger>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-black">
                                    Delete Course
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-black">
                                    Are you sure you want to delete <strong>" {courseToDelete?.courseCode} - {courseToDelete?.courseName}"</strong>?
                                  </AlertDialogDescription>
                                  <AlertDialogDescription className="text-black">
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter className="flex flex-row justify-center items-center gap-4 sm:justify-center">
                                  <AlertDialogCancel onClick={() => setCourseToDelete(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={confirmDelete}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
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