import { useState, useEffect } from "react";
import { ArrowLeft, Search, UserPlus, Users, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getStudentsForCustomGoals, enrollStudentsInModule, getTutorialGroupsForModule, getStudentsWithEnrollmentStatus } from "../services/api"; // Use existing campus-filtered API

interface StudentData {
  uuid: string;
  user_display_id: string;
  name: string;
  role: string;
  status: string;
  attendanceMinimum?: number;
  isEnrolled?: boolean;
}

interface ModuleData {
  moduleID: string;
  moduleCode: string;
  moduleName: string;
  startDate: string | null;
  endDate: string | null;
  lecturerID?: string | null;
}

interface TutorialGroup {
  tutorialGroupsID: number;
  groupName: string;
  studentCount: number;
}

interface EnrollStudentProps {
  moduleData: ModuleData;
  onBack: () => void;
  onNavigateToProfile?: () => void;
}

export function EnrollStudent({
  moduleData,
  onBack,
  onNavigateToProfile,
}: EnrollStudentProps) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [tutorialGroups, setTutorialGroups] = useState<TutorialGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 30;

  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {


        console.log('Fetching students for module:', moduleData.moduleCode);

        // Fetch both students with enrollment status and tutorial groups in parallel
        const [studentsData, tutorialGroupsData] = await Promise.all([
          getStudentsWithEnrollmentStatus(moduleData.moduleID, token),
          getTutorialGroupsForModule(moduleData.moduleID, token)
        ]);

        setStudents(studentsData);
        setTutorialGroups(tutorialGroupsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        // If the new endpoint fails, fall back to the old method
        try {
          console.log('Falling back to basic student data...');
          const [studentsData, tutorialGroupsData] = await Promise.all([
            getStudentsForCustomGoals(token || "", "", "All Status"),
            getTutorialGroupsForModule(moduleData.moduleID, token || "")
          ]);

          // Add isEnrolled: false as fallback
          const studentsWithEnrollment = studentsData.map((student: any) => ({
            ...student,
            isEnrolled: false // Fallback to false, user can still enroll
          }));

          setStudents(studentsWithEnrollment);
          setTutorialGroups(tutorialGroupsData);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [token, moduleData.moduleID]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.user_display_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const handleStudentSelect = (studentId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (isSelected) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allUnenrolledStudents = paginatedStudents
        .filter(student => !student.isEnrolled)
        .map(student => student.uuid);
      setSelectedStudents(new Set([...selectedStudents, ...allUnenrolledStudents]));
    } else {
      // Only deselect students from current page
      const currentPageStudentIds = new Set(paginatedStudents.map(student => student.uuid));
      const newSelected = new Set([...selectedStudents].filter(id => !currentPageStudentIds.has(id)));
      setSelectedStudents(newSelected);
    }
  };

  const handleEnrollSelected = async () => {
    if (selectedStudents.size === 0) {
      alert("Please select at least one student to enroll.");
      return;
    }

    setEnrolling(true);
    try {
      // Call the actual enrollment API with auto-assignment to tutorial groups
      const result = await enrollStudentsInModule(moduleData.moduleID, Array.from(selectedStudents), token || "");
      console.log('Enrollment result:', result);

      // Refresh both student enrollment status and tutorial groups from database
      const [updatedStudents, updatedTutorialGroups] = await Promise.all([
        getStudentsWithEnrollmentStatus(moduleData.moduleID, token || ""),
        getTutorialGroupsForModule(moduleData.moduleID, token || "")
      ]);

      setStudents(updatedStudents);
      setTutorialGroups(updatedTutorialGroups);
      setSelectedStudents(new Set());

      // Show success message with tutorial group assignment info
      const message = tutorialGroups.length > 0
        ? `Successfully enrolled ${result.enrolled_count} student(s) in ${moduleData.moduleCode}.\nStudents have been automatically distributed across ${tutorialGroups.length} tutorial groups.`
        : `Successfully enrolled ${result.enrolled_count} student(s) in ${moduleData.moduleCode}.`;

      alert(message);
    } catch (error) {
      console.error('Error enrolling students:', error);
      alert('Failed to enroll students. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const currentPageUnenrolledCount = paginatedStudents.filter(student => !student.isEnrolled).length;
  const currentPageSelectedCount = paginatedStudents.filter(student =>
    !student.isEnrolled && selectedStudents.has(student.uuid)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage Modules
        </Button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Enroll Students</h1>
          <p className="text-gray-600 mt-1">
            Enroll students from your campus in <span className="font-semibold">{moduleData.moduleCode} - {moduleData.moduleName}</span>
          </p>
        </div>

        {/* Module Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Module Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Module Code</p>
                <p className="font-semibold">{moduleData.moduleCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Module Name</p>
                <p className="font-semibold">{moduleData.moduleName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-semibold">
                  {moduleData.startDate ? new Date(moduleData.startDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">End Date</p>
                <p className="font-semibold">
                  {moduleData.endDate ? new Date(moduleData.endDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tutorial Groups Info Card */}
        {tutorialGroups.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Tutorial Groups
              </CardTitle>
              <CardDescription>
                Students will be automatically distributed across available tutorial groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tutorialGroups.map((group) => (
                  <div key={group.tutorialGroupsID} className="p-4 border rounded-lg">
                    <p className="font-semibold text-gray-900">{group.groupName}</p>
                    <p className="text-sm text-gray-600">
                      {group.studentCount} student{group.studentCount !== 1 ? 's' : ''} enrolled
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Auto-Assignment:</strong> New students will be evenly distributed across these {tutorialGroups.length} tutorial groups to maintain balanced enrollment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student List</CardTitle>
            <CardDescription>
              Select students from your campus to enroll in this module
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search and Actions */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campus students by number or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Enroll Selected Button */}
              <Button
                onClick={handleEnrollSelected}
                disabled={selectedStudents.size === 0 || enrolling}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {enrolling ? 'Enrolling...' : `Enroll Selected (${selectedStudents.size})`}
              </Button>
            </div>

            {/* Students Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          currentPageUnenrolledCount > 0 &&
                          currentPageSelectedCount === currentPageUnenrolledCount
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Student Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrollment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        Loading students...
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No students found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((student) => (
                      <TableRow key={student.uuid}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.has(student.uuid)}
                            disabled={student.isEnrolled}
                            onCheckedChange={(checked: boolean) =>
                              handleStudentSelect(student.uuid, checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.user_display_id}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {student.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={student.status === "Active" ? "default" : "secondary"}
                            className={student.status === "Active" ? "bg-blue-100 text-blue-800" : ""}
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={student.isEnrolled ? "default" : "secondary"}
                            className={student.isEnrolled ? "bg-green-100 text-green-800" : ""}
                          >
                            {student.isEnrolled ? "Enrolled" : "Not Enrolled"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
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