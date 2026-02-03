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

import { useAuth } from "../cont/AuthContext";
import { Course, CreateUserPayload } from "../types/adminInnards";
import { createUser, getCampusCourses } from "../services/api";
import { Navbar } from "./Navbar";

interface CreateUserProps {
  onLogout: () => void;
  onBack: () => void;
  onCreateSuccess: () => void;
  onNavigateToProfile: () => void;
}

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

// Password validation function
const validatePassword = (password: string): { isValid: boolean; error: string } => {
  if (!password) {
    return { isValid: false, error: "Password is required" };
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

export function CreateUser({ onLogout, onBack, onCreateSuccess, onNavigateToProfile }: CreateUserProps) {
  const { token } = useAuth();
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); //
  const [userIdInput, setUserIdInput] = useState(""); // Maps to StudentNum or Job Title
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseID, setSelectedCourseID] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      case 'password':
        setPassword(value);
        const passwordValidation = validatePassword(value);
        setErrors(prev => ({ ...prev, password: passwordValidation.error }));

        // Also validate confirm password if it exists
        if (confirmPassword) {
          const confirmMatch = value === confirmPassword;
          setErrors(prev => ({ ...prev, confirmPassword: confirmMatch ? "" : "Passwords do not match" }));
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        const confirmMatch = value === password;
        setErrors(prev => ({ ...prev, confirmPassword: confirmMatch ? "" : "Passwords do not match" }));
        break;
      case 'userIdInput':
        setUserIdInput(value);
        const roleFieldValidation = validateRoleSpecificField(value, role.toLowerCase());
        setErrors(prev => ({ ...prev, userIdInput: roleFieldValidation.error }));
        break;
      case 'role':
        setRole(value);
        setUserIdInput(""); // Clear role-specific input when changing roles
        setSelectedCourseID(""); // Clear course selection
        setErrors(prev => ({ ...prev, userIdInput: "", selectedCourseID: "" }));
        break;
      case 'selectedCourseID':
        setSelectedCourseID(value);
        setErrors(prev => ({ ...prev, selectedCourseID: "" }));
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

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

    // Password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      validationErrors.password = passwordValidation.error;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      validationErrors.confirmPassword = "Passwords do not match";
    }
    if (!confirmPassword) {
      validationErrors.confirmPassword = "Please confirm your password";
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

    // Prepare pl
    const payload: CreateUserPayload = {
      name,
      email,
      password,
      role: role.toLowerCase(), // Send as lowercase to match backend
    };

    // Map the dynamic fields based on role
    const roleKey = role.toLowerCase();

    if (roleKey === "student") {
      // Convert the string from Select to a Number for the Backend
      payload.courseID = selectedCourseID ? Number(selectedCourseID) : undefined;
      payload.studentNum = userIdInput;
    }
    else if (roleKey === "lecturer") {
      payload.specialistIn = userIdInput;
    }
    else if (roleKey === "admin") {
      payload.jobTitle = userIdInput;
    }

    // Call API
    try {
      await createUser(payload, token);
      alert("User created successfully!");
      onCreateSuccess(); // Navigate back or reset
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const loadCourses = async () => {
      try {
        if (token) {
          const data = await getCampusCourses(token);
          setCourses(data);
        }
      } catch (error) {
        console.error("Error loading courses:", error);
      }
    };

    loadCourses();
  }, [token]);

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

        {/* Create User Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Create New User</CardTitle>
              <CardDescription>
                Create a new user account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Create As Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="userType">Create As:</Label>
                  <Select value={role} onValueChange={(value: string) => handleInputChange("role", value)}>
                    <SelectTrigger id="userType" className={errors.role ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Lecturer">Lecturer</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-red-500 text-sm">{errors.role}</p>
                  )}
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="userId">Name:</Label>
                  <Input
                    id="userId"
                    type="text"
                    placeholder="Enter Name"
                    value={name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm">{errors.name}</p>
                  )}
                </div>
                {/* E-mail Input */}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail:</Label>
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
                </div>
                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password:</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password (minimum 6 characters)"
                    value={password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password:</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                  )}
                </div>
                {/* Course / Specialist / Job Input */}
                {(role === 'Student') && (
                  <div className="space-y-2">
                    <Label htmlFor="course-select">Course:</Label>
                    <Select value={selectedCourseID} onValueChange={(value: string) => handleInputChange("selectedCourseID", value)}>
                      <SelectTrigger id="course-select" className={errors.selectedCourseID ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select a Course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.courseID} value={course.courseID.toString()}>
                            {course.courseCode} {/*Need to implement Course names*/}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.selectedCourseID && (
                      <p className="text-red-500 text-sm">{errors.selectedCourseID}</p>
                    )}
                  </div>
                )}
                {(role === 'Lecturer') && (
                  <div className="space-y-2">
                    <Label htmlFor="specialisation">Specialisation:</Label>
                    <Input
                      id="specialisation"
                      type="text"
                      placeholder="Enter Specialisation"
                      value={userIdInput}
                      onChange={(e) => handleInputChange("userIdInput", e.target.value)}
                      className={errors.userIdInput ? "border-red-500" : ""}
                    />
                    {errors.userIdInput && (
                      <p className="text-red-500 text-sm">{errors.userIdInput}</p>
                    )}
                  </div>
                )}
                {(role === 'Admin') && (
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Role:</Label>
                    <Input
                      id="jobTitle"
                      type="text"
                      placeholder="Enter Staff Role"
                      value={userIdInput}
                      onChange={(e) => handleInputChange("userIdInput", e.target.value)}
                      className={errors.userIdInput ? "border-red-500" : ""}
                    />
                    {errors.userIdInput && (
                      <p className="text-red-500 text-sm">{errors.userIdInput}</p>
                    )}
                  </div>
                )}

                {(role === 'Student') && (
                  <div className="space-y-2">
                    <Label htmlFor="studentNumber">Student Number:</Label>
                    <Input
                      id="studentNumber"
                      type="text"
                      placeholder="Enter Student Number"
                      value={userIdInput}
                      onChange={(e) => handleInputChange("userIdInput", e.target.value)}
                      className={errors.userIdInput ? "border-red-500" : ""}
                    />
                    {errors.userIdInput && (
                      <p className="text-red-500 text-sm">{errors.userIdInput}</p>
                    )}
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex justify-center gap-4 pt-4 w-full">
                  <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                    {loading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}