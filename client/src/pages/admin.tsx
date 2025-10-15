import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, Trash2, ArrowLeft, Image as ImageIcon, Video, Loader2, Copy, ExternalLink, Receipt } from "lucide-react";
import { type Content, type Purchase } from "@shared/schema";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [driveUrl, setDriveUrl] = useState("");
  const [driveTitle, setDriveTitle] = useState("");
  const [driveType, setDriveType] = useState<"image" | "video">("image");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);

  const { data: content, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const driveMutation = useMutation({
    mutationFn: async (data: { driveUrl: string; title: string; type: string }) => {
      return await apiRequest("POST", "/api/content/google-drive", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Success",
        description: "Content added from Google Drive",
      });
      setDriveUrl("");
      setDriveTitle("");
    },
    onError: (error: Error) => {
      toast({
        title: "Google Drive Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const handleDriveImport = () => {
    if (!driveUrl || !driveTitle) {
      toast({
        title: "Missing Information",
        description: "Please enter Google Drive URL and title",
        variant: "destructive",
      });
      return;
    }

    driveMutation.mutate({ driveUrl, title: driveTitle, type: driveType });
  };

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

  const copyTrackingLink = (purchaseId: string) => {
    const link = `${window.location.origin}/purchase/${purchaseId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Tracking link copied to clipboard",
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold font-display" data-testid="text-admin-title">
                Admin Panel
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Import from Google Drive</CardTitle>
                <CardDescription>
                  Add content by providing a Google Drive file URL. Your Google Drive will be used as storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="drive-url">Google Drive URL</Label>
                  <Input
                    id="drive-url"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    data-testid="input-drive-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drive-title">Title</Label>
                  <Input
                    id="drive-title"
                    value={driveTitle}
                    onChange={(e) => setDriveTitle(e.target.value)}
                    placeholder="Enter content title"
                    data-testid="input-drive-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drive-type">Content Type</Label>
                  <Select value={driveType} onValueChange={(v) => setDriveType(v as "image" | "video")}>
                    <SelectTrigger id="drive-type" data-testid="select-drive-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleDriveImport}
                  disabled={driveMutation.isPending || !driveUrl || !driveTitle}
                  className="w-full"
                  data-testid="button-import-drive"
                >
                  {driveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Import from Drive
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Images</span>
                  </div>
                  <Badge variant="secondary" data-testid="badge-images-count">
                    {content?.filter((c) => c.type === "image").length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Videos</span>
                  </div>
                  <Badge variant="secondary" data-testid="badge-videos-count">
                    {content?.filter((c) => c.type === "video").length || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="content" className="mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Manage Content</CardTitle>
                <CardDescription>View and manage all content from Google Drive</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4" data-testid="loading-content">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : !content || content.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-content">
                    <LinkIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No content added yet. Import from Google Drive to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="content-list">
                    {content.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-accent/50 hover-elevate"
                        data-testid={`content-item-${item.id}`}
                      >
                        <img
                          src={`/api/content/${item.id}/preview`}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate" data-testid={`text-content-title-${item.id}`}>{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{item.type}</Badge>
                            <Badge variant="secondary" className="text-xs">Google Drive</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View all completed transactions and tracking links</CardDescription>
              </CardHeader>
              <CardContent>
                {purchasesLoading ? (
                  <div className="space-y-4" data-testid="loading-purchases">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : !purchases || purchases.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-purchases">
                    <Receipt className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No purchases yet</p>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="purchases-list">
                    {purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="p-4 rounded-lg border border-border bg-card hover-elevate"
                        data-testid={`purchase-item-${purchase.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={purchase.status === 'completed' ? 'default' : purchase.status === 'pending' ? 'secondary' : 'destructive'}
                                data-testid={`badge-status-${purchase.id}`}
                              >
                                {purchase.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground" data-testid={`text-date-${purchase.id}`}>
                                {formatDate(purchase.createdAt)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Items</p>
                                <p className="font-medium" data-testid={`text-items-${purchase.id}`}>
                                  {purchase.contentIds.length}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Amount</p>
                                <p className="font-semibold text-primary" data-testid={`text-amount-${purchase.id}`}>
                                  ₦{purchase.totalAmount.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Reference</p>
                                <p className="font-mono text-xs truncate" data-testid={`text-reference-${purchase.id}`}>
                                  {purchase.paystackReference}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">Tracking Link</p>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={`${window.location.origin}/purchase/${purchase.id}`}
                                    readOnly
                                    className="flex-1 px-2 py-1 text-xs bg-accent/50 border border-border rounded"
                                    data-testid={`input-link-${purchase.id}`}
                                  />
                                  <Button
                                    onClick={() => copyTrackingLink(purchase.id)}
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-copy-${purchase.id}`}
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy
                                  </Button>
                                  <Button
                                    onClick={() => window.open(`/purchase/${purchase.id}`, '_blank')}
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-open-${purchase.id}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this content from your store. The original file in Google Drive will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
