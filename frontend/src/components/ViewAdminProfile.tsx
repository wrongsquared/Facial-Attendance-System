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
import { ArrowLeft } from "lucide-react";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { AdminProfileData } from "../types/adminInnards";
import { getAdminProfile, updateAdminProfile } from "../services/api";

interface ViewAdminProfileProps {
  onBack: () => void;
  onNavigateToProfile: () => void;
}

export function ViewAdminProfile({
  onBack,
  onNavigateToProfile,
}: ViewAdminProfileProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<AdminProfileData>({
    name: "",
    email: "",
    role: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
  });

  // Store original data to restore on cancel
  const [originalData, setOriginalData] = useState<AdminProfileData>({
    name: "",
    email: "",
    role: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
  });

  // Fetch Admin Profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const data = await getAdminProfile(token);
        const profileData = {
          name: data.name || "",
          email: data.email || "",
          role: data.role || "",
          contactNumber: data.contactNumber || "",
          address: data.address || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactRelationship:
            data.emergencyContactRelationship || "",
          emergencyContactNumber: data.emergencyContactNumber || "",
        };
        setFormData(profileData);
        setOriginalData(profileData); // Store original data
      } catch (err) {
        console.error("Failed to load admin profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCancel = () => {
    setFormData(originalData); // Restore original data
    setIsEditMode(false);
  };
  const handleUpdateProfile = () => setIsEditMode(true);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token) return;

    // Validate required fields
    const requiredFields = [
      { field: 'contactNumber', label: 'Contact Number' },
      { field: 'address', label: 'Address' },
      { field: 'emergencyContactName', label: 'Emergency Contact Name' },
      { field: 'emergencyContactRelationship', label: 'Emergency Contact Relationship' },
      { field: 'emergencyContactNumber', label: 'Emergency Contact Number' }
    ];

    const missingFields = requiredFields.filter(({ field }) =>
      !formData[field as keyof AdminProfileData]?.trim()
    );

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(({ label }) => label).join(', ');
      alert(`Missing data cannot be updated. Please fill in: ${missingLabels}`);
      return;
    }

    setSaving(true);

    const payload = {
      contactNumber: formData.contactNumber || "",
      address: formData.address || "",
      emergencyContactName: formData.emergencyContactName || "",
      emergencyContactRelationship:
        formData.emergencyContactRelationship || "",
      emergencyContactNumber: formData.emergencyContactNumber || "",
    };

    try {
      await updateAdminProfile(token, payload);
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



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        title="Admin Portal"
        onNavigateToProfile={onNavigateToProfile}
      />

      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h2 className="text-3xl mb-2">View Profile</h2>
          <p className="text-gray-600">
            {isEditMode
              ? "Update your personal information and emergency contacts"
              : "View your personal information and emergency contacts"}
          </p>
        </div>

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
              <Field label="Name" id="name" value={formData.name} disabled />
              <Field label="Role" id="role" value={formData.role} disabled />
              <Field label="Email" id="email" value={formData.email} disabled />

              <Field
                label="Contact Number"
                id="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                disabled={!isEditMode}
              />

              <Field
                label="Address"
                id="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditMode}
              />
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
              <Field
                label="Contact Name"
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                disabled={!isEditMode}
              />

              <Field
                label="Relationship"
                id="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleChange}
                disabled={!isEditMode}
              />

              <Field
                label="Contact Number"
                id="emergencyContactNumber"
                value={formData.emergencyContactNumber}
                onChange={handleChange}
                disabled={!isEditMode}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {isEditMode ? (
            <div className="flex justify-center gap-6 mt-6">
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
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center mt-6">
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

/* ---------- Reusable Field ---------- */
function Field({
  label,
  id,
  value,
  onChange,
  disabled,
}: {
  label: string;
  id: string;
  value: string | undefined;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}:</Label>
      <Input
        id={id}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className="h-12"
      />
    </div>
  );
}
