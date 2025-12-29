import {
  BookOpen,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
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
import { useAuth } from "../cont/AuthContext";
interface NavbarProps {
  // Optional: If you want to override the title manually
  title?: string; 
}

export function Navbar({ title }: NavbarProps) {
  const { user, logout } = useAuth();

  const getPortalTitle = () => {
    if (title) return title; // Use override if provided
    if (!user) return "Portal";
    
    const role = user.role_name.charAt(0).toUpperCase() + user.role_name.slice(1);
    return `${role} Portal`;
  };

  // Get Initials for the Avatar
  const getInitials = () => {
    if (!user?.role_name) return "U";
    return user.role_name.substring(0, 2).toUpperCase();
  };
  const getUserSubtitle = () => {
        // Req to dodge the "Might be Null" issue
        if (!user) return "Guest";
        //Student
        if (user.studentNum) return `Student ID: ${user.studentNum}`;
        if (user.specialistIn) return user.specialistIn;
        // For Admins
        if (user.job) return user.job;

        // Generic role name
        return user.role_name.charAt(0).toUpperCase() + user.role_name.slice(1);
    };
    
  return(
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl">Attendify</h1>
              <p className="text-sm text-gray-600">{getPortalTitle()}</p>
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
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>{user?.name ?? "Unknown Name"}</p>
                <p className="text-sm text-gray-600">{getUserSubtitle()}</p>
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
                  <AlertDialogAction onClick={logout}>
                    Log out
                  </AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>
  )
}