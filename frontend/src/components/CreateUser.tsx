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

export function CreateUser({ onLogout, onBack, onCreateSuccess,onNavigateToProfile }: CreateUserProps) {
  const {token} = useAuth();
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); //
  const [userIdInput, setUserIdInput] = useState(""); // Maps to StudentNum or Job Title
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseID, setSelectedCourseID] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!token) return;

  // Password Validation
  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }
  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  // Student validation
  if (role.toLowerCase() === "student" && !selectedCourseID) {
    alert("Please select a course for the student");
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
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="userType">
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Lecturer">Lecturer</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="userId">Name:</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {/* E-mail Input */}
              <div className="space-y-2">
                <Label htmlFor="userId">E-mail:</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password:</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password:</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {/* Course / Specialist / Job Input */}
              {(role === 'Student') && (
                <div className="space-y-2">
                  <Label htmlFor="course-select">Course:</Label>
                  <Select value={selectedCourseID} onValueChange={(value: string) => setSelectedCourseID(value)}>
                    <SelectTrigger id="course-select">
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
                </div>
              )}
              {(role === 'Lecturer') && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Specialisation:</Label>
                  <Input
                    id="special"
                    type="text"
                    placeholder="Enter Specialisation"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                  />
                </div>
              )}
              {(role === 'Admin') && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Role:</Label>
                  <Input
                    id="special"
                    type="text"
                    placeholder="Enter Staff Role"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                  />
                </div>
              )}
              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-4">
                <Button type="button" variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button type="submit" disabled ={loading}>
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