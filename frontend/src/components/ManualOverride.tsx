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
  };
  showToast: (message: string) => void;
  updateAttendanceRecord: (userId: string, date: string, newStatus: string) => void;
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

  const handleSave = () => {
    // Update the attendance record with the new status
    updateAttendanceRecord(studentData.userId, studentData.date, selectedStatus);
    // Show success toast
    showToast("Manual Attendance Override successful!");
    // Navigate back to records page
    onBack();
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
                  className="flex-1 min-w-[100px]"
                >
                  Present
                </Button>
                <Button
                  variant={selectedStatus === "Late" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("Late")}
                  className="flex-1 min-w-[100px]"
                >
                  Late
                </Button>
                <Button
                  variant={selectedStatus === "Absent" ? "default" : "outline"}
                  onClick={() => setSelectedStatus("Absent")}
                  className="flex-1 min-w-[100px]"
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
                  className="w-full justify-start"
                >
                  Facial Recognition Failure
                </Button>
                <Button
                  variant={
                    selectedReason === "Medical Note" ? "default" : "outline"
                  }
                  onClick={() => setSelectedReason("Medical Note")}
                  className="w-full justify-start"
                >
                  Medical Note
                </Button>
                <Button
                  variant={selectedReason === "Other" ? "default" : "outline"}
                  onClick={() => setSelectedReason("Other")}
                  className="w-full justify-start"
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
            <div className="flex justify-between pt-6 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!selectedStatus || !selectedReason}
              >
                Save Changes
              </Button>
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