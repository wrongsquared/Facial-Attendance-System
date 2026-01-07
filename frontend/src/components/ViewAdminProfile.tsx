import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
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

interface ViewAdminProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onUpdateProfile: () => void;
  adminData?: {
    name?: string;
    email?: string;
    contactNumber?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyRelationship?: string;
    emergencyContactNumber?: string;
  };
}

export function ViewAdminProfile({
  onLogout,
  onBack,
  onUpdateProfile,
  adminData,
}: ViewAdminProfileProps) {
  // Mock data for display (in a real app, this would come from props or API)
  const name = adminData?.name || "John Smith";
  const email = adminData?.email || "john.smith@uow.edu.au";
  const contactNumber = adminData?.contactNumber || "+61 2 4221 3456";
  const address = adminData?.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia";
  const emergencyContactName = adminData?.emergencyContactName || "Jane Smith";
  const emergencyRelationship = adminData?.emergencyRelationship || "Spouse";
  const emergencyContactNumber = adminData?.emergencyContactNumber || "+61 412 345 678";

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
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Admin User</p>
                <p className="text-sm text-gray-600">{name}</p>
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
          Back to Dashboard
        </Button>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-2">View Profile</h2>
          <p className="text-gray-600 mb-8">
            Review your personal and emergency contact information
          </p>

          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Name:</p>
                  <p className="text-base">{name}</p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Email:</p>
                  <p className="text-base">{email}</p>
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Contact Number:</p>
                  <p className="text-base">{contactNumber}</p>
                </div>

                {/* Address - Larger box */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Address:</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[120px]">
                    <p className="text-base whitespace-pre-line">{address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>
                  Emergency contact person details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Name */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Contact Name:</p>
                  <p className="text-base">{emergencyContactName}</p>
                </div>

                {/* Relationship */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Relationship:</p>
                  <p className="text-base">{emergencyRelationship}</p>
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Contact Number:</p>
                  <p className="text-base">{emergencyContactNumber}</p>
                </div>
              </CardContent>
            </Card>

            {/* Update Profile Button - Centered */}
            <div className="flex justify-center items-center pt-4">
              <Button onClick={onUpdateProfile} size="lg">
                Update Profile
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