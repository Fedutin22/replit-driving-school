import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, FileText } from "lucide-react";
import type { TestTemplate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const testTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  mode: z.enum(["random", "manual"]),
  questionCount: z.string().optional(),
  passingPercentage: z.string().min(1, "Passing percentage is required"),
});

type TestTemplateForm = z.infer<typeof testTemplateSchema>;

export default function AdminTestTemplates() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<TestTemplate[]>({
    queryKey: ["/api/admin/test-templates"],
  });

  const form = useForm<TestTemplateForm>({
    resolver: zodResolver(testTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      mode: "manual",
      questionCount: "10",
      passingPercentage: "70",
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: TestTemplateForm) => {
      const payload = {
        ...data,
        questionCount: data.questionCount ? parseInt(data.questionCount) : null,
        passingPercentage: parseInt(data.passingPercentage),
      };
      
      if (editingTemplate) {
        await apiRequest("PATCH", `/api/admin/test-templates/${editingTemplate.id}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/test-templates", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/test-templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
      toast({
        title: editingTemplate ? "Template Updated" : "Template Created",
        description: `Test template has been ${editingTemplate ? "updated" : "created"} successfully`,
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

  const handleOpenDialog = (template?: TestTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.reset({
        name: template.name,
        description: template.description || "",
        mode: template.mode,
        questionCount: template.questionCount?.toString() || "10",
        passingPercentage: template.passingPercentage.toString(),
      });
    } else {
      setEditingTemplate(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: TestTemplateForm) => {
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
          <h1 className="text-2xl font-semibold">Test Template Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create reusable test templates that can be assigned to multiple courses
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Test Template"}</DialogTitle>
              <DialogDescription>
                {editingTemplate ? "Update template details" : "Create a reusable test template"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-template-name" placeholder="e.g., Final Theory Exam" {...field} />
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
                          data-testid="input-template-description"
                          placeholder="Describe the test purpose..."
                          rows={2}
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
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template-mode">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="random">Random</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="passingPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passing %</FormLabel>
                        <FormControl>
                          <Input data-testid="input-passing-percentage" type="number" min="0" max="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {form.watch("mode") === "random" && (
                  <FormField
                    control={form.control}
                    name="questionCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Questions</FormLabel>
                        <FormControl>
                          <Input data-testid="input-question-count" type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
                    data-testid="button-save-template"
                  >
                    {createOrUpdateMutation.isPending ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
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
            <FileText className="h-5 w-5" />
            All Test Templates ({templates?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!templates || templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test templates yet. Create your first template to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Passing %</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${template.id}`}>
                      {template.name}
                    </TableCell>
                    <TableCell data-testid={`mode-cell-${template.id}`}>
                      <Badge variant={template.mode === "random" ? "secondary" : "default"} data-testid={`badge-mode-${template.id}`}>
                        {template.mode}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-questions-${template.id}`}>
                      {template.questionCount || "Manual"}
                    </TableCell>
                    <TableCell data-testid={`text-passing-${template.id}`}>
                      {template.passingPercentage}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(template)}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
