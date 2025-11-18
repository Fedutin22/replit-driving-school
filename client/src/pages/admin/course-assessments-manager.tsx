import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClipboardCheck, Clock, Hash, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TopicAssessment, Topic, Course, Question } from "@shared/schema";

interface CourseAssessmentsManagerProps {
  courseId: string;
}

type TopicWithAssessments = Topic & { assessments: TopicAssessment[] };
type CourseContent = { course: Course; topics: TopicWithAssessments[]; };

const assessmentSchema = z.object({
  topicId: z.string().min(1, "Please select a topic"),
  name: z.string().min(1, "Assessment name is required"),
  description: z.string().optional(),
  mode: z.enum(["random", "manual", "linked_template"]),
  questionCount: z.number().int().positive().optional(),
  randomizeQuestions: z.boolean(),
  passingPercentage: z.number().int().min(0).max(100),
  maxAttempts: z.number().int().positive(),
  timeLimit: z.string().optional(),
  testTemplateId: z.string().optional(),
  isRequired: z.boolean(),
  status: z.enum(["draft", "published"]),
  orderIndex: z.number().int().nonnegative(),
  questionIds: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  // Validate manual mode has questions selected
  if (data.mode === "manual" && (!data.questionIds || data.questionIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select at least one question for manual mode",
      path: ["questionIds"],
    });
  }
  // Validate linked template mode has template selected
  if (data.mode === "linked_template" && (!data.testTemplateId || data.testTemplateId.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a test template for linked template mode",
      path: ["testTemplateId"],
    });
  }
});

type AssessmentForm = z.infer<typeof assessmentSchema>;

export function CourseAssessmentsManager({ courseId }: CourseAssessmentsManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [questionSearchTerm, setQuestionSearchTerm] = useState("");
  const [questionTagFilter, setQuestionTagFilter] = useState("all");
  const [searchedQuestions, setSearchedQuestions] = useState<Question[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: courseContent, isLoading } = useQuery<CourseContent>({
    queryKey: [`/api/courses/${courseId}/content`],
  });

  const { data: testTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/test-templates'],
  });

  const topics = courseContent?.topics;

  const assessmentForm = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      topicId: "",
      name: "",
      description: "",
      mode: "random",
      questionCount: 10,
      randomizeQuestions: false,
      passingPercentage: 70,
      maxAttempts: 3,
      timeLimit: "",
      testTemplateId: "",
      isRequired: false,
      status: "draft",
      orderIndex: 0,
      questionIds: [],
    },
  });

  const selectedMode = assessmentForm.watch("mode");
  const selectedTopicId = assessmentForm.watch("topicId");

  // Get available tags from all questions
  const availableTags: string[] = [];

  // Search for questions
  useEffect(() => {
    const searchQuestions = async () => {
      if (selectedMode !== "manual") {
        setSearchedQuestions([]);
        return;
      }

      if (!questionSearchTerm.trim() && questionTagFilter === 'all') {
        setSearchedQuestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (questionSearchTerm.trim()) params.append("q", questionSearchTerm.trim());
        if (questionTagFilter !== 'all') params.append("tag", questionTagFilter);
        params.append("limit", "10");

        const response = await fetch(`/api/admin/questions/search?${params.toString()}`);
        if (response.ok) {
          const questions = await response.json();
          setSearchedQuestions(questions);
        }
      } catch (error) {
        console.error("Failed to search questions:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchQuestions, 300);
    return () => clearTimeout(debounce);
  }, [questionSearchTerm, questionTagFilter, selectedMode]);

  const createAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentForm) => {
      const { topicId, timeLimit, testTemplateId, ...assessmentData } = data;
      
      // Use the current maxOrderIndex for the selected topic
      const topic = topics?.find(t => t.id === topicId);
      const correctOrderIndex = topic?.assessments && topic.assessments.length > 0
        ? Math.max(...topic.assessments.map(a => a.orderIndex)) + 1
        : 0;
      
      const payload: any = {
        ...assessmentData,
        // Only include timeLimit if it's a valid number
        ...(timeLimit && timeLimit.trim() !== "" ? { timeLimit: parseInt(timeLimit) } : {}),
        // Only include testTemplateId for linked_template mode
        ...(data.mode === "linked_template" && testTemplateId ? { testTemplateId } : {}),
      };
      
      // Always overwrite orderIndex with computed value
      payload.orderIndex = correctOrderIndex;
      
      return await apiRequest("POST", `/api/admin/topics/${topicId}/assessments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/content`] });
      setIsDialogOpen(false);
      assessmentForm.reset();
      setQuestionSearchTerm("");
      setQuestionTagFilter("all");
      setSearchedQuestions([]);
      toast({
        title: "Assessment Created",
        description: "Assessment has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assessment",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = () => {
    // Guard against no topics
    if (!topics || topics.length === 0) {
      toast({
        title: "No Topics Available",
        description: "Please create topics first in the Topics tab before adding assessments.",
        variant: "destructive",
      });
      return;
    }

    const firstTopic = topics[0];
    assessmentForm.reset({
      topicId: firstTopic.id,
      name: "",
      description: "",
      mode: "random",
      questionCount: 10,
      randomizeQuestions: false,
      passingPercentage: 70,
      maxAttempts: 3,
      timeLimit: "",
      testTemplateId: "",
      isRequired: false,
      status: "draft",
      orderIndex: 0,
      questionIds: [],
    });
    setQuestionSearchTerm("");
    setQuestionTagFilter("all");
    setSearchedQuestions([]);
    setIsDialogOpen(true);
  };

  const allAssessments = topics?.flatMap(topic => 
    topic.assessments.map(assessment => ({
      ...assessment,
      topicName: topic.name,
      topicOrder: topic.orderIndex,
    }))
  ) || [];

  const sortedAssessments = allAssessments.sort((a, b) => {
    if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
    return a.orderIndex - b.orderIndex;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading assessments...
        </CardContent>
      </Card>
    );
  }

  if (sortedAssessments.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">All Assessments</h3>
            <p className="text-sm text-muted-foreground">No assessments yet</p>
          </div>
          {topics && topics.length > 0 && (
            <Button onClick={handleOpenDialog} data-testid="button-create-assessment">
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No assessments yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              {topics && topics.length > 0 
                ? "Create your first assessment to test student knowledge"
                : "Create topics first in the Topics tab, then add assessments"}
            </p>
            {topics && topics.length > 0 && (
              <Button onClick={handleOpenDialog} variant="outline" data-testid="button-create-assessment-empty">
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            )}
          </CardContent>
        </Card>
        {renderDialog()}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">All Assessments</h3>
          <p className="text-sm text-muted-foreground">
            {sortedAssessments.length} assessment{sortedAssessments.length !== 1 ? "s" : ""} across {topics?.length || 0} topic{topics?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleOpenDialog} data-testid="button-create-assessment">
          <Plus className="h-4 w-4 mr-2" />
          Create Assessment
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedAssessments.map((assessment) => (
          <Card key={assessment.id} data-testid={`card-assessment-${assessment.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{assessment.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Topic: {assessment.topicName}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {assessment.mode === 'random' ? 'Random Questions' : 
                     assessment.mode === 'manual' ? 'Manual Questions' : 'Template Linked'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Max Attempts</p>
                    <p className="text-sm font-medium">{assessment.maxAttempts || 3}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time Limit</p>
                    <p className="text-sm font-medium">
                      {assessment.timeLimit ? `${assessment.timeLimit} min` : 'No limit'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {renderDialog()}
    </div>
  );

  function renderDialog() {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={selectedMode === "manual" ? "max-w-5xl" : "max-w-2xl"}>
          <DialogHeader>
            <DialogTitle>Create New Assessment</DialogTitle>
            <DialogDescription>
              Add a new assessment to test student knowledge
            </DialogDescription>
          </DialogHeader>

          <div className={selectedMode === "manual" ? "md:grid md:grid-cols-[1.4fr_1fr] gap-6" : "flex flex-col gap-6"}>
            {/* Left Column: Form */}
            <Form {...assessmentForm}>
              <form onSubmit={assessmentForm.handleSubmit((data) => createAssessmentMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={assessmentForm.control}
                  name="topicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assessment-topic">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                  control={assessmentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-assessment-name" placeholder="e.g., Road Signs Quiz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assessmentForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-assessment-description"
                          placeholder="Describe this assessment..."
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
                    control={assessmentForm.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-assessment-required"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Required for completion</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assessmentForm.control}
                    name="randomizeQuestions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            data-testid="checkbox-randomize-questions"
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Randomize questions</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={assessmentForm.control}
                    name="passingPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passing Percentage</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" data-testid="input-passing-percentage" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assessmentForm.control}
                    name="maxAttempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Attempts</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" data-testid="input-max-attempts" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assessmentForm.control}
                    name="timeLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Limit (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="No limit"
                            data-testid="input-time-limit" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {selectedMode === "random" && (
                  <FormField
                    control={assessmentForm.control}
                    name="questionCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Questions</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" data-testid="input-question-count" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={assessmentForm.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mode</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Clear searched questions when switching modes
                            if (value !== "manual") {
                              setSearchedQuestions([]);
                              setQuestionSearchTerm("");
                              setQuestionTagFilter("all");
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-assessment-mode">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="random">Random (from question bank)</SelectItem>
                            <SelectItem value="manual">Manual (select specific questions)</SelectItem>
                            <SelectItem value="linked_template">Linked Test Template</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={assessmentForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-assessment-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft (not visible to students)</SelectItem>
                            <SelectItem value="published">Published (visible to students)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {selectedMode === "linked_template" && (
                  <FormField
                    control={assessmentForm.control}
                    name="testTemplateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Template</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-test-template">
                              <SelectValue placeholder="Select a test template..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {testTemplates?.map((template: any) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} ({template.mode} - {template.passingPercentage}% passing)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </form>
            </Form>

            {/* Right Column: Question Search (only shown in manual mode) */}
            {selectedMode === "manual" && (
              <Card className="p-4">
                <h3 className="font-medium mb-3">Select Questions</h3>
                
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={questionSearchTerm}
                    onChange={(e) => setQuestionSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-questions"
                  />
                </div>

                {/* Tag Filter */}
                <Select value={questionTagFilter} onValueChange={setQuestionTagFilter}>
                  <SelectTrigger className="mb-3" data-testid="select-tag-filter">
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {availableTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Stats */}
                <div className="text-sm text-muted-foreground mb-3">
                  {assessmentForm.watch("questionIds")?.length || 0} selected · {searchedQuestions.length} shown (max 10)
                </div>

                {/* Bulk Actions */}
                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const visibleIds = searchedQuestions.map(q => q.id);
                      const currentIds = assessmentForm.watch("questionIds") || [];
                      const newIds = Array.from(new Set([...currentIds, ...visibleIds]));
                      assessmentForm.setValue("questionIds", newIds);
                    }}
                    data-testid="button-select-all"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => assessmentForm.setValue("questionIds", [])}
                    data-testid="button-clear-all"
                  >
                    Clear All
                  </Button>
                </div>

                {/* Question List */}
                <div className="border rounded-md h-[240px] overflow-y-auto minimal-scrollbar">
                  {isSearching ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
                  ) : searchedQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {!questionSearchTerm.trim() && questionTagFilter === 'all' 
                        ? "Start typing to search for questions or select a tag filter"
                        : "No questions found. Try different search terms or tags."}
                    </p>
                  ) : (
                    <div className="p-2 space-y-2">
                      {searchedQuestions.map((question) => {
                        const selectedIds = assessmentForm.watch("questionIds") || [];
                        const isSelected = selectedIds.includes(question.id);
                        return (
                          <div
                            key={question.id}
                            className="flex items-start space-x-3 p-2 rounded hover-elevate cursor-pointer"
                            onClick={() => {
                              if (isSelected) {
                                assessmentForm.setValue("questionIds", selectedIds.filter((id: string) => id !== question.id));
                              } else {
                                assessmentForm.setValue("questionIds", [...selectedIds, question.id]);
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by parent div onClick
                              data-testid={`checkbox-question-${question.id}`}
                              className="h-4 w-4 mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{question.questionText}</p>
                              {Array.isArray(question.tags) && question.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {question.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Footer - outside the grid */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              data-testid="button-cancel-assessment"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={assessmentForm.handleSubmit((data) => createAssessmentMutation.mutate(data))}
              disabled={createAssessmentMutation.isPending}
              data-testid="button-save-assessment"
            >
              {createAssessmentMutation.isPending ? "Creating..." : "Create Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
