import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Content } from "@shared/schema";
import { Trash2, Image, Video, ExternalLink, Loader2, Trash, CheckSquare, Square, Upload, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ContentSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadTitles, setUploadTitles] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: content, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/content/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Deleted",
        description: "Content removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map(id => apiRequest("DELETE", `/api/content/${id}`, {}));
      return await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setSelectedItems(new Set());
      toast({
        title: "Bulk Delete Complete",
        description: `${selectedItems.size} items deleted successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Clone response to read it multiple times if needed
        const responseClone = response.clone();
        let errorMessage = 'Upload failed';
        
        // Try to parse as JSON first
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            // If JSON parse fails, try text
            try {
              const errorText = await responseClone.text();
              errorMessage = errorText || `Server returned ${response.status}`;
            } catch {
              errorMessage = `Server returned ${response.status}`;
            }
          }
        } else {
          // Not JSON, try text
          try {
            const errorText = await response.text();
            errorMessage = errorText || `Server returned ${response.status}`;
          } catch {
            errorMessage = `Server returned ${response.status}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Upload Successful",
        description: "File uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    setContentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (contentToDelete) {
      deleteMutation.mutate(contentToDelete);
      setDeleteDialogOpen(false);
      setContentToDelete(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === content?.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(content?.map(item => item.id) || []));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    if (selectedItems.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedItems));
      setBulkDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please select image or video files only",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(validFiles);
    // Initialize titles with file names
    const titles: Record<number, string> = {};
    validFiles.forEach((file, index) => {
      titles[index] = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    });
    setUploadTitles(titles);
    setUploadDialogOpen(true);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const title = uploadTitles[i] || file.name.replace(/\.[^/.]+$/, "");
      
      if (!title.trim()) {
        toast({
          title: "Title Required",
          description: `Please provide a title for ${file.name}`,
          variant: "destructive",
        });
        return;
      }

      await uploadMutation.mutateAsync({ file, title });
    }

    // Reset state
    setSelectedFiles([]);
    setUploadTitles({});
    setUploadDialogOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Content Management</h2>
          <p className="text-muted-foreground">
            Manage your uploaded content
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-48 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Content Management</h2>
          <p className="text-muted-foreground">
            Manage your uploaded content ({content?.length || 0} items)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={handleUploadClick}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload Files
          </Button>
          
          {selectedItems.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} selected
              </span>
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash className="w-4 h-4 mr-2" />
                )}
                Delete Selected
              </Button>
            </>
          )}
        </div>
      </div>

      {!content || content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No content yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload your first images or videos to get started.
            </p>
            <Button onClick={handleUploadClick}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select All Controls */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedItems.size === content?.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedItems.size === content?.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedItems.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} of {content?.length} selected
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={`/api/content/${item.id}/preview`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => handleSelectItem(item.id)}
                        className="bg-background/80"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      {item.loadStatus === "failed" && (
                        <Badge variant="destructive" className="bg-red-600">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      <Badge variant={item.type === "image" ? "default" : "destructive"}>
                        {item.type === "image" ? (
                          <Image className="w-3 h-3 mr-1" />
                        ) : (
                          <Video className="w-3 h-3 mr-1" />
                        )}
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold line-clamp-2 mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = item.supabaseUrl || item.googleDriveUrl;
                          if (url) {
                            window.open(url, '_blank');
                          }
                        }}
                        disabled={!item.supabaseUrl && !item.googleDriveUrl}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this content from your store. The original file in Google Drive will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedItems.size} selected items from your store. The original files in Google Drive will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedItems.size} Items`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Provide titles for your files. You can upload multiple files at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`title-${index}`}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Label>
                <Input
                  id={`title-${index}`}
                  value={uploadTitles[index] || ''}
                  onChange={(e) => {
                    setUploadTitles(prev => ({
                      ...prev,
                      [index]: e.target.value,
                    }));
                  }}
                  placeholder="Enter title for this file"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFiles([]);
                setUploadTitles({});
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || selectedFiles.length === 0}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
