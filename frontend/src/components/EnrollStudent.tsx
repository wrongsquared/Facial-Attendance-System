import { useState, useEffect } from "react";
import { ArrowLeft, Search, UserPlus, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
// import { getStudentList, enrollStudentsInModule } from "../services/api"; // Uncomment when API is ready

interface StudentData {
  studentID: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);

  const { token } = useAuth();

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        // TODO: Replace with actual API call
        // const data = await getStudentList(token);
        
        // Mock data for now - replace with actual API call
        const mockStudents: StudentData[] = [
          {
            studentID: "1",
            studentNumber: "S001234",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@student.edu",
            isEnrolled: false,
          },
          {
            studentID: "2",
            studentNumber: "S001235",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@student.edu",
            isEnrolled: true,
          },
          {
            studentID: "3",
            studentNumber: "S001236",
            firstName: "Mike",
            lastName: "Johnson",
            email: "mike.johnson@student.edu",
            isEnrolled: false,
          },
        ];

        setStudents(mockStudents);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch students');
        setLoading(false);
      }
    };

    fetchStudents();
  }, [token]);

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

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
      const allUnenrolledStudents = filteredStudents
        .filter(student => !student.isEnrolled)
        .map(student => student.studentID);
      setSelectedStudents(new Set(allUnenrolledStudents));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleEnrollSelected = async () => {
    if (selectedStudents.size === 0) {
      alert("Please select at least one student to enroll.");
      return;
    }

    setEnrolling(true);
    try {
      // TODO: Replace with actual API call
      // await enrollStudentsInModule(moduleData.moduleID, Array.from(selectedStudents), token);

      // Mock success - update local state
      setStudents(prevStudents =>
        prevStudents.map(student =>
          selectedStudents.has(student.studentID)
            ? { ...student, isEnrolled: true }
            : student
        )
      );

      setSelectedStudents(new Set());
      alert(`Successfully enrolled ${selectedStudents.size} student(s) in ${moduleData.moduleCode}`);
    } catch (error) {
      console.error('Error enrolling students:', error);
      alert('Failed to enroll students. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const unenrolledCount = filteredStudents.filter(student => !student.isEnrolled).length;
  const enrolledCount = filteredStudents.filter(student => student.isEnrolled).length;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Students</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            Retry
          </Button>
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
          Back to Manage Modules
        </Button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Enroll Students</h1>
          <p className="text-gray-600 mt-1">
            Enroll students in <span className="font-semibold">{moduleData.moduleCode} - {moduleData.moduleName}</span>
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

        {/* Enrollment Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{enrolledCount}</div>
                <div className="text-sm text-gray-600">Already Enrolled</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{unenrolledCount}</div>
                <div className="text-sm text-gray-600">Available to Enroll</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{selectedStudents.size}</div>
                <div className="text-sm text-gray-600">Selected</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student List</CardTitle>
            <CardDescription>
              Select students to enroll in this module
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search and Actions */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student number, name, or email..."
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
                          unenrolledCount > 0 && 
                          selectedStudents.size === unenrolledCount
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Student Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
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
                    filteredStudents.map((student) => (
                      <TableRow key={student.studentID}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.has(student.studentID)}
                            disabled={student.isEnrolled}
                            onCheckedChange={(checked) => 
                              handleStudentSelect(student.studentID, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.studentNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {student.firstName} {student.lastName}
                          </div>
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}