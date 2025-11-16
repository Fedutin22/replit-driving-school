import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileQuestion, Plus, Search, Edit2, Trash2, CheckSquare, Square } from "lucide-react";
import type { Question, Course, Topic } from "@shared/schema";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface QuestionWithDetails extends Question {
  courseName?: string;
  topicName?: string;
}

interface QuestionChoice {
  label: string;
  isCorrect: boolean;
}

export default function Questions() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [type, setType] = useState<"single_choice" | "multiple_choice">("single_choice");
  const [courseId, setCourseId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [choices, setChoices] = useState<QuestionChoice[]>([
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
  ]);

  const { data: questions, isLoading } = useQuery<QuestionWithDetails[]>({
    queryKey: ["/api/questions"],
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses"],
  });

  const { data: topics } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
    enabled: !!courseId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Question Created",
        description: "The question has been added to the question bank",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      await apiRequest("PATCH", `/api/questions/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Question Updated",
        description: "The question has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/questions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Question Deleted",
        description: "The question has been removed from the question bank",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setQuestionText("");
    setExplanation("");
    setType("single_choice");
    setCourseId("");
    setTopicId("");
    setChoices([
      { label: "", isCorrect: false },
      { label: "", isCorrect: false },
    ]);
    setEditingQuestion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.questionText);
    setExplanation(question.explanation || "");
    setType(question.type);
    setCourseId(question.courseId || "");
    setTopicId(question.topicId || "");
    setChoices(question.choices as QuestionChoice[]);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      questionText,
      explanation,
      type,
      courseId: courseId || null,
      topicId: topicId || null,
      choices,
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, updates: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addChoice = () => {
    setChoices([...choices, { label: "", isCorrect: false }]);
  };

  const updateChoice = (index: number, field: "label" | "isCorrect", value: string | boolean) => {
    const updated = [...choices];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "isCorrect" && value && type === "single_choice") {
      updated.forEach((choice, i) => {
        if (i !== index) choice.isCorrect = false;
      });
    }
    setChoices(updated);
  };

  const removeChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  const filteredQuestions = questions?.filter((q) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      q.questionText.toLowerCase().includes(searchLower) ||
      q.courseName?.toLowerCase().includes(searchLower) ||
      q.topicName?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-questions">
            Question Bank
          </h1>
          <p className="text-muted-foreground">
            Manage questions for tests and assessments
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-question">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-questions"
        />
      </div>

      <div className="space-y-4">
        {filteredQuestions && filteredQuestions.length > 0 ? (
          filteredQuestions.map((question) => (
            <Card key={question.id} className="hover-elevate" data-testid={`card-question-${question.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base mb-2">{question.questionText}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={question.type === "single_choice" ? "default" : "secondary"}>
                        {question.type === "single_choice" ? (
                          <>
                            <Square className="h-3 w-3 mr-1" />
                            Single Choice
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-3 w-3 mr-1" />
                            Multiple Choice
                          </>
                        )}
                      </Badge>
                      {question.courseName && (
                        <Badge variant="outline">{question.courseName}</Badge>
                      )}
                      {question.topicName && (
                        <Badge variant="outline">{question.topicName}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(question)}
                      data-testid={`button-edit-${question.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(question.id)}
                      data-testid={`button-delete-${question.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(question.choices as QuestionChoice[]).map((choice, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {choice.isCorrect ? (
                        <CheckSquare className="h-4 w-4 text-green-600" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={choice.isCorrect ? "font-medium text-green-600" : "text-muted-foreground"}>
                        {choice.label}
                      </span>
                    </div>
                  ))}
                </div>
                {question.explanation && (
                  <div className="mt-4 p-3 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Explanation</p>
                    <p className="text-sm">{question.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No questions found</p>
              <p className="text-sm text-muted-foreground">Add questions to build your question bank</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-question-form">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Create Question"}</DialogTitle>
            <DialogDescription>
              {editingQuestion ? "Update the question details" : "Add a new question to the question bank"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="questionText">Question Text *</Label>
              <Textarea
                id="questionText"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter the question..."
                rows={3}
                data-testid="input-question-text"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Question Type *</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger id="type" data-testid="select-question-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">Single Choice</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="course" data-testid="select-course">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Answer Choices *</Label>
              <div className="space-y-3">
                {choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox
                      checked={choice.isCorrect}
                      onCheckedChange={(checked) => updateChoice(index, "isCorrect", !!checked)}
                      data-testid={`checkbox-correct-${index}`}
                    />
                    <Input
                      value={choice.label}
                      onChange={(e) => updateChoice(index, "label", e.target.value)}
                      placeholder={`Choice ${index + 1}`}
                      className="flex-1"
                      data-testid={`input-choice-${index}`}
                    />
                    {choices.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChoice(index)}
                        data-testid={`button-remove-choice-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addChoice} data-testid="button-add-choice">
                <Plus className="h-4 w-4 mr-2" />
                Add Choice
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation (Optional)</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain the correct answer..."
                rows={2}
                data-testid="input-explanation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-question"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingQuestion
                ? "Update Question"
                : "Create Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
