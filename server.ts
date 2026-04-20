import express from "express";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import * as admin from "firebase-admin";

// Load environment variables for development
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

// Enterprise Security: Initialize Firebase Admin for authenticating backend requests.
// By defining the projectId, we can use verifyIdToken() to validate Google-signed JWTs 
// without needing a highly sensitive Service Account private key on the server.
admin.initializeApp({
  projectId: "iit-exchange-368e9"
});

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // (Optional) Enforce the @iitdh.ac.in domain on the backend level too
    if (!decodedToken.email?.endsWith('@iitdh.ac.in')) {
      return res.status(403).json({ error: "Forbidden: Not an IITD domain" });
    }
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Cloudinary
  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // API Route to upload image to Cloudinary (secure signed upload via server)
  app.post("/api/images/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Missing Cloudinary API keys on server");
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "iit-exchange" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload stream error:", error);
            return res.status(500).json({ error: "Failed to upload to Cloudinary" });
          }
          res.json({ secure_url: result?.secure_url });
        }
      );

      Readable.from(req.file.buffer).pipe(uploadStream);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Server upload error" });
    }
  });

  // API Route to delete image from Cloudinary
  app.post("/api/images/delete", requireAuth, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl || typeof imageUrl !== "string") {
        return res.status(400).json({ error: "Missing imageUrl" });
      }

      // Extract the Cloudinary public_id from the URL
      // E.g. https://res.cloudinary.com/cloud_name/image/upload/v12345/presets/abc123_.jpg
      // This regex extracts the string after /upload/ (ignoring version) and removes the extension
      const urlParts = imageUrl.split('/');
      const filenameWithExtension = urlParts[urlParts.length - 1];
      const publicId = filenameWithExtension.split('.')[0];
      
      // If using folders, they won't be captured strictly by this simplistic extraction
      // A better way is to find everything after the folder/prefix we use, but for unsigned presets, 
      // usually it uploads to the root or a preset folder. 
      // A more robust method for cloudinary URLs:
      // https://res.cloudinary.com/<cloud_name>/image/upload/[v_version]/<public_id>.<ext>
      const uploadIdx = urlParts.findIndex(part => part === 'upload');
      if (uploadIdx === -1) {
          return res.status(400).json({ error: "Invalid Cloudinary URL" });
      }
      
      // Usually, the next part is version (e.g. v1612... ) or directly the public_id
      let startIdx = uploadIdx + 1;
      if (urlParts[startIdx].match(/^v\d+$/)) {
          startIdx += 1;
      }
      
      let fullPublicIdWithExt = urlParts.slice(startIdx).join('/');
      const fullPublicId = fullPublicIdWithExt.substring(0, fullPublicIdWithExt.lastIndexOf('.'));

      if (!fullPublicId) {
        return res.status(400).json({ error: "Could not extract public ID" });
      }

      if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Missing Cloudinary API keys on server");
      }

      await cloudinary.uploader.destroy(fullPublicId);
      
      res.json({ success: true, publicId: fullPublicId });
    } catch (error: any) {
      console.error("Cloudinary delete error:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
