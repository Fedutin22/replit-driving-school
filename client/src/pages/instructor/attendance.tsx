import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle } from "lucide-react";
import type { Schedule, User } from "@shared/schema";

type ScheduleWithDetails = Schedule & {
  course: { id: string; title: string };
  topic: { id: string; title: string } | null;
  instructor: { id: string; name: string };
  registrationCount: number;
};

type StudentAttendance = {
  studentId: string;
  student: User;
  status: 'present' | 'absent' | null;
  markedAt: Date | null;
};

export default function InstructorAttendance() {
  const { toast } = useToast();
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<ScheduleWithDetails[]>({
    queryKey: ['/api/schedules'],
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<StudentAttendance[]>({
    queryKey: [`/api/instructor/schedules/${selectedSchedule}/attendance`],
    enabled: !!selectedSchedule,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ scheduleId, studentId, status }: { scheduleId: string; studentId: string; status: 'present' | 'absent' }) => {
      return apiRequest('POST', `/api/instructor/schedules/${scheduleId}/attendance`, { studentId, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/instructor/schedules/${selectedSchedule}/attendance`] });
      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    },
  });

  const upcomingSchedules = schedules.filter(s => new Date(s.startTime) > new Date());
  const pastSchedules = schedules.filter(s => new Date(s.startTime) <= new Date());

  const selectedScheduleData = schedules.find(s => s.id === selectedSchedule);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-attendance-title">Attendance Tracking</h1>
        <p className="text-muted-foreground">Mark attendance for your scheduled sessions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select a Session</h2>
          
          {schedulesLoading ? (
            <Card>
              <CardContent className="p-6">Loading sessions...</CardContent>
            </Card>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="p-6">No scheduled sessions found.</CardContent>
            </Card>
          ) : (
            <>
              {upcomingSchedules.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Upcoming Sessions</h3>
                  {upcomingSchedules.map(schedule => (
                    <Card
                      key={schedule.id}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        selectedSchedule === schedule.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedSchedule(schedule.id)}
                      data-testid={`card-schedule-${schedule.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold">{schedule.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{schedule.course.title}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(schedule.startTime).toLocaleDateString('en-US', { 
                                timeZone: 'Europe/Riga',
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(schedule.startTime).toLocaleTimeString('en-US', { 
                                timeZone: 'Europe/Riga',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {schedule.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {schedule.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {schedule.registrationCount}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {pastSchedules.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Past Sessions</h3>
                  {pastSchedules.slice(0, 5).map(schedule => (
                    <Card
                      key={schedule.id}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        selectedSchedule === schedule.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedSchedule(schedule.id)}
                      data-testid={`card-schedule-${schedule.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold">{schedule.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{schedule.course.title}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(schedule.startTime).toLocaleDateString('en-US', { 
                                timeZone: 'Europe/Riga',
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(schedule.startTime).toLocaleTimeString('en-US', { 
                                timeZone: 'Europe/Riga',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {schedule.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {schedule.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {schedule.registrationCount}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Mark Attendance</h2>
          
          {!selectedSchedule ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Select a session to mark attendance
              </CardContent>
            </Card>
          ) : studentsLoading ? (
            <Card>
              <CardContent className="p-6">Loading students...</CardContent>
            </Card>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No students registered for this session
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedScheduleData?.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedScheduleData && new Date(selectedScheduleData.startTime).toLocaleDateString('en-US', { 
                    timeZone: 'Europe/Riga',
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {students.map(({ studentId, student, status }) => (
                  <div
                    key={studentId}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border"
                    data-testid={`row-student-${studentId}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'present' && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Present
                        </Badge>
                      )}
                      {status === 'absent' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Absent
                        </Badge>
                      )}
                      {!status && (
                        <Badge variant="outline">Not marked</Badge>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={status === 'present' ? 'default' : 'outline'}
                          onClick={() => markAttendanceMutation.mutate({ 
                            scheduleId: selectedSchedule, 
                            studentId, 
                            status: 'present' 
                          })}
                          disabled={markAttendanceMutation.isPending}
                          data-testid={`button-mark-present-${studentId}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={status === 'absent' ? 'destructive' : 'outline'}
                          onClick={() => markAttendanceMutation.mutate({ 
                            scheduleId: selectedSchedule, 
                            studentId, 
                            status: 'absent' 
                          })}
                          disabled={markAttendanceMutation.isPending}
                          data-testid={`button-mark-absent-${studentId}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
