import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { BookOpen, LogOut, ArrowLeft, Bell, Settings, Upload, Camera } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type PhaseInfo = {
  idx: number;
  instruction: string;
  need: number;
  done: number;
} | null;

interface UpdateBiometricProfileProps {
  onLogout: () => void;
  onBack: () => void;
  userData: {
    userId: string;
    name: string;
    role: string;
  };
  showToast: (message: string) => void;
}

export function UpdateBiometricProfile({
  onLogout,
  onBack,
  userData,
  showToast,
}: UpdateBiometricProfileProps) {
  const [updateMethod, setUpdateMethod] = useState("Facial Recognition");
  const [notes, setNotes] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const currentStatus = "Active";
  const profileId = "BP-2025-00123";
  const enrolledOn = "15 Nov 2025, 10:30 AM";
  const lastUpdated = "28 Nov 2025, 02:15 PM";
  const enrolledBy = "Admin User";

  const handleLoadImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // ===== camera/enrol state =====
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [running, setRunning] = useState(false);
  const [enrolmentId, setEnrolmentId] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<PhaseInfo>(null);
  const [count, setCount] = useState(0);
  const [required, setRequired] = useState(200);

  const studentLabel = useMemo(() => {
    const firstName = (userData.name || "").split(" ")[0] || "User";
    return `${userData.userId}_${firstName}`.trim();
  }, [userData.name, userData.userId]);

  function stopCaptureLoop() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }

  async function startCamera() {
    setError(null);
    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      setCameraOn(true);
      setStatus("Camera requested...");
    } catch (e: any) {
      setError(e?.message ?? "Could not access camera");
      setStatus("Camera failed.");
    }
  }
  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const onLoaded = () => {
      setCameraReady(true);
      setStatus("Camera ready.");
    };

    video.addEventListener("loadedmetadata", onLoaded);

    video.play().catch(() => null);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [cameraOn]);

  function stopCamera() {
    const stream = streamRef.current;
    stream?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setCameraOn(false);
    setCameraReady(false);
  }

  async function takePhotoPreview() {
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!cameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera not ready yet — wait 1 second and try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setUploadedImage(dataUrl);
    setStatus("Photo captured (preview).");
  }

  async function startEnrolmentAndCapture() {
    setError(null);

    if (!cameraOn) {
      setError("Please click Start Camera first.");
      return;
    }
    if (!cameraReady) {
      setError("Camera not ready yet. Wait 1 second and try again.");
      return;
    }

    setStatus("Starting enrolment...");

    try {
      const res = await fetch(`${API_URL}/ai/enrolment/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_label: studentLabel }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(JSON.stringify(data ?? { error: "Failed to start enrolment" }));
        setStatus("Failed to start.");
        return;
      }

      setEnrolmentId(data.enrolment_id);
      setRequired(data.capture_count ?? 200);
      setPhase(data.phase ?? null);
      setCount(0);

      setStatus("Capturing...");
      setRunning(true);

      timerRef.current = window.setInterval(async () => {
        await captureAndSendFrame(data.enrolment_id);
      }, 350);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
      setStatus("Network error");
    }
  }

  async function captureAndSendFrame(id: string) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
    );
    if (!blob) return;

    const form = new FormData();
    form.append("enrolment_id", id);
    form.append("image", blob, "frame.jpg");

    try {
      const res = await fetch(`${API_URL}/ai/enrolment/frame`, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(JSON.stringify(data ?? { error: "Backend rejected frame" }));
        setStatus("Backend rejected frame.");
        return;
      }

      if (data.accepted) {
        setCount(data.count ?? 0);
        setPhase(data.phase ?? null);

        if (data.done) {
          setStatus("Capture complete!");
          stopCaptureLoop();
          await finishEnrolment(id);
        } else {
          setStatus("Capturing...");
        }
      } else {
        setStatus(`Waiting... (${data.reason ?? "not accepted"})`);
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
      setStatus("Network error");
    }
  }

  async function finishEnrolment(id: string) {
    setStatus("Finalizing...");
    try {
      const res = await fetch(
        `${API_URL}/ai/enrolment/finish?enrolment_id=${encodeURIComponent(id)}`,
        { method: "POST" }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(JSON.stringify(data ?? { error: "Finish failed" }));
        setStatus("Finish failed.");
        return;
      }

      setStatus("Done! Profile updated.");
      showToast("Biometric Profile Updated!");

      stopCamera();
      setRunning(false);
    } catch (e: any) {
      setError(e?.message ?? "Network error");
      setStatus("Network error");
    }
  }

  useEffect(() => {
    return () => {
      stopCaptureLoop();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const instructionText =
    phase ? `${phase.instruction} (phase ${phase.idx + 1}: ${phase.done}/${phase.need})` : "—";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl">Attendify</h1>
              <p className="text-sm text-gray-600">Admin Portal</p>
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
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Admin User</p>
                <p className="text-sm text-gray-600">System Administrator</p>
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
                  <AlertDialogDescription>Are you sure ?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={onLogout}>Log out</AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage Biometric Profile
        </Button>

        <div className="mb-8">
          <h2 className="text-3xl mb-2">Update Biometric Profile</h2>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Biometric Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">User ID:</p>
              <p className="font-medium">{userData.userId}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">User Name:</p>
              <p className="font-medium">{userData.name}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Role:</p>
              <p className="font-medium">{userData.role}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Current Status:</p>
              <p className="font-medium">{currentStatus}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Profile ID:</p>
              <p className="font-medium">{profileId}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Enrolled On:</p>
              <p className="font-medium">{enrolledOn}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Last Updated:</p>
              <p className="font-medium">{lastUpdated}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Enrolled By:</p>
              <p className="font-medium">{enrolledBy}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Update Method:</p>
              <Select value={updateMethod} onValueChange={setUpdateMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Update Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facial Recognition">Facial Recognition</SelectItem>
                  <SelectItem value="Fingerprint">Fingerprint</SelectItem>
                  <SelectItem value="Iris Scan">Iris Scan</SelectItem>
                  <SelectItem value="Voice Recognition">Voice Recognition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Upload / Preview Image:</p>
              <Button variant="outline" className="w-full justify-start" onClick={handleLoadImage}>
                <Upload className="h-4 w-4 mr-2" />
                Load Image
              </Button>
              {uploadedImage && (
                <div className="mt-4 border rounded-lg p-4">
                  <img
                    src={uploadedImage}
                    alt="Uploaded biometric"
                    className="max-w-full h-auto max-h-64 mx-auto rounded-lg"
                  />
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Notes:</p>
              <Textarea
                placeholder="Enter any additional notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full"
              />
            </div>

            <div className="flex justify-center gap-4 pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>Update Biometric Profile</Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="max-w-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Update Biometric Profile</AlertDialogTitle>
                    <AlertDialogDescription>
                      We will capture face crops following guided phases. The first accepted “look straight”
                      will be saved as the profile picture.
                      <div className="mt-2 text-xs text-gray-500">
                        Enrolment label: <code>{studentLabel}</code>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3">
                    {!cameraOn ? (
                      <>
                        <Camera className="h-16 w-16 text-gray-400" />
                        <div className="text-gray-500">Camera preview will appear here</div>
                        <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
                          Start Camera
                        </Button>
                      </>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-[320px] rounded-lg bg-black object-cover"
                          playsInline
                          muted
                          autoPlay
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="text-sm text-gray-600">
                          <b>Status:</b> {status} &nbsp;|&nbsp; <b>Progress:</b> {count}/{required}
                        </div>
                        <div className="text-sm text-gray-600">
                          <b>Instruction:</b> {instructionText}
                        </div>

                        <div className="flex gap-2 flex-wrap justify-center">
                          <Button
                            onClick={takePhotoPreview}
                            variant="outline"
                            disabled={!cameraReady}
                          >
                            Take Photo (Preview)
                          </Button>

                          <Button
                            onClick={startEnrolmentAndCapture}
                            disabled={running || !cameraReady}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start Capture
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => {
                              stopCaptureLoop();
                              setStatus("Stopped.");
                            }}
                            disabled={!running}
                          >
                            Stop
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="text-sm text-red-600">
                      <b>Error:</b> {error}
                    </div>
                  )}

                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => {
                        stopCaptureLoop();
                        stopCamera();
                        setError(null);
                        setStatus("Idle");
                        setPhase(null);
                        setCount(0);
                        setRequired(200);
                        setEnrolmentId(null);
                        setCameraOn(false);
                        setRunning(false);
                        setCameraReady(false);
                      }}
                    >
                      Close
                    </AlertDialogCancel>

                    <AlertDialogAction
                      onClick={() => {
                        if (enrolmentId && count >= required) finishEnrolment(enrolmentId);
                      }}
                      disabled={!enrolmentId || count < required || running}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Finish
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
