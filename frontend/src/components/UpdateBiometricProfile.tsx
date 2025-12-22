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
  Upload,
} from "lucide-react";
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

interface UpdateBiometricProfileProps {
  onLogout: () => void;
  onBack: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
  };
  showToast: (message: string) => void;
}

export function UpdateBiometricProfile({
  onLogout,
  onBack,
  userData,
  showToast,
}: UpdateBiometricProfileProps) {
  const [updateMethod, setUpdateMethod] = useState("Facial Recognition");
  const [notes, setNotes] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Mock data
  const currentStatus = "Active";
  const profileId = "BP-2025-00123";
  const enrolledOn = "15 Nov 2025, 10:30 AM";
  const lastUpdated = "28 Nov 2025, 02:15 PM";
  const enrolledBy = "Admin User";

  const handleLoadImage = () => {
    // Mock image upload functionality
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUpdate = () => {
    showToast("Biometric Profile Updated!");
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
          Back to Manage Biometric Profile
        </Button>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Update Biometric Profile</h2>
        </div>

        {/* Update Biometric Profile Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Biometric Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User ID */}
            <div>
              <p className="text-sm text-gray-600 mb-2">User ID:</p>
              <p className="font-medium">{userData.userId}</p>
            </div>

            {/* User Name */}
            <div>
              <p className="text-sm text-gray-600 mb-2">User Name:</p>
              <p className="font-medium">{userData.name}</p>
            </div>

            {/* Role */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Role:</p>
              <p className="font-medium">{userData.role}</p>
            </div>

            {/* Current Status */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Current Status:</p>
              <p className="font-medium">{currentStatus}</p>
            </div>

            {/* Profile ID */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Profile ID:</p>
              <p className="font-medium">{profileId}</p>
            </div>

            {/* Enrolled On */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Enrolled On:</p>
              <p className="font-medium">{enrolledOn}</p>
            </div>

            {/* Last Updated */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Last Updated:</p>
              <p className="font-medium">{lastUpdated}</p>
            </div>

            {/* Enrolled By */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Enrolled By:</p>
              <p className="font-medium">{enrolledBy}</p>
            </div>

            {/* Update Method */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Update Method:</p>
              <Select value={updateMethod} onValueChange={setUpdateMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Update Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facial Recognition">Facial Recognition</SelectItem>
                  <SelectItem value="Fingerprint">Fingerprint</SelectItem>
                  <SelectItem value="Iris Scan">Iris Scan</SelectItem>
                  <SelectItem value="Voice Recognition">Voice Recognition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload Image */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Upload Image:</p>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLoadImage}
              >
                <Upload className="h-4 w-4 mr-2" />
                Load Image
              </Button>
              {uploadedImage && (
                <div className="mt-4 border rounded-lg p-4">
                  <img
                    src={uploadedImage}
                    alt="Uploaded biometric"
                    className="max-w-full h-auto max-h-64 mx-auto rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Notes:</p>
              <Textarea
                placeholder="Enter any additional notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Biometric Profile
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