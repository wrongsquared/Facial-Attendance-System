import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  BookOpen,
  LogOut,
  Bell,
  Settings,
  ArrowLeft,
  Users,
  Mail,
  Phone,
  ShieldCheck,
  MapPin
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
import { Badge } from "./ui/badge";

import { useEffect, useState } from "react";
import { useAuth } from "../cont/AuthContext";

interface ViewInstitutionProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onEditProfile: () => void;
  institutionData: {
    institutionId: string;
    institutionName: string;
  };
}

// 1. Represents an Administrative User (linked via UserProfile -> Campus)
export interface AdminUser {
  userID: string;       // UUID from your backend
  name: string;
  email: string;
  phone: string | null; // mapped from 'contactNumber' in your DB
  type: string;         // 'admin'
  status: string;       // Usually hardcoded as "Active" or mapped from isActive
}

// 2. Represents the University details
export interface UniversityDetails {
  campusID: number;
  campusName: string;
  campusAddress: string;
  subscriptionDate: string; // Date string from ISO format
  isActive: boolean;
}

// 3. The final response structure from your FastAPI /institution/{id} call
export interface InstitutionFullProfile {
  details: UniversityDetails;
  admins: AdminUser[];
}

// 4. (Optional) If you ever fetch just the list of campuses for a university
export interface Campus {
  campusID: number;
  campusName: string;
  campusAddress: string;
  universityID: number;
}

export function ViewInstitutionProfile({
  onLogout,
  onBack,
  onEditProfile,
  institutionData,
}: ViewInstitutionProfileProps) {
  

  // 1. Define a state at the top of your component to hold the data
  const [profileData, setProfileData] = useState<InstitutionFullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { token } = useAuth()

  useEffect(() => {
    const fetchInstitutionProfile = async () => {
      // Ensure we have a token and an ID before fetching
      if (!token || !institutionData.institutionId) return;

      try {
        setLoading(true);

        // We call the specific institution endpoint using the ID from props
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

        if (!response.ok) {
          throw new Error("Failed to fetch institution profile");
        }

        const data = await response.json();

        // This 'data' now contains:
        // data.details -> University info (Name, Address, etc.)
        // data.admins  -> The list of Daniel, James, etc.
        setProfileData(data);

      } catch (err) {
        console.error("Error while fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutionProfile();
  }, [token, institutionData.institutionId]); // Re-run if token or selected ID changes

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
              <p className="text-sm text-gray-600">Platform Manager Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><Settings className="h-5 w-5" /></Button>
            <div className="flex items-center gap-3">
              <Avatar><AvatarFallback>PM</AvatarFallback></Avatar>
              <div className="hidden md:block">
                <p>Platform Manager</p>
                <p className="text-sm text-gray-600">System Manager</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm"><LogOut className="h-4 w-4 mr-2" />Logout</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={onLogout}>Logout</AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Manage Institutions
        </Button>

        <div className="space-y-6">
          {/* 1. HERO SECTION */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="h-1.5 bg-blue-600 w-full" />
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4 w-full">
                  <h2 className="text-3xl font-bold text-gray-900">{institutionData.institutionName}</h2>

                  {/* Fixed Spacing for ID, Address, and Badge */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-black-500">
                    <span className="text-sm font-bold text-black">ID: {institutionData.institutionId}</span>

                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-black-400" />
                      <span className="text-sm font-bold text-black-600">{profileData ? profileData.details.campusAddress : profileData}</span>
                    </div>



                  </div>
                </div>
                <Button onClick={onEditProfile} className="bg-blue-600 hover:bg-blue-700">Update Profile</Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. SECURITY NOTE */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-4">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800 font-medium">
              Only users listed as "Admin" have permission to manage this institution's portal data.
            </p>
          </div>

          {/* 3. UNIVERSITY ADMINS TABLE */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Users className="h-5 w-5 text-blue-600" /> University Administrators
                </CardTitle>
                <CardDescription>
                  System administrators for {institutionData.institutionName}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-black font-bold uppercase text-[10px] tracking-widest border-b">
                    <tr>
                      {/* Four distinct headers */}
                      <th className="py-4 px-8">ID</th>
                      <th className="py-4 px-8">Full Name</th>
                      <th className="py-4 px-8">Email Address</th>
                      <th className="py-4 px-8">Phone Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {profileData?.admins.map((user) => (
                      <tr key={user.userID} className="hover:bg-gray-50/50 transition-colors">
                        
                        {/* Column 1: ID */}
                        <td className="py-6 px-8">
                          <code className="flex items-center text-black-900 font-bold">
                            {user.userID}
                          </code>
                        </td>

                        {/* Column 2: Name */}
                        <td className="py-6 px-8">
                          <div className="font-bold text-gray-900">{user.name}</div>
                        </td>

                        {/* Column 3: Email */}
                        <td className="py-6 px-8">
                          <div className="flex items-center text-gray-700 font-medium">
                            <Mail className="h-4 w-4 mr-2 text-blue-500" /> 
                            {user.email}
                          </div>
                        </td>

                        {/* Column 4: Phone */}
                        <td className="py-6 px-8">
                          <div className="flex items-center text-gray-700 font-medium">
                            <Phone className="h-4 w-4 mr-2 text-gray-700" /> 
                            {user.phone || <span className="text-gray-300 italic text-xs">Not provided</span>}
                          </div>
                        </td>
                        
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}