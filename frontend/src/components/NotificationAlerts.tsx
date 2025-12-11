import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { AlertTriangle, XCircle } from "lucide-react";

interface AttendanceNotRecordedAlert {
  type: "not_recorded";
  studentId: string;
  studentName: string;
  module: string;
  date: string;
  attendanceStatus: string;
  reason: string;
  attendanceMethod: string;
  cameraLocation: string;
  timestamp: string;
  suggestedAction: string;
}

interface AttendanceBelowThresholdAlert {
  type: "below_threshold";
  studentId: string;
  studentName: string;
  module: string;
  date: string;
  attendanceStatus: string;
  currentAttendance: number;
  threshold: number;
  recentSessionsMissed: number;
  totalRecentSessions: number;
  impact: string;
  suggestedAction: string;
}

type NotificationAlert = AttendanceNotRecordedAlert | AttendanceBelowThresholdAlert;

interface NotificationAlertsProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: NotificationAlert[];
}

export function NotificationAlerts({
  isOpen,
  onClose,
  alerts,
}: NotificationAlertsProps) {
  const handleCloseAlert = (index: number) => {
    // In a real application, you would remove this specific alert
    console.log(`Close alert at index ${index}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Alerts</DialogTitle>
          <DialogDescription>Manage and respond to attendance alerts.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications at this time.
            </div>
          ) : (
            alerts.map((alert, index) => (
              <Card key={index} className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  {alert.type === "not_recorded" ? (
                    <>
                      <div className="flex items-start gap-3 mb-4">
                        <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg mb-4">Attendance Not Recorded</h3>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Student ID:</p>
                              <p className="font-medium">{alert.studentId}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Student Name:</p>
                              <p className="font-medium">{alert.studentName}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Module:</p>
                              <p className="font-medium">{alert.module}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Date:</p>
                              <p className="font-medium">{alert.date}</p>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">Attendance Status:</p>
                              <p className="font-medium text-red-600">{alert.attendanceStatus}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Reason:</p>
                              <p className="font-medium">{alert.reason}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Attendance Method:</p>
                              <p className="font-medium">{alert.attendanceMethod}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Camera Location:</p>
                              <p className="font-medium">{alert.cameraLocation}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Timestamp:</p>
                              <p className="font-medium">{alert.timestamp}</p>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">Suggested Action:</p>
                              <p className="font-medium">{alert.suggestedAction}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-center pt-4 border-t">
                        <Button onClick={() => handleCloseAlert(index)} variant="outline">
                          Close
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg mb-4">Attendance Below Threshold</h3>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Student ID:</p>
                              <p className="font-medium">{alert.studentId}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Student Name:</p>
                              <p className="font-medium">{alert.studentName}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Module:</p>
                              <p className="font-medium">{alert.module}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Date:</p>
                              <p className="font-medium">{alert.date}</p>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">Attendance Status:</p>
                              <p className="font-medium text-orange-600">{alert.attendanceStatus}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Current Attendance:</p>
                              <p className="font-medium">
                                {alert.currentAttendance}% (Threshold: {alert.threshold}%)
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Recent Sessions Missed:</p>
                              <p className="font-medium">
                                {alert.recentSessionsMissed} of last {alert.totalRecentSessions}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-gray-600">Impact:</p>
                              <p className="font-medium">{alert.impact}</p>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">Suggested Action:</p>
                              <p className="font-medium">{alert.suggestedAction}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-center pt-4 border-t">
                        <Button onClick={() => handleCloseAlert(index)} variant="outline">
                          Close
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}