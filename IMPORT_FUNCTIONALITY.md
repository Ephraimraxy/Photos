# Import Functionality Documentation

## Overview
The admin panel provides two ways to import images and videos:
1. **Import from Local File** - Upload files directly from your device storage
2. **Import from Google Drive** - Select files/folders from Google Drive with OAuth authentication

## Location
Navigate to `/admin` → Click "Imports" section in the sidebar

## Import Methods

### 1. Import from Local File Storage

**How it works:**
- Click the "Import" button (top right)
- Select "Import from file" from the dropdown menu
- A file picker dialog opens allowing you to select multiple files from your device
- Accepts: Images (image/*) and Videos (video/*)
- Multiple file selection is enabled

**Technical Implementation:**
- Uses a hidden `<input type="file">` element with `multiple` and `accept="image/*,video/*"` attributes
- Triggered via a ref when the dropdown menu item is clicked
- Files are uploaded via FormData to `/api/content/upload` endpoint
- Shows progress modal with current file being uploaded and progress bar
- Invalidates cache and shows success toast upon completion

**Code Location:** 
- Frontend: `client/src/components/admin/imports-section.tsx` (lines 171-214, 354-361)
- Handler: `handleImportFromFileClick()` and `handleFilesSelected()`

### 2. Import from Google Drive

**How it works:**
- Click the "Import" button (top right)
- Select "Import from Google Drive" from the dropdown menu
- **Google OAuth Popup appears** - User logs in with their Google account
- Google Picker interface opens showing user's Drive files and folders
- User can select files or folders (with folder selection enabled)
- Shows confirmation dialog (optional, can be disabled in settings)
- Imports selected items with progress tracking

**Technical Implementation:**
- Uses Google Picker API with OAuth 2.0 authentication
- Requires `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY` environment variables
- OAuth scope: `https://www.googleapis.com/auth/drive.readonly`
- Dynamically loads Google GSI, GAPI, and Picker libraries
- Access token is cached for the session
- Supports both individual files and folder imports
- For folders: can filter by media type (all, images only, videos only)

**OAuth Flow:**
1. `openGooglePicker()` is called
2. `ensureAccessToken()` checks for cached token or initiates OAuth flow
3. Google's token client shows OAuth consent popup
4. User logs in and grants permissions
5. Access token is returned and cached
6. Google Picker UI appears with user's Drive contents
7. Selected files/folders are imported via backend API

**Code Locations:**
- Frontend Picker: `client/src/lib/googlePicker.ts`
- Import Handler: `client/src/components/admin/imports-section.tsx` (lines 216-234)
- Backend Auth (Server-side): `server/google-drive.ts` (uses Replit connector)

**Backend Authentication:**
The server uses the Replit Google Drive connector for authentication, which:
- Automatically manages OAuth tokens and refresh
- Falls back to environment variables if needed
- Supports service account authentication
- Handles token caching and expiration

### Import Settings

Click the "Settings" button (next to Import button) to configure:
- **Default folder import type**: Choose what media types to import from folders (All, Images Only, Videos Only)
- **Confirm before importing**: Toggle confirmation dialog before importing (enabled by default)

Settings are persisted in localStorage.

## Progress Tracking

Both import methods show a progress modal displaying:
- Current file number / Total files
- Current file name being processed
- Visual progress bar
- Animated loading indicator

## API Endpoints

### Upload from File
- **Endpoint**: `POST /api/content/upload`
- **Body**: FormData with `file` (multipart) and `title`
- **File Handling**: Uses multer middleware with memory storage (100MB limit)
- **Process**: File is uploaded from local device → stored in Google Drive → metadata saved to database
- **Response**: Uploaded content object with Google Drive details

### Import from Google Drive (Individual File)
- **Endpoint**: `POST /api/content/google-drive`
- **Body**: `{ fileId, title, type, token }`
- **Response**: Imported content object

### Import from Google Drive (Folder)
- **Endpoint**: `POST /api/content/google-drive-folder`
- **Body**: `{ folderId, mediaType, token }`
- **Response**: `{ imported: number }` - count of imported files

## Environment Variables Required

### Client-side (Frontend)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth 2.0 Client ID
- `VITE_GOOGLE_API_KEY` - Google API Key for Picker

### Server-side (Backend)
The Replit Google Drive connector is configured and handles authentication automatically.
No additional environment variables are required on the server side.

## Features

- ✅ Multiple file selection from local device
- ✅ Google OAuth login popup for Drive access
- ✅ Folder selection and bulk import from Google Drive
- ✅ Media type filtering (images/videos/all)
- ✅ Progress tracking with file names and progress bar
- ✅ Confirmation dialogs (configurable)
- ✅ Settings persistence
- ✅ Error handling with user-friendly messages
- ✅ Cache invalidation after successful import
- ✅ Toast notifications for success/error states
- ✅ Proper test IDs for all interactive elements

## Test IDs for Automated Testing

- `button-import-top-right` - Main Import dropdown button
- `menu-import-file` - "Import from file" menu item
- `menu-import-drive` - "Import from Google Drive" menu item
- `button-import-settings` - Settings button
- `input-drive-url` - Google Drive URL input (for manual URL entry)
- `input-drive-title` - Title input for manual Drive import
- `select-drive-type` - Content type selector
- `button-import-drive` - Import button for manual Drive URL import
