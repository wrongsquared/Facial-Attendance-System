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

interface UpdateCustomGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  };
  goalMetadata: {
    lastUpdated: string;
    setBy: string;
  };
  onUpdateGoal: (userId: string, goal: number) => void;
  showToast: (message: string) => void;
}

export function UpdateCustomGoalModal({
  isOpen,
  onClose,
  userData,
  goalMetadata,
  onUpdateGoal,
  showToast,
}: UpdateCustomGoalModalProps) {
  const [selectedGoal, setSelectedGoal] = useState<string>("");

  const handleUpdateGoal = () => {
    if (!selectedGoal) {
      showToast("Please select a goal percentage");
      return;
    }

    onUpdateGoal(userData.userId, parseInt(selectedGoal));
    showToast(`Custom goal updated to ${selectedGoal}% successfully for ${userData.name}`);
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
          <DialogTitle className="text-2xl">Update Custom Goal</DialogTitle>
          {/* <DialogDescription className="text-sm">
            Update the custom attendance goal for the selected user.
          </DialogDescription> */}
        </DialogHeader>

        {/* User Information */}
        <div className="flex gap-8 mb-4">
          <div>
            <span className="font-bold">User ID:</span>{" "}
            <span>{userData.userId}</span>
          </div>
        </div>
        <div className="flex gap-8 mb-4">
          <div>
            <span className="font-bold">User Name:</span>{" "}
            <span>{userData.name}</span>
          </div>
          <div>
            <span className="font-bold">Role:</span>{" "}
            <span>{userData.role}</span>
          </div>
        </div>

        {/* Custom Goals Box */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-medium">Custom Attendance Goals</h3>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              Current Goal: {userData.currentGoal ? `${userData.currentGoal}%` : "Not Set"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              Last Updated: {goalMetadata.lastUpdated}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              Set By: {goalMetadata.setBy}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">Update Goal:</p>
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
          <div className="flex w-full gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 bg-gray-200 hover:bg-gray-400 text-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGoal}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}