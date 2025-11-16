import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash, FileText, List, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Course, Topic, Post, TopicAssessment, Question } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RichTextEditor } from "@/components/rich-text-editor";

const topicSchema = z.object({
  name: z.string().min(1, "Topic name is required"),
  description: z.string().optional(),
  type: z.enum(["theory", "practice"]),
  orderIndex: z.coerce.number().default(0),
});

const postSchema = z.object({
  title: z.string().min(1, "Post title is required"),
  content: z.string().min(1, "Post content is required"),
  orderIndex: z.coerce.number().default(0),
});

const assessmentSchema = z.object({
  name: z.string().min(1, "Assessment name is required"),
  description: z.string().optional(),
  isRequired: z.boolean().default(false),
  passingPercentage: z.coerce.number().min(0).max(100).default(70),
  mode: z.enum(["random", "manual"]).default("random"),
  questionCount: z.coerce.number().min(1).default(10),
  randomizeQuestions: z.boolean().default(false),
  orderIndex: z.coerce.number().default(0),
  questionIds: z.array(z.string()).optional(), // For manual mode
});

type TopicForm = z.infer<typeof topicSchema>;
type PostForm = z.infer<typeof postSchema>;
type AssessmentForm = z.infer<typeof assessmentSchema>;

interface CourseContentManagerProps {
  course: Course;
  open: boolean;
  onClose: () => void;
}

export function CourseContentManager({ course, open, onClose }: CourseContentManagerProps) {
  const { toast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedTopicForAssessments, setSelectedTopicForAssessments] = useState<Topic | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<TopicAssessment | null>(null);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [questionSearchTerm, setQuestionSearchTerm] = useState("");
  const [questionTagFilter, setQuestionTagFilter] = useState<string>("all");
  const [searchedQuestions, setSearchedQuestions] = useState<Question[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: topics, isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics", course.id],
    queryFn: async () => {
      const response = await fetch(`/api/topics?courseId=${course.id}`);
      if (!response.ok) throw new Error("Failed to fetch topics");
      return response.json();
    },
    enabled: open,
  });

  const { data: posts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", selectedTopic?.id],
    queryFn: async () => {
      if (!selectedTopic) return [];
      const response = await fetch(`/api/posts?topicId=${selectedTopic.id}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
    enabled: !!selectedTopic,
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery<TopicAssessment[]>({
    queryKey: ["/api/admin/topics", selectedTopicForAssessments?.id, "assessments"],
    queryFn: async () => {
      if (!selectedTopicForAssessments) return [];
      const response = await fetch(`/api/admin/topics/${selectedTopicForAssessments.id}/assessments`);
      if (!response.ok) throw new Error("Failed to fetch assessments");
      return response.json();
    },
    enabled: !!selectedTopicForAssessments,
  });

  // AJAX search function for questions
  const searchQuestions = async (searchTerm: string, tag: string) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (tag && tag !== 'all') params.append('tag', tag);
      params.append('limit', '10');
      
      const response = await fetch(`/api/questions/search?${params}`);
      if (!response.ok) throw new Error("Failed to search questions");
      const questions = await response.json();
      setSearchedQuestions(questions);
    } catch (error) {
      console.error("Error searching questions:", error);
      toast({ title: "Error", description: "Failed to search questions", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Get unique tags from searched questions
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    searchedQuestions.forEach(q => {
      if (Array.isArray(q.tags)) {
        q.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [searchedQuestions]);

  const topicForm = useForm<TopicForm>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "theory",
      orderIndex: 0,
    },
  });

  const postForm = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      orderIndex: 0,
    },
  });

  const assessmentForm = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      name: "",
      description: "",
      isRequired: false,
      passingPercentage: 70,
      mode: "random",
      questionCount: 10,
      randomizeQuestions: false,
      orderIndex: 0,
    },
  });

  // Current assessment mode for effect dependencies
  const currentMode = assessmentForm.watch("mode");
  
  // Debounced search effect - only when in manual mode AND user has typed something
  useEffect(() => {
    if (currentMode !== "manual") {
      return;
    }
    
    // Don't auto-search - only search when user has typed something
    if (!questionSearchTerm.trim() && questionTagFilter === 'all') {
      setSearchedQuestions([]);
      return;
    }
    
    const timer = setTimeout(() => {
      searchQuestions(questionSearchTerm, questionTagFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [questionSearchTerm, questionTagFilter, currentMode]);

  const createOrUpdateTopicMutation = useMutation({
    mutationFn: async (data: TopicForm) => {
      const payload = { ...data, courseId: course.id };
      if (editingTopic) {
        await apiRequest("PATCH", `/api/admin/topics/${editingTopic.id}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/topics", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", course.id] });
      setIsTopicDialogOpen(false);
      setEditingTopic(null);
      topicForm.reset();
      toast({
        title: editingTopic ? "Topic Updated" : "Topic Created",
        description: `Topic has been ${editingTopic ? "updated" : "created"} successfully`,
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

  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      await apiRequest("DELETE", `/api/admin/topics/${topicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", course.id] });
      if (selectedTopic) setSelectedTopic(null);
      toast({
        title: "Topic Deleted",
        description: "Topic has been deleted successfully",
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

  const reorderTopicMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      await apiRequest("POST", `/api/admin/topics/${id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", course.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createOrUpdatePostMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      if (!selectedTopic) throw new Error("No topic selected");
      const payload = { ...data, topicId: selectedTopic.id };
      if (editingPost) {
        await apiRequest("PATCH", `/api/admin/posts/${editingPost.id}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/posts", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", selectedTopic?.id] });
      setIsPostDialogOpen(false);
      setEditingPost(null);
      postForm.reset();
      toast({
        title: editingPost ? "Post Updated" : "Post Created",
        description: `Post has been ${editingPost ? "updated" : "created"} successfully`,
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

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest("DELETE", `/api/admin/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", selectedTopic?.id] });
      toast({
        title: "Post Deleted",
        description: "Post has been deleted successfully",
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

  const reorderPostMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      await apiRequest("POST", `/api/admin/posts/${id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", selectedTopic?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenTopicDialog = (topic?: Topic) => {
    if (topic) {
      setEditingTopic(topic);
      topicForm.reset({
        name: topic.name,
        description: topic.description || "",
        type: topic.type as "theory" | "practice",
        orderIndex: topic.orderIndex,
      });
    } else {
      setEditingTopic(null);
      const maxOrderIndex = topics && topics.length > 0
        ? Math.max(...topics.map(t => t.orderIndex))
        : -1;
      topicForm.reset({
        name: "",
        description: "",
        type: "theory",
        orderIndex: maxOrderIndex + 1,
      });
    }
    setIsTopicDialogOpen(true);
  };

  const handleOpenPostDialog = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      postForm.reset({
        title: post.title,
        content: post.content,
        orderIndex: post.orderIndex,
      });
    } else {
      setEditingPost(null);
      const maxOrderIndex = posts && posts.length > 0
        ? Math.max(...posts.map(p => p.orderIndex))
        : -1;
      postForm.reset({
        title: "",
        content: "",
        orderIndex: maxOrderIndex + 1,
      });
    }
    setIsPostDialogOpen(true);
  };

  const createOrUpdateAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentForm) => {
      if (!selectedTopicForAssessments) throw new Error("No topic selected");
      if (editingAssessment) {
        await apiRequest("PATCH", `/api/admin/assessments/${editingAssessment.id}`, data);
      } else {
        await apiRequest("POST", `/api/admin/topics/${selectedTopicForAssessments.id}/assessments`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/topics", selectedTopicForAssessments?.id, "assessments"] });
      setIsAssessmentDialogOpen(false);
      setEditingAssessment(null);
      assessmentForm.reset();
      toast({
        title: editingAssessment ? "Assessment Updated" : "Assessment Created",
        description: `Assessment has been ${editingAssessment ? "updated" : "created"} successfully`,
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

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (assessmentId: string) => {
      await apiRequest("DELETE", `/api/admin/assessments/${assessmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/topics", selectedTopicForAssessments?.id, "assessments"] });
      toast({
        title: "Assessment Deleted",
        description: "Assessment has been deleted successfully",
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

  const handleOpenAssessmentDialog = async (assessment?: TopicAssessment) => {
    if (assessment) {
      setEditingAssessment(assessment);
      
      // Fetch questionIds if manual mode
      let questionIds: string[] = [];
      if (assessment.mode === "manual") {
        try {
          const response = await fetch(`/api/admin/assessments/${assessment.id}/questions`);
          if (response.ok) {
            const data = await response.json();
            questionIds = data.questionIds || [];
          }
        } catch (error) {
          console.error("Error loading question IDs:", error);
        }
      }
      
      assessmentForm.reset({
        name: assessment.name,
        description: assessment.description || "",
        isRequired: assessment.isRequired,
        passingPercentage: assessment.passingPercentage,
        mode: assessment.mode,
        questionCount: assessment.questionCount || 10,
        randomizeQuestions: assessment.randomizeQuestions,
        orderIndex: assessment.orderIndex,
        questionIds: questionIds,
      });
    } else {
      setEditingAssessment(null);
      const maxOrderIndex = assessments && assessments.length > 0
        ? Math.max(...assessments.map(a => a.orderIndex))
        : -1;
      assessmentForm.reset({
        name: "",
        description: "",
        isRequired: false,
        passingPercentage: 70,
        mode: "random",
        questionCount: 10,
        randomizeQuestions: false,
        orderIndex: maxOrderIndex + 1,
        questionIds: [],
      });
    }
    setIsAssessmentDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Course Content: {course.name}</DialogTitle>
            <DialogDescription>
              Organize topics and posts for this course
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="topics" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="topics" data-testid="tab-topics">
                <List className="h-4 w-4 mr-2" />
                Topics
              </TabsTrigger>
              <TabsTrigger value="posts" data-testid="tab-posts">
                <FileText className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="assessments" data-testid="tab-assessments">
                <FileText className="h-4 w-4 mr-2" />
                Assessments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="topics" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {topics?.length || 0} topics
                </p>
                <Button size="sm" onClick={() => handleOpenTopicDialog()} data-testid="button-add-topic">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </div>

              <div className="grid gap-3">
                {topicsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading topics...</p>
                ) : !topics || topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No topics yet. Create your first topic to organize course content.
                  </p>
                ) : (
                  topics.map((topic, index) => (
                    <Card key={topic.id} className={selectedTopic?.id === topic.id ? "border-primary" : ""}>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base" data-testid={`text-topic-name-${topic.id}`}>
                              {topic.name}
                            </CardTitle>
                            {topic.description && (
                              <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Type: {topic.type === "theory" ? "Theory" : "Practice"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderTopicMutation.mutate({ id: topic.id, direction: 'up' })}
                              disabled={index === 0}
                              data-testid={`button-move-up-topic-${topic.id}`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => reorderTopicMutation.mutate({ id: topic.id, direction: 'down' })}
                              disabled={index === topics.length - 1}
                              data-testid={`button-move-down-topic-${topic.id}`}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenTopicDialog(topic)}
                              data-testid={`button-edit-topic-${topic.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTopicMutation.mutate(topic.id)}
                              data-testid={`button-delete-topic-${topic.id}`}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="posts" className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-2 block">Select Topic</Label>
                  <Select
                    value={selectedTopic?.id || ""}
                    onValueChange={(value) => {
                      const topic = topics?.find(t => t.id === value);
                      setSelectedTopic(topic || null);
                    }}
                    data-testid="select-post-topic"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a topic to manage posts" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics?.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name} ({topic.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTopic && (
                  <Button size="sm" onClick={() => handleOpenPostDialog()} data-testid="button-add-post" className="mt-6">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Post
                  </Button>
                )}
              </div>

              {!selectedTopic ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Select a topic above to view and manage its posts
                </p>
              ) : (
                <>
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">
                      {posts?.length || 0} posts in {selectedTopic.name}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {postsLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Loading posts...</p>
                    ) : !posts || posts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No posts yet. Create your first post to add content to this topic.
                      </p>
                    ) : (
                      posts.map((post, index) => (
                        <Card key={post.id}>
                          <CardHeader className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base" data-testid={`text-post-title-${post.id}`}>
                                  {post.title}
                                </CardTitle>
                                <div
                                  className="text-sm text-muted-foreground mt-2 line-clamp-2"
                                  dangerouslySetInnerHTML={{ __html: post.content.substring(0, 200) + "..." }}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => reorderPostMutation.mutate({ id: post.id, direction: 'up' })}
                                  disabled={index === 0}
                                  data-testid={`button-move-up-post-${post.id}`}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => reorderPostMutation.mutate({ id: post.id, direction: 'down' })}
                                  disabled={index === posts.length - 1}
                                  data-testid={`button-move-down-post-${post.id}`}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenPostDialog(post)}
                                  data-testid={`button-edit-post-${post.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deletePostMutation.mutate(post.id)}
                                  data-testid={`button-delete-post-${post.id}`}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="assessments" className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-2 block">Select Topic</Label>
                  <Select
                    value={selectedTopicForAssessments?.id || ""}
                    onValueChange={(value) => {
                      const topic = topics?.find(t => t.id === value);
                      setSelectedTopicForAssessments(topic || null);
                    }}
                    data-testid="select-assessment-topic"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a topic to manage assessments" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics?.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name} ({topic.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTopicForAssessments && (
                  <Button size="sm" onClick={() => handleOpenAssessmentDialog()} data-testid="button-add-assessment" className="mt-6">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assessment
                  </Button>
                )}
              </div>

              {!selectedTopicForAssessments ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Select a topic above to view and manage its assessments
                </p>
              ) : (
                <>
                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground">
                      {assessments?.length || 0} assessments in {selectedTopicForAssessments.name}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {assessmentsLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Loading assessments...</p>
                    ) : !assessments || assessments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No assessments yet. Create your first assessment to test student knowledge.
                      </p>
                    ) : (
                      assessments.map((assessment) => (
                        <Card key={assessment.id}>
                          <CardHeader className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base" data-testid={`text-assessment-name-${assessment.id}`}>
                                    {assessment.name}
                                  </CardTitle>
                                  {assessment.isRequired && (
                                    <Badge variant="default" data-testid={`badge-required-${assessment.id}`}>Required</Badge>
                                  )}
                                </div>
                                {assessment.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{assessment.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Mode: {assessment.mode} | Passing: {assessment.passingPercentage}% | Questions: {assessment.questionCount || 10}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenAssessmentDialog(assessment)}
                                  data-testid={`button-edit-assessment-${assessment.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteAssessmentMutation.mutate(assessment.id)}
                                  data-testid={`button-delete-assessment-${assessment.id}`}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic ? "Edit Topic" : "Create New Topic"}</DialogTitle>
            <DialogDescription>
              {editingTopic ? "Update topic details" : "Add a new topic to this course"}
            </DialogDescription>
          </DialogHeader>
          <Form {...topicForm}>
            <form onSubmit={topicForm.handleSubmit((data) => createOrUpdateTopicMutation.mutate(data))} className="space-y-4">
              <FormField
                control={topicForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic Name</FormLabel>
                    <FormControl>
                      <Input data-testid="input-topic-name" placeholder="e.g., Road Signs and Markings" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={topicForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="input-topic-description"
                        placeholder="Describe this topic..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={topicForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        data-testid="select-topic-type"
                        {...field}
                      >
                        <option value="theory">Theory</option>
                        <option value="practice">Practice</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTopicDialogOpen(false)}
                  data-testid="button-cancel-topic"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOrUpdateTopicMutation.isPending}
                  data-testid="button-save-topic"
                >
                  {createOrUpdateTopicMutation.isPending ? "Saving..." : editingTopic ? "Update Topic" : "Create Topic"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
            <DialogDescription>
              {editingPost ? "Update post content" : "Add a new post to this topic"}
            </DialogDescription>
          </DialogHeader>
          <Form {...postForm}>
            <form onSubmit={postForm.handleSubmit((data) => createOrUpdatePostMutation.mutate(data))} className="space-y-4">
              <FormField
                control={postForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Title</FormLabel>
                    <FormControl>
                      <Input data-testid="input-post-title" placeholder="e.g., Introduction to Road Safety" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={postForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        content={field.value}
                        onChange={field.onChange}
                        placeholder="Write your post content here..."
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
                  onClick={() => setIsPostDialogOpen(false)}
                  data-testid="button-cancel-post"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOrUpdatePostMutation.isPending}
                  data-testid="button-save-post"
                >
                  {createOrUpdatePostMutation.isPending ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssessmentDialogOpen} onOpenChange={setIsAssessmentDialogOpen}>
        <DialogContent className={assessmentForm.watch("mode") === "manual" ? "max-w-5xl" : "max-w-2xl"}>
          <DialogHeader>
            <DialogTitle>{editingAssessment ? "Edit Assessment" : "Create New Assessment"}</DialogTitle>
            <DialogDescription>
              {editingAssessment ? "Update assessment details" : "Add a new assessment to this topic"}
            </DialogDescription>
          </DialogHeader>
          
          <div className={assessmentForm.watch("mode") === "manual" ? "md:grid md:grid-cols-[1.4fr_1fr] gap-6" : "flex flex-col gap-6"}>
            {/* Left Column: Form */}
            <Form {...assessmentForm}>
              <form onSubmit={assessmentForm.handleSubmit((data) => createOrUpdateAssessmentMutation.mutate(data))} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <FormField
                control={assessmentForm.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <FormControl>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        data-testid="select-assessment-mode"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Clear searched questions when switching modes
                          if (e.target.value !== "manual") {
                            setSearchedQuestions([]);
                            setQuestionSearchTerm("");
                            setQuestionTagFilter("all");
                          }
                        }}
                      >
                        <option value="random">Random (from question bank)</option>
                        <option value="manual">Manual (select specific questions)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </form>
            </Form>

            {/* Right Column: Question Search (only shown in manual mode) */}
            {assessmentForm.watch("mode") === "manual" && (
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
              onClick={() => setIsAssessmentDialogOpen(false)}
              data-testid="button-cancel-assessment"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={assessmentForm.handleSubmit((data) => createOrUpdateAssessmentMutation.mutate(data))}
              disabled={createOrUpdateAssessmentMutation.isPending}
              data-testid="button-save-assessment"
            >
              {createOrUpdateAssessmentMutation.isPending ? "Saving..." : editingAssessment ? "Update Assessment" : "Create Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
