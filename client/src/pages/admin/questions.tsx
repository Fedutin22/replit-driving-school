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
import { Plus, Edit, HelpCircle, Trash2 } from "lucide-react";
import type { Question } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  explanation: z.string().optional(),
  type: z.enum(["single_choice", "multiple_choice"]),
});

type QuestionForm = z.infer<typeof questionSchema>;

export default function AdminQuestions() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const form = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      questionText: "",
      explanation: "",
      type: "single_choice",
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: QuestionForm) => {
      const payload = {
        ...data,
        choices: [
          { label: "Option A", isCorrect: true },
          { label: "Option B", isCorrect: false },
          { label: "Option C", isCorrect: false },
          { label: "Option D", isCorrect: false },
        ],
        tags: [],
      };
      
      if (editingQuestion) {
        await apiRequest("PATCH", `/api/questions/${editingQuestion.id}`, payload);
      } else {
        await apiRequest("POST", "/api/questions", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      setIsDialogOpen(false);
      setEditingQuestion(null);
      form.reset();
      toast({
        title: editingQuestion ? "Question Updated" : "Question Created",
        description: `Question has been ${editingQuestion ? "updated" : "created"} successfully`,
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
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/questions/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Question Deleted",
        description: "Question has been deleted successfully",
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

  const handleOpenDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      form.reset({
        questionText: question.questionText,
        explanation: question.explanation || "",
        type: question.type,
      });
    } else {
      setEditingQuestion(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: QuestionForm) => {
    createOrUpdateMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteMutation.mutate(id);
    }
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
          <h1 className="text-2xl font-semibold">Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your standalone question bank - questions can be reused across multiple tests
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-question">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Create New Question"}</DialogTitle>
              <DialogDescription>
                {editingQuestion ? "Update question details" : "Add a new question to the question bank"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-question-text"
                          placeholder="Enter your question..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-question-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single_choice">Single Choice</SelectItem>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="explanation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Explanation (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-question-explanation"
                          placeholder="Explain the correct answer..."
                          rows={2}
                          {...field}
                        />
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
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrUpdateMutation.isPending}
                    data-testid="button-save-question"
                  >
                    {createOrUpdateMutation.isPending ? "Saving..." : editingQuestion ? "Update Question" : "Create Question"}
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
            <HelpCircle className="h-5 w-5" />
            All Questions ({questions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!questions || questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No questions yet. Create your first question to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id} data-testid={`row-question-${question.id}`}>
                    <TableCell className="font-medium max-w-md truncate" data-testid={`text-question-${question.id}`}>
                      {question.questionText}
                    </TableCell>
                    <TableCell data-testid={`type-question-${question.id}`}>
                      <Badge variant={question.type === "single_choice" ? "default" : "secondary"} data-testid={`badge-type-${question.id}`}>
                        {question.type === "single_choice" ? "Single" : "Multiple"}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`status-question-${question.id}`}>
                      <Badge variant={question.isArchived ? "secondary" : "default"} data-testid={`badge-status-${question.id}`}>
                        {question.isArchived ? "Archived" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(question)}
                          data-testid={`button-edit-question-${question.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(question.id)}
                          data-testid={`button-delete-question-${question.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}
