import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, HelpCircle, Trash2, X } from "lucide-react";
import type { Question } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  explanation: z.string().optional(),
  type: z.enum(["single_choice", "multiple_choice"]),
  choices: z.array(z.object({
    label: z.string().min(1, "Choice text is required"),
    isCorrect: z.boolean(),
  })).min(2, "At least 2 choices required").refine((choices) => choices.some(c => c.isCorrect), {
    message: "At least one choice must be marked as correct",
  }),
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
      choices: [
        { label: "", isCorrect: false },
        { label: "", isCorrect: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "choices",
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: QuestionForm) => {
      const payload = {
        ...data,
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
        choices: Array.isArray(question.choices) ? question.choices as Array<{label: string, isCorrect: boolean}> : [
          { label: "", isCorrect: false },
          { label: "", isCorrect: false },
        ],
      });
    } else {
      setEditingQuestion(null);
      form.reset({
        questionText: "",
        explanation: "",
        type: "single_choice",
        choices: [
          { label: "", isCorrect: false },
          { label: "", isCorrect: false },
        ],
      });
    }
    setIsDialogOpen(true);
  };

  const handleToggleCorrect = (index: number) => {
    const currentType = form.watch("type");
    const currentChoices = form.watch("choices");
    
    if (currentType === "single_choice") {
      const updatedChoices = currentChoices.map((choice, i) => ({
        ...choice,
        isCorrect: i === index,
      }));
      form.setValue("choices", updatedChoices);
    } else {
      const updatedChoices = [...currentChoices];
      updatedChoices[index] = {
        ...updatedChoices[index],
        isCorrect: !updatedChoices[index].isCorrect,
      };
      form.setValue("choices", updatedChoices);
    }
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Answer Choices</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ label: "", isCorrect: false })}
                      data-testid="button-add-choice"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Choice
                    </Button>
                  </div>
                  <FormDescription className="text-xs">
                    {form.watch("type") === "single_choice" 
                      ? "Mark one choice as correct" 
                      : "Mark one or more choices as correct"}
                  </FormDescription>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex items-center pt-2">
                        <Checkbox
                          checked={form.watch(`choices.${index}.isCorrect`)}
                          onCheckedChange={() => handleToggleCorrect(index)}
                          data-testid={`checkbox-choice-correct-${index}`}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`choices.${index}.label`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`Choice ${index + 1}`}
                                data-testid={`input-choice-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {fields.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-choice-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {form.formState.errors.choices?.message && (
                    <p className="text-sm text-destructive">{form.formState.errors.choices.message}</p>
                  )}
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
