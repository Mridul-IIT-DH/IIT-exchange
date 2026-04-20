import express from "express";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import admin from "firebase-admin";
import rateLimit from "express-rate-limit";

// Load environment variables for development
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Enterprise Security: Initialize Firebase Admin for authenticating backend requests.
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
    console.log("Firebase Admin initialized successfully.");
  }
} catch (error: any) {
  console.error("Firebase admin initialization error:", error);
}

// Enterprise Protection: Global Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});

// Stricter limiter for image uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // limit each IP to 30 uploads per hour
  message: { error: "Hourly upload limit reached." }
});

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Strict domain enforcement on all API endpoints
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
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize Cloudinary
  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // API Route to upload image to Cloudinary (secure signed upload via server)
  app.post("/api/images/upload", apiLimiter, uploadLimiter, requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Missing Cloudinary API keys on server");
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: "iit-exchange",
          transformation: [
            { width: 1200, height: 900, crop: "limit" },
            { quality: "auto" }
          ]
        },
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
  app.post("/api/images/delete", apiLimiter, requireAuth, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl || typeof imageUrl !== "string") {
        return res.status(400).json({ error: "Missing imageUrl" });
      }

      // Pattern match to extract Public ID from URL
      const urlParts = imageUrl.split('/');
      const uploadIdx = urlParts.findIndex(part => part === 'upload');
      if (uploadIdx === -1) {
          return res.status(400).json({ error: "Invalid Cloudinary URL" });
      }
      
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
