import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  LogOut,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { AttendanceLogEntry } from "../types/lecturerinnards";
import { getAttendanceLog } from "../services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";

interface LecturerAttendanceRecordsProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
}

const ITEMS_PER_PAGE = 8;

export function LecturerAttendanceRecords({
  onLogout,
  onBack,
  onNavigateToProfile,
}: LecturerAttendanceRecordsProps) {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceLogEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recentAttendanceLog, setRecentAttendanceLog] = useState<AttendanceLogEntry[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);


  // Filter records
    const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

    useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        // Convert Date to YYYY-MM-DD
        let dateStr = "";
        if (selectedDate) {
           // Ensure local date string matches API expectation
           // Trick: use the 'en-CA' locale to get YYYY-MM-DD
           dateStr = selectedDate.toLocaleDateString("en-CA");
        }
        console.log("SENDING DATE:", dateStr); 

        const data = await getAttendanceLog(token, {
          searchTerm: debouncedSearch,
          moduleCode: selectedModule === "all" ? undefined : selectedModule,
          status: selectedStatus === "all" ? undefined : (selectedStatus as any),
          date: dateStr, // Sends "2026-01-06"
          page: 1
        });
        setRecentAttendanceLog(data);
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, debouncedSearch, selectedModule, selectedStatus, selectedDate]);
  
  const totalPages = Math.ceil(recentAttendanceLog.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentRecords = recentAttendanceLog.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Helper for Status Badge Color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present": return "bg-green-100 text-green-700 hover:bg-green-100";
      case "Absent": return "bg-red-100 text-red-700 hover:bg-red-100";
      case "Late": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      default: return "bg-gray-100";
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title= "Lecturer Portal" onNavigateToProfile={onNavigateToProfile}/>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Attendance Records Card */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              View and filter student attendance records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Header */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Module Code Dropdown */}
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Module Code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="CSCI334">CSCI334</SelectItem>
                  <SelectItem value="CSCI203">CSCI203</SelectItem>
                </SelectContent>
              </Select>

              {/* Attendance Status Dropdown */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Attendance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
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
            </div>

            {/* Attendance Records Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Attendance Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.length > 0 ? (
                    currentRecords.map((record, index) => (
                      <TableRow key={`${record.user_id}-${index}`}>
                        <TableCell>{record.user_id}</TableCell>
                        <TableCell>{record.student_name}</TableCell>
                        <TableCell>{record.module_code}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const detailedRecord = {
                                ...record,
                                attendanceMethod: "Biometric Scan", // Mock
                                liveCheck: "Passed",                // Mock
                                cameraLocation: "Building 3, Room 205", // Mock or from API
                                timestamp: "09:00 AM",              // Mock
                                verificationType: "Single-person",  // Mock
                                virtualTripwire: "Triggered"        // Mock
                                };
                              setSelectedRecord(detailedRecord);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-500 py-8"
                      >
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {recentAttendanceLog.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages || 1}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Student Attendance Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Attendance Details</DialogTitle>
            <DialogDescription>
              View detailed attendance information for this student
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Student Name:</p>
                  <p className="font-medium">{selectedRecord.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">User ID:</p>
                  <p className="font-medium">{selectedRecord.user_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Module:</p>
                  <p className="font-medium">{selectedRecord.module_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date:</p>
                  <p className="font-medium">{selectedRecord.date}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Attendance Status:</p>
                    <Badge className={getStatusColor(selectedRecord.status)}>
                      {selectedRecord.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Attendance Method:</p>
                    <p className="font-medium">{selectedRecord.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Live Check:</p>
                    <Badge 
                      className={
                        selectedRecord.liveCheck === "Passed"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : selectedRecord.liveCheck === "Failed"
                          ? "bg-red-100 text-red-700 hover:bg-red-100"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                      }
                    >
                      {selectedRecord.liveCheck}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Camera Location:</p>
                    <p className="font-medium">{selectedRecord.cameraLocation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Timestamp:</p>
                    <p className="font-medium">{selectedRecord.timestamp}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Verification Type:</p>
                    <p className="font-medium">{selectedRecord.verificationType}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Virtual Tripwire:</p>
                    <Badge 
                      className={
                        selectedRecord.virtualTripwire === "Triggered"
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                      }
                    >
                      {selectedRecord.virtualTripwire}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}