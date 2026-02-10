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
import { getLecturerFullProfile, updateLecturerProfile } from "../services/api";
import { Navbar } from "./Navbar";
import { ProfileUpdateData } from "../types/auth";
import { Textarea } from "./ui/textarea";

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
  const { token, user } = useAuth();
  const [formData, setFormData] = useState<LecturerProfileData>({
    name: "",
    email: "",
    specialistIn: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
  });
  const [originalData, setOriginalData] = useState<LecturerProfileData>({
    name: "",
    email: "",
    specialistIn: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCancel = () => {
    setFormData(originalData); // Restore original data
    setIsEditMode(false);
  };
  // Handle Input Changes
  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };
  const handleUpdateProfile = () => {
    setIsEditMode(true);
  };

  const handleSave = async () => {
    if (!token || !user) return;

    // Validate required fields
    const requiredFields = [
      { field: 'name', label: 'Name' },
      { field: 'email', label: 'Email' },
      { field: 'contactNumber', label: 'Contact Number' },
      { field: 'address', label: 'Address' },
      { field: 'emergencyContactName', label: 'Emergency Contact Name' },
      { field: 'emergencyContactRelationship', label: 'Emergency Contact Relationship' },
      { field: 'emergencyContactNumber', label: 'Emergency Contact Number' }
    ];

    const missingFields = requiredFields.filter(({ field }) =>
      !formData[field as keyof LecturerProfileData]?.trim()
    );

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(({ label }) => label).join(', ');
      alert(`Missing data cannot be updated. Please fill in: ${missingLabels}`);
      return;
    }

    setSaving(true); // Disable button while saving

    // Prepare Data (Only send what is editable)
    const payload: ProfileUpdateData = {
      name: formData.name,
      email: formData.email,
      contactNumber: formData.contactNumber || "",
      address: formData.address || "",
      emergencyContactName: formData.emergencyContactName || "",
      emergencyContactRelationship: formData.emergencyContactRelationship || "",
      emergencyContactNumber: formData.emergencyContactNumber || ""
    };
    try {

      await updateLecturerProfile(token, payload);
      alert("Profile updated successfully!");
      setOriginalData(formData); // Update original data after successful save
      setIsEditMode(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const data = await getLecturerFullProfile(token);
        // Populate Form
        // We use || "" to ensure inputs don't become uncontrolled if value is null
        const profileData = {
          name: data.name || "",
          email: data.email || "",
          specialistIn: data.specialistIn || "",
          contactNumber: data.contactNumber || "",
          address: data.address || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactRelationship: data.emergencyContactRelationship || "",
          emergencyContactNumber: data.emergencyContactNumber || ""
        };
        setFormData(profileData);
        setOriginalData(profileData); // Store original data for cancel functionality
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };
    fetchData();
  }, [token]);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Lecturer Dashboard" onNavigateToProfile={onNavigateToProfile} />
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address:</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
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
                <Label htmlFor="emergencyContactName">
                  Contact Name:
                </Label>
                <Input
                  id="emergencyContactName"
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">
                  Relationship:
                </Label>
                <Input
                  id="emergencyContactRelationship"
                  type="text"
                  value={formData.emergencyContactRelationship}
                  onChange={handleChange}
                  className="h-12"
                  disabled={!isEditMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactNumber">
                  Contact Number:
                </Label>
                <Input
                  id="emergencyContactNumber"
                  type="tel"
                  value={formData.emergencyContactNumber}
                  onChange={handleChange}
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
                disabled={saving}
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
