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
import {
  Search,
  Building2,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useAuth } from "../cont/AuthContext";
import { getPlatforManagerDashboard } from "../services/api";
import { PlatformManagerDash } from "../types/platformmanagerdash";
import { Navbar } from "./Navbar";

interface PlatformManagerDashboardProps {
  onLogout: () => void;
  onNavigateToInstitutionsProfile: () => void;
}

export function PlatformManagerDashboard({
  onLogout,
  onNavigateToInstitutionsProfile,
}: PlatformManagerDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformManagerData, setPlatforManagerData] = useState<PlatformManagerDash | null>(null);

  const { token } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      try {
        const data = await getPlatforManagerDashboard(token || "");
        setPlatforManagerData(data);
      } catch (e) {
        console.error("Error while fetching platform manager dashboard: ", e);
      }
    };

    fetchDashboardData();
  }, [token]);

  const filteredSubscriptions = platformManagerData?.recent_subscriptions.filter((subscription) =>

    subscription.campusName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Platform Manager Portal" />

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Top Header - Stats and Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Number of Institutions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                Total Number of Campuses
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">
                {platformManagerData?.stats.total_institutions}
              </div>
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
                View and Manage All Campuses
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recently Joined Campuses */}
        <Card>
          <CardHeader>
            {/* FIX 1: Corrected Grammar */}
            <CardTitle>Recently Joined Campuses</CardTitle>
            <CardDescription>
              Campuses that have recently been added to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar ...
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search campuses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div> */}

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Campus Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Joined Date</TableHead>
                  {/* NOTE: No "Action" header here, which is correct */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions && filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((subscription) => (
                    <TableRow
                      key={subscription.campusID}
                      // FIX 2: Added styling to show it's clickable
                      className="cursor-pointer hover:bg-gray-100 transition-colors"
                      // FIX 3: Added the click handler to the ROW
                      onClick={() => {
                        console.log(`Navigating to campus ${subscription.campusName}`);
                        // Add your navigation logic here, e.g.:
                        // navigate(`/institution/${subscription.campusID}`);
                      }}
                    >
                      <TableCell className="text-gray-600 font-medium">#{subscription.campusID}</TableCell>

                      <TableCell className="font-medium">
                        {subscription.campusName}
                      </TableCell>

                      <TableCell className="text-gray-600">
                        {subscription.campusAddress || "N/A"}
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        {(() => {
                          const dateObj = new Date(subscription.subscriptionDate);
                          return dateObj.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          });
                        })()}
                      </TableCell>

                      {/* FIX 4: REMOVED THE BUTTON CELL ENTIRELY 
                              It was causing the alignment issue. 
                          */}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    {/* FIX 5: Updated colSpan to 5 (matching header count) */}
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No campuses found
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