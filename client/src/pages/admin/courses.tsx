import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, BookOpen, FileText, Calendar } from "lucide-react";
import type { Course } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CourseContentManager } from "./course-content-manager";
import { ScheduleManager } from "./schedule-manager";

const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.string().optional(),
});

type CourseForm = z.infer<typeof courseSchema>;

export default function AdminCourses() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [managingCourse, setManagingCourse] = useState<Course | null>(null);
  const [managingSchedules, setManagingSchedules] = useState<Course | null>(null);

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses"],
  });

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: "",
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: CourseForm) => {
      if (editingCourse) {
        await apiRequest("PATCH", `/api/admin/courses/${editingCourse.id}`, data);
      } else {
        await apiRequest("POST", "/api/admin/courses", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      setIsDialogOpen(false);
      setEditingCourse(null);
      form.reset();
      toast({
        title: editingCourse ? "Course Updated" : "Course Created",
        description: `Course has been ${editingCourse ? "updated" : "created"} successfully`,
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

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      form.reset({
        name: course.name,
        description: course.description || "",
        category: course.category || "",
        price: course.price || "",
      });
    } else {
      setEditingCourse(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: CourseForm) => {
    createOrUpdateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Course Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage courses for your driving school
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-course">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
              <DialogDescription>
                {editingCourse ? "Update course details" : "Add a new course to your driving school"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-course-name" placeholder="e.g., Basic Driving Course" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-course-description"
                          placeholder="Describe the course content and objectives..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input data-testid="input-course-category" placeholder="e.g., Beginner" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-course-price" type="number" step="0.01" placeholder="299.99" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrUpdateMutation.isPending}
                    data-testid="button-save-course"
                  >
                    {createOrUpdateMutation.isPending ? "Saving..." : editingCourse ? "Update Course" : "Create Course"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Courses ({courses?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!courses || courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No courses yet. Create your first course to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${course.id}`}>
                      {course.name}
                    </TableCell>
                    <TableCell data-testid={`text-category-${course.id}`}>
                      {course.category || "—"}
                    </TableCell>
                    <TableCell data-testid={`text-price-${course.id}`}>
                      ${course.price || "0.00"}
                    </TableCell>
                    <TableCell data-testid={`status-cell-${course.id}`}>
                      <Badge variant={course.isActive ? "default" : "secondary"} data-testid={`badge-status-${course.id}`}>
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManagingCourse(course)}
                          data-testid={`button-manage-content-${course.id}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManagingSchedules(course)}
                          data-testid={`button-manage-schedules-${course.id}`}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(course)}
                          data-testid={`button-edit-course-${course.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {managingCourse && (
        <CourseContentManager
          course={managingCourse}
          open={!!managingCourse}
          onClose={() => setManagingCourse(null)}
        />
      )}

      {managingSchedules && (
        <ScheduleManager
          course={managingSchedules}
          open={!!managingSchedules}
          onClose={() => setManagingSchedules(null)}
        />
      )}
    </div>
  );
}
