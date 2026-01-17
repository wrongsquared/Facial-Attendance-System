import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  ArrowLeft,
} from "lucide-react";
import { AdminProfileData } from "../types/adminInnards";
import { Navbar } from "./Navbar";
import { useState, useEffect } from "react";
import { useAuth } from "../cont/AuthContext";
import { getAdminProfile } from "../services/api";

interface ViewAdminProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onUpdateProfile: () => void;
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
  onNavigateToProfile
}: ViewAdminProfileProps) {
  const name = adminData?.name || "John Smith";
  const email = adminData?.email || "john.smith@uow.edu.au";
  const contactNumber = adminData?.contactNumber || "+61 2 4221 3456";
  const address = adminData?.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia";
  const emergencyContactName = adminData?.emergencyContactName || "Jane Smith";
  const emergencyRelationship = adminData?.emergencyRelationship || "Spouse";
  const emergencyContactNumber = adminData?.emergencyContactNumber || "+61 412 345 678";
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
                  <p className="text-base">{formData.name}</p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Email:</p>
                  <p className="text-base">{formData.email}</p>
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Contact Number:</p>
                  <p className="text-base">{formData.contactNumber}</p>
                </div>

                {/* Address - Larger box */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Address:</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[120px]">
                    <p className="text-base whitespace-pre-line">{formData.address ? formData.address: "--"}</p>
                  </div>
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
                  <p className="text-base">{formData.emergencyContactName ? formData.emergencyContactName: "--"} </p>
                </div>

                {/* Relationship */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Relationship:</p>
                  <p className="text-base">{formData.emergencyContactRelationship ? formData.emergencyContactRelationship: "--"}</p>
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Contact Number:</p>
                  <p className="text-base">{formData.emergencyContactNumber? formData.emergencyContactNumber: "--"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Update Profile Button - Centered */}
            <div className="flex justify-center items-center pt-4">
              <Button onClick={onUpdateProfile} size="lg">
                Update Profile
              </Button>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}