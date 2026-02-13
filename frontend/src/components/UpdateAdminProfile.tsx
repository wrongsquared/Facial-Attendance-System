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
import {
  ArrowLeft,
} from "lucide-react";

import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AdminProfileData } from "../types/adminInnards";
import { useAuth } from "../cont/AuthContext";
import { getAdminProfile } from "../services/api";

interface UpdateAdminProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
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
  onNavigateToProfile
}: UpdateAdminProfileProps) {
  // Initialize form with current data or defaults
  const [name, setName] = useState(adminData?.name || "John Smith");
  const [email, setEmail] = useState(adminData?.email || "john.smith@uow.edu.au");
  const [contactNumber, setContactNumber] = useState(adminData?.contactNumber || "+61 2 4221 3456");
  const [address, setAddress] = useState(adminData?.address || "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia");
  const [emergencyContactName, setEmergencyContactName] = useState(adminData?.emergencyContactName || "Jane Smith");
  const [emergencyRelationship, setEmergencyRelationship] = useState(adminData?.emergencyRelationship || "Spouse");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState(adminData?.emergencyContactNumber || "+61 412 345 678");
  const [saving, setsaving] = useState(true);
  // Track if any changes have been made
  const [hasChanges, setHasChanges] = useState(false);
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
  const handleSave = async () => {
    if (!token || !user) return;
    setsaving(true);
  }
  useEffect(()=>{
    if (!token) return;
    const fetchData = async () => {
      
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
                    value={formData.name}
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
                    value={formData.email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number:</Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="Enter your contact number"
                  />
                </div>

                {/* Address - Larger textarea */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address:</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
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
                    value={formData.emergencyContactName} 
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Enter emergency contact name"
                  />
                </div>

                {/* Relationship */}
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship:</Label>
                  <Input
                    id="emergencyRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => setEmergencyRelationship(e.target.value)}
                    placeholder="Enter relationship"
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactNumber">Contact Number:</Label>
                  <Input
                    id="emergencyContactNumber"
                    value={formData.emergencyContactNumber}
                    onChange={(e) => setEmergencyContactNumber(e.target.value)}
                    placeholder="Enter emergency contact number"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center items-center gap-4 pt-4">
              <Button variant="outline" onClick={onBack} size="lg">
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                size="lg"
                disabled={!hasChanges}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}