import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { getUserAccDetails, updateUser, updateUserProfile } from "../services/api";
import { useAuth } from "../cont/AuthContext";
import { Navbar } from "./Navbar";
import { UpdateProfilePayload } from "../types/adminInnards";

interface AdminUpdateUserProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToBiometricProfile: () => void;
  userData: {
    uuid: string;
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
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); 
  // --- Form State (Initialized empty to avoid 'uncontrolled' warnings) ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [creationDate, setCreationDate] = useState("");
  const [associatedModules, setAssociatedModules] = useState("");
  const [studnum,setstudnum] = useState("");
  const hardName = name;
  // Role specific fields
  const [studentNum, setStudentNum] = useState("");
  const [attendance, setAttendance] = useState("");
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A"; // Fallback if date is missing

    const date = new Date(dateString);

    // This produces the "15 Feb 2023" format
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };
  useEffect(() => {
    const loadData = async () => {
      if (!userData.uuid || !token) return;
      try {
        setLoading(true);
        const data = await getUserAccDetails(userData.uuid, token);
        
        // Map backend fields to frontend state
        setName(data.name || "");
        setEmail(data.email || "");
        setRole(data.role || "");
        setStatus(data.active ? "Active" : "Inactive");
        setstudnum(data.studentNum || "");
        // Fields from your DB 'users' table
        setContactNumber(data.phone || ""); 
        setAddress(data.fulladdress || "");
        
        // Fields from 'student' table (if applicable)
        if (data.role.toLowerCase() === "student") {
            setStudentNum(data.studentNum || "");
            setAttendance(data.attendanceMinimum?.toString() || "");
        }
        setCreationDate(formatDate(data.creationDate) ?? "");
        setAssociatedModules(data.associatedModules || "N/A");
      } catch (err: any) {
        showToast("Error loading profile: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userData.uuid, token, refreshKey]);

  const handleSave = async () => {
    try {
      setLoading(true);

      const payload: UpdateProfilePayload = {
        name: name,
        phone: contactNumber,
        fulladdress: address,
        roleName: role,
        status: status,
      };

      // Only include attendance if the user is a Student
      if (role.toLowerCase() === "student") {
        // Convert the string state to a number for the backend
        payload.attendanceMinimum = Number(attendance);
      }

      await updateUserProfile(userData.uuid, payload, token!);

      showToast("User Profile Updated Successfully!");
      setIsEditMode(false);
      setRefreshKey(prev => prev + 1); 

  } catch (err: any) {
    showToast("Update failed: " + err.message);
  } finally {
    setLoading(false);
  }
  };
  const handleCancel = () => {
    setIsEditMode(false);
    setRefreshKey(prev => prev + 1); // Force the useEffect to re-run
    showToast("Changes discarded.");
  };

  if (loading && !isEditMode) return <div className="p-10 text-center">Loading Profile...</div>;
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
            <p className="text-gray-600">User ID: {userData.uuid}</p>
            <p className="text-gray-600">User Name: {hardName}</p>
          </div>
        </div>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Full Name:</label>
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
                disabled // This can be edited in UserAccounts Edit
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
              <Textarea // Multiline Support
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
                User ID: / Student Num
              </label>
              <p className="font-medium">{userData.uuid} / {studnum}</p>
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
                Account Creation Date:
              </label>
              <p className="font-medium">{creationDate}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Associated Modules:
              </label>
              <p className="font-medium">{associatedModules}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Attendance (%):
              </label>
              <Input
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                placeholder="Attendance"
                disabled={!isEditMode}
              />
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
              <p className="font-medium">Not Created</p>
            </div>
            {/* not in use */}
            {/* <div>
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
            </div> */}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {isEditMode ? (
            <>
              <Button disabled={loading} variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button disabled={loading} onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">
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