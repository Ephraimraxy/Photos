# Google Drive Folder Import Guide

## 🎉 New Feature: Bulk Folder Import

Your application now supports importing entire Google Drive folders with automatic file detection!

### ✅ **What's New:**
- **Bulk Import**: Import all images/videos from a folder at once
- **Auto-Detection**: Automatically categorizes files as images or videos
- **Smart Filtering**: Choose to import only images, only videos, or both
- **Error Handling**: Reports which files failed to import

## 🔧 **How to Use Folder Import**

### **API Endpoint:**
```
POST /api/content/google-drive-folder
```

### **Request Body:**
```json
{
  "folderUrl": "https://drive.google.com/drive/folders/1u07ZqZwf8jMw7t_K8LwvZy1RljsEZWQW",
  "mediaType": "all"
}
```

### **Media Type Options:**
- `"all"` - Import both images and videos
- `"image"` - Import only images  
- `"video"` - Import only videos

### **Response Example:**
```json
{
  "success": true,
  "imported": 15,
  "total": 20,
  "errors": 5,
  "content": [...],
  "errorDetails": [...]
}
```

## 🚀 **Testing Your Folder Import**

### **Method 1: Using Your Browser**
1. Go to `http://localhost:5000`
2. Open browser developer tools (F12)
3. Go to Console tab
4. Run this JavaScript:

```javascript
fetch('/api/content/google-drive-folder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    folderUrl: 'https://drive.google.com/drive/folders/1u07ZqZwf8jMw7t_K8LwvZy1RljsEZWQW',
    mediaType: 'all'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### **Method 2: Using Postman/Insomnia**
- **URL**: `http://localhost:5000/api/content/google-drive-folder`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "folderUrl": "https://drive.google.com/drive/folders/1u07ZqZwf8jMw7t_K8LwvZy1RljsEZWQW",
  "mediaType": "all"
}
```

## 🔐 **Google Drive Authentication Setup**

The folder import requires Google Drive API access. You need to set up authentication:

### **Option 1: Replit Connectors (Recommended)**
If you're using Replit, set up Google Drive connector:
1. Go to your Replit project
2. Click on "Connectors" in the sidebar
3. Add "Google Drive" connector
4. Follow the authentication flow

### **Option 2: Manual OAuth Setup**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add credentials to your `.env` file:

```bash
GOOGLE_DRIVE_CLIENT_ID=your_client_id_here
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret_here
```

## 📊 **Expected Results from Your Folder**

Based on your Google Drive folder, you should be able to import:
- **20+ images** (JPG, PNG files)
- **Automatic categorization** by file type
- **Metadata extraction** (file size, dimensions, etc.)

## 🛠️ **Troubleshooting**

### **Error: "Google Drive not connected"**
- Set up Google Drive authentication (see above)
- Ensure your `.env` file has the correct credentials

### **Error: "Invalid Google Drive folder URL"**
- Make sure you're using a folder URL (not a file URL)
- Format: `https://drive.google.com/drive/folders/FOLDER_ID`

### **Error: "No media files found"**
- Check that your folder contains images or videos
- Ensure files are not in subfolders (only direct files are imported)
- Verify folder permissions (should be accessible)

## 🎯 **Next Steps**

1. **Set up Google Drive authentication**
2. **Test the folder import** with your folder URL
3. **Check the imported content** in your admin panel
4. **Set up Paystack** for payment processing
5. **Deploy to production** with HTTPS

## 📝 **Example Usage**

```javascript
// Import all media from your folder
const response = await fetch('/api/content/google-drive-folder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    folderUrl: 'https://drive.google.com/drive/folders/1u07ZqZwf8jMw7t_K8LwvZy1RljsEZWQW',
    mediaType: 'all'
  })
});

const result = await response.json();
console.log(`Imported ${result.imported} files out of ${result.total}`);
```

Your folder import feature is now ready! Once you set up Google Drive authentication, you'll be able to bulk import all your images and videos from the Google Drive folder.
