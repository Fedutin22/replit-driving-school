import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Post, Topic, Course } from "@shared/schema";

interface CoursePostsManagerProps {
  courseId: string;
}

type TopicWithPosts = Topic & { posts: Post[] };
type CourseContent = { course: Course; topics: TopicWithPosts[]; };

const postSchema = z.object({
  topicId: z.string().min(1, "Please select a topic"),
  title: z.string().min(1, "Post title is required"),
  content: z.string().optional(),
  orderIndex: z.number().int().nonnegative(),
});

type PostForm = z.infer<typeof postSchema>;

export function CoursePostsManager({ courseId }: CoursePostsManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: courseContent, isLoading } = useQuery<CourseContent>({
    queryKey: [`/api/courses/${courseId}/content`],
  });

  const topics = courseContent?.topics;

  const postForm = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      topicId: "",
      title: "",
      content: "",
      orderIndex: 0,
    },
  });

  const selectedTopicId = postForm.watch("topicId");
  const selectedTopic = topics?.find(t => t.id === selectedTopicId);

  // Recalculate orderIndex when topic changes
  const maxOrderIndex = selectedTopic?.posts && selectedTopic.posts.length > 0
    ? Math.max(...selectedTopic.posts.map(p => p.orderIndex))
    : -1;

  const createPostMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      const { topicId, ...postData } = data;
      // Use the current maxOrderIndex for the selected topic
      const topic = topics?.find(t => t.id === topicId);
      const correctOrderIndex = topic?.posts && topic.posts.length > 0
        ? Math.max(...topic.posts.map(p => p.orderIndex)) + 1
        : 0;
      
      return await apiRequest("POST", `/api/admin/posts`, {
        ...postData,
        topicId,
        orderIndex: correctOrderIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/content`] });
      setIsDialogOpen(false);
      postForm.reset();
      toast({
        title: "Post Created",
        description: "Post has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = () => {
    // Guard against no topics
    if (!topics || topics.length === 0) {
      toast({
        title: "No Topics Available",
        description: "Please create topics first in the Topics tab before adding posts.",
        variant: "destructive",
      });
      return;
    }

    const firstTopic = topics[0];
    postForm.reset({
      topicId: firstTopic.id,
      title: "",
      content: "",
      orderIndex: 0, // This will be recalculated in mutation
    });
    setIsDialogOpen(true);
  };
  const allPosts = topics?.flatMap(topic => 
    topic.posts.map(post => ({
      ...post,
      topicName: topic.name,
      topicOrder: topic.orderIndex,
    }))
  ) || [];

  const sortedPosts = allPosts.sort((a, b) => {
    if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
    return a.orderIndex - b.orderIndex;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading posts...
        </CardContent>
      </Card>
    );
  }

  if (sortedPosts.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">All Posts</h3>
            <p className="text-sm text-muted-foreground">No posts yet</p>
          </div>
          {topics && topics.length > 0 && (
            <Button onClick={handleOpenDialog} data-testid="button-create-post">
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No posts yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              {topics && topics.length > 0 
                ? "Create your first post to share information with students"
                : "Create topics first in the Topics tab, then add posts"}
            </p>
            {topics && topics.length > 0 && (
              <Button onClick={handleOpenDialog} variant="outline" data-testid="button-create-post-empty">
                <Plus className="h-4 w-4 mr-2" />
                Create Post
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
          <h3 className="text-lg font-semibold">All Posts</h3>
          <p className="text-sm text-muted-foreground">
            {sortedPosts.length} post{sortedPosts.length !== 1 ? "s" : ""} across {topics?.length || 0} topic{topics?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleOpenDialog} data-testid="button-create-post">
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedPosts.map((post) => (
          <Card key={post.id} data-testid={`card-post-${post.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{post.title}</CardTitle>
                  <CardDescription className="mt-1">
                    Topic: {post.topicName}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {post.content && (
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      {renderDialog()}
    </div>
  );

  function renderDialog() {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Add a new post to share information with students
            </DialogDescription>
          </DialogHeader>
          <Form {...postForm}>
            <form onSubmit={postForm.handleSubmit((data) => createPostMutation.mutate(data))} className="space-y-4">
              <FormField
                control={postForm.control}
                name="topicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-post-topic">
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
                        content={field.value || ""}
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
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-post"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPostMutation.isPending}
                  data-testid="button-save-post"
                >
                  {createPostMutation.isPending ? "Creating..." : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }
}
