import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  ShieldCheck,
  MapPin,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth } from "../cont/AuthContext";
import { Navbar } from "./Navbar";

interface ViewInstitutionProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onEditProfile: () => void;
  institutionData: {
    institutionId: string;
    institutionName: string;
  };
}

export interface AdminUser {
  userID: string;
  name: string;
  email: string;
  phone: string | null;
  type: string;
  isActive: boolean;
}

export interface UniversityDetails {
  campusID: number;
  campusName: string;
  campusAddress: string;
  subscriptionDate: string;
  isActive: boolean;
}

export interface InstitutionFullProfile {
  details: UniversityDetails;
  admins: AdminUser[];
}

export function ViewInstitutionProfile({
  onLogout,
  onBack,
  onEditProfile,
  institutionData,
}: ViewInstitutionProfileProps) {

  // Data State
  const [profileData, setProfileData] = useState<InstitutionFullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", contactNumber: "", password: "" });

  const { token } = useAuth();

  // 1. Fetch Data
  const fetchInstitutionProfile = async () => {


    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/platform-manager/institution/${institutionData.institutionId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();
      setProfileData(data);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !institutionData.institutionId) return;
    fetchInstitutionProfile();
  }, [token, institutionData.institutionId]);

  // Add Admin Logic
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`http://localhost:8000/platform-manager/campus/${institutionData.institutionId}/add-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(newAdmin),
      });

      const data = await response.json();
      if (!response.ok) {

        if (Array.isArray(data.detail)) {
          throw new Error("Missing Data or Invalid Field");
        }

        if (typeof data.detail === "string") {
          throw new Error(data.detail);
        }
      }

      window.alert("Account has been successfully created!");
      setIsAddAdminOpen(false);
      setNewAdmin({ name: "", email: "", contactNumber: "", password: "" });
      fetchInstitutionProfile();

    } catch (error: any) {
      console.error("Full Error Object:", error);

      // Show alert with error message
      window.alert(error.message);

      // The original toast code
      toast.error("Registration Failed", {
        description: error.message
      });
    }
  };

  // Change Status Logic
  const handleStatusChange = async (userId: string, newStatus: string) => {
    const isActiveBool = newStatus === "active";

    // Optimistic Update
    setProfileData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        admins: prev.admins.map((admin) =>
          admin.userID === userId ? { ...admin, isActive: isActiveBool } : admin
        ),
      };
    });

    try {
      const response = await fetch(`http://localhost:8000/platform-manager/admin/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: isActiveBool }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      toast.success(`User marked as ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
      fetchInstitutionProfile();
    }
  };

  // Filtering Logic
  const filteredAdmins = profileData?.admins.filter(admin => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = admin.isActive === true;
    if (statusFilter === "inactive") matchesStatus = admin.isActive === false;

    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Platform Manager Portal" />

      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Manage Campus
        </Button>

        <div className="space-y-6">
          {/* HERO SECTION */}
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="h-1.5 bg-blue-600 w-full" />
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4 w-full">
                  <h2 className="text-3xl font-bold text-gray-900">{institutionData.institutionName}</h2>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-black-500">
                    <span className="text-sm font-bold text-black">ID: {institutionData.institutionId}</span>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-black-400 mr-2" />
                      <span className="text-sm font-bold text-black-600">
                        {profileData?.details?.campusAddress || "Loading..."}
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={onEditProfile} className="bg-blue-600 hover:bg-blue-700">Update Profile</Button>
              </div>
            </CardContent>
          </Card>

          {/* SECURITY NOTE */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-4">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800 font-medium">
              Only users listed as "Admin" have permission to manage this institution's portal data.
            </p>
          </div>

          {/* ADMINS TABLE */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Users className="h-5 w-5 text-blue-600" /> University Administrators
                </CardTitle>
                <CardDescription>
                  System administrators for {institutionData.institutionName}
                </CardDescription>
              </div>
            </CardHeader>

            {/* Tool Bar */}
            <CardContent className="p-4 bg-gray-50/30">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Search Bar */}
                <div className="relative flex-1 ">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search admins by name or email..."
                    className="pl-10 w-full "
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* FILTERS & BUTTON */}
                <div className="flex items-center gap-3 w-full md:w-auto">

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] ">
                      <div className="flex items-center gap-2 text-gray-600">
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Suspended</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* --- DIALOG MODIFIED TO USE FORM --- */}
                  <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                        Add Admin
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-3xl text-center">Add New Administrator</DialogTitle>
                        <DialogDescription className="text-center ">
                          Create a new admin account linked to {institutionData.institutionName}.
                        </DialogDescription>
                      </DialogHeader>

                      {/* Start form */}
                      <form onSubmit={handleAddAdmin}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={newAdmin.name}
                              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                              placeholder="John Doe"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newAdmin.email}
                              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                              placeholder="admin@uni.edu"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="contactNumber">Contact Number</Label>
                            <Input
                              id="contactNumber"
                              value={newAdmin.contactNumber}
                              onChange={(e) => setNewAdmin({ ...newAdmin, contactNumber: e.target.value })}
                              placeholder="+65..."
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="password">Temp Password</Label>
                            <Input
                              id="password"
                              type="password"
                              value={newAdmin.password}
                              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                              placeholder="Min 6 chars"
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          {/* Type="submit" makes the form trigger onSubmit */}
                          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                            Create Account
                          </Button>
                        </DialogFooter>
                      </form>

                    </DialogContent>
                  </Dialog>

                </div>
              </div>
            </CardContent>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-black font-bold uppercase text-[10px] tracking-widest border-b">
                    <tr>
                      <th className="py-4 px-8">ID</th>
                      <th className="py-4 px-8">Full Name</th>
                      <th className="py-4 px-8">Email Address</th>
                      <th className="py-4 px-8">Contact Number</th>
                      <th className="py-4 px-8">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAdmins.length > 0 ? (
                      filteredAdmins.map((user) => (
                        <tr key={user.userID} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-6 px-8">
                            <code className="flex items-center text-black-900 font-bold text-xs break-all">
                              {user.userID}
                            </code>
                          </td>
                          <td className="py-6 px-8">
                            <div className="font-bold text-gray-900">{user.name}</div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="flex items-center text-gray-700 font-medium">
                              <Mail className="h-4 w-4 mr-2 text-blue-500" />
                              {user.email}
                            </div>
                          </td>
                          <td className="py-6 px-8">
                            <div className="flex items-center text-gray-700 font-medium">
                              <Phone className="h-4 w-4 mr-2 text-gray-700" />
                              {user.phone || <span className="text-gray-300 italic text-xs">Not provided</span>}
                            </div>
                          </td>

                          <td className="py-6 px-8">
                            <Select
                              value={user.isActive ? "active" : "inactive"}
                              onValueChange={(val: string) => handleStatusChange(user.userID, val)}
                            >
                              <SelectTrigger className={`w-[140px] h-9 border-none font-medium transition-colors ${user.isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}>
                                <div className="flex items-center gap-2">
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Suspend</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          {loading ? "Loading..." : "No administrators found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}