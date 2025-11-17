import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, MapPin, Users, BookOpen, User as UserIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import type { Schedule, Course, Topic, User } from "@shared/schema";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

interface ScheduleWithDetails extends Schedule {
  course: Course;
  topic: Topic | null;
  instructor: User;
  registeredStudentsCount: number;
  isRegistered?: boolean;
}

export default function SchedulePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");

  const { data: schedules, isLoading } = useQuery<ScheduleWithDetails[]>({
    queryKey: ["/api/schedules"],
  });

  const { data: instructors } = useQuery<User[]>({
    queryKey: ["/api/instructors"],
    enabled: user?.role === "admin" || user?.role === "instructor",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const registerMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiRequest("POST", `/api/schedules/${scheduleId}/register`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Registration Successful",
        description: "You have been registered for this session",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiRequest("DELETE", `/api/schedules/${scheduleId}/register`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Unregistered",
        description: "You have been removed from this session",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Unregistration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Filter schedules by selected instructor
  const filteredSchedules = schedules?.filter((schedule) => {
    if (selectedInstructor === "all") return true;
    return schedule.instructorId === selectedInstructor;
  });

  const getSchedulesForDay = (date: Date) => {
    if (!filteredSchedules) return [];
    return filteredSchedules.filter((schedule) =>
      isSameDay(parseISO(schedule.startTime.toString()), date)
    ).sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  };

  // Get unique instructors from schedules
  const instructorsList = instructors?.filter((u) => u.role === "instructor") || [];

  const previousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const nextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isStudent = user?.role === 'student';

  // Get dynamic time range from schedules
  const getTimeRange = () => {
    if (!filteredSchedules || filteredSchedules.length === 0) {
      return { minHour: 8, maxHour: 22 };
    }
    
    let minHour = 24;
    let maxHour = 0;
    
    filteredSchedules.forEach(schedule => {
      const start = new Date(schedule.startTime);
      const end = new Date(schedule.endTime);
      const startHour = start.getHours();
      const endHour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
      
      minHour = Math.min(minHour, startHour);
      maxHour = Math.max(maxHour, endHour);
    });
    
    // Ensure at least 8:00-22:00 range
    minHour = Math.min(8, minHour);
    maxHour = Math.max(22, maxHour);
    
    return { minHour, maxHour };
  };

  const { minHour, maxHour } = getTimeRange();
  const timeSlots = Array.from({ length: maxHour - minHour + 1 }, (_, i) => i + minHour);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-schedule">
            <CalendarIcon className="h-8 w-8" />
            Schedule Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            {isStudent ? "View your enrolled course sessions" : "View all scheduled sessions"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isStudent && instructorsList.length > 0 && (
            <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
              <SelectTrigger className="w-[200px]" data-testid="select-instructor-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Instructors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-all-instructors">All Instructors</SelectItem>
                {instructorsList.map((instructor) => (
                  <SelectItem 
                    key={instructor.id} 
                    value={instructor.id}
                    data-testid={`option-instructor-${instructor.id}`}
                  >
                    {instructor.firstName} {instructor.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={previousWeek} data-testid="button-previous-week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} data-testid="button-today">
            Today
          </Button>
          <Button variant="outline" onClick={nextWeek} data-testid="button-next-week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Week of {format(currentWeekStart, "MMMM d, yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1400px]">
                {/* Header with day names */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
                  <div className="p-3 border-r bg-muted/30"></div>
                  {weekDays.map((day, index) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={index}
                        className={`p-3 text-center border-r last:border-r-0 ${
                          isToday ? "bg-primary/5" : "bg-muted/30"
                        }`}
                      >
                        <div className="text-sm text-muted-foreground font-medium">
                          {format(day, "EEE")}
                        </div>
                        <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calendar grid with time axis */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                  {/* Time labels column */}
                  <div className="border-r bg-muted/30">
                    {timeSlots.map((hour) => (
                      <div 
                        key={hour} 
                        className="h-16 flex items-start justify-end pr-3 pt-1 text-xs text-muted-foreground font-medium border-b"
                      >
                        {hour}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, dayIndex) => {
                    const daySchedules = getSchedulesForDay(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={dayIndex}
                        className={`border-r last:border-r-0 ${
                          isToday ? "bg-primary/[0.02]" : ""
                        }`}
                      >
                        {timeSlots.map((hour) => {
                          // Find schedules that fall in this hour
                          const hourSchedules = daySchedules.filter(schedule => {
                            const start = new Date(schedule.startTime);
                            const startHour = start.getHours();
                            return startHour === hour;
                          });

                          return (
                            <div
                              key={hour}
                              className="h-16 border-b p-1 space-y-1"
                              data-testid={`time-slot-${hour}-${dayIndex}`}
                            >
                              {hourSchedules.map((schedule) => {
                                const availableSeats = schedule.capacity - schedule.registeredStudentsCount;
                                const isFull = availableSeats <= 0;

                                return (
                                  <Card
                                    key={schedule.id}
                                    className="hover-elevate p-2"
                                    data-testid={`schedule-card-${schedule.id}`}
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-xs font-semibold truncate" title={schedule.title}>
                                            {schedule.title}
                                          </h4>
                                          <p className="text-xs text-muted-foreground truncate" title={schedule.course.name}>
                                            <BookOpen className="h-3 w-3 inline mr-1" />
                                            {schedule.course.name.length > 30 
                                              ? schedule.course.name.substring(0, 30) + '...' 
                                              : schedule.course.name}
                                          </p>
                                        </div>
                                        {schedule.isRegistered && (
                                          <Badge variant="default" className="text-xs shrink-0">
                                            Registered
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="space-y-0.5 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 shrink-0" />
                                          <span className="truncate">
                                            {new Date(schedule.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Riga' })} - {new Date(schedule.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Riga' })}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1 truncate" title={schedule.instructor.firstName + " " + schedule.instructor.lastName}>
                                          <UserIcon className="h-3 w-3 shrink-0" />
                                          <span className="truncate">
                                            {schedule.instructor.firstName} {schedule.instructor.lastName}
                                          </span>
                                        </div>

                                        {schedule.location && (
                                          <div className="flex items-center gap-1 truncate" title={schedule.location}>
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{schedule.location}</span>
                                          </div>
                                        )}

                                        <div className="flex items-center gap-1">
                                          <Users className="h-3 w-3 shrink-0" />
                                          <span>
                                            {schedule.registeredStudentsCount}/{schedule.capacity}
                                          </span>
                                          {isFull && (
                                            <Badge variant="destructive" className="text-xs ml-1">
                                              Full
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {isStudent && new Date(schedule.startTime) > new Date() && (
                                        <div className="pt-1">
                                          {schedule.isRegistered ? (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full text-xs h-7"
                                              onClick={() => unregisterMutation.mutate(schedule.id)}
                                              disabled={unregisterMutation.isPending}
                                              data-testid={`button-unregister-${schedule.id}`}
                                            >
                                              {unregisterMutation.isPending ? "Canceling..." : "Cancel"}
                                            </Button>
                                          ) : (
                                            <Button
                                              variant="default"
                                              size="sm"
                                              className="w-full text-xs h-7"
                                              onClick={() => registerMutation.mutate(schedule.id)}
                                              disabled={isFull || registerMutation.isPending}
                                              data-testid={`button-register-${schedule.id}`}
                                            >
                                              {registerMutation.isPending ? "Registering..." : isFull ? "Full" : "Register"}
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
