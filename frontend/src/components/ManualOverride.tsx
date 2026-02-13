import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import {
  BookOpen,
  LogOut,
  ArrowLeft,
  Bell,
  Settings,
} from "lucide-react";
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

interface ManualOverrideProps {
  onLogout: () => void;
  onBack: () => void;
  studentData: {
    userId: string;
    studentName: string;
    date: string;
    status: string;
    lessonId: number;
  };
  showToast: (message: string) => void;
  updateAttendanceRecord: (userId: string, date: string, newStatus: string, reason?: string, adminNotes?: string, lessonId?: number) => Promise<void>;
}

export function ManualOverride({
  onLogout,
  onBack,
  studentData,
  showToast,
  updateAttendanceRecord,
}: ManualOverrideProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");

  const handleSave = async () => {
    try {
      console.log("Attempting to update attendance record:", {
        userId: studentData.userId,
        date: studentData.date,
        selectedStatus,
        selectedReason,
        adminNotes,
        lessonId: studentData.lessonId
      });

      const result = await updateAttendanceRecord(
        studentData.userId,
        studentData.date,
        selectedStatus,
        selectedReason,
        adminNotes || undefined,
        studentData.lessonId
      );

      console.log("Update result:", result);
      // Show success toast
      showToast("Manual Attendance Override successful!");
      // Navigate back to records page
      onBack();
    } catch (error) {
      console.error("Failed to update attendance:", error);
      showToast("Failed to update attendance record. Please try again.");
    }
  };

  const handleCancel = () => {
    onBack();
  };

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
              <p className="text-sm text-gray-600">Admin Portal</p>
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
                <p className="text-sm text-gray-600">System Administrator</p>
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
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Attendance Records
        </Button>

        {/* Manual Override Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Manual Attendance Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Student Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Student ID:</p>
                <p className="font-medium">{studentData.userId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Student Name:</p>
                <p className="font-medium">{studentData.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Date:</p>
                <p className="font-medium">{studentData.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Current Status:</p>
                <p className="font-medium">{studentData.status}</p>
              </div>
            </div>

            {/* Change Status */}
            <div className="border-t pt-6">
              <p className="text-sm text-gray-600 mb-3">Change Status:</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={selectedStatus === "Present" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("Present")}
                  className={`flex-1 min-w-[100px] ${selectedStatus === "Present"
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    : ""
                    }`}
                >
                  Present
                </Button>
                <Button
                  variant={selectedStatus === "Late" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("Late")}
                  className={`flex-1 min-w-[100px] ${selectedStatus === "Late"
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    : ""
                    }`}
                >
                  Late
                </Button>
                <Button
                  variant={selectedStatus === "Absent" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("Absent")}
                  className={`flex-1 min-w-[100px] ${selectedStatus === "Absent"
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    : ""
                    }`}
                >
                  Absent
                </Button>
              </div>
            </div>

            {/* Reason for Change */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Reason for Change:</p>
              <div className="flex flex-col gap-3">
                <Button
                  variant={
                    selectedReason === "Facial Recognition Failure"
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setSelectedReason("Facial Recognition Failure")
                  }
                  className={`w-full justify-start ${selectedReason === "Facial Recognition Failure"
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    : ""
                    }`}
                >
                  Facial Recognition Failure
                </Button>
                <Button
                  variant={
                    selectedReason === "Medical Note" ? "default" : "outline"
                  }
                  onClick={() => setSelectedReason("Medical Note")}
                  className={`w-full justify-start ${selectedReason === "Medical Note"
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    : ""
                    }`}
                >
                  Medical Note
                </Button>
                <Button
                  variant={selectedReason === "Other" ? "default" : "outline"}
                  onClick={() => setSelectedReason("Other")}
                  className={`w-full justify-start ${selectedReason === "Other"
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                    : ""
                    }`}
                >
                  Other
                </Button>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Admin Notes (Optional):
              </p>
              <Textarea
                placeholder="Enter any additional notes here..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={5}
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-4 pt-6 border-t mt-6">
              <Button className="flex-1" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedStatus || !selectedReason}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}