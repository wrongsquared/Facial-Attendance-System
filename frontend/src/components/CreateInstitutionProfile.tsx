import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  BookOpen,
  LogOut,
  Bell,
  Settings,
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
import { useState } from "react";

interface CreateInstitutionProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onCreate: (institutionData: {
    institutionName: string;
    address: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    tempPassword: string;
  }) => void;
}

export function CreateInstitutionProfile({
  onLogout,
  onBack,
  onCreate,
}: CreateInstitutionProfileProps) {
  // Form state
  const [institutionName, setInstitutionName] = useState("");
  const [address, setAddress] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const handleCreate = () => {
    // Basic validation
    if (!institutionName || !address || !fullName || !email || !phoneNumber || !tempPassword) {
      alert("Please fill in all fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    onCreate({
      institutionName,
      address,
      fullName,
      email,
      phoneNumber,
      tempPassword,
    });
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
              <p className="text-sm text-gray-600">Platform Manager Portal</p>
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
                <AvatarFallback>PM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Platform Manager</p>
                <p className="text-sm text-gray-600">System Manager</p>
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
          Back to Manage Institutions
        </Button>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-2">Create Account</h2>
          <p className="text-gray-600 mb-8">
            Create a new institution profile and administrator account
          </p>

          <div className="space-y-6">
            {/* Institution Details */}
            <Card>
              <CardHeader>
                <CardTitle>Institution Details</CardTitle>
                <CardDescription>
                  Enter the institution information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Institution Name */}
                  <div className="space-y-2">
                    <Label htmlFor="institutionName">Institution Name</Label>
                    <Input
                      id="institutionName"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="Enter institution name"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter address"
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Administrator Details */}
            <Card>
              <CardHeader>
                <CardTitle>Administrator Details</CardTitle>
                <CardDescription>
                  Enter the administrator account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Temp Password */}
                  <div className="space-y-2">
                    <Label htmlFor="tempPassword">Temp Password</Label>
                    <Input
                      id="tempPassword"
                      type="password"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Enter temporary password"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Create Button - Centered */}
            <div className="flex justify-center items-center pt-4">
              <Button onClick={handleCreate} size="lg">
                Create
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          © 2025 University of Wollongong
        </div>
      </footer>
    </div>
  );
}