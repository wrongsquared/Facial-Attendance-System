import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { toast } from "sonner";

interface CreateInstitutionProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onCreate: (data: any) => void;
}

export function CreateInstitutionProfile({
  onLogout,
  onBack,
  onCreate,
}: CreateInstitutionProfileProps) {
  const [institutionName, setInstitutionName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleCreate = async (e: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!institutionName || !address) {
      toast.error("Please fill in Campus Name and Address");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:8000/platform-manager/campus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          campusName: institutionName,
          campusAddress: address,
        })
      });

      const data = await response.json();

      // --- CRITICAL ERROR CHECK ---
      if (!response.ok) {
        let msg = data.detail || "An error occurred";

        if (Array.isArray(data.detail)) msg = "Missing Data or Invalid Field";

        // Force an error to jump to the 'catch' block
        throw new Error(msg);
      }

      // --- SUCCESS LOGIC (Only runs if NO error was thrown above) ---
      toast.success("Campus created successfully!");
      onCreate(data);
      onBack();

    } catch (error: any) {
      console.error("Stopping duplicate creation:", error.message);
      window.alert(error.message); // This will show "Campus name already exists"
      toast.error(error.message);
      // Logic stops here. It will NOT run onBack() or toast.success()
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Platform Manager Portal" />

      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage Campus
        </Button>

        <div className="w-full bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl mb-2 font-bold text-center">Add New Campus</h2>
          <p className="text-gray-600 mb-8 text-center">Create a new campus profile.</p>

          {/* --- ADDED FORM TAG HERE --- */}
          <form onSubmit={handleCreate}>
            <Card>
              <CardHeader className="px-8">
                <CardTitle>Campus Details</CardTitle>
                <CardDescription>Enter the campus location information</CardDescription>
              </CardHeader>

              <CardContent className="px-8">
                <div className="grid gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="campusName">Campus Name</Label>
                    <Input
                      id="campusName"
                      required
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. Wollongong Campus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Campus Address</Label>
                    <Input
                      id="address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Education Lane"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex w-full gap-6 bg-gray-50/50 p-6 rounded-b-lg">
                <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit" // CHANGED TO SUBMIT
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
                >
                  {loading ? "Creating..." : "Create Campus"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </main>
    </div>
  );
}