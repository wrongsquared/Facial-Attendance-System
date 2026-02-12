import { useState, useRef, useEffect, useMemo } from "react";
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
  Lock,

  User,
  Camera,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { StudentProfileData } from "../types/studentinnards";
import { getStudentFullProfile, updateStudentProfile } from "../services/api";
import { ProfileUpdateData } from "../types/auth";
import { Textarea } from "./ui/textarea";

const API_URL = "http://localhost:8000";

type PhaseInfo = {
  idx: number;
  instruction: string;
  need: number;
  done: number;
} | null;

interface StudentProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
  onOpenNotifications: () => void;
}

export function StudentProfile({
  onNavigateToProfile,
  onBack,
  onOpenNotifications
}: StudentProfileProps) {
  const { token, user, updateUserPhoto } = useAuth();
  const [loading, setLoading] = useState(true);

  // Biometric enrollment state - true if enrolled, false if not
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState<boolean | null>(null); // Will be fetched from backend

  // Biometric dialog state
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [showUpdateBiometricDialog, setShowUpdateBiometricDialog] = useState(false);
  const [showDeleteBiometricDialog, setShowDeleteBiometricDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ========= NEW: biometric metadata (stop hardcoding dates) =========
  const [biometricLastUpdated, setBiometricLastUpdated] = useState<string | null>(null);
  const [biometricPreviewImage, setBiometricPreviewImage] = useState<string | null>(null);
  // If backend gives a persistent URL, store it here:
  const [biometricImageUrl, setBiometricImageUrl] = useState<string | null>(null);
  // Store images from all 5 angles for viewing - HARDCODED: Initialize with demo images

  // replace with your own face angle images in the bucket
  const [biometricImages, setBiometricImages] = useState<Array<{ angle: string, url: string }>>([]);
  const [loadingBiometricImages, setLoadingBiometricImages] = useState(false);
  const [loadingImages, setLoadingImages] = useState(true);
  // ========= Camera state =========
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========= 200-frame enrolment state =========
  const [running, setRunning] = useState(false);
  const [enrolmentId, setEnrolmentId] = useState<string | null>(null);
  const [phase, setPhase] = useState<PhaseInfo>(null);
  const [count, setCount] = useState(0);
  const [required, setRequired] = useState(200);
  const [status, setStatus] = useState<string>("Idle");
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Mock face images - in a real app, these would be fetched from the backend
  const faceImages = [
    { id: 1, label: "Front View" },
    { id: 2, label: "Left Profile" },
    { id: 3, label: "Right Profile" },
  ];

  const [saving, setSaving] = useState(false);

  // Validation error state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Form State
  const [formData, setFormData] = useState<StudentProfileData>({
    studentID: "",
    name: "",
    email: "",
    studentNum: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: ""
  });

  const studentLabel = useMemo(() => {
    const safeName = (formData.name || "user")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
    const id = formData.studentNum || "000000";
    return `${safeName}_${id}`;
  }, [formData.name, formData.studentNum]);

  // Validation function
  // Function to fetch biometric enrollment status
  const fetchBiometricStatus = async (studentNum: string) => {
    if (!studentNum) return;

    try {
      const response = await fetch(`${API_URL}/profile/status?student_num=${encodeURIComponent(studentNum)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Biometric status response:', data);
        setIsBiometricEnrolled(data.enrolled || false);
        if (data.last_updated) {
          setBiometricLastUpdated(data.last_updated);
        }
        if (data.profile_image_url) {
          console.log('Setting biometric image URL:', data.profile_image_url);
          setBiometricImageUrl(data.profile_image_url);
          // Update the user photo in AuthContext so navbar shows the new image
          updateUserPhoto(data.profile_image_url);
        }
      } else {
        setIsBiometricEnrolled(false);
      }
    } catch (error) {
      console.error('Failed to fetch biometric status:', error);
      setIsBiometricEnrolled(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.contactNumber?.trim()) {
      errors.contactNumber = "Contact number is required";
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.contactNumber)) {
      errors.contactNumber = "Please enter a valid contact number";
    }

    if (!formData.address?.trim()) {
      errors.address = "Address is required";
    }

    if (!formData.emergencyContactName?.trim()) {
      errors.emergencyContactName = "Emergency contact name is required";
    }

    if (!formData.emergencyContactRelationship?.trim()) {
      errors.emergencyContactRelationship = "Relationship is required";
    }

    if (!formData.emergencyContactNumber?.trim()) {
      errors.emergencyContactNumber = "Emergency contact number is required";
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.emergencyContactNumber)) {
      errors.emergencyContactNumber = "Please enter a valid contact number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!token || !user) return;
    if (!validateForm()) return;

    setSaving(true);

    const payload: ProfileUpdateData = {
      name: formData.name,
      email: formData.email,
      contactNumber: formData.contactNumber || "",
      address: formData.address || "",
      emergencyContactName: formData.emergencyContactName || "",
      emergencyContactRelationship: formData.emergencyContactRelationship || "",
      emergencyContactNumber: formData.emergencyContactNumber || ""
    };

    try {
      await updateStudentProfile(token, payload);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
      setIsEditMode(false);
    }
  };

  // Fetch Data on Mount
  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getStudentFullProfile(token);

        setFormData({
          studentID: data.studentID || "",
          name: data.name || "",
          email: data.email || "",
          studentNum: data.studentNum || "",
          contactNumber: data.contactNumber || "",
          address: data.address || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactRelationship: data.emergencyContactRelationship || "",
          emergencyContactNumber: data.emergencyContactNumber || ""
        });

        // Fetch biometric status after getting student data
        if (data.studentNum) {
          await fetchBiometricStatus(data.studentNum);
        }

      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingImages(true);
        const response = await fetch(`${API_URL}/biometric/${formData.studentNum}/images`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setBiometricImages(data.images);
        }
      } catch (error) {
        console.error('Failed to fetch biometric images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    if (formData.studentNum) fetchImages();
  }, [formData.studentNum, token]);

  // ========= fetch all 5 biometric images for viewing =========
  const fetchBiometricImages = async () => {
    if (!formData.studentNum || !token) return;

    setLoadingBiometricImages(true);
    try {
      console.log('Fetching biometric images for student:', formData.studentNum);
      const response = await fetch(`${API_URL}/biometric/${formData.studentNum}/images`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Biometric images response:', data);
        setBiometricImages(data.images || []);
      } else {
        console.error('Failed to fetch biometric images:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch biometric images:', error);
      setBiometricImages([]);
    } finally {
      setLoadingBiometricImages(false);
    }

  };

  // Handle Input Changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> // Update this line
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
    if (validationErrors[id]) {
      setValidationErrors((prev) => ({
        ...prev,
        [id]: ""
      }));
    }
  };

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  const handleCancel = () => {
    setIsEditMode(false);
    setValidationErrors({});
  };

  const handleUpdateProfile = () => {
    setIsEditMode(true);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? faceImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === faceImages.length - 1 ? 0 : prev + 1
    );
  };

  function stopCaptureLoop() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  }

  // ========= Camera start/stop (reliable mount-safe) =========
  const startCamera = async () => {
    setCameraError(null);
    setEnrolError(null);
    setStatus("Requesting camera...");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera not supported in this browser. Please use file upload instead.");
      setStatus("Camera not supported.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);
      setCameraReady(false); // will become true when metadata loads
      setStatus("Camera ready.");
    } catch (err: any) {
      if (err?.name === "NotFoundError") {
        setCameraError("No camera found. Please use file upload instead.");
      } else if (err?.name === "NotAllowedError") {
        setCameraError("Camera access denied. Please enable camera permissions.");
      } else {
        setCameraError("Unable to access camera. Please use file upload instead.");
      }
      setStatus("Camera failed.");
    }
  };

  // Attach stream only after <video> exists
  useEffect(() => {
    if (!isCameraActive) return;
    const v = videoRef.current;
    const s = streamRef.current;
    if (!v || !s) return;

    v.srcObject = s;

    const onLoaded = () => setCameraReady(true);
    v.addEventListener("loadedmetadata", onLoaded);

    v.play().catch(() => null);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [isCameraActive]);

  const stopCamera = () => {
    const stream = streamRef.current;
    stream?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setCameraReady(false);
  };

  // ========= Capture one frame to preview (optional) =========
  const capturePreviewFrame = () => {
    const video = videoRef.current;
    if (!video) return null;

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;

    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.9);
  };

  // ========= Start 200-frame enrolment =========
  const startEnrolmentAndCapture = async () => {
    setEnrolError(null);

    if (!isCameraActive) {
      setEnrolError("Please click Start Camera first.");
      return;
    }
    if (!cameraReady) {
      setEnrolError("Camera is not ready yet (wait 1 second and try again).");
      return;
    }

    setStatus("Starting enrolment...");

    try {
      const startres = await fetch(`${API_URL}/enrolment/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          student_label: studentLabel,
          student_name: formData.name,
          student_num: formData.studentNum,
          student_id: formData.studentID,
          // Work around
        }),
      });

      const data = await startres.json().catch(() => null);

      if (!startres.ok) {
        setEnrolError(JSON.stringify(data ?? { error: "Failed to start enrolment" }));
        setStatus("Failed to start.");
        return;
      }

      setEnrolmentId(data.enrolment_id);
      setRequired(data.capture_count ?? 200);
      setPhase(data.phase ?? null);
      setCount(0);

      setRunning(true);
      setStatus("Capturing...");

      timerRef.current = window.setInterval(async () => {
        await captureAndSendFrame(data.enrolment_id);
      }, 250);

    } catch (e: any) {
      setEnrolError(e?.message ?? "Network error");
      setStatus("Network error");
    }
  };

  const captureAndSendFrame = async (id: string) => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;

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
      const frameres = await fetch(`${API_URL}/enrolment/frame`, {
        method: "POST",
        body: form,
      });

      const data = await frameres.json().catch(() => null);

      if (!frameres.ok) {
        setEnrolError(JSON.stringify(data ?? { error: "Backend rejected frame" }));
        setStatus("Backend rejected frame.");
        return;
      }

      if (data.accepted) {
        // If backend returns a "profile_saved" or "first_good_frame" moment,
        // you can update preview here.
        if (!biometricPreviewImage) {
          const preview = capturePreviewFrame();
          if (preview) setBiometricPreviewImage(preview);
        }

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
      setEnrolError(e?.message ?? "Network error");
      setStatus("Network error");
    }
  };

  const finishEnrolment = async (id: string) => {
    setStatus("Finalizing...");

    try {
      const finishres = await fetch(
        `${API_URL}/enrolment/finish?enrolment_id=${encodeURIComponent(id)}`,
        { method: "POST" }
      );

      const data = await finishres.json().catch(() => null);

      if (!finishres.ok) {
        setEnrolError(JSON.stringify(data ?? { error: "Finish failed" }));
        setStatus("Finish failed.");
        return;
      }

      // ✅ update UI immediately
      setStatus("Done! Profile updated.");
      setIsBiometricEnrolled(true);

      // ✅ last updated should be NOW unless backend gives a real timestamp
      const now = new Date();
      setBiometricLastUpdated(now.toISOString());

      // ✅ if backend returns a stored URL, use it (this updates the profile preview immediately)
      if (data.profile_image_url) {
        setBiometricImageUrl(data.profile_image_url);
        // Update the user photo in AuthContext so navbar shows the new image
        updateUserPhoto(data.profile_image_url);
      }
      if (data.last_updated) setBiometricLastUpdated(data.last_updated);

      stopCamera();
      setRunning(false);

      alert("Biometric profile updated successfully!");

      // Refresh biometric status to show updated enrollment
      if (formData.studentNum) {
        await fetchBiometricStatus(formData.studentNum);
      }

      setShowUpdateBiometricDialog(false);

    } catch (e: any) {
      setEnrolError(e?.message ?? "Network error");
      setStatus("Network error");
    }
  };

  // Cleanup camera/capture when dialogs close
  useEffect(() => {
    if (!showUpdateBiometricDialog && !showEnrollDialog) {
      stopCaptureLoop();
      stopCamera();
      setRunning(false);
      setEnrolmentId(null);
      setPhase(null);
      setCount(0);
      setRequired(200);
      setStatus("Idle");
      setEnrolError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpdateBiometricDialog, showEnrollDialog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCaptureLoop();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const instructionText =
    phase ? `${phase.instruction} (phase ${phase.idx + 1}: ${phase.done}/${phase.need})` : "—";

  const lastUpdatedText = biometricLastUpdated
    ? new Date(biometricLastUpdated).toLocaleString()
    : "—";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Student Profile"
        onNavigateToProfile={onNavigateToProfile}
        onOpenNotifications={onOpenNotifications} />

      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" className="mb-6" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h2 className="text-3xl mb-2">View Profile</h2>
          <p className="text-gray-600">
            {isEditMode
              ? "Update your personal information and emergency contacts"
              : "View your personal information and emergency contacts"}
          </p>
        </div>

        <div className="max-w-3xl">
          {/* Biometric Enrollment Profile */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Biometric Enrollment Profile</CardTitle>
              <CardDescription>
                Manage biometric data for attendance verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Face Recognition</span>
                  <span className={`font-semibold ${isBiometricEnrolled === null
                    ? 'text-gray-500'
                    : isBiometricEnrolled
                      ? 'text-green-600'
                      : 'text-red-600'
                    }`}>
                    {isBiometricEnrolled === null ? 'Loading...' : isBiometricEnrolled ? 'Enrolled' : 'Not Enrolled'}
                  </span>
                </div>

                {isBiometricEnrolled === null ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading biometric status...</p>
                  </div>
                ) : isBiometricEnrolled ? (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      Last updated on {lastUpdatedText}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Your biometric data is currently being used for automated attendance
                    </p>

                    {/* show preview image if we have one */}
                    {(biometricImageUrl || biometricPreviewImage) && (
                      <div className="mb-4">
                        <img
                          src={biometricImageUrl ?? biometricPreviewImage ?? ""}
                          alt="Biometric profile"
                          className="w-full max-w-md rounded-lg border bg-white"
                          onError={(e) => {
                            console.error('Failed to load biometric image:', e.currentTarget.src);
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('Biometric image loaded successfully');
                          }}
                        />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => {
                        // HARDCODED: Always show images regardless of enrollment status
                        fetchBiometricImages();
                        setShowBiometricDialog(true);
                      }}>
                        View
                      </Button>
                      <Button variant="outline" onClick={() => setShowUpdateBiometricDialog(true)}>
                        Update
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => setShowDeleteBiometricDialog(true)}
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Enroll your face profile to enable touchless attendance tracking on campus.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => setShowEnrollDialog(true)}
                      >
                        Start Capture
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-start gap-3 mt-4 p-3 bg-blue-50 rounded-lg">
                <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  Biometric data is encrypted and stored securely according to university privacy policy. It is solely used for identity verification.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name:</Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Input id="name" type="text" value={formData.name} className="h-12" disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID:</Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Input id="studentId" type="text" value={formData.studentNum} className="h-12" disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email:</Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} className="h-12" disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number: <span className="text-red-500">*</span>
                </Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Input
                    id="contactNumber"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className={`h-12 ${validationErrors.contactNumber ? 'border-red-500' : ''}`}
                    disabled={!isEditMode}
                  />
                )}
                {validationErrors.contactNumber && (
                  <p className="text-sm text-red-500">{validationErrors.contactNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Address: <span className="text-red-500">*</span>
                </Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`h-12 ${validationErrors.address ? 'border-red-500' : ''}`}
                    disabled={!isEditMode}
                  />)}
                {validationErrors.address && (
                  <p className="text-sm text-red-500">{validationErrors.address}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Provide emergency contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">
                  Contact Name: <span className="text-red-500">*</span>
                </Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Input
                    id="emergencyContactName"
                    type="text"
                    onChange={handleChange}
                    value={formData.emergencyContactName}
                    className={`h-12 ${validationErrors.emergencyContactName ? 'border-red-500' : ''}`}
                    disabled={!isEditMode}
                  />
                )}
                {validationErrors.emergencyContactName && (
                  <p className="text-sm text-red-500">{validationErrors.emergencyContactName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">
                  Relationship: <span className="text-red-500">*</span>
                </Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Input
                    id="emergencyContactRelationship"
                    type="text"
                    onChange={handleChange}
                    value={formData.emergencyContactRelationship}
                    className={`h-12 ${validationErrors.emergencyContactRelationship ? 'border-red-500' : ''}`}
                    disabled={!isEditMode}
                  />
                )}
                {validationErrors.emergencyContactRelationship && (
                  <p className="text-sm text-red-500">{validationErrors.emergencyContactRelationship}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactNumber">
                  Contact Number: <span className="text-red-500">*</span>
                </Label>
                {loading ? (
                  <div className="animate-hard-pulse h-12 w-full bg-gray-200 rounded-md" />
                ) : (
                  <Input
                    id="emergencyContactNumber"
                    type="tel"
                    onChange={handleChange}
                    value={formData.emergencyContactNumber}
                    className={`h-12 ${validationErrors.emergencyContactNumber ? 'border-red-500' : ''}`}
                    disabled={!isEditMode}
                  />
                )}
                {validationErrors.emergencyContactNumber && (
                  <p className="text-sm text-red-500">{validationErrors.emergencyContactNumber}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {isEditMode ? (
            <div className="flex items-center justify-center gap-6 mt-6">
              <Button variant="outline" size="lg" onClick={handleCancel} className="w-40">
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={handleSave}
                disabled={saving}
                className="w-40 bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center mt-6">
              <Button size="lg" onClick={handleUpdateProfile} className="w-48 bg-blue-600 text-white hover:bg-blue-700">
                Update Profile
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Update Biometric Profile Dialog */}
      <Dialog open={showUpdateBiometricDialog} onOpenChange={setShowUpdateBiometricDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Update Biometric Profile</DialogTitle>
            <DialogDescription asChild>
              <div> {/* This is the SINGLE child React is looking for */}
                Capture 200 guided frames and upload them to the backend.
                <div className="mt-2 text-xs text-gray-500">
                  Enrolment label: <code>{studentLabel}</code>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">User ID:</p>
                <p className="font-semibold">{formData.studentNum}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated:</p>
                <p className="font-semibold">{lastUpdatedText}</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[360px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center gap-4 w-full">
                {cameraError ? (
                  <>
                    <div className="text-center">
                      <Camera className="h-24 w-24 text-red-400 mx-auto mb-4" />
                      <p className="text-red-600 mb-4">{cameraError}</p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          alert("Photo uploaded (but not yet sent to enrolment pipeline).");
                        }
                      }}
                    />

                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </>
                ) : isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-72 rounded-lg bg-black object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="text-sm text-gray-600">
                      <b>Status:</b> {status} &nbsp;|&nbsp; <b>Progress:</b> {count}/{required}
                    </div>
                    <div className="text-sm text-gray-600">
                      <b>Instruction:</b> {instructionText}
                    </div>

                    {enrolError && (
                      <div className="text-sm text-red-600">
                        <b>Error:</b> {enrolError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={startEnrolmentAndCapture}
                        disabled={!formData.studentID || running}
                      >
                        Start 200 Capture
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
                      <Button
                        variant="outline"
                        onClick={stopCamera}
                        disabled={running}
                      >
                        Close Camera
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="h-24 w-24 text-gray-400" />
                    <p className="text-gray-600">Camera preview will appear here</p>
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={startCamera}>
                      Start Camera
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowUpdateBiometricDialog(false)}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  alert("Click 'Start 200 Capture' to actually update biometrics.");
                }}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Biometric Profile Dialog */}
      <Dialog open={showDeleteBiometricDialog} onOpenChange={setShowDeleteBiometricDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Delete Biometric Profile</DialogTitle>
            <DialogDescription>Confirm deletion of your biometric data</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-center text-gray-700">This will remove the stored biometric data for:</p>
            <p className="text-center font-semibold mt-2">
              User: {formData.name} (User ID: {formData.studentNum})
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteBiometricDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                try {
                  if (formData.studentNum && token) {
                    const response = await fetch(`${API_URL}/biometric/${formData.studentNum}`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });

                    if (response.ok) {
                      // Refresh biometric status after deletion
                      await fetchBiometricStatus(formData.studentNum);
                      // Clear the profile photo from AuthContext
                      updateUserPhoto("");
                      alert("Biometric profile deleted successfully");
                    } else {
                      throw new Error('Failed to delete biometric profile');
                    }
                  } else {
                    // Fallback for mock delete
                    setIsBiometricEnrolled(false);
                    setBiometricImageUrl(null);
                    setBiometricPreviewImage(null);
                    setBiometricLastUpdated(null);
                    alert("Biometric profile deleted");
                  }
                } catch (error) {
                  console.error('Failed to delete biometric profile:', error);
                  alert("Failed to delete biometric profile. Please try again.");
                }
                setShowDeleteBiometricDialog(false);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Biometric Profile Dialog (unchanged placeholder) */}
      <Dialog open={showBiometricDialog} onOpenChange={setShowBiometricDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">View Biometric Profile</DialogTitle>
            <DialogDescription>
              View your enrolled biometric face data and verification images
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">User ID:</p>
                <p className="font-semibold">{formData.studentNum}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date Enrolled:</p>
                <p className="font-semibold">{lastUpdatedText}</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              {loadingBiometricImages ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-gray-500">Loading biometric images...</p>
                </div>
              ) : biometricImages.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-4">Captured Face Angles ({biometricImages.length}/5)</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {biometricImages.map((image, index) => (
                      <div key={image.angle} className="flex flex-col items-center space-y-2">
                        <div className="w-40 h-40 bg-gray-100 rounded-lg overflow-hidden border">
                          <img
                            src={image.url}
                            alt={`${image.angle} view`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-full h-full flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-600">
                          {image.angle}
                        </p>
                      </div>
                    ))}
                  </div>
                  {biometricImages.length < 5 && (
                    <p className="text-sm text-amber-600 mt-4">Some angles may be missing. Consider re-enrolling for complete coverage.</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <User className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No biometric images found</p>
                    <p className="text-sm text-gray-400">Please enroll first to view images</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Biometric Profile Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Enroll Biometric Profile</DialogTitle>
            <DialogDescription asChild>
              <div> {/* This is the SINGLE child React is looking for */}
                Capture 200 guided frames and upload them to the backend.
                <div className="mt-2 text-xs text-gray-500">
                  Enrolment label: <code>{studentLabel}</code>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">User ID:</p>
                <p className="font-semibold">{formData.studentNum}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status:</p>
                <p className="font-semibold">New Enrollment</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[360px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center gap-4 w-full">
                {cameraError ? (
                  <>
                    <div className="text-center">
                      <Camera className="h-24 w-24 text-red-400 mx-auto mb-4" />
                      <p className="text-red-600 mb-4">{cameraError}</p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          alert("Photo uploaded (but not yet sent to enrolment pipeline).");
                        }
                      }}
                    />

                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </>
                ) : isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-72 rounded-lg bg-black object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="text-sm text-gray-600">
                      <b>Status:</b> {status} &nbsp;|&nbsp; <b>Progress:</b> {count}/{required}
                    </div>
                    <div className="text-sm text-gray-600">
                      <b>Instruction:</b> {instructionText}
                    </div>

                    {enrolError && (
                      <div className="text-sm text-red-600">
                        <b>Error:</b> {enrolError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={startEnrolmentAndCapture}
                        disabled={!formData.studentID || running}
                      >
                        Start 200 Capture
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
                      <Button
                        variant="outline"
                        onClick={stopCamera}
                        disabled={running}
                      >
                        Close Camera
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="h-24 w-24 text-gray-400" />
                    <p className="text-gray-600">Camera preview will appear here</p>
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={startCamera}>
                      Start Camera
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowEnrollDialog(false)}
              >
                Cancel
              </Button>

              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={async () => {
                  // After successful enrollment, refresh status from backend
                  if (formData.studentNum) {
                    await fetchBiometricStatus(formData.studentNum);
                  }
                  alert("Biometric profile enrolled successfully!");
                  setShowEnrollDialog(false);
                }}
              >
                Complete Enrollment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
