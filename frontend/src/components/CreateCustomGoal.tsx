import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  BookOpen,
  LogOut,
  ArrowLeft,
  Bell,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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

interface CreateCustomGoalProps {
  onLogout: () => void;
  onBack: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  };
  onCreateGoal: (userId: string, goal: number) => void;
  showToast: (message: string) => void;
}

export function CreateCustomGoal({
  onLogout,
  onBack,
  userData,
  onCreateGoal,
  showToast,
}: CreateCustomGoalProps) {
  const [selectedGoal, setSelectedGoal] = useState<string>("");

  const handleCreateGoal = () => {
    if (!selectedGoal) {
      showToast("Please select a goal percentage");
      return;
    }

    onCreateGoal(userData.userId, parseInt(selectedGoal));
    showToast(`Custom goal of ${selectedGoal}% created successfully for ${userData.name}`);
    onBack();
  };

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
              <p className="text-sm text-gray-600">
                Admin Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Admin User</p>
                <p className="text-sm text-gray-600">
                  System Administrator
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={onLogout}>
                    Log out
                  </AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage User Profile
        </Button>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Create Custom Goal</h2>
        </div>

        {/* Create Custom Goal Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Custom Attendance Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b">
              <div>
                <label className="text-sm text-gray-600">User ID</label>
                <p className="mt-1">{userData.userId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">User Name</label>
                <p className="mt-1">{userData.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Role</label>
                <p className="mt-1">{userData.role}</p>
              </div>
            </div>

            {/* Current Goal */}
            <div>
              <label className="text-sm text-gray-600">Current Goal</label>
              <p className="mt-1 text-lg">
                {userData.currentGoal ? `${userData.currentGoal}%` : "None"}
              </p>
            </div>

            {/* Set Goal */}
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                Set New Goal
              </label>
              <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select goal percentage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60%</SelectItem>
                  <SelectItem value="65">65%</SelectItem>
                  <SelectItem value="70">70%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="80">80%</SelectItem>
                  <SelectItem value="85">85%</SelectItem>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="95">95%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGoal}
                disabled={!selectedGoal}
              >
                Create Goal
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600">
          &copy; 2025 University of Wollongong
        </div>
      </footer>
    </div>
  );
}