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
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { AttendanceLog } from "../types/studentinnards";
import { getFullAttendanceHistory } from "../services/api";

interface Props {
  onNavigateToProfile: () => void;
  onBack: () => void;
  onLogout: () => void; // Kept for prop compatibility, though Navbar handles it
  onOpenNotifications: () => void;
}
const itemsPerPage = 20;


export function StudentAttendanceHistory({ onBack, onNavigateToProfile, onOpenNotifications }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<AttendanceLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const data = await getFullAttendanceHistory(token);
        setHistoryData(data);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);
  // 1. Get Unique Modules for Dropdown
  const uniqueModules = Array.from(new Set(historyData.map(item => item.module_code)));

  // 2. Filter Logic
  const filteredRecords = historyData.filter((record) => {
    // A. Search
    const matchesSearch = record.module_code.toLowerCase().includes(searchQuery.toLowerCase());

    // B. Module Dropdown
    const matchesModule = selectedModule === "all" || record.module_code === selectedModule;

    // C. Status Dropdown
    const matchesStatus = selectedStatus === "all" || record.status === selectedStatus;

    // D. Date Picker
    let matchesDate = true;
    if (selectedDate) {
      const recordDate = new Date(record.start_time).toDateString();
      const filterDate = selectedDate.toDateString();
      matchesDate = recordDate === filterDate;
    }

    return matchesSearch && matchesModule && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedModule, selectedStatus, selectedDate]);

  // --- HELPERS ---
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present": return "bg-green-600 text-white";
      case "Absent": return "bg-red-600 text-white";
      case "Late": return "bg-yellow-600 text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Student Portal" onNavigateToProfile={onNavigateToProfile} onOpenNotifications={onOpenNotifications} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Attendance History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>
              View your attendance records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter Header */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by module..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Module Dropdown */}
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {uniqueModules.map((code) => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
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

            {/* Attendance History Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Attendance Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                        Loading Table Data
                      </TableCell>
                    </TableRow>
                  ) : currentRecords.length > 0 ? (
                    currentRecords.map((record) => {
                      const dateObj = new Date(record.start_time);
                      return (
                        <TableRow key={record.lessonID}>
                          <TableCell>{record.module_code}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                          <TableCell>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</TableCell>
                        </TableRow>);
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
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
            {totalPages > 0 && (
              <div className="flex items-center justify-center gap-4 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
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
    </div>
  );
}