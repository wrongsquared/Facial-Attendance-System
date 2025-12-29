import { useState, useEffect, SetStateAction } from "react";
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
  Settings,
  ArrowLeft,
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
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface UpdateInstitutionProfileProps {
  onLogout: () => void;
  onBack: () => void;
  institutionData: {
    institutionId: string;
    institutionName: string;
    institutionType?: string;
    address?: string;
    status?: "Active" | "Inactive";
    adminFullName?: string;
    adminEmail?: string;
    adminPhone?: string;
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

export function UpdateInstitutionProfile({
  onLogout,
  onBack,
  institutionData,
  onUpdateInstitution,
}: UpdateInstitutionProfileProps) {
  const [currentStatus, setCurrentStatus] = useState<"Active" | "Inactive">(
    institutionData.status || "Active"
  );
  const [institutionType, setInstitutionType] = useState(
    institutionData.institutionType || "university"
  );
  const [name, setName] = useState(institutionData.institutionName);
  const [address, setAddress] = useState(
    institutionData.address || "Northfields Avenue, Wollongong NSW 2522"
  );
  const [adminFullName, setAdminFullName] = useState(
    institutionData.adminFullName || "Dr. Sarah Williams"
  );
  const [adminEmail, setAdminEmail] = useState(
    institutionData.adminEmail || "sarah.williams@uow.edu.au"
  );
  const [adminPhone, setAdminPhone] = useState(
    institutionData.adminPhone || "+61 2 4221 3555"
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Store original values for cancel functionality
  const [originalValues] = useState({
    status: institutionData.status || ("Active" as "Active" | "Inactive"),
    institutionType: institutionData.institutionType || "university",
    name: institutionData.institutionName,
    address: institutionData.address || "Northfields Avenue, Wollongong NSW 2522",
    adminFullName: institutionData.adminFullName || "Dr. Sarah Williams",
    adminEmail: institutionData.adminEmail || "sarah.williams@uow.edu.au",
    adminPhone: institutionData.adminPhone || "+61 2 4221 3555",
  });

  // Auto-detect changes whenever any field value changes
  useEffect(() => {
    const hasChanges =
      currentStatus !== originalValues.status ||
      institutionType !== originalValues.institutionType ||
      name !== originalValues.name ||
      address !== originalValues.address ||
      adminFullName !== originalValues.adminFullName ||
      adminEmail !== originalValues.adminEmail ||
      adminPhone !== originalValues.adminPhone;
    setHasUnsavedChanges(hasChanges);
  }, [
    currentStatus,
    institutionType,
    name,
    address,
    adminFullName,
    adminEmail,
    adminPhone,
    originalValues,
  ]);

  const handleActivate = () => {
    setCurrentStatus("Active");
    toast.success("Institution status set to Active");
  };

  const handleSuspend = () => {
    setCurrentStatus("Inactive");
    toast.info("Institution status set to Inactive");
  };

  const handleCancel = () => {
    // Reset to original values
    setCurrentStatus(originalValues.status);
    setInstitutionType(originalValues.institutionType);
    setName(originalValues.name);
    setAddress(originalValues.address);
    setAdminFullName(originalValues.adminFullName);
    setAdminEmail(originalValues.adminEmail);
    setAdminPhone(originalValues.adminPhone);
    setHasUnsavedChanges(false);
    toast.info("Changes cancelled");
  };

  const handleSaveChanges = () => {
    console.log("Save Changes button clicked!");
    console.log("hasUnsavedChanges:", hasUnsavedChanges);

    // Validate inputs
    if (!name.trim()) {
      toast.error("Institution name is required");
      return;
    }
    if (!address.trim()) {
      toast.error("Address is required");
      return;
    }
    if (!adminFullName.trim()) {
      toast.error("Administrator full name is required");
      return;
    }
    if (!adminEmail.trim()) {
      toast.error("Administrator email is required");
      return;
    }
    if (!adminPhone.trim()) {
      toast.error("Administrator phone number is required");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setHasUnsavedChanges(false);

    console.log("Saving institution profile changes...", {
      institutionId: institutionData.institutionId,
      institutionType,
      name,
      address,
      adminFullName,
      adminEmail,
      adminPhone,
      status: currentStatus,
    });

    // Call parent update function
    onUpdateInstitution({
      institutionId: institutionData.institutionId,
      institutionName: name,
      institutionType,
      address,
      status: currentStatus,
      adminFullName,
      adminEmail,
      adminPhone,
    });

    toast.success("Institution profile updated successfully!");
    
    // Navigate back after successful save
    setTimeout(() => {
      onBack();
    }, 1500);
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
          Back to Institution Profile
        </Button>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-2">Update Institution Profile</h2>
          <p className="text-gray-600 mb-8">
            Edit institution and administrator information
          </p>

          <div className="space-y-6">
            {/* Current Status Section */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={currentStatus === "Active" ? "default" : "secondary"}
                    className="text-base px-4 py-2"
                  >
                    {currentStatus}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleActivate}
                      disabled={currentStatus === "Active"}
                    >
                      Activate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSuspend}
                      disabled={currentStatus === "Inactive"}
                    >
                      Suspend
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Institution and Administrator Details */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update institution and administrator details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column - Institution Details */}
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">Institution Details</h3>

                    {/* Institution ID (Read-only) */}
                    <div className="space-y-2">
                      <Label htmlFor="institutionId">Institution ID</Label>
                      <Input
                        id="institutionId"
                        value={institutionData.institutionId}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>

                    {/* Institution Type */}
                    <div className="space-y-2">
                      <Label htmlFor="institutionType">Institution Type</Label>
                      <Select
                        value={institutionType}
                        onValueChange={(value: SetStateAction<string>) => {
                          setInstitutionType(value);
                        }}
                      >
                        <SelectTrigger id="institutionType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="university">University</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                          <SelectItem value="institute">Institute</SelectItem>
                          <SelectItem value="academy">Academy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Institution Name */}
                    <div className="space-y-2">
                      <Label htmlFor="institutionName">Institution Name *</Label>
                      <Input
                        id="institutionName"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                        }}
                        placeholder="Enter institution name"
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                        }}
                        placeholder="Enter address"
                      />
                    </div>
                  </div>

                  {/* Right Column - Administrator Details */}
                  <div className="space-y-6">
                    <h3 className="font-semibold text-lg">Administrator Details</h3>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="adminFullName">Full Name *</Label>
                      <Input
                        id="adminFullName"
                        value={adminFullName}
                        onChange={(e) => {
                          setAdminFullName(e.target.value);
                        }}
                        placeholder="Enter full name"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => {
                          setAdminEmail(e.target.value);
                        }}
                        placeholder="Enter email"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label htmlFor="adminPhone">Phone Number *</Label>
                      <Input
                        id="adminPhone"
                        type="tel"
                        value={adminPhone}
                        onChange={(e) => {
                          setAdminPhone(e.target.value);
                        }}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Cancel and Save Changes Buttons */}
                <div className="flex justify-end items-center gap-4 mt-8">
                  <Button
                    onClick={handleCancel}
                    size="lg"
                    variant="outline"
                    disabled={!hasUnsavedChanges}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    size="lg"
                    disabled={!hasUnsavedChanges}
                  >
                    Save Changes
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