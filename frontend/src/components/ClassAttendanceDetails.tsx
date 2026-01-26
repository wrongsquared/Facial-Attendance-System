import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "../cont/AuthContext";

// 1. Interfaces matching your Python Pydantic models
interface AttendanceDetailRow {
  user_id: string;
  student_name: string;
  check_in_time: string | null;
  status: string;
}

interface OverallClassAttendanceDetails {
  subject_details: string;
  lesson_details: string;
  attended_count: number;
  total_enrolled: number;
  attendance_rate: number;
  Present_count: number;
  late_arrivals: number;
  absentees: number;
  attendance_log: AttendanceDetailRow[];
}

interface ClassAttendanceDetailsProps {
  session: {
    lessonID: number;
    // We keep these optional just in case, but we primarily use lessonID
    subject?: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

export function ClassAttendanceDetails({
  session,
  open,
  onClose,
}: ClassAttendanceDetailsProps) {
  // Auth Context
  const { token } = useAuth();

  // State
  const [data, setData] = useState<OverallClassAttendanceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch Data Effect
  useEffect(() => {
    if (open && session?.lessonID && token) {
      const fetchDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(
            `http://localhost:8000/lecturer/class/details?lesson_id=${session.lessonID}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Fixed 403 Error
              },
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch attendance details");
          }

          const result: OverallClassAttendanceDetails = await response.json();
          setData(result);
        } catch (err) {
          console.error(err);
          setError("Unable to load data.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchDetails();
    } else {
      // Reset when closed
      setData(null);
      setCurrentPage(1);
    }
  }, [open, session?.lessonID, token]);

  // Pagination Logic
  const allStudents = data?.attendance_log || [];
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
    // Normalize case just to be safe
    const s = status.toLowerCase();
    switch (s) {
      case "present":
        return "bg-green-600 text-white hover:bg-green-700";
      case "late":
        return "bg-yellow-600 text-white hover:bg-yellow-700";
      case "absent":
        return "bg-red-600 text-white hover:bg-red-700";
      default:
        return "bg-gray-600 text-white hover:bg-gray-700";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Overall Class Attendance Details</DialogTitle>
          <DialogDescription>
            View detailed attendance records for the selected class session.
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex justify-center items-center py-20 text-red-500">
            {error}
          </div>
        )}

        {/* Data Content */}
        {!isLoading && !error && data && (
          <div className="space-y-6 pt-4">
            {/* Session Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{data.subject_details}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {/* The API returns the formatted string: Date · Time · Location */}
                <span>{data.lesson_details}</span>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-md border">
              <div className="flex items-center gap-2">
                <span className="font-medium">Attended:</span>
                <span>{data.attended_count}/{data.total_enrolled}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Attendance Rate:</span>
                <span className={data.attendance_rate < 80 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                  {data.attendance_rate}%
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm pt-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Present:</span>
                  <span>{data.Present_count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Late arrivals:</span>
                  <span>{data.late_arrivals}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Absentees:</span>
                  <span>{data.absentees}</span>
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
                  {currentStudents.length > 0 ? (
                    currentStudents.map((student) => (
                      <TableRow key={student.user_id}>
                        <TableCell className="font-mono text-xs">{student.user_id}</TableCell>
                        <TableCell>{student.student_name}</TableCell>
                        <TableCell>{student.check_in_time || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(student.status)}>
                            {student.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        No students found.
                      </TableCell>
                    </TableRow>
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
            )}

            {/* Close Button */}
            <div className="flex justify-center pb-4">
              <Button onClick={onClose} variant="default" className="px-8">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}