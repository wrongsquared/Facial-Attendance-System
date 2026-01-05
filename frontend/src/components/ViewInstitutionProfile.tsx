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
import { Badge } from "./ui/badge";

interface ViewInstitutionProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onEditProfile: () => void;
  institutionData: {
    institutionId: string;
    institutionName: string;
  };
  onUpdateInstitution: (updatedData: {
    institutionId: string;
    institutionName: string;
    institutionType: string;
    address: string;
    status: "Active" | "Inactive";
    adminFullName: string;
    adminEmail: string;
    adminPhone: string;
  }) => void;
}

export function ViewInstitutionProfile({
  onLogout,
  onBack,
  onEditProfile,
  institutionData,
}: ViewInstitutionProfileProps) {
  // Mock data for display (in a real app, this would come from props or API)
  const currentStatus = "Active";
  const institutionType = "University";
  const name = institutionData.institutionName;
  const address = "Northfields Avenue, Wollongong NSW 2522";
  const adminFullName = "Dr. Sarah Williams";
  const adminEmail = "sarah.williams@uow.edu.au";
  const adminPhone = "+61 2 4221 3555";

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
          <h2 className="text-3xl mb-2">View Institution Profile</h2>
          <p className="text-gray-600 mb-8">
            Review institution and administrator information
          </p>

          <div className="space-y-6">
            {/* Current Status Section */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={currentStatus === "Active" ? "default" : "secondary"}
                  className="text-base px-4 py-2"
                >
                  {currentStatus}
                </Badge>
              </CardContent>
            </Card>

            {/* Institution and Administrator Details */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Institution and administrator details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column - Institution Details */}
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">Institution Details</h3>

                    {/* Institution ID */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Institution ID</p>
                      <p className="text-base">{institutionData.institutionId}</p>
                    </div>

                    {/* Institution Type */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Institution Type</p>
                      <p className="text-base">{institutionType}</p>
                    </div>

                    {/* Institution Name */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Institution Name</p>
                      <p className="text-base">{name}</p>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="text-base">{address}</p>
                    </div>
                  </div>

                  {/* Right Column - Administrator Details */}
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">Administrator Details</h3>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="text-base">{adminFullName}</p>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-base">{adminEmail}</p>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="text-base">{adminPhone}</p>
                    </div>
                  </div>
                </div>

                {/* Update Button - Centered */}
              <div className="mt-10 border-t pt-8">
                  <Button 
                    onClick={onEditProfile} 
                    size="lg"
                    className="w-full text-lg h-14 font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    Update Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
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
