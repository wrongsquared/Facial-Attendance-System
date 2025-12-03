import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import logoImage from "figma:asset/7f4aea41a772ddccb866f53538bcc63281191ac1.png";

interface LoginPageProps {
  onLogin: (userType: "student" | "lecturer" | "admin") => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<
    "student" | "lecturer" | "admin"
  >("student");
  const [error, setError] = useState("");

  const handleLogin = () => {
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Mock validation - in a real app, this would check against a backend
    setError("");
    onLogin(userType);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="space-y-6 pb-8">
          <div className="flex flex-col md:flex-row md:relative md:items-start items-center gap-4">
            <div className="md:absolute md:left-0 flex flex-col items-center justify-center md:min-w-[120px]">
              <div className="text-center">
                <img
                  src={logoImage}
                  alt="Logo"
                  className="w-16 h-16 mx-auto mb-2"
                />
                <div className="font-bold text-blue-600">
                  Attendify
                </div>
              </div>
            </div>
            <div className="w-full flex justify-center items-center md:pt-4">
              <CardTitle className="text-2xl md:text-4xl font-bold text-blue-600">
                Login Page
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-8">
          <div className="space-y-2">
            <Label htmlFor="userType">User Type</Label>
            <Select
              value={userType}
              onValueChange={(
                value: "student" | "lecturer" | "admin",
              ) => setUserType(value)}
            >
              <SelectTrigger id="userType" className="h-12">
                <SelectValue placeholder="Select user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="lecturer">
                  Lecturer
                </SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@uow.edu.au"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-12"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white mt-6 text-xl font-bold"
            onClick={handleLogin}
          >
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}