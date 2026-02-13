import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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

interface CreateBiometricProfileProps {
  onLogout: () => void;
  onBack: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
  };
}

export function CreateBiometricProfile({
  onLogout,
  onBack,
  userData,
}: CreateBiometricProfileProps) {
  const [userId, setUserId] = useState(userData.userId);
  const [userName, setUserName] = useState(userData.name);
  const [role, setRole] = useState(userData.role);
  const [notes, setNotes] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = () => {
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

  const handleSave = () => {
    alert(
      `Biometric Profile Created:\nUser ID: ${userId}\nName: ${userName}\nRole: ${role}\nNotes: ${notes}`
    );
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
          Back to Manage Biometric Profile
        </Button>

        {/* Create Biometric Profile Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create Biometric Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User ID */}
            <div>
              <p className="text-sm text-gray-600 mb-2">User ID:</p>
              <p className="font-medium">{userId}</p>
            </div>

            {/* User Name */}
            <div>
              <p className="text-sm text-gray-600 mb-2">User Name:</p>
              <p className="font-medium">{userName}</p>
            </div>

            {/* Role */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Role:</p>
              <p className="font-medium">{role}</p>
            </div>

            {/* Current Status */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Current Status:</p>
              <p className="font-medium text-gray-500">None</p>
            </div>

            {/* Upload Image */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Upload Image:</p>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleImageUpload}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadedImage ? "Change Image" : "Upload Image"}
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
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!userId || !userName || !role}
                className="bg-blue-600 text-white hover:bg-blue-700"
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