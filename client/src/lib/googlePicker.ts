const GSI_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";
const PICKER_SRC = "https://apis.google.com/js/api.picker.js";

type PickerDoc = {
  id: string;
  name?: string;
  mimeType?: string;
  isFolder?: boolean;
  webViewLink?: string;
};

let gsiLoaded = false;
let gapiLoaded = false;
let pickerLoaded = false;
let accessToken: string | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureGsi(): Promise<void> {
  if (gsiLoaded) return;
  await loadScript(GSI_SRC);
  gsiLoaded = true;
}

async function ensureGapi(): Promise<void> {
  if (gapiLoaded) return;
  await loadScript(GAPI_SRC);
  await new Promise<void>((resolve) => {
    (window as any).gapi.load("client", () => resolve());
  });
  gapiLoaded = true;
}

async function ensurePicker(): Promise<void> {
  if (pickerLoaded) return;
  await loadScript(PICKER_SRC);
  pickerLoaded = true;
}

async function ensureAccessToken(): Promise<string> {
  if (accessToken) return accessToken;
  await ensureGsi();
  return new Promise<string>((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    if (!clientId) {
      reject(new Error("Missing VITE_GOOGLE_CLIENT_ID"));
      return;
    }
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      prompt: "consent",
      callback: (resp: any) => {
        if (resp && resp.access_token) {
          accessToken = resp.access_token;
          resolve(accessToken);
        } else {
          reject(new Error("Failed to obtain access token"));
        }
      },
    });
    tokenClient.requestAccessToken();
  });
}

export async function openGooglePicker(): Promise<PickerDoc[] | null> {
  await Promise.all([ensureGapi(), ensurePicker()]);
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  if (!apiKey || !clientId) {
    throw new Error("Missing VITE_GOOGLE_API_KEY or VITE_GOOGLE_CLIENT_ID");
  }

  const token = await ensureAccessToken();

  return new Promise<PickerDoc[] | null>((resolve, reject) => {
    try {
      const viewFiles = new (window as any).google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setOwnedByMe(true);

      const picker = new (window as any).google.picker.PickerBuilder()
        .enableFeature((window as any).google.picker.Feature.SIMPLE_UPLOAD_ENABLED)
        .addView(viewFiles)
        .setOAuthToken(token)
        .setDeveloperKey(apiKey)
        .setCallback((data: any) => {
          const Action = (window as any).google.picker.Action;
          if (data.action === Action.PICKED) {
            const docs: PickerDoc[] = (data.docs || []).map((d: any) => ({
              id: d.id,
              name: d.name,
              mimeType: d.mimeType,
              isFolder: d.mimeType === 'application/vnd.google-apps.folder',
              webViewLink: d.url,
            }));
            resolve(docs);
          } else if (data.action === Action.CANCEL) {
            resolve(null);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (e) {
      reject(e);
    }
  });
}

export async function getGoogleDriveAccessToken(): Promise<string> {
  return await ensureAccessToken();
}

export function buildDriveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function buildDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}


