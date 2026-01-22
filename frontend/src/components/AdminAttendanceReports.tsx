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
  Settings,
  ArrowLeft,
  Download,
  FileText,
  Shield, // Icon for Admin
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
import { useAuth } from "../cont/AuthContext";
import { Navbar } from "./Navbar";

interface AdminAttendanceReportsProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
}

// Data structures matching Backend
interface Module {
  moduleID: number;
  moduleCode: string;
  moduleName: string;
}

interface Report {
  id: number;
  title: string;
  date: string;
  tags: string[];
  fileName: string;
}

const formatDisplayDate = (dateString: string) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

export function AdminAttendanceReports({
  onLogout,
  onBack,
  onNavigateToProfile,
}: AdminAttendanceReportsProps) {
  // 1. State Management
  const [reportType, setReportType] = useState<"Module Performance" | "Low Attendance Rate">
    ("Module Performance");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedModule, setSelectedModule] = useState("All");

  // Data from API
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [modulesList, setModulesList] = useState<Module[]>([]);

  const { token } = useAuth();

  // 2. Fetch Data
  // Replace your existing fetchData with this:
  const fetchData = async () => {
    console.log("--- FETCHING DATA START ---");
    console.log("Current Token:", token);

    if (!token) {
      console.warn("No token found! Aborting fetch.");
      return;
    }

    // 1. Fetch History
    try {
      const res = await fetch("http://localhost:8000/admin/reports/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      console.log("History Status:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("History Data Received:", data);
        setRecentReports(data);
      } else {
        const errText = await res.text();
        console.error("History Error Response:", errText);
      }
    } catch (e) {
      console.error("History Network Error:", e);
    }

    // 2. Fetch Modules
    try {
      const res = await fetch("http://localhost:8000/admin/modules", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      console.log("Modules Status:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("Modules Data Received:", data);
        setModulesList(data);
      }
    } catch (e) {
      console.error("Modules Network Error:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // 3. Download Logic
  const handleDownloadFile = async (reportID: number, fileName: string) => {
    try {
      const res = await fetch(`http://localhost:8000/admin/reports/download/${reportID}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to download file.");
    }
  };

  // 4. Generate Logic
  const handleGenerateReport = async () => {
    try {
      const payload = {
        report_type: reportType,
        date_from: fromDate,
        date_to: toDate,
        course_id: selectedModule
      };

      const res = await fetch("http://localhost:8000/admin/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      await handleDownloadFile(data.report_id, data.filename);
      fetchData(); // Refresh list

    } catch (error) {
      console.error(error);
      alert("Failed to generate report.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard
        </Button>

        <div className="mb-8">
          <h2 className="text-3xl mb-2">System Reports</h2>
          <p className="text-gray-600">Generate system-wide reports</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Report Generation Form (2 Columns) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate Report</CardTitle>
                <CardDescription>Configure and Generate attendance reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* 1. Report Type Buttons (Large Toggle Style) */}
                <div className="space-y-3">
                  <Label>Report Type</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-sm font-medium transition-colors border border-blue-600! 
                        ${reportType === "Module Performance"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-white text-blue-600 hover:bg-blue-50"
                        }
                      `}
                      onClick={() => setReportType("Module Performance")}
                    >
                      Module Performance
                    </Button>

                    <Button
                      type="button"
                      className={`flex-1 h-12 rounded-xl text-sm font-medium transition-colors border border-blue-600! 
                        ${reportType === "Low Attendance Rate"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-white text-blue-600 hover:bg-blue-50"
                        }
                      `}
                      onClick={() => setReportType("Low Attendance Rate")}
                    >
                      Low Attendance Rate
                    </Button>
                  </div>
                </div>

                {/* 2. Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromDate">From:</Label>
                    <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-12 bg-gray-100" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toDate">To:</Label>
                    <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-12 bg-gray-100" />
                  </div>
                </div>

                {/* 3. Scope / Module */}
                <div className="space-y-2">
                  <Label htmlFor="moduleScope">Scope</Label>
                  <Select value={selectedModule} onValueChange={setSelectedModule}>
                    <SelectTrigger id="moduleScope" className="h-12 bg-gray-100">
                      <SelectValue placeholder="Select Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Modules</SelectItem>
                      {modulesList.map((mod) => (
                        <SelectItem key={mod.moduleID} value={mod.moduleCode}>
                          {mod.moduleCode} - {mod.moduleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Generate Button */}
                <Button
                  className="w-full h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:text-gray-100"
                  onClick={handleGenerateReport}
                  disabled={!fromDate || !toDate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate and Download
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Report Details / Preview (1 Column) */}
          <div className="h-full">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Report Type</p>
                  <p className="font-medium text-blue-700">{reportType}</p>
                </div>
                {fromDate && toDate && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Date Range</p>
                    <p className="text-sm">
                      {formatDisplayDate(fromDate)} to {formatDisplayDate(toDate)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Module</p>
                  <p className="text-sm">
                    {selectedModule === "All" ? "All Modules" : selectedModule}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Generated Reports (Bottom Full Width) */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Generated Reports</CardTitle>
            <CardDescription>History of generated system files</CardDescription>
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
                            {report.tags && report.tags.join(" • ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadFile(report.id, report.fileName)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
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