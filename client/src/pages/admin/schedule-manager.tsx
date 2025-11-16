import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash, Calendar, Clock, MapPin, Users } from "lucide-react";
import type { Course, Schedule, Topic, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const scheduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  topicId: z.string().optional().nullable(),
  instructorId: z.string().min(1, "Instructor is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").default(20),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

interface ScheduleWithDetails extends Schedule {
  instructorName?: string;
  topicName?: string;
  registeredCount?: number;
}

interface ScheduleManagerProps {
  course: Course;
  open: boolean;
  onClose: () => void;
}

export function ScheduleManager({ course, open, onClose }: ScheduleManagerProps) {
  const { toast } = useToast();
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: schedules, isLoading: schedulesLoading, error: schedulesError } = useQuery<ScheduleWithDetails[]>({
    queryKey: ["/api/admin/courses", course.id, "schedules"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${course.id}/schedules`);
      if (!response.ok) throw new Error("Failed to fetch schedules");
      return response.json();
    },
    enabled: open,
  });

  const { data: topics } = useQuery<Topic[]>({
    queryKey: ["/api/topics", course.id],
    queryFn: async () => {
      const response = await fetch(`/api/topics?courseId=${course.id}`);
      if (!response.ok) throw new Error("Failed to fetch topics");
      return response.json();
    },
    enabled: open,
  });

  const { data: instructors } = useQuery<User[]>({
    queryKey: ["/api/admin/instructors"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const users = await response.json();
      return users.filter((u: User) => u.role === "instructor" || u.role === "admin");
    },
    enabled: open,
  });

  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: "",
      topicId: null,
      instructorId: "",
      startTime: "",
      endTime: "",
      location: "",
      capacity: 20,
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: ScheduleForm) => {
      const payload = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };
      if (editingSchedule) {
        await apiRequest("PATCH", `/api/admin/schedules/${editingSchedule.id}`, payload);
      } else {
        await apiRequest("POST", `/api/admin/courses/${course.id}/schedules`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", course.id, "schedules"] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
      form.reset();
      toast({
        title: editingSchedule ? "Schedule Updated" : "Schedule Created",
        description: `Schedule has been ${editingSchedule ? "updated" : "created"} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await apiRequest("DELETE", `/api/admin/schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", course.id, "schedules"] });
      toast({
        title: "Schedule Deleted",
        description: "Schedule has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (schedule?: Schedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      const startDate = typeof schedule.startTime === 'string' ? new Date(schedule.startTime) : schedule.startTime;
      const endDate = typeof schedule.endTime === 'string' ? new Date(schedule.endTime) : schedule.endTime;
      
      form.reset({
        title: schedule.title,
        topicId: schedule.topicId || null,
        instructorId: schedule.instructorId,
        startTime: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        location: schedule.location || "",
        capacity: schedule.capacity,
      });
    } else {
      setEditingSchedule(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: ScheduleForm) => {
    createOrUpdateMutation.mutate(data);
  };

  const handleDelete = (scheduleId: string) => {
    if (window.confirm("Are you sure you want to delete this schedule? All student registrations will be removed.")) {
      deleteMutation.mutate(scheduleId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Manage Schedules - {course.name}</DialogTitle>
          <DialogDescription>
            Create and manage session schedules for this course
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Course Schedules</h3>
              <p className="text-sm text-muted-foreground">
                {schedules?.length || 0} session{schedules?.length !== 1 ? "s" : ""} scheduled
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-schedule">
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </div>

          {schedulesLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading schedules...
            </div>
          ) : schedulesError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-lg font-medium text-destructive mb-2">Failed to load schedules</p>
                <p className="text-sm text-muted-foreground">{(schedulesError as Error).message}</p>
              </CardContent>
            </Card>
          ) : !schedules || schedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No sessions scheduled</p>
                <p className="text-sm text-muted-foreground mb-4">Create your first session to get started</p>
                <Button onClick={() => handleOpenDialog()} data-testid="button-create-first-schedule">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const endDate = typeof schedule.endTime === 'string' ? new Date(schedule.endTime) : schedule.endTime;
                const startDate = typeof schedule.startTime === 'string' ? new Date(schedule.startTime) : schedule.startTime;
                const isPast = endDate < new Date();
                const seatsLeft = schedule.capacity - (schedule.registeredCount || 0);
                
                return (
                  <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base mb-1">{schedule.title}</CardTitle>
                          <CardDescription>
                            {schedule.topicName && `Topic: ${schedule.topicName}`}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPast && <Badge variant="secondary">Past</Badge>}
                          <Badge variant={seatsLeft > 0 ? "default" : "destructive"}>
                            {seatsLeft > 0 ? `${seatsLeft} seats left` : "Full"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(startDate, "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(startDate, "h:mm a")} -{" "}
                            {format(endDate, "h:mm a")}
                          </span>
                        </div>
                      </div>
                      {schedule.location && (
                        <div className="flex items-center gap-2 text-sm mb-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{schedule.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm mb-4">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Instructor: {schedule.instructorName} • {schedule.registeredCount || 0}/{schedule.capacity} registered
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(schedule)}
                          data-testid={`button-edit-schedule-${schedule.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-schedule-${schedule.id}`}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Edit Session" : "Create New Session"}</DialogTitle>
            <DialogDescription>
              {editingSchedule ? "Update session details" : "Schedule a new session for this course"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Title</FormLabel>
                    <FormControl>
                      <Input data-testid="input-schedule-title" placeholder="e.g., Morning Practice Session" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="topicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-schedule-topic">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific topic</SelectItem>
                        {topics?.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-schedule-instructor">
                          <SelectValue placeholder="Select an instructor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instructors?.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.firstName} {instructor.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input data-testid="input-schedule-start" type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input data-testid="input-schedule-end" type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input data-testid="input-schedule-location" placeholder="e.g., Main Training Center" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input data-testid="input-schedule-capacity" type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-schedule"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOrUpdateMutation.isPending}
                  data-testid="button-save-schedule"
                >
                  {createOrUpdateMutation.isPending ? "Saving..." : editingSchedule ? "Update Session" : "Create Session"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
