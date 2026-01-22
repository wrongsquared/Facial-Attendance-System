import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ArrowLeft,
  Fingerprint,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import { Navbar } from "./Navbar";

interface AdminUpdateUserProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToBiometricProfile: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
  };
  userProfileData?: {
    userId: string;
    name: string;
    role: string;
    status: string;
    email: string;
    dateOfBirth: string;
    contactNumber: string;
    address: string;
    enrollmentDate: string;
    associatedModules: string;
    biometricStatus: string;
    biometricLastUpdated: string;
  };
  onUpdateProfile: (userId: string, profileData: {
    name: string;
    role: string;
    status: string;
    email: string;
    dateOfBirth: string;
    contactNumber: string;
    address: string;
    enrollmentDate: string;
    associatedModules: string;
    biometricStatus: string;
    biometricLastUpdated: string;
  }) => void;
  showToast: (message: string) => void;
}

export function AdminUpdateUserProfile({
  onBack,
  onNavigateToBiometricProfile,
  userData,
  userProfileData,
  onUpdateProfile,
  showToast,
  onNavigateToProfile
}: AdminUpdateUserProfileProps) {
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Personal Information - use userProfileData if available, otherwise defaults
  const [name, setName] = useState(userProfileData?.name || userData.name);
  const [email, setEmail] = useState(userProfileData?.email || "john.smith@uow.edu.au");
  const [dateOfBirth, setDateOfBirth] = useState(userProfileData?.dateOfBirth || "1998-05-15");
  const [contactNumber, setContactNumber] = useState(userProfileData?.contactNumber || "+61 412 345 678");
  const [address, setAddress] = useState(userProfileData?.address || "123 Main Street, Wollongong NSW 2500");

  // Account & System Information
  const [role, setRole] = useState(userProfileData?.role || userData.role);
  const [status, setStatus] = useState(userProfileData?.status || "Active");
  const enrollmentDate = userProfileData?.enrollmentDate || "15 Feb 2023";
  const associatedModules = userProfileData?.associatedModules || "CSCI334, CSCI251, CSCI203";

  // Biometric Profile
  const biometricStatus = userProfileData?.biometricStatus || "Enrolled";
  const biometricLastUpdated = userProfileData?.biometricLastUpdated || "28 Oct 2025";

  const handleSave = () => {
    onUpdateProfile(userData.userId, {
      name,
      role,
      status,
      email,
      dateOfBirth,
      contactNumber,
      address,
      enrollmentDate,
      associatedModules,
      biometricStatus,
      biometricLastUpdated,
    });
    showToast("User Profile Updated!");
    setIsEditMode(false);
  };

  const handleCancel = () => {
    // Reset form to original values
    setName(userProfileData?.name || userData.name);
    setEmail(userProfileData?.email || "john.smith@uow.edu.au");
    setDateOfBirth(userProfileData?.dateOfBirth || "1998-05-15");
    setContactNumber(userProfileData?.contactNumber || "+61 412 345 678");
    setAddress(userProfileData?.address || "123 Main Street, Wollongong NSW 2500");
    setRole(userProfileData?.role || userData.role);
    setStatus(userProfileData?.status || "Active");
    setIsEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage User Profile
        </Button>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">{isEditMode ? 'Update User Profile' : 'View User Profile'}</h2>
          <div className="mt-4 space-y-1">
            <p className="text-gray-600">User ID: {userData.userId}</p>
            <p className="text-gray-600">User Name: {userData.name}</p>
          </div>
        </div>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Name:</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                disabled={!isEditMode}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Email:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                disabled={!isEditMode}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Date of Birth:
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={!isEditMode}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Contact Number:
              </label>
              <Input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Enter contact number"
                disabled={!isEditMode}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Address:
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
                disabled={!isEditMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account & System Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account & System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                User ID:
              </label>
              <p className="font-medium">{userData.userId}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Role:</label>
              <Select value={role} onValueChange={setRole} disabled={!isEditMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Lecturer">Lecturer</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Status:
              </label>
              <Select value={status} onValueChange={setStatus} disabled={!isEditMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Enrollment Date:
              </label>
              <p className="font-medium">{enrollmentDate}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Associated Modules:
              </label>
              <p className="font-medium">{associatedModules}</p>
            </div>
          </CardContent>
        </Card>

        {/* Biometric Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Biometric Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Status:
              </label>
              <p className="font-medium">{biometricStatus}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Last updated:
              </label>
              <p className="font-medium">{biometricLastUpdated}</p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={onNavigateToBiometricProfile}
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Manage Biometric Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditMode(true)} className="bg-blue-600 text-white hover:bg-blue-700">
              Update Profile
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}