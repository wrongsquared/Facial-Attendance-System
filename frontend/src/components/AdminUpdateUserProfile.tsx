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
import { getUserAccDetails, updateUserProfile } from "../services/api";
import { useAuth } from "../cont/AuthContext";
import { Navbar } from "./Navbar";
import { UpdateProfilePayload } from "../types/adminInnards";

// Name validation function
const validateName = (name: string): { isValid: boolean; error: string } => {
  if (!name.trim()) {
    return { isValid: false, error: "Name is required" };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: "Name must be at least 2 characters long" };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: "Name must be less than 50 characters" };
  }

  return { isValid: true, error: "" };
};

// Email validation function
const validateEmail = (email: string): { isValid: boolean; error: string } => {
  if (!email.trim()) {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true, error: "" };
};

// Phone validation function
const validatePhone = (phone: string): { isValid: boolean; error: string } => {
  if (!phone.trim()) {
    return { isValid: false, error: "Contact number is required" };
  }

  // Basic phone validation (allows digits, spaces, hyphens, parentheses, plus)
  const phoneRegex = /^[\+]?[(]?[0-9\s\-\(\)]{8,15}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return { isValid: false, error: "Please enter a valid contact number" };
  }

  return { isValid: true, error: "" };
};

// Address validation function
const validateAddress = (address: string): { isValid: boolean; error: string } => {
  if (!address.trim()) {
    return { isValid: false, error: "Address is required" };
  }

  if (address.trim().length < 5) {
    return { isValid: false, error: "Address must be at least 5 characters long" };
  }

  if (address.trim().length > 200) {
    return { isValid: false, error: "Address must be less than 200 characters" };
  }

  return { isValid: true, error: "" };
};
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
  userData,
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
  const [studnum, setstudnum] = useState("");
  const hardName = name;
  // Role specific fields
  const [studentNum, setStudentNum] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Handle input changes with real-time validation
  const handleInputChange = (field: string, value: string) => {
    // Update the appropriate state
    switch (field) {
      case 'name':
        setName(value);
        if (isEditMode) {
          const nameValidation = validateName(value);
          setErrors(prev => ({ ...prev, name: nameValidation.error }));
        }
        break;
      case 'email':
        setEmail(value);
        if (isEditMode) {
          const emailValidation = validateEmail(value);
          setErrors(prev => ({ ...prev, email: emailValidation.error }));
        }
        break;
      case 'contactNumber':
        setContactNumber(value);
        if (isEditMode) {
          const phoneValidation = validatePhone(value);
          setErrors(prev => ({ ...prev, contactNumber: phoneValidation.error }));
        }
        break;
      case 'address':
        setAddress(value);
        if (isEditMode) {
          const addressValidation = validateAddress(value);
          setErrors(prev => ({ ...prev, address: addressValidation.error }));
        }
        break;
      case 'role':
        setRole(value);
        setErrors(prev => ({ ...prev, role: "" }));
        break;
      case 'status':
        setStatus(value);
        setErrors(prev => ({ ...prev, status: "" }));
        break;
      default:
        break;
    }
  };
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
    // Validate all fields before saving
    const validationErrors: { [key: string]: string } = {};

    // Name validation
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      validationErrors.name = nameValidation.error;
    }

    // Email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      validationErrors.email = emailValidation.error;
    }

    // Contact number validation
    const phoneValidation = validatePhone(contactNumber);
    if (!phoneValidation.isValid) {
      validationErrors.contactNumber = phoneValidation.error;
    }

    // Address validation
    const addressValidation = validateAddress(address);
    if (!addressValidation.isValid) {
      validationErrors.address = addressValidation.error;
    }

    // Role validation
    if (!role.trim()) {
      validationErrors.role = "Role is required";
    }

    // Status validation
    if (!status.trim()) {
      validationErrors.status = "Status is required";
    }

    // If there are validation errors, show them and don't submit
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      showToast(`Validation Error: ${firstError}`);
      return;
    }

    try {
      setLoading(true);

      const payload: UpdateProfilePayload = {
        name: name,
        phone: contactNumber,
        fulladdress: address,
        roleName: role,
        status: status,
      };

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
    setErrors({}); // Clear validation errors
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
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter name"
                disabled={!isEditMode}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Email:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email"
                disabled // This can be edited in UserAccounts Edit
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Contact Number:
              </label>
              <Input
                type="tel"
                value={contactNumber}
                onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                placeholder="Enter contact number"
                disabled={!isEditMode}
                className={errors.contactNumber ? "border-red-500" : ""}
              />
              {errors.contactNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Address:
              </label>
              <Textarea // Multiline Support
                value={address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter address"
                disabled={!isEditMode}
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address}</p>
              )}
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
              <Select value={role} onValueChange={(value: string) => handleInputChange("role", value)} disabled={!isEditMode}>
                <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Lecturer">Lecturer</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Status:
              </label>
              <Select value={status} onValueChange={(value: string) => handleInputChange("status", value)} disabled={!isEditMode}>
                <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-red-500 text-sm mt-1">{errors.status}</p>
              )}
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