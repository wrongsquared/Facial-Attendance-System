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
import { getAttendanceLog, getLecturerModuleList } from "../services/api";
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

const ITEMS_PER_PAGE = 10;

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
  const [totalRecords, setTotalRecords] = useState(0);
  const [moduleList, setModuleList] = useState<string[]>([]);

  // Filter records
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Important: Reset to Page 1 when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchModules = async () => {
      if (!token) return;
      try {
        const modules = await getLecturerModuleList(token);
        setModuleList(modules);
      } catch (err) {
        console.error("Failed to load module list", err);
      }
    };
    fetchModules();
  }, [token]);
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

        const response = await getAttendanceLog(token, {
          searchTerm: debouncedSearch,
          moduleCode: selectedModule === "all" ? undefined : selectedModule,
          status: selectedStatus === "all" ? undefined : (selectedStatus as any),
          date: dateStr,
          page: currentPage,
          limit: ITEMS_PER_PAGE
        });
        console.log("API RESPONSE RAW:", response);
        setRecentAttendanceLog(response.data || []);
        setTotalRecords(response.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, debouncedSearch, selectedModule, selectedStatus, selectedDate, currentPage]);

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

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
      <Navbar title="Lecturer Portal" onNavigateToProfile={onNavigateToProfile} />

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
                  {moduleList.map((mod: any) => (
                    <SelectItem key={mod.moduleCode} value={mod.moduleCode}>
                      {mod.moduleCode}
                    </SelectItem>
                  ))}
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">Loading records...</TableCell>
                    </TableRow>
                  ) : recentAttendanceLog?.length > 0 ? (
                    recentAttendanceLog.map((record, index) => (
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
                                cameraLocation: record.location, // Mock or from API
                                timestamp: record.timestamp,              // Mock
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
                    <p className="font-medium">{selectedRecord.method ?? "Camera Capture"} </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Camera Location:</p>
                    <p className="font-medium">{selectedRecord.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Timestamp:</p>
                    <p className="font-medium">{selectedRecord.timestamp}</p>
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