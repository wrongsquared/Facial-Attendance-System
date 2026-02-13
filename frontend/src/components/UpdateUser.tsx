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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Navbar } from "./Navbar";
import { getUserDetails, updateUser, getCampusCourses } from "../services/api";
import { UpdateUserPayload,  Course } from "../types/adminInnards";
import { useAuth } from "../cont/AuthContext";

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

// Password validation function (for updates, password is optional)
const validatePassword = (password: string): { isValid: boolean; error: string } => {
  if (!password) {
    return { isValid: true, error: "" }; // Password is optional for updates
  }

  if (password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters long" };
  }

  if (password.length > 100) {
    return { isValid: false, error: "Password must be less than 100 characters" };
  }

  return { isValid: true, error: "" };
};

// Role-specific field validation
const validateRoleSpecificField = (value: string, role: string): { isValid: boolean; error: string } => {
  if (!value.trim()) {
    const fieldName = role === 'student' ? 'Student Number' :
      role === 'lecturer' ? 'Specialisation' : 'Role/Job Title';
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (value.trim().length > 100) {
    return { isValid: false, error: "Field must be less than 100 characters" };
  }

  return { isValid: true, error: "" };
};

interface UpdateUserProps {
  onLogout: () => void;
  onBack: () => void;
  onUpdateSuccess: () => void;
  userData: {
    uuid: string;
    name: string;
    role: string;
    status: string;
  };
  showToast: (message: string) => void;
  onNavigateToProfile: () => void;
}

export function UpdateUser({ onLogout, onBack, onUpdateSuccess, userData, showToast, onNavigateToProfile }: UpdateUserProps) {
  const { token } = useAuth()
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [selectedCourseID, setSelectedCourseID] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const targetUUID = userData?.uuid;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState(""); // Default to empty
  const [userIdInput, setUserIdInput] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Handle input changes with real-time validation
  const handleInputChange = (field: string, value: string) => {
    // Update the appropriate state
    switch (field) {
      case 'name':
        setName(value);
        const nameValidation = validateName(value);
        setErrors(prev => ({ ...prev, name: nameValidation.error }));
        break;
      case 'email':
        setEmail(value);
        const emailValidation = validateEmail(value);
        setErrors(prev => ({ ...prev, email: emailValidation.error }));
        break;
      case 'newPassword':
        setNewPassword(value);
        const passwordValidation = validatePassword(value);
        setErrors(prev => ({ ...prev, newPassword: passwordValidation.error }));

        // Also validate confirm password if it exists
        if (confirmPassword) {
          const confirmMatch = value === confirmPassword;
          setErrors(prev => ({ ...prev, confirmPassword: confirmMatch ? "" : "Passwords do not match" }));
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        const confirmMatch = value === newPassword;
        setErrors(prev => ({ ...prev, confirmPassword: confirmMatch ? "" : "Passwords do not match" }));
        break;
      case 'userIdInput':
        setUserIdInput(value);
        const roleFieldValidation = validateRoleSpecificField(value, role.toLowerCase());
        setErrors(prev => ({ ...prev, userIdInput: roleFieldValidation.error }));
        break;
      case 'selectedCourseID':
        setSelectedCourseID(value);
        setErrors(prev => ({ ...prev, selectedCourseID: "" }));
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!token) return;
    const loadInitialData = async () => {
      try {
        // Fetch courses for the dropdown
        const coursesData = await getCampusCourses(token);
        setCourses(coursesData);

        // Fetch the user details (existing logic)
        if (targetUUID) {
          const user = await getUserDetails(targetUUID, token);
          setName(user.name || "");
          setEmail(user.email || "");
          setRole(user.role || "");

          if (user.role.toLowerCase() === "student") {
            setUserIdInput(user.studentNum || "");
            setSelectedCourseID(user.courseID?.toString() || "");
          } else {
            // This handles specialistIn or jobTitle
            setUserIdInput(user.specialistIn || user.jobTitle || "");
          }
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [targetUUID, token]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validate all fields
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

    // Password validation (only if password is provided)
    if (newPassword) {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        validationErrors.newPassword = passwordValidation.error;
      }

      // Confirm password validation
      if (newPassword !== confirmPassword) {
        validationErrors.confirmPassword = "Passwords do not match";
      }
    }

    // Role-specific field validation
    const roleFieldValidation = validateRoleSpecificField(userIdInput, role.toLowerCase());
    if (!roleFieldValidation.isValid) {
      validationErrors.userIdInput = roleFieldValidation.error;
    }

    // Student course validation
    if (role.toLowerCase() === "student" && !selectedCourseID) {
      validationErrors.selectedCourseID = "Please select a course for the student";
    }

    // If there are validation errors, show them and don't submit
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      alert(`Validation Error: ${firstError}`);
      return;
    }

    setLoading(true);

    // Payload
    const payload: UpdateUserPayload = {
      name,
      email,
    };

    if (newPassword.trim() !== "") {
      payload.password = newPassword;
    }

    // Map dynamic fields back for the backend
    const roleKey = role.toLowerCase();
    if (roleKey === "student") {
      payload.studentNum = userIdInput;
      payload.courseID = selectedCourseID ? Number(selectedCourseID) : undefined;
    } else if (roleKey === "lecturer") {
      payload.specialistIn = userIdInput;
    } else if (roleKey === "admin") {
      payload.jobTitle = userIdInput;
    }

    // API Call
    try {
      await updateUser(targetUUID, payload, token!);
      showToast("User updated successfully!");
      onUpdateSuccess();
    } catch (err: any) {
      alert(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage User Accounts
        </Button>

        {/* Update User Form Card */}
        <Card className="max-w-2xl mx-auto overflow-hidden">
          <CardHeader>
            <CardTitle>Update User Account</CardTitle>
            <CardDescription>
              Update user account information for {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                {/* User ID Input */}
                <div className="space-y-2">
                  <Label>Full Name:</Label>
                  {loading ? (
                    <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                  ) : (
                    <>
                      <Input
                        value={name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className={errors.name ? "border-red-500" : ""}
                        placeholder="Enter full name"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm">{errors.name}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">User E-mail:</Label>
                  {loading ? (
                    <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                  ) : (
                    <>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter E-mail"
                        value={email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm">{errors.email}</p>
                      )}
                    </>
                  )}
                </div>
                {role.toLowerCase() === 'student' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Student Number:</Label>
                      {loading ? (
                        <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                      ) : (
                        <>
                          <Input
                            value={userIdInput}
                            onChange={(e) => handleInputChange("userIdInput", e.target.value)}
                            placeholder="Enter Student ID"
                            className={errors.userIdInput ? "border-red-500" : ""}
                          />
                          {errors.userIdInput && (
                            <p className="text-red-500 text-sm">{errors.userIdInput}</p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course-select">Course:</Label>
                      {loading ? (
                        <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                      ) : (
                        <>
                          <Select value={selectedCourseID} onValueChange={(value: string) => handleInputChange("selectedCourseID", value)}>
                            <SelectTrigger id="course-select" className={errors.selectedCourseID ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select a Course" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.courseID} value={course.courseID.toString()}>
                                  {course.courseCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.selectedCourseID && (
                            <p className="text-red-500 text-sm">{errors.selectedCourseID}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {role.toLowerCase() === 'lecturer' && (
                  <div className="space-y-2">
                    <Label>Lecturer Specialisation:</Label>
                    {loading ? (
                      <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                    ) : (
                      <>
                        <Input
                          placeholder="e.g. Data Science, Ethics"
                          value={userIdInput}
                          onChange={(e) => handleInputChange("userIdInput", e.target.value)}
                          className={errors.userIdInput ? "border-red-500" : ""}
                        />
                        {errors.userIdInput && (
                          <p className="text-red-500 text-sm">{errors.userIdInput}</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {role.toLowerCase() === 'admin' && (
                  <div className="space-y-2">
                    <Label>Admin Job Role:</Label>
                    {loading ? (
                      <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                    ) : (
                      <>
                        <Input
                          placeholder="e.g. Faculty Manager"
                          value={userIdInput}
                          onChange={(e) => handleInputChange("userIdInput", e.target.value)}
                          className={errors.userIdInput ? "border-red-500" : ""}
                        />
                        {errors.userIdInput && (
                          <p className="text-red-500 text-sm">{errors.userIdInput}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password:</Label>
                  {loading ? (
                    <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                  ) : (
                    <>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter new password (leave blank to keep current)"
                        value={newPassword}
                        onChange={(e) => handleInputChange("newPassword", e.target.value)}
                        className={errors.newPassword ? "border-red-500" : ""}
                      />
                      {errors.newPassword && (
                        <p className="text-red-500 text-sm">{errors.newPassword}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password:</Label>
                  {loading ? (
                    <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                  ) : (
                    <>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className={errors.confirmPassword ? "border-red-500" : ""}
                      />
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 pt-4 w-full">
                  <Button variant="outline" onClick={onBack} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 flex-1">
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}