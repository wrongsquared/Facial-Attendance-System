import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  BookOpen,
  LogOut,
  Bell,
  Settings,
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  MapPin
} from "lucide-react";


// UI Components
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

import { useEffect, useState } from "react";
import { useAuth } from "../cont/AuthContext";
import { Navbar } from "./Navbar";

interface UpdateInstitutionProfileProps {
  onLogout: () => void;
  onBack: () => void; // This will take user back to the list
  onUpdateSuccess?: () => void; // Callback to refresh parent component data
  institutionData: {
    institutionId: string;
    institutionName: string;
  };
}

export function UpdateInstitutionProfile({
  onLogout,
  onBack,
  onUpdateSuccess,
  institutionData,
}: UpdateInstitutionProfileProps) {
  const { token } = useAuth();

  // Loading states
  const [loading, setLoading] = useState(true);      // Initial fetch
  const [isSaving, setIsSaving] = useState(false);   // During PUT request

  // Form State
  const [editForm, setEditForm] = useState({
    campusName: "",
    campusAddress: "",
  });

  // Validation error state
  const [errors, setErrors] = useState({
    campusName: "",
    campusAddress: "",
  });

  // Validation functions
  const validateCampusName = (value: string) => {
    if (!value.trim()) {
      return "Campus name is required";
    }
    if (value.trim().length < 3) {
      return "Campus name must be at least 3 characters long";
    }
    if (value.trim().length > 100) {
      return "Campus name must be less than 100 characters";
    }
    if (!/^[a-zA-Z0-9\s\-.,&()]+$/.test(value.trim())) {
      return "Campus name contains invalid characters";
    }
    return "";
  };

  const validateCampusAddress = (value: string) => {
    if (!value.trim()) {
      return "Campus address is required";
    }
    if (value.trim().length < 10) {
      return "Please provide a complete address (at least 10 characters)";
    }
    if (value.trim().length > 500) {
      return "Address must be less than 500 characters";
    }
    return "";
  };

  const validateForm = () => {
    const newErrors = {
      campusName: validateCampusName(editForm.campusName),
      campusAddress: validateCampusAddress(editForm.campusAddress),
    };
    setErrors(newErrors);
    return !newErrors.campusName && !newErrors.campusAddress;
  };

  // 1. Fetch current data to populate the form
  useEffect(() => {
    if (!token || !institutionData.institutionId) return;
    const fetchCurrentDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:8000/platform-manager/institution/${institutionData.institutionId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch Campus details");

        const data = await response.json();

        // Populate the form with data from the database
        setEditForm({
          campusName: data.details.campusName,
          campusAddress: data.details.campusAddress,
        });
      } catch (err) {
        console.error("Error fetching details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentDetails();
  }, [token, institutionData.institutionId]);

  // 2. Handle Update Submission
  const handleUpdateSubmit = async () => {
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(
        `http://localhost:8000/platform-manager/institution/${institutionData.institutionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            campusName: editForm.campusName.trim(),
            campusAddress: editForm.campusAddress.trim(),
          }),
        }
      );

      if (!response.ok) throw new Error("Update failed");

      alert("Campus updated successfully!");

      // Trigger refresh in parent component if callback is provided
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }

      onBack(); // Return to the previous screen/list after successful update
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Platform Manager Portal" />

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6 hover:bg-gray-200">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to View Campus Profile
        </Button>

        <div className="space-y-6">
          <Card className="border-t-4 border-t-blue-600 shadow-lg bg-white">
            <CardHeader className="pb-4 flex flex-col items-center text-center">
              <CardTitle className="text-3xl flex items-center gap-2">
                Update Campus Profile
              </CardTitle>
              <CardDescription className="text-lg font-semibold text-gray-700 mt-2">
                ID: {institutionData.institutionId}
                <span className="font-bold text-black"> {institutionData.institutionName}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="campusName" className="text-sm font-semibold">
                  Campus Name *
                </Label>
                <div className="relative">
                  <Input
                    id="campusName"
                    value={editForm.campusName}
                    onChange={(e) => {
                      setEditForm({ ...editForm, campusName: e.target.value });
                      // Clear error when user starts typing
                      if (errors.campusName) {
                        setErrors({ ...errors, campusName: "" });
                      }
                    }}
                    onBlur={() => {
                      const error = validateCampusName(editForm.campusName);
                      setErrors({ ...errors, campusName: error });
                    }}
                    placeholder="e.g. University of Example"
                    className={`pl-3 py-6 text-lg focus-visible:ring-blue-600 ${errors.campusName ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                  />
                </div>
                {errors.campusName && (
                  <p className="text-sm text-red-600 mt-1">{errors.campusName}</p>
                )}
              </div>

              {/* Address Input */}
              <div className="space-y-2">
                <Label htmlFor="campusAddress" className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" /> Address *
                </Label>
                <Textarea
                  id="campusAddress"
                  rows={5}
                  value={editForm.campusAddress}
                  onChange={(e) => {
                    setEditForm({ ...editForm, campusAddress: e.target.value });
                    // Clear error when user starts typing
                    if (errors.campusAddress) {
                      setErrors({ ...errors, campusAddress: "" });
                    }
                  }}
                  onBlur={() => {
                    const error = validateCampusAddress(editForm.campusAddress);
                    setErrors({ ...errors, campusAddress: error });
                  }}
                  placeholder="Street, City, Zip Code"
                  className={`resize-none text-base focus-visible:ring-blue-600 ${errors.campusAddress ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                />
                {errors.campusAddress && (
                  <p className="text-sm text-red-600 mt-1">{errors.campusAddress}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex w-full gap-3 border-t bg-gray-50/50 p-6 rounded-b-lg">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isSaving}
                className="flex-1 px-8"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSubmit}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 font-semibold shadow-md transition-all active:scale-95"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}