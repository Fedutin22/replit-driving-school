import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash, FileText, List, ArrowUp, ArrowDown } from "lucide-react";
import type { Course, Topic, Post } from "@shared/schema";
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

type TopicForm = z.infer<typeof topicSchema>;
type PostForm = z.infer<typeof postSchema>;

interface CourseContentManagerProps {
  course: Course;
  open: boolean;
  onClose: () => void;
}

export function CourseContentManager({ course, open, onClose }: CourseContentManagerProps) {
  const { toast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="topics" data-testid="tab-topics">
                <List className="h-4 w-4 mr-2" />
                Topics
              </TabsTrigger>
              <TabsTrigger value="posts" data-testid="tab-posts">
                <FileText className="h-4 w-4 mr-2" />
                Posts
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
    </>
  );
}
