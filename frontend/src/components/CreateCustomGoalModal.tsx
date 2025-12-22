import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface CreateCustomGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  };
  onCreateGoal: (userId: string, goal: number) => void;
  showToast: (message: string) => void;
}

export function CreateCustomGoalModal({
  isOpen,
  onClose,
  userData,
  onCreateGoal,
  showToast,
}: CreateCustomGoalModalProps) {
  const [selectedGoal, setSelectedGoal] = useState<string>("");

  const handleCreateGoal = () => {
    if (!selectedGoal) {
      showToast("Please select a goal percentage");
      return;
    }

    onCreateGoal(userData.userId, parseInt(selectedGoal));
    showToast(`Custom goal of ${selectedGoal}% created successfully for ${userData.name}`);
    setSelectedGoal(""); // Reset selection
    onClose();
  };

  const handleCancel = () => {
    setSelectedGoal(""); // Reset selection
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#003366]">Create Custom Goal</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">Set a custom attendance goal for the user.</DialogDescription>
        </DialogHeader>

        {/* User Information */}
        <div className="flex gap-8 text-gray-700 mb-4">
          <div>
            <span className="text-gray-500">User ID:</span>{" "}
            <span>{userData.userId}</span>
          </div>
          <div>
            <span className="text-gray-500">User Name:</span>{" "}
            <span>{userData.name}</span>
          </div>
          <div>
            <span className="text-gray-500">Role:</span>{" "}
            <span>{userData.role}</span>
          </div>
        </div>

        {/* Custom Goals Box */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-6">
          <h3 className="text-lg text-[#003366]">Custom Attendance Goals</h3>

          <div className="space-y-2">
            <label className="text-sm text-gray-600">Current Goal:</label>
            <p className="text-lg">
              {userData.currentGoal ? `${userData.currentGoal}%` : "None"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-600">Set Goal:</label>
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

          {/* Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGoal}
              className="bg-[#003366] hover:bg-[#004488] text-white"
            >
              Create Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}