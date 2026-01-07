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
import { useState, useEffect } from "react";

interface UpdateAdminProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onSave: (profileData: {
    name: string;
    email: string;
    contactNumber: string;
    address: string;
    emergencyContactName: string;
    emergencyRelationship: string;
    emergencyContactNumber: string;
  }) => void;
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

export function UpdateAdminProfile({
  onLogout,
  onBack,
  onSave,
  adminData,
}: UpdateAdminProfileProps) {
  // Initialize form with current data or defaults
  const [name, setName] = useState(adminData?.name || "John Smith");
  const [email, setEmail] = useState(adminData?.email || "john.smith@uow.edu.au");
  const [contactNumber, setContactNumber] = useState(adminData?.contactNumber || "+61 2 4221 3456");
  const [address, setAddress] = useState(adminData?.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia");
  const [emergencyContactName, setEmergencyContactName] = useState(adminData?.emergencyContactName || "Jane Smith");
  const [emergencyRelationship, setEmergencyRelationship] = useState(adminData?.emergencyRelationship || "Spouse");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState(adminData?.emergencyContactNumber || "+61 412 345 678");

  // Track if any changes have been made
  const [hasChanges, setHasChanges] = useState(false);

  // Original values for comparison
  const originalData = {
    name: adminData?.name || "John Smith",
    email: adminData?.email || "john.smith@uow.edu.au",
    contactNumber: adminData?.contactNumber || "+61 2 4221 3456",
    address: adminData?.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia",
    emergencyContactName: adminData?.emergencyContactName || "Jane Smith",
    emergencyRelationship: adminData?.emergencyRelationship || "Spouse",
    emergencyContactNumber: adminData?.emergencyContactNumber || "+61 412 345 678",
  };

  // Check for changes whenever form values update
  useEffect(() => {
    const changed = 
      name !== originalData.name ||
      email !== originalData.email ||
      contactNumber !== originalData.contactNumber ||
      address !== originalData.address ||
      emergencyContactName !== originalData.emergencyContactName ||
      emergencyRelationship !== originalData.emergencyRelationship ||
      emergencyContactNumber !== originalData.emergencyContactNumber;
    
    setHasChanges(changed);
  }, [name, email, contactNumber, address, emergencyContactName, emergencyRelationship, emergencyContactNumber]);

  const handleSave = () => {
    onSave({
      name,
      email,
      contactNumber,
      address,
      emergencyContactName,
      emergencyRelationship,
      emergencyContactNumber,
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
          Back to View Profile
        </Button>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl mb-2">Update Profile</h2>
          <p className="text-gray-600 mb-8">
            Edit your personal and emergency contact information
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
                  <Label htmlFor="name">Name:</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email:</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number:</Label>
                  <Input
                    id="contactNumber"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Enter your contact number"
                  />
                </div>

                {/* Address - Larger textarea */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address:</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your address"
                    className="min-h-[120px] resize-none"
                  />
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
                  <Label htmlFor="emergencyContactName">Contact Name:</Label>
                  <Input
                    id="emergencyContactName"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Enter emergency contact name"
                  />
                </div>

                {/* Relationship */}
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship:</Label>
                  <Input
                    id="emergencyRelationship"
                    value={emergencyRelationship}
                    onChange={(e) => setEmergencyRelationship(e.target.value)}
                    placeholder="Enter relationship"
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactNumber">Contact Number:</Label>
                  <Input
                    id="emergencyContactNumber"
                    value={emergencyContactNumber}
                    onChange={(e) => setEmergencyContactNumber(e.target.value)}
                    placeholder="Enter emergency contact number"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons - Cancel and Save Changes in the middle */}
            <div className="flex justify-center items-center gap-4 pt-4">
              <Button variant="outline" onClick={onBack} size="lg">
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                size="lg"
                disabled={!hasChanges}
              >
                Save Changes
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