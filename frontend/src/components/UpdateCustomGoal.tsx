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
  Settings,
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

interface UpdateCustomGoalProps {
  onLogout: () => void;
  onBack: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  };
  onUpdateGoal: (userId: string, goal: number) => void;
  onDeleteGoal: (userId: string) => void;
  showToast: (message: string) => void;
}

export function UpdateCustomGoal({
  onLogout,
  onBack,
  userData,
  onUpdateGoal,
  onDeleteGoal,
  showToast,
}: UpdateCustomGoalProps) {
  const [setGoal, setSetGoal] = useState<string>("");

  // Generate goal options from 0 to 100 in increments of 5
  const goalOptions = [];
  for (let i = 0; i <= 100; i += 5) {
    goalOptions.push(i);
  }

  const handleUpdateGoal = () => {
    onUpdateGoal(userData.userId, parseInt(setGoal));
    showToast("Attendance Goal Updated!");
    onBack();
  };

  const handleDeleteGoal = () => {
    onDeleteGoal(userData.userId);
    showToast("Attendance Goal Deleted!");
    onBack();
  };

  const handleCancel = () => {
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
              <p className="text-sm text-gray-600">Admin Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Admin User</p>
                <p className="text-sm text-gray-600">System Administrator</p>
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
                    Are you sure ?
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
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage User Profile
        </Button>

        {/* Update Custom Goal Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Update Custom Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User ID */}
            <div>
              <p className="text-sm text-gray-600 mb-2">User ID:</p>
              <p className="font-medium">{userData.userId}</p>
            </div>

            {/* User Name */}
            <div>
              <p className="text-sm text-gray-600 mb-2">User Name:</p>
              <p className="font-medium">{userData.name}</p>
            </div>

            {/* Role */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Role:</p>
              <p className="font-medium">{userData.role}</p>
            </div>

            {/* Custom Attendance Goals Section */}
            <div className="pt-4 border-t">
              <h3 className="text-lg mb-4">Custom Attendance Goals</h3>
              
              {/* Current Goal */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current Goal:</p>
                <p className="font-medium">
                  {userData.currentGoal !== null ? `${userData.currentGoal}%` : "None"}
                </p>
              </div>

              {/* Set Goal */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Set Goal:</p>
                <Select value={setGoal} onValueChange={setSetGoal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Goal Percentage" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalOptions.map((goal) => (
                      <SelectItem key={goal} value={goal.toString()}>
                        {goal}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-4 pt-6 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteGoal}
                disabled={userData.currentGoal === null}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Custom Goal
              </Button>
              <Button
                onClick={handleUpdateGoal}
                disabled={!setGoal}
              >
                Update Goal
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