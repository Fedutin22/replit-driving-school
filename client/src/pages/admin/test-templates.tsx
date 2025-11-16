import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, FileText, List, X } from "lucide-react";
import type { TestTemplate, Question } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

const testTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  mode: z.enum(["random", "manual"]),
  questionCount: z.string().optional(),
  randomizeQuestions: z.boolean().default(false),
  passingPercentage: z.string().min(1, "Passing percentage is required"),
});

type TestTemplateForm = z.infer<typeof testTemplateSchema>;

export default function AdminTestTemplates() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TestTemplate | null>(null);

  const { data: templates, isLoading } = useQuery<TestTemplate[]>({
    queryKey: ["/api/admin/test-templates"],
  });

  const { data: allQuestions } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const { data: templateQuestions } = useQuery<any[]>({
    queryKey: ["/api/admin/test-templates", selectedTemplate?.id, "questions"],
    enabled: !!selectedTemplate,
  });

  const addQuestionMutation = useMutation({
    mutationFn: async ({ templateId, questionId }: { templateId: string; questionId: string }) => {
      const currentCount = templateQuestions?.length || 0;
      await apiRequest("POST", `/api/admin/test-templates/${templateId}/questions`, {
        questionId,
        orderIndex: currentCount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/test-templates", selectedTemplate?.id, "questions"] });
      toast({ title: "Question Added", description: "Question added to template successfully" });
    },
  });

  const removeQuestionMutation = useMutation({
    mutationFn: async ({ templateId, questionId }: { templateId: string; questionId: string }) => {
      await apiRequest("DELETE", `/api/admin/test-templates/${templateId}/questions/${questionId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/test-templates", selectedTemplate?.id, "questions"] });
      toast({ title: "Question Removed", description: "Question removed from template successfully" });
    },
  });

  const form = useForm<TestTemplateForm>({
    resolver: zodResolver(testTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      mode: "manual",
      questionCount: "10",
      randomizeQuestions: false,
      passingPercentage: "70",
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: TestTemplateForm) => {
      const payload = {
        ...data,
        questionCount: data.questionCount ? parseInt(data.questionCount) : null,
        randomizeQuestions: data.randomizeQuestions,
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
        randomizeQuestions: template.randomizeQuestions || false,
        passingPercentage: template.passingPercentage.toString(),
      });
    } else {
      setEditingTemplate(null);
      form.reset({
        name: "",
        description: "",
        mode: "manual",
        questionCount: "10",
        randomizeQuestions: false,
        passingPercentage: "70",
      });
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
                <FormField
                  control={form.control}
                  name="randomizeQuestions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-randomize-questions"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Randomize Question Order
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Shuffle questions each time the test is taken
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
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
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(template)}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {template.mode === "manual" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setQuestionDialogOpen(true);
                            }}
                            data-testid={`button-manage-questions-${template.id}`}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Questions - {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Add questions from the question bank to this manual test template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Selected Questions ({templateQuestions?.length || 0})</h3>
              {templateQuestions && templateQuestions.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {templateQuestions.map((tq: any) => (
                    <div key={tq.id} className="flex items-start gap-2 p-2 bg-muted rounded-md" data-testid={`selected-question-${tq.questionId}`}>
                      <div className="flex-1 text-sm">{tq.question?.questionText}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestionMutation.mutate({ templateId: selectedTemplate!.id, questionId: tq.questionId })}
                        disabled={removeQuestionMutation.isPending}
                        data-testid={`button-remove-${tq.questionId}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No questions selected yet</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Available Questions</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {allQuestions?.filter(q => !templateQuestions?.some(tq => tq.questionId === q.id)).map((question) => (
                  <div key={question.id} className="flex items-start gap-2 p-2 hover-elevate rounded-md" data-testid={`available-question-${question.id}`}>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{question.questionText}</div>
                      <Badge variant="secondary" className="text-xs mt-1">{question.type}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addQuestionMutation.mutate({ templateId: selectedTemplate!.id, questionId: question.id })}
                      disabled={addQuestionMutation.isPending}
                      data-testid={`button-add-${question.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setQuestionDialogOpen(false)} data-testid="button-close-questions">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
