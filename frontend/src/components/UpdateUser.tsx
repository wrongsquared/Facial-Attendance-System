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
import { UpdateUserPayload, UserDetails, Course } from "../types/adminInnards";
import { useAuth } from "../cont/AuthContext";

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
  const [loading, setLoading] = useState<boolean>(false);
  const targetUUID = userData?.uuid;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState(""); // Default to empty
  const [userIdInput, setUserIdInput] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!token) return;
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
      }
    };
    loadInitialData();
  }, [targetUUID, token]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validation
    if (newPassword && newPassword !== confirmPassword) {
      alert("Passwords do not match");
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
      payload.courseID =  selectedCourseID ? Number(selectedCourseID) : undefined;
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
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile}/>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage User Accounts
        </Button>

        {/* Update User Form Card */}
        <Card className="max-w-2xl mx-auto">
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
                <Input value={name} disabled={true} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">User E-mail:</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {role.toLowerCase() === 'student' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Student Number:</Label>
                    <Input 
                      value={userIdInput} 
                      onChange={(e) => setUserIdInput(e.target.value)} 
                      placeholder="Enter Student ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-select">Course:</Label>
                    <Select value={selectedCourseID} onValueChange={(value: string) => setSelectedCourseID(value)}>
                      <SelectTrigger id="course-select">
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
                  </div>
                </div>
              )}

              {role.toLowerCase() === 'lecturer' && (
                <div className="space-y-2">
                  <Label>Lecturer Specialisation:</Label>
                  <Input
                    placeholder="e.g. Data Science, Ethics"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                  />
                </div>
              )}

              {role.toLowerCase() === 'admin' && (
                <div className="space-y-2">
                  <Label>Admin Job Role:</Label>
                  <Input
                    placeholder="e.g. Faculty Manager"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                  />
                </div>
              )}
              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Password:</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password (leave blank to keep current)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password:</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">
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