import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LinkIcon, Loader2, Upload, Settings as SettingsIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openGooglePicker, buildDriveFileUrl, buildDriveFolderUrl, getGoogleDriveAccessToken } from "@/lib/googlePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export default function ImportsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [driveUrl, setDriveUrl] = useState("");
  const [driveTitle, setDriveTitle] = useState("");
  const [driveType, setDriveType] = useState<"image" | "video" | "all">("all");
  const driveCardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  type ImportSettings = {
    defaultFolderType: "all" | "image" | "video";
    confirmBeforeImport: boolean;
  };

  const loadSettings = (): ImportSettings => {
    try {
      const raw = localStorage.getItem("importSettings");
      if (!raw) return { defaultFolderType: "all", confirmBeforeImport: true };
      const parsed = JSON.parse(raw);
      return {
        defaultFolderType: ["all", "image", "video"].includes(parsed.defaultFolderType) ? parsed.defaultFolderType : "all",
        confirmBeforeImport: typeof parsed.confirmBeforeImport === "boolean" ? parsed.confirmBeforeImport : true,
      } as ImportSettings;
    } catch {
      return { defaultFolderType: "all", confirmBeforeImport: true };
    }
  };

  const [settings, setSettings] = useState<ImportSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<Array<{ id: string; name?: string; mimeType?: string; isFolder?: boolean }>>([]);
  
  // Progress modal state
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressData, setProgressData] = useState<{
    current: number;
    total: number;
    currentFile: string;
    type: 'file' | 'drive';
  }>({ current: 0, total: 0, currentFile: '', type: 'file' });

  const saveSettings = (next: ImportSettings) => {
    setSettings(next);
    localStorage.setItem("importSettings", JSON.stringify(next));
  };

  const driveMutation = useMutation({
    mutationFn: async (data: { driveUrl?: string; title?: string; type?: string; folderId?: string; fileId?: string }) => {
      const token = await getGoogleDriveAccessToken();

      // prefer explicit IDs if provided
      if (data.folderId) {
        const res = await apiRequest("POST", "/api/content/google-drive-folder", {
          folderId: data.folderId,
          mediaType: (data.type || "all") === "all" ? "all" : data.type,
          token,
        });
        return await res.json();
      }
      if (data.fileId) {
        const res = await apiRequest("POST", "/api/content/google-drive", {
          fileId: data.fileId,
          title: data.title || "Imported File",
          type: data.type || "image",
          token,
        });
        return await res.json();
      }

      // else parse from URL
      const driveUrl = data.driveUrl || "";
      const isFolder = driveUrl.includes('/folders/');
      if (isFolder) {
        const folderId = driveUrl.split('/folders/')[1]?.split(/[?#]/)[0];
        const res = await apiRequest("POST", "/api/content/google-drive-folder", {
          folderId,
          mediaType: (data.type || "all") === "all" ? "all" : data.type,
          token,
        });
        return await res.json();
      } else {
        const fileId = driveUrl.split('/file/d/')[1]?.split('/')[0];
        const res = await apiRequest("POST", "/api/content/google-drive", {
          fileId,
          title: data.title || "Imported File",
          type: data.type || "image",
          token,
        });
        return await res.json();
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      if (response.imported) {
        // Folder import response
        toast({
          title: "Success",
          description: `Imported ${response.imported} files from Google Drive folder`,
        });
      } else {
        // Individual file import response
        toast({
          title: "Success",
          description: "Content added from Google Drive",
        });
      }
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

  const handleDriveImport = () => {
    if (!driveUrl || (!driveTitle && !driveUrl.includes('/folders/'))) {
      toast({
        title: "Missing Information",
        description: "Please provide a Google Drive URL and title",
        variant: "destructive",
      });
      return;
    }

    driveMutation.mutate({
      driveUrl,
      title: driveTitle || "Imported Content",
      type: driveType,
    });
  };

  const handleImportFromFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Show progress modal
    setProgressData({ current: 0, total: files.length, currentFile: '', type: 'file' });
    setProgressOpen(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressData(prev => ({ ...prev, current: i, currentFile: file.name }));
        
        const form = new FormData();
        form.append("file", file);
        form.append("title", file.name);
        const res = await fetch("/api/content/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || `Failed to upload ${file.name}`);
        }
        await res.json();
      }
      
      setProgressData(prev => ({ ...prev, current: files.length }));
      setTimeout(() => {
        setProgressOpen(false);
        toast({ title: "Upload complete", description: `${files.length} file(s) imported` });
        queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      }, 500);
    } catch (err: any) {
      setProgressOpen(false);
      toast({ title: "Upload failed", description: err?.message || "", variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const handleImportFromDriveClick = () => {
    openGooglePicker()
      .then((docs) => {
        if (!docs || docs.length === 0) return;
        setPendingDocs(docs);
        if (settings.confirmBeforeImport) {
          setSummaryOpen(true);
        } else {
          confirmImport(docs);
        }
      })
      .catch((e) => {
        toast({
          title: "Google Picker error",
          description: e?.message || "Unable to open Google Picker",
          variant: "destructive",
        });
      });
  };

  const confirmImport = async (docs: Array<{ id: string; name?: string; mimeType?: string; isFolder?: boolean }>) => {
    // Show progress modal
    setProgressData({ current: 0, total: docs.length, currentFile: '', type: 'drive' });
    setProgressOpen(true);
    
    try {
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        setProgressData(prev => ({ ...prev, current: i, currentFile: doc.name || doc.id }));
        
        try {
          if (doc.isFolder) {
            await driveMutation.mutateAsync({
              folderId: doc.id,
              title: doc.name || "Imported Folder",
              type: settings.defaultFolderType,
            });
          } else {
            const inferredType: "image" | "video" = (doc.mimeType || "").startsWith("video/") ? "video" : "image";
            await driveMutation.mutateAsync({
              fileId: doc.id,
              title: doc.name || "Imported File",
              type: inferredType,
            });
          }
        } catch (e: any) {
          toast({
            title: "Import failed",
            description: e?.message || "Could not import selected item",
            variant: "destructive",
          });
        }
      }
      
      setProgressData(prev => ({ ...prev, current: docs.length }));
      setTimeout(() => {
        setProgressOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      }, 500);
    } catch (err: any) {
      setProgressOpen(false);
      toast({ title: "Import failed", description: err?.message || "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold">Import Content</h2>
          <p className="text-muted-foreground">
            Import images and videos from Google Drive
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-import-settings">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Settings</DialogTitle>
                <DialogDescription>Control default filters and confirmations for Drive imports.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="default-folder-type">Default folder import type</Label>
                  <Select
                    value={settings.defaultFolderType}
                    onValueChange={(v) => saveSettings({ ...settings, defaultFolderType: v as any })}
                  >
                    <SelectTrigger id="default-folder-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All (Images & Videos)</SelectItem>
                      <SelectItem value="image">Images Only</SelectItem>
                      <SelectItem value="video">Videos Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <p className="font-medium">Confirm before importing</p>
                    <p className="text-sm text-muted-foreground">Show a summary dialog after picking items.</p>
                  </div>
                  <Switch
                    checked={settings.confirmBeforeImport}
                    onCheckedChange={(checked) => saveSettings({ ...settings, confirmBeforeImport: !!checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setSettingsOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="button-import-top-right">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportFromFileClick} data-testid="menu-import-file">
                Import from file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportFromDriveClick} data-testid="menu-import-drive">
                Import from Google Drive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>
      </div>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              Review the items selected from Google Drive before importing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-auto">
            {pendingDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items selected.</p>
            ) : (
              pendingDocs.map((d) => {
                const isVideo = (d.mimeType || "").startsWith("video/");
                const isFolder = !!d.isFolder;
                return (
                  <div key={d.id} className="flex items-center justify-between border rounded p-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{d.name || d.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {isFolder ? "Folder" : isVideo ? "Video" : "Image"}
                      </p>
                    </div>
                    {isFolder && (
                      <span className="text-xs text-muted-foreground">Type: {settings.defaultFolderType}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setSummaryOpen(false);
                await confirmImport(pendingDocs);
                setPendingDocs([]);
              }}
            >
              Import {pendingDocs.length > 0 ? `(${pendingDocs.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card ref={driveCardRef}>
        <CardHeader>
          <CardTitle>Import from Google Drive</CardTitle>
          <CardDescription>
            Add content by providing a Google Drive file or folder URL. Your Google Drive will be used as storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="drive-url">Google Drive URL</Label>
            <Input
              id="drive-url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/... or https://drive.google.com/file/d/..."
              data-testid="input-drive-url"
            />
            <p className="text-sm text-muted-foreground">
              Enter either a folder URL to import all files, or an individual file URL
            </p>
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
            <Select value={driveType} onValueChange={(v) => setDriveType(v as "image" | "video" | "all")}>
              <SelectTrigger id="drive-type" data-testid="select-drive-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Images & Videos)</SelectItem>
                <SelectItem value="image">Images Only</SelectItem>
                <SelectItem value="video">Videos Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              For folders: choose what types to import. For individual files: choose the file type.
            </p>
          </div>
          
          <Button
            onClick={handleDriveImport}
            disabled={driveMutation.isPending || !driveUrl || (!driveTitle && !driveUrl.includes('/folders/'))}
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
                <Upload className="w-4 h-4 mr-2" />
                {driveUrl.includes('/folders/') ? 'Import Folder from Drive' : 'Import from Drive'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Modal */}
      <Dialog open={progressOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {progressData.type === 'file' ? 'Uploading Files' : 'Importing from Drive'}
            </DialogTitle>
            <DialogDescription>
              Please wait while we process your files...
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progressData.current} / {progressData.total}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${progressData.total > 0 ? (progressData.current / progressData.total) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Current File */}
            {progressData.currentFile && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Current file:</p>
                <p className="text-sm text-muted-foreground truncate" title={progressData.currentFile}>
                  {progressData.currentFile}
                </p>
              </div>
            )}

            {/* Animated dots */}
            <div className="flex justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
