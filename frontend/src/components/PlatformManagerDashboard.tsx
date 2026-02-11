import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
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
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await getPlatforManagerDashboard(token || "");
        setPlatforManagerData(data);
      } catch (e) {
        console.error("Error while fetching platform manager dashboard: ", e);
      } finally{
        setLoading(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className= "flex flex-col h-full overflow-hidden">
            {loading ? (
              <div className="animate-hard-pulse w-full bg-gray-200"
              style={{ height: '160px' }}  />
              ) : (
              <>
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
            </>)}
          </Card>

          <Card className="flex flex-col h-full overflow-hidden">
            {loading ? (
              <div className="animate-hard-pulse w-full bg-gray-200" 
              style={{ height: '160px' }} />
                ) : (
                <>
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
            </>)}
          </Card>
        </div>

        <Card className="overflow-hidden">
           {loading ? (
              <div className="animate-hard-pulse w-full bg-gray-200" 
              style={{ height: '450px' }} />
              ) : (
                <>
          <CardHeader>
            <CardTitle>Recently Joined Campuses</CardTitle>
            <CardDescription>
              Campuses that have recently been added to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Campus Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions && filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((subscription) => (
                    <TableRow
                      key={subscription.campusID}
                      className="cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        console.log(`Navigating to campus ${subscription.campusName}`);
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

                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No campuses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          </>)}
        </Card>
      </main>
    </div>
  );
}