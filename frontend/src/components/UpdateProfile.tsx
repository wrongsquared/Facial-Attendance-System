import { useState, useEffect } from "react";
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
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../cont/AuthContext";
import { LecturerProfileData } from "../types/lecturerinnards";
import { getLecturerFullProfile  } from "../services/api";
import { Navbar } from "./Navbar";

interface UpdateProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
}

export function UpdateProfile({
  onLogout,
  onBack,
  onNavigateToProfile
}: UpdateProfileProps) {
  // Edit mode state
  const { token } = useAuth();
  const [formData, setFormData] = useState<LecturerProfileData>({
    name: "",
    email: "",
    specialistIn: "",
    phone: "",
    fulladdress: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);

  // Personal Information
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState(
    ""
  );
  const [address, setAddress] = useState(
    ""
  );

  // Emergency Contact
  const [emergencyName, setEmergencyName] =
    useState("Michael Wong");
  const [relationship, setRelationship] = useState("");
  const [emergencyContact, setEmergencyContact] = useState(
    "",
  );

  const handleSave = () => {
    // Mock save logic
    console.log("Saving profile:", {
      name,
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
  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const data = await getLecturerFullProfile(token);
        // Populate Form
        // We use || "" to ensure inputs don't become uncontrolled if value is null
        setFormData({
          name: data.name || "",
          email: data.email || "",
          specialistIn: data.specialistIn || "",
          phone: data.contactNumber || "",
          fulladdress: data.address || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactRelationship: data.emergencyContactRelationship || "",
          emergencyContactNumber: data.emergencyContactNumber || ""
        });
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    fetchData();
  }, [token]);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Lecturer Dashboard" onNavigateToProfile={onNavigateToProfile}/>
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
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email:</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
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
                  value={formData.phone}
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
                  value={formData.fulladdress}
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
                  value={formData.emergencyContactName}
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
                  value={formData.emergencyContactRelationship}
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
                  value={formData.emergencyContactNumber}
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