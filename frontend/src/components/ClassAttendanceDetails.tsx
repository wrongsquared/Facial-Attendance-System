import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ClassAttendanceDetailsProps {
  session: {
    subject: string;
    date: string;
    time: string;
    attended: number;
    total: number;
    percentage: number;
  } | null;
  open: boolean;
  onClose: () => void;
}

// Mock student attendance data
const generateStudentAttendance = (attended: number, total: number) => {
  const students = [];
  const statuses: ("Present" | "Late" | "Absent")[] = ["Present", "Late", "Absent"];
  
  // Add present students
  const presentCount = Math.floor(attended * 0.85);
  for (let i = 1; i <= presentCount; i++) {
    students.push({
      userId: `789${1010 + i}`,
      studentName: `Student ${i}`,
      checkInTime: `9:${String(i % 60).padStart(2, '0')} AM`,
      status: "Present" as const,
    });
  }
  
  // Add late students
  const lateCount = attended - presentCount;
  for (let i = 1; i <= lateCount; i++) {
    students.push({
      userId: `789${2010 + i}`,
      studentName: `Student ${presentCount + i}`,
      checkInTime: `9:${String(20 + i).padStart(2, '0')} AM`,
      status: "Late" as const,
    });
  }
  
  // Add absent students
  const absentCount = total - attended;
  for (let i = 1; i <= absentCount; i++) {
    students.push({
      userId: `789${3010 + i}`,
      studentName: `Student ${attended + i}`,
      checkInTime: "-",
      status: "Absent" as const,
    });
  }
  
  return students;
};

export function ClassAttendanceDetails({
  session,
  open,
  onClose,
}: ClassAttendanceDetailsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const allStudents = session ? generateStudentAttendance(
    session.attended,
    session.total
  ) : [];
  
  const presentCount = allStudents.filter(s => s.status === "Present").length;
  const lateCount = allStudents.filter(s => s.status === "Late").length;
  const absentCount = allStudents.filter(s => s.status === "Absent").length;

  // Calculate pagination
  const totalPages = Math.ceil(allStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = allStudents.slice(startIndex, endIndex);

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-green-600 text-white hover:bg-green-700";
      case "Late":
        return "bg-yellow-600 text-white hover:bg-yellow-700";
      case "Absent":
        return "bg-red-600 text-white hover:bg-red-700";
      default:
        return "bg-gray-600 text-white hover:bg-gray-700";
    }
  };

  // Extract module code and name from subject
  const [moduleCode, moduleName] = session?.subject.includes(" - ")
    ? session.subject.split(" - ")
    : [session?.subject, ""];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Overall Class Attendance Details</DialogTitle>
          <DialogDescription>
            View detailed attendance records for the selected class session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Session Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{moduleCode}</span>
              {moduleName && (
                <>
                  <span>-</span>
                  <span>{moduleName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{session?.date}</span>
              <span>•</span>
              <span>{session?.time}</span>
              <span>•</span>
              <span>Building 3, Room 205</span>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Attended:</span>
              <span>{session?.attended}/{session?.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Attendance Rate:</span>
              <span>{session?.percentage}%</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Present:</span>
                <span>{presentCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Late arrivals:</span>
                <span>{lateCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Absentees:</span>
                <span>{absentCount}</span>
              </div>
            </div>
          </div>

          {/* Student Details Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentStudents.map((student) => (
                  <TableRow key={student.userId}>
                    <TableCell>{student.userId}</TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell>{student.checkInTime}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(student.status)}>
                        {student.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousPage}
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
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Close Button */}
          <div className="flex justify-center pb-4">
            <Button onClick={onClose} variant="default" className="px-8">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}