import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Clock, MapPin, Users, CheckCircle2 } from "lucide-react";
import type { Schedule } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

interface ScheduleWithDetails extends Schedule {
  courseName?: string;
  topicName?: string;
  instructorName?: string;
  registeredCount?: number;
  isRegistered?: boolean;
  canRegister?: boolean;
}

export default function SchedulePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: schedules, isLoading } = useQuery<ScheduleWithDetails[]>({
    queryKey: ["/api/schedules"],
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const upcomingSessions = schedules?.filter(
    (s) => new Date(s.startTime) > new Date()
  ) || [];
  const pastSessions = schedules?.filter(
    (s) => new Date(s.startTime) <= new Date()
  ) || [];

  const registeredSessions = upcomingSessions.filter((s) => s.isRegistered);
  const availableSessions = upcomingSessions.filter((s) => !s.isRegistered);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-schedule">
          Schedule
        </h1>
        <p className="text-muted-foreground">
          View and register for upcoming sessions
        </p>
      </div>

      {registeredSessions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">My Registered Sessions</h2>
          <div className="space-y-4">
            {registeredSessions.map((session) => (
              <Card key={session.id} className="hover-elevate border-primary/50" data-testid={`card-registered-session-${session.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-1">{session.title}</CardTitle>
                      <CardDescription>
                        {session.courseName}
                        {session.topicName && ` • ${session.topicName}`}
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Registered
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(session.startTime), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(session.startTime), "h:mm a")} -{" "}
                        {format(new Date(session.endTime), "h:mm a")}
                      </span>
                    </div>
                  </div>
                  {session.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{session.location}</span>
                    </div>
                  )}
                  {session.instructorName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Instructor: {session.instructorName}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unregisterMutation.mutate(session.id)}
                    disabled={unregisterMutation.isPending}
                    data-testid={`button-unregister-${session.id}`}
                  >
                    {unregisterMutation.isPending ? "Canceling..." : "Cancel Registration"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {availableSessions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Sessions</h2>
          <div className="space-y-4">
            {availableSessions.map((session) => {
              const seatsLeft = session.capacity - (session.registeredCount || 0);
              const isFull = seatsLeft <= 0;

              return (
                <Card key={session.id} className="hover-elevate" data-testid={`card-available-session-${session.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-1">{session.title}</CardTitle>
                        <CardDescription>
                          {session.courseName}
                          {session.topicName && ` • ${session.topicName}`}
                        </CardDescription>
                      </div>
                      <Badge variant={isFull ? "destructive" : "secondary"} className="flex-shrink-0">
                        {isFull ? "Full" : `${seatsLeft} seats left`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(session.startTime), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(session.startTime), "h:mm a")} -{" "}
                          {format(new Date(session.endTime), "h:mm a")}
                        </span>
                      </div>
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{session.location}</span>
                      </div>
                    )}
                    {session.instructorName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Instructor: {session.instructorName}</span>
                      </div>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => registerMutation.mutate(session.id)}
                      disabled={!session.canRegister || isFull || registerMutation.isPending}
                      data-testid={`button-register-${session.id}`}
                    >
                      {registerMutation.isPending
                        ? "Registering..."
                        : isFull
                        ? "Session Full"
                        : !session.canRegister
                        ? "Not Eligible"
                        : "Register"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {upcomingSessions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No upcoming sessions</p>
            <p className="text-sm text-muted-foreground">Check back later for new sessions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
