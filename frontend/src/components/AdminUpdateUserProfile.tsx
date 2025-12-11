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
import {
  BookOpen,
  LogOut,
  ArrowLeft,
  Bell,
  Fingerprint,
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

interface AdminUpdateUserProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToBiometricProfile: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
  };
}

export function AdminUpdateUserProfile({
  onLogout,
  onBack,
  onNavigateToBiometricProfile,
  userData,
}: AdminUpdateUserProfileProps) {
  // Personal Information
  const [name, setName] = useState(userData.name);
  const [email, setEmail] = useState("john.smith@uow.edu.au");
  const [dateOfBirth, setDateOfBirth] = useState("1998-05-15");
  const [contactNumber, setContactNumber] = useState("+61 412 345 678");
  const [address, setAddress] = useState("123 Main Street, Wollongong NSW 2500");

  // Account & System Information
  const [role, setRole] = useState(userData.role);
  const [status, setStatus] = useState("Active");
  const [enrollmentDate] = useState("15 Feb 2023");
  const [associatedModules] = useState("CSCI334, CSCI251, CSCI203");

  // Biometric Profile
  const [biometricStatus] = useState("Enrolled");
  const [biometricLastUpdated] = useState("28 Oct 2025");

  const handleSave = () => {
    alert(
      `Profile Updated:\nName: ${name}\nEmail: ${email}\nRole: ${role}\nStatus: ${status}`
    );
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
          Back to Manage User Profile
        </Button>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Update User Profile</h2>
          <div className="mt-4 space-y-1">
            <p className="text-gray-600">User ID: {userData.userId}</p>
            <p className="text-gray-600">User Name: {userData.name}</p>
          </div>
        </div>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Name:</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Email:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Date of Birth:
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Contact Number:
              </label>
              <Input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Enter contact number"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Address:
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account & System Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account & System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                User ID:
              </label>
              <p className="font-medium">{userData.userId}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Role:</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Lecturer">Lecturer</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Status:
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Enrollment Date:
              </label>
              <p className="font-medium">{enrollmentDate}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Associated Modules:
              </label>
              <p className="font-medium">{associatedModules}</p>
            </div>
          </CardContent>
        </Card>

        {/* Biometric Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Biometric Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Status:
              </label>
              <p className="font-medium">{biometricStatus}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Last updated:
              </label>
              <p className="font-medium">{biometricLastUpdated}</p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={onNavigateToBiometricProfile}
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Manage Biometric Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
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