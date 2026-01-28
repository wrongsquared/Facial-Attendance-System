import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface DeleteCustomGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    userId: string;
    name: string;
  };
  onDeleteGoal: (userId: string, userName: string) => void;
  showToast: (message: string) => void;
}

export function DeleteCustomGoalModal({
  isOpen,
  onClose,
  userData,
  onDeleteGoal,
  showToast,
}: DeleteCustomGoalModalProps) {
  const handleDelete = () => {
    onDeleteGoal(userData.userId, userData.name);
    showToast(`Custom goal deleted successfully for ${userData.name}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Delete Custom Goal</DialogTitle>
          {/* <DialogDescription className="text-sm text-gray-500 text-center">
            Confirm deletion of custom goal for <span className="font-semibold">"{userData.name}"</span>?
          </DialogDescription> */}
        </DialogHeader>

        {/* Confirmation Message */}
        <div className="py-6 text-center">
          <p className="text-lg">
            Are you sure you want to delete the custom goal for <span className="font-semibold">"{userData.name}"</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex w-full gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white flex-1"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}