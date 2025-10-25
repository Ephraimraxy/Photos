import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LinkIcon, Loader2, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [driveUrl, setDriveUrl] = useState("");
  const [driveTitle, setDriveTitle] = useState("");
  const [driveType, setDriveType] = useState<"image" | "video" | "all">("all");

  const driveMutation = useMutation({
    mutationFn: async (data: { driveUrl: string; title: string; type: string }) => {
      // Check if it's a folder URL or individual file URL
      if (data.driveUrl.includes('/folders/')) {
        // Folder import
        return await apiRequest("POST", "/api/content/google-drive-folder", {
          folderUrl: data.driveUrl,
          mediaType: data.type === "all" ? "all" : data.type
        });
      } else {
        // Individual file import
        return await apiRequest("POST", "/api/content/google-drive", data);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Import Content</h2>
        <p className="text-muted-foreground">
          Import images and videos from Google Drive
        </p>
      </div>

      <Card>
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
    </div>
  );
}
