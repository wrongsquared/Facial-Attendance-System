import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import {
  BookOpen,
  LogOut,
  Bell,
  Settings,
  Search,
  Building2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
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
import { useEffect } from "react";
import { getPlatforManagerDashboard } from "../services/api";
import { PlatformManagerDash } from "../types/platformmanagerdash";

interface PlatformManagerDashboardProps {
  onLogout: () => void;
  onNavigateToInstitutionsProfile: () => void;
}

// Mock data for recent subscriptions
const recentSubscriptions = [
  {
    id: 1,
    institutionName: "University of Wollongong",
    date: "28 Dec 2025",
  },
  {
    id: 2,
    institutionName: "University of Sydney",
    date: "25 Dec 2025",
  },
  {
    id: 3,
    institutionName: "University of New South Wales",
    date: "22 Dec 2025",
  },
  {
    id: 4,
    institutionName: "Monash University",
    date: "20 Dec 2025",
  },
  {
    id: 5,
    institutionName: "University of Melbourne",
    date: "18 Dec 2025",
  },
  {
    id: 6,
    institutionName: "Australian National University",
    date: "15 Dec 2025",
  },
  {
    id: 7,
    institutionName: "University of Queensland",
    date: "12 Dec 2025",
  },
  {
    id: 8,
    institutionName: "University of Western Australia",
    date: "10 Dec 2025",
  },
];

export function PlatformManagerDashboard({
  onLogout,
  onNavigateToInstitutionsProfile,
}: PlatformManagerDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformManagerData, setPlatforManagerData] = useState<PlatformManagerDash | null>(null)

  const { token } = useAuth()

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      try {
        const data = await getPlatforManagerDashboard(token || "")
        setPlatforManagerData(data)
      }
      catch (e) {
        console.error("Error while fetching platform manager dashboard: ", e)
      }
    }

    fetchDashboardData()
  }, [])

  // Filter subscriptions based on search
  const filteredSubscriptions = platformManagerData?.recent_subscriptions.filter((subscription) =>
    subscription.universityName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <p className="text-sm text-gray-600">Platform Manager Portal</p>
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
                <AvatarFallback>PM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Platform Manager</p>
                <p className="text-sm text-gray-600">System Manager</p>
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
        {/* Top Header - Stats and Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Number of Institutions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                Total Number of Institutions
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{platformManagerData?.stats.total_institutions}</div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onNavigateToInstitutionsProfile}
              >
                View Institutions Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Subscriptions</CardTitle>
            <CardDescription>
              Universities that have recently subscribed to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search institutions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Subscriptions Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Institution Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions && filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((subscription, index) => (
                    <TableRow key={subscription.universityID}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{subscription.universityName}</TableCell>
                      <TableCell>{
                        ((): string => {
                          const dateObj = new Date(subscription.subscriptionDate)
                          return dateObj.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        })()
                      }</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log(`View ${subscription.universityName}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No institutions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}