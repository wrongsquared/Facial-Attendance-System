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
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  BookOpen,
  LogOut,
  Bell,
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
import { useAuth } from "../cont/AuthContext";
import { Navbar } from "./Navbar";

interface AttendanceReportsProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
}

// const recentReports = [
//   {
//     id: 1,
//     name: "CSCI334 - Daily Report",
//     date: "28 Oct 2025",
//     type: "Daily",
//     status: "Present",
//     downloadUrl: "#",
//   },
//   {
//     id: 2,
//     name: "CSCI203 - Monthly Report",
//     date: "1 Oct 2025",
//     type: "Monthly",
//     status: "Absent",
//     downloadUrl: "#",
//   },
//   {
//     id: 3,
//     name: "CSCI334 - Daily Report",
//     date: "27 Oct 2025",
//     type: "Daily",
//     status: "Present",
//     downloadUrl: "#",
//   },
//   {
//     id: 4,
//     name: "CSCI203 - Daily Report",
//     date: "26 Oct 2025",
//     type: "Daily",
//     status: "All",
//     downloadUrl: "#",
//   },
// ];

const days = Array.from({ length: 31 }, (_, i) =>
  (i + 1).toString(),
);

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const years = Array.from({ length: 6 }, (_, i) =>
  (2024 + i).toString(),
);

interface Module {
  moduleID: string;
  moduleName: string;
  moduleCode: string;
}

interface Report {
  id: number;
  title: string;
  date: string;
  tags: string[];
  fileName: string;
}

const buildDateString = (
  year: string,
  month: string,
  day: string,
) => {
  if (!year || !month || !day) return "";
  const paddedDay = day.padStart(2, "0");
  return `${year}-${month}-${paddedDay}`;
};

// NEW: format for display as dd/mm/yyyy
const formatDisplayDate = (dateString: string) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

export function AttendanceReports({
  onLogout,
  onBack,
  onNavigateToProfile,
}: AttendanceReportsProps) {
  const [reportType, setReportType] = useState<
    "Daily" | "Monthly"
  >("Daily");

  // Use date strings for calendar inputs
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [module, setModule] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");

  const { token } = useAuth()

  const fetchReportHistory = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/lecturer/reports/history",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch report history");
      }
      const data = await res.json();
      setRecentReports(data);
    } catch (error) {
      console.error("Error fetching report history:", error);
    }
  }

  useEffect(() => {
    const fetchModulesTaught = async () => {
      try {
        const res = await fetch(
          "http://localhost:8000/lecturer/modules/",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch modules");
        }

        const data = await res.json();
        setModules(data);
      } catch (error) {
        console.error("Error fetching modules:", error);
      }
    }
    fetchModulesTaught()

    fetchReportHistory()
  }, [token])

  const handleGenerateReport = async () => {
    try {
      console.log("Generating report with criteria:", {
        report_type: reportType,
        date_from: fromDate,
        date_to: toDate,
        module_code: module,
        attendance_status: attendanceStatus
      });

      const res = await fetch("http://localhost:8000/lecturer/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          report_type: reportType,
          date_from: fromDate,
          date_to: toDate,
          module_code: module,
          attendance_status: attendanceStatus
        })
      })


      if (!res.ok) {
        const errorData = await res.json();
        const errorMessage = errorData.detail || "Failed to generate report";
        alert(`Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      // Download 
      const data = await res.json()
      const reportID = data.report_id;

      const downloadRes = await fetch(`http://localhost:8000/lecturer/reports/download/${reportID}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      const blob = await downloadRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_report_${reportID}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      console.log("Report generated and download initiated.");

      // Refresh the report history to show the new report
      await fetchReportHistory();
    }
    catch (error) {
      console.error("Error generating report:", error);
    }
  }

  // Add this inside your component, before the return statement
  const handleDownloadFromList = async (reportID: number, fileName: string) => {
    if (!token) return;

    try {
      // 1. Fetch the file blob from the API
      const res = await fetch(`http://localhost:8000/lecturer/reports/download/${reportID}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Download failed");

      // 2. Convert to Blob
      const blob = await res.blob();

      // 3. Create a temporary invisible link to trigger the browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName; // Uses the filename saved in the database
      document.body.appendChild(a);
      a.click();

      // 4. Cleanup
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  const dailyActive = reportType === "Daily";
  const monthlyActive = reportType === "Monthly";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Lecturer Portal" onNavigateToProfile={onNavigateToProfile} />

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
                        ${reportType === "Daily"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-white text-blue-600 hover:bg-blue-50"
                        }
                      `}
                      onClick={() => setReportType("Daily")}
                    >
                      Daily
                    </Button>

                    {/* Monthly */}
                    <Button
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-sm font-medium transition-colors 
                        border !border-blue-600
                        ${reportType === "Monthly"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-white text-blue-600 hover:bg-blue-50"
                        }
                      `}
                      onClick={() => setReportType("Monthly")}
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
                        {modules.map((mod) => (
                          <SelectItem
                            key={mod.moduleID}
                            value={mod.moduleCode}
                          >
                            {mod.moduleCode} - {mod.moduleName}
                          </SelectItem>
                        ))}
                        {/* <SelectItem value="csci334">
                          CSCI334 - Database Systems
                        </SelectItem>
                        <SelectItem value="csci203">
                          CSCI203 - Algorithms
                        </SelectItem>
                        <SelectItem value="all">
                          All Modules
                        </SelectItem> */}
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
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Present">
                          Present
                        </SelectItem>
                        <SelectItem value="Absent">
                          Absent
                        </SelectItem>
                        <SelectItem value="Late">
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
          <div className="flex flex-col gap-6">
            <Card className="flex-1">
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
              {recentReports.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No reports found.</p>
              ) : (
                recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{report.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-600">{report.date}</p>
                          <Badge variant="outline" className="text-xs">
                            {/* Join tags (e.g., "Daily • Present") */}
                            {report.tags && report.tags.join(" • ")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* --- THIS IS THE UPDATE --- */}
                    <Button
                      variant="ghost"
                      size="sm"
                      // Call the function with the specific Report ID and Filename
                      onClick={() => handleDownloadFromList(report.id, report.fileName)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {/* -------------------------- */}

                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}