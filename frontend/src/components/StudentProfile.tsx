import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button"; 
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  ArrowLeft
} from "lucide-react";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { StudentProfileData } from "../types/studentinnards";
import { getStudentFullProfile } from "../services/api";

interface StudentProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
  onOpenNotifications:() => void;
}

export function StudentProfile({
  onNavigateToProfile,
  onBack,
  onOpenNotifications
}: StudentProfileProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<StudentProfileData>({
    name: "",
    email: "",
    studentNum: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: ""
  });

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const data = await getStudentFullProfile(token);
        // Populate Form
        // We use || "" to ensure inputs don't become uncontrolled if value is null
        setFormData({
          name: data.name || "",
          email: data.email || "",
          studentNum: data.studentNum || "",
          contactNumber: data.contactNumber || "",
          address: data.address || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactRelationship: data.emergencyContactRelationship || "",
          emergencyContactNumber: data.emergencyContactNumber || ""
        });
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };


  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Personal Information
  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleUpdateProfile = () => {
    setIsEditMode(true);
  };
  if (loading) return <div className="p-10 text-center">Loading profile...</div>;
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Student Profile" onNavigateToProfile={onNavigateToProfile} onOpenNotifications={onOpenNotifications}/>

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
                  value={formData.name}
                  className="h-12"
                  disabled // Shouldn't be allowed to change
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID:</Label>
                <Input
                  id="studentId"
                  type="text"
                  value={formData.studentNum}
                  className="h-12"
                  disabled // Shouldn't be allowed to change
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email:</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  className="h-12"
                  disabled // Shouldn't be allowed to change
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number:
                </Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  className="h-12"
                  disabled = {!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address:</Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
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
                  value={formData.emergencyContactName}
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
                  value={formData.emergencyContactRelationship}
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
                  value={formData.emergencyContactNumber}
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
                onClick={handleChange}
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