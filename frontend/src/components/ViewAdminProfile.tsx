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
import {
  ArrowLeft,
} from "lucide-react";
import { AdminProfileData } from "../types/adminInnards";
import { Navbar } from "./Navbar";
import { useState, useEffect } from "react";
import { useAuth } from "../cont/AuthContext";
import { getAdminProfile } from "../services/api";
import React from "react";

interface ViewAdminProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onUpdateProfile: () => void;
  onSave?: (profileData: {
    name: string;
    email: string;
    contactNumber: string;
    address: string;
    emergencyContactName: string;
    emergencyRelationship: string;
    emergencyContactNumber: string;
  }) => void;
  onNavigateToProfile?: () => void;
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
  onBack,
  onUpdateProfile,
  adminData,
  onNavigateToProfile,
  onSave
}: ViewAdminProfileProps) {
   // State for edit mode
  const [isEditing, setIsEditing] = React.useState(false);

  // Form state
  const [name, setName] = React.useState(adminData?.name || "John Smith");
  const [email, setEmail] = React.useState(adminData?.email || "john.smith@uow.edu.au");
  const [contactNumber, setContactNumber] = React.useState(adminData?.contactNumber || "+61 2 4221 3456");
  const [address, setAddress] = React.useState(adminData?.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia");
  const [emergencyContactName, setEmergencyContactName] = React.useState(adminData?.emergencyContactName || "Jane Smith");
  const [emergencyRelationship, setEmergencyRelationship] = React.useState(adminData?.emergencyRelationship || "Spouse");
  const [emergencyContactNumber, setEmergencyContactNumber] = React.useState(adminData?.emergencyContactNumber || "+61 412 345 678");

  // Update form when adminData changes
  React.useEffect(() => {
    if (adminData) {
      setName(adminData.name || "John Smith");
      setEmail(adminData.email || "john.smith@uow.edu.au");
      setContactNumber(adminData.contactNumber || "+61 2 4221 3456");
      setAddress(adminData.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia");
      setEmergencyContactName(adminData.emergencyContactName || "Jane Smith");
      setEmergencyRelationship(adminData.emergencyRelationship || "Spouse");
      setEmergencyContactNumber(adminData.emergencyContactNumber || "+61 412 345 678");
    }
  }, [adminData]);

  const handleUpdateClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        name,
        email,
        contactNumber,
        address,
        emergencyContactName,
        emergencyRelationship,
        emergencyContactNumber,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset form to current adminData
    setName(adminData?.name || "John Smith");
    setEmail(adminData?.email || "john.smith@uow.edu.au");
    setContactNumber(adminData?.contactNumber || "+61 2 4221 3456");
    setAddress(adminData?.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia");
    setEmergencyContactName(adminData?.emergencyContactName || "Jane Smith");
    setEmergencyRelationship(adminData?.emergencyRelationship || "Spouse");
    setEmergencyContactNumber(adminData?.emergencyContactNumber || "+61 412 345 678");
    setIsEditing(false);
  };
  const { token, user } = useAuth();
  const [formData, setFormData] = useState<AdminProfileData>({
    name: "",
    email: "",
    role: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: ""
  })
  useEffect(()=>{
      const fetchData = async () => {
        if (!token) return;
        try{
          const data = await getAdminProfile(token);
            setFormData({
            name: data.name || "",
            email: data.email || "",
            role: data.role || "",
            contactNumber: data.contactNumber || "",
            address: data.address || "",
            emergencyContactName: data.emergencyContactName || "",
            emergencyContactRelationship: data.emergencyContactRelationship || "",
            emergencyContactNumber: data.emergencyContactNumber || ""
          });
        }
        catch (err) {
          console.error("Failed to load profile", err);
        }
      };
      fetchData();
    }, [token]);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

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
                   {isEditing ? (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-base">{name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Email:</p>
                  {isEditing ? (
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-base">{email}</p>
                  )}
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Contact Number:</p>
                  {isEditing ? (
                    <Input
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-base">{contactNumber}</p>
                  )}
                </div>

                {/* Address - Larger box */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Address:</p>
                  {isEditing ? (
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full min-h-[120px]"
                    />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[120px]">
                      <p className="text-base whitespace-pre-line">{address}</p>
                    </div>
                  )}
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
                  {isEditing ? (
                    <Input
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-base">{emergencyContactName}</p>
                  )}
                </div>

                {/* Relationship */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Relationship:</p>
                  {isEditing ? (
                    <Input
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-base">{emergencyRelationship}</p>
                  )}
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Contact Number:</p>
                  {isEditing ? (
                    <Input
                      value={emergencyContactNumber}
                      onChange={(e) => setEmergencyContactNumber(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-base">{emergencyContactNumber}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Update Profile Button - Centered */}
            <div className="flex justify-center items-center pt-4">
              {isEditing ? (
                <>
                  <Button onClick={handleCancel} size="lg" variant="outline" className="mr-4">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={handleUpdateClick} size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
                  Update Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}