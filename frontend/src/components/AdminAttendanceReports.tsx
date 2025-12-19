import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  BookOpen,
  LogOut,
  Bell,
  Settings,
  ArrowLeft,
  Download,
  FileText,
} from "lucide-react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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

interface AdminAttendanceReportsProps {
  onLogout: () => void;
  onBack: () => void;
}

const recentReports = [
  {
    id: 1,
    name: "All Departments - Daily Report",
    date: "28 Oct 2025",
    type: "Daily",
    status: "Present",
    downloadUrl: "#",
  },
  {
    id: 2,
    name: "Computer Science - Monthly Report",
    date: "1 Oct 2025",
    type: "Monthly",
    status: "Absent",
    downloadUrl: "#",
  },
  {
    id: 3,
    name: "All Departments - Daily Report",
    date: "27 Oct 2025",
    type: "Daily",
    status: "Present",
    downloadUrl: "#",
  },
  {
    id: 4,
    name: "Engineering - Daily Report",
    date: "26 Oct 2025",
    type: "Daily",
    status: "All",
    downloadUrl: "#",
  },
];

// NEW: format for display as dd/mm/yyyy
const formatDisplayDate = (dateString: string) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

export function AdminAttendanceReports({
  onLogout,
  onBack,
}: AdminAttendanceReportsProps) {
  const [reportType, setReportType] = useState<
    "daily" | "monthly"
  >("daily");

  // Use date strings for calendar inputs
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [module, setModule] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");

  const handleGenerateReport = () => {
    console.log("Generating report:", {
      reportType,
      fromDate,
      toDate,
      module,
      attendanceStatus,
    });
    alert(
      "Report generated successfully! Download will begin shortly.",
    );
  };

  const dailyActive = reportType === "daily";
  const monthlyActive = reportType === "monthly";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl">Attendify</h1>
              <p className="text-sm text-gray-600">
                Admin Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Admin User</p>
                <p className="text-sm text-gray-600">
                  System Administrator
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={onLogout}>
                    Log out
                  </AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Attendance Reports</h2>
          <p className="text-gray-600">
            Generate and download attendance reports
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Generation Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate Report</CardTitle>
                <CardDescription>
                  Configure and generate attendance reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Report Type */}
                <div className="space-y-3">
                  <Label>Report Type</Label>
                  <div className="flex gap-3">
                    {/* Daily */}
                    <Button
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-sm font-medium transition-colors 
                        border !border-blue-600
                        ${
                          reportType === "daily"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-white text-blue-600 hover:bg-blue-50"
                        }
                      `}
                      onClick={() => setReportType("daily")}
                    >
                      Daily
                    </Button>

                    {/* Monthly */}
                    <Button
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-sm font-medium transition-colors 
                        border !border-blue-600
                        ${
                          reportType === "monthly"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-white text-blue-600 hover:bg-blue-50"
                        }
                      `}
                      onClick={() => setReportType("monthly")}
                    >
                      Monthly
                    </Button>
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* From Date */}
                  <div className="space-y-2">
                    <Label htmlFor="fromDate">From:</Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-12 bg-gray-100"
                    />
                  </div>

                  {/* To Date */}
                  <div className="space-y-2">
                    <Label htmlFor="toDate">To:</Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-12 bg-gray-100"
                    />
                  </div>
                </div>

                {/* Module and Attendance Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="module">Module</Label>
                    <Select
                      value={module}
                      onValueChange={setModule}
                    >
                      <SelectTrigger
                        id="module"
                        className="h-12 bg-gray-100"
                      >
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csci334">
                          CSCI334 - Database Systems
                        </SelectItem>
                        <SelectItem value="csci203">
                          CSCI203 - Algorithms
                        </SelectItem>
                        <SelectItem value="all">
                          All Modules
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendanceStatus">
                      Attendance Status
                    </Label>
                    <Select
                      value={attendanceStatus}
                      onValueChange={setAttendanceStatus}
                    >
                      <SelectTrigger
                        id="attendanceStatus"
                        className="h-12 bg-gray-100"
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="present">
                          Present
                        </SelectItem>
                        <SelectItem value="absent">
                          Absent
                        </SelectItem>
                        <SelectItem value="late">
                          Late
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:text-gray-100 disabled:hover:bg-gray-400"
                  onClick={handleGenerateReport}
                  disabled={
                    !fromDate ||
                    !toDate ||
                    !module ||
                    !attendanceStatus
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate and Download
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Report Preview/Info */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Report Type
                  </p>
                  <p className="capitalize">{reportType}</p>
                </div>
                {fromDate && toDate && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Date Range
                    </p>
                    <p className="text-sm">
                      from {formatDisplayDate(fromDate)} to{" "}
                      {formatDisplayDate(toDate)}
                    </p>
                  </div>
                )}
                {module && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Module
                    </p>
                    <p className="text-sm">
                      {module === "all"
                        ? "All Modules"
                        : module.toUpperCase()}
                    </p>
                  </div>
                )}
                {attendanceStatus && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Status Filter
                    </p>
                    <p className="text-sm capitalize">
                      {attendanceStatus}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Generated Reports */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Generated Reports</CardTitle>
            <CardDescription>
              Previously generated attendance reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {report.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600">
                          {report.date}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {report.type}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600">
          &copy; 2025 University of Wollongong
        </div>
      </footer>
    </div>
  );
}
