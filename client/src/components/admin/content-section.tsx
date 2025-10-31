import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Content } from "@shared/schema";
import { Trash2, Image, Video, ExternalLink, Loader2, Trash, CheckSquare, Square, Upload } from "lucide-react";
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

export default function ContentSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressState, setProgressState] = useState<{ current: number; total: number; file: string; success: number; failed: number }>({ current: 0, total: 0, file: '', success: 0, failed: 0 });

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const existingNames = new Set((content || []).map(c => (c.title || "").trim().toLowerCase()));
      const seenInSelection = new Set<string>();
      const toUpload: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const name = files[i].name.trim().toLowerCase();
        if (existingNames.has(name)) continue; // skip duplicates already uploaded
        if (seenInSelection.has(name)) continue; // skip duplicates within the same selection
        seenInSelection.add(name);
        toUpload.push(files[i]);
      }

      if (toUpload.length === 0) {
        toast({ title: "No new files", description: "All selected files are duplicates by name." });
        e.target.value = "";
        return;
      }

      setProgressState({ current: 0, total: toUpload.length, file: '', success: 0, failed: 0 });
      setProgressOpen(true);
      let successCount = 0;
      let failedCount = 0;
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        setProgressState(prev => ({ ...prev, current: i + 1, file: file.name, success: successCount, failed: failedCount }));
        const form = new FormData();
        form.append("file", file);
        form.append("title", file.name);
        const res = await fetch("/api/content/upload", { method: "POST", body: form });
        if (!res.ok) {
          const msg = await res.text();
          failedCount++;
          setProgressState(prev => ({ ...prev, success: successCount, failed: failedCount }));
          continue;
        }
        await res.json();
        successCount++;
        setProgressState(prev => ({ ...prev, success: successCount }));
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setProgressOpen(false);
      toast({ title: "Upload complete", description: `${successCount} succeeded, ${failedCount} failed` });
    } catch (err: any) {
      setProgressOpen(false);
      toast({ title: "Upload failed", description: err?.message || "", variant: "destructive" });
    } finally {
      e.target.value = "";
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

      <AlertDialog open={progressOpen} onOpenChange={setProgressOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uploading files</AlertDialogTitle>
            <AlertDialogDescription>
              {progressState.current} / {progressState.total} • {progressState.file}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Success: {progressState.success} • Failed: {progressState.failed}
          </div>
        </AlertDialogContent>
      </AlertDialog>
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <Button variant="default" size="sm" onClick={handleUploadClick}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {!content || content.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No content yet</h3>
            <p className="text-muted-foreground text-center">
              Import your first images or videos from Google Drive to get started.
            </p>
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
                    <div className="absolute top-2 right-2">
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
                        onClick={() => window.open(item.googleDriveUrl, '_blank')}
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
    </div>
  );
}
