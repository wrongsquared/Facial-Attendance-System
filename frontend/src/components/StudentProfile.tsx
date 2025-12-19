import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  BookOpen,
  LogOut,
  Bell,
  ArrowLeft,
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

interface StudentProfileProps {
  onLogout: () => void;
  onBack: () => void;
}

export function StudentProfile({
  onLogout,
  onBack,
}: StudentProfileProps) {
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Personal Information
  const [name, setName] = useState("John Smith");
  const [studentId, setStudentId] = useState("7891011");
  const [email, setEmail] = useState("js123@uowmail.edu.au");
  const [contactNumber, setContactNumber] = useState(
    "+61 412 345 678",
  );
  const [address, setAddress] = useState(
    "123 Main Street, Wollongong NSW 2500",
  );

  // Emergency Contact
  const [emergencyName, setEmergencyName] =
    useState("Sarah Smith");
  const [relationship, setRelationship] = useState("Mother");
  const [emergencyContact, setEmergencyContact] = useState(
    "+61 423 456 789",
  );

  const handleSave = () => {
    // Mock save logic
    console.log("Saving profile:", {
      name,
      studentId,
      email,
      contactNumber,
      address,
      emergencyName,
      relationship,
      emergencyContact,
    });
    alert("Profile updated successfully!");
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleUpdateProfile = () => {
    setIsEditMode(true);
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
              <p className="text-sm text-gray-600">
                Student Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>John Smith</p>
                <p className="text-sm text-gray-600">
                  Student ID: 7891011
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
          <h2 className="text-3xl mb-2">View Profile</h2>
          <p className="text-gray-600">
            {isEditMode
              ? "Update your personal information and emergency contacts"
              : "View your personal information and emergency contacts"}
          </p>
        </div>

        {/* Profile Form */}
        <div className="max-w-3xl">
          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name:</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID:</Label>
                <Input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-12"
                  disabled={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email:</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number:
                </Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={contactNumber}
                  onChange={(e) =>
                    setContactNumber(e.target.value)
                  }
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address:</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>
                Provide emergency contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">
                  Contact Name:
                </Label>
                <Input
                  id="emergencyName"
                  type="text"
                  value={emergencyName}
                  onChange={(e) =>
                    setEmergencyName(e.target.value)
                  }
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">
                  Relationship:
                </Label>
                <Input
                  id="relationship"
                  type="text"
                  value={relationship}
                  onChange={(e) =>
                    setRelationship(e.target.value)
                  }
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">
                  Contact Number:
                </Label>
                <Input
                  id="emergencyContact"
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) =>
                    setEmergencyContact(e.target.value)
                  }
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {isEditMode ? (
            <div className="flex items-center justify-center gap-6 mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancel}
                className="w-40"
              >
                Cancel
              </Button>

              <Button
                size="lg"
                onClick={handleSave}
                className="w-40 bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center mt-6">
              <Button
                size="lg"
                onClick={handleUpdateProfile}
                className="w-48 bg-blue-600 text-white hover:bg-blue-700"
              >
                Update Profile
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}