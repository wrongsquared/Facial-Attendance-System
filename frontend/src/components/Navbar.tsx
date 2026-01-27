import {
  BookOpen,
  Bell,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
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
import { NotificationItem } from "../types/studentinnards";
import { 
  getNotifications, 
  markNotificationRead, 
} from "../services/api";
import { NotificationAlerts } from "./NotificationAlerts"; 
import { useEffect, useState } from "react";

interface NavbarProps {
  // Optional: If you want to override the title manually
  title: string;
  onNavigateToProfile?: () => void;
  onOpenNotifications?: () => void;
}

export function Navbar({ title, onNavigateToProfile, onOpenNotifications }: NavbarProps) {
  const { user, token, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const getPortalTitle = () => {
    if (title) return title; // Use override if provided
    if (!user) return "Portal";

    const role = user.role_name.charAt(0).toUpperCase() + user.role_name.slice(1);
    return `${role} Portal`;
  };
  useEffect(() => {
    const fetchNotifs = async () => {
      // Logic: Only fetch if logged in AND is a student
      if (token && user?.role_name?.toLowerCase() === 'student') {
        try {
          const data = await getNotifications(token);
          setNotifications(data);
        } catch (err) {
          console.error("Failed to fetch notifications", err);
        }
      }
    };
    fetchNotifs();
  }, [token, user]);

  const handleDismissAlert = async (notificationID: number) => {
    
    setNotifications((prev) => 
      prev.filter((n) => n.notificationID !== notificationID)
    );
    try {
      await markNotificationRead(notificationID, token!);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate Unread Count for the Red Badge
  const unreadCount = notifications.filter((n) => !n.isRead).length;
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


    return user.role_name.charAt(0).toUpperCase() + user.role_name.slice(1);
  };

  return (
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
          {user?.role_name.toLowerCase() === "student" && onOpenNotifications && (
            <Button variant="ghost" size="icon" className="relative" onClick={() => setIsAlertsOpen(true)}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
              )}
            </Button>
          )}
          <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
            onClick={onNavigateToProfile}>
              <Avatar>
                <AvatarImage src={user?.photo}/>
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={logout} className="bg-blue-600 hover:bg-blue-700">
                  Log out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <NotificationAlerts 
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={notifications}
        onDismissAlert={handleDismissAlert}
      />
      </div>
    </header>
  )
}