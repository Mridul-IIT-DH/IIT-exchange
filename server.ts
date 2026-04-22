import express from "express";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import admin from "firebase-admin";
import helmet from "helmet";
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
    admin.initializeApp({
      projectId: "iit-exchange-368e9"
    });
  }
} catch (error: any) {
  console.error("Firebase admin initialization error:", error);
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Strict domain enforcement and verification check on all API endpoints
    if (!decodedToken.email?.endsWith('@iitdh.ac.in')) {
      return res.status(403).json({ error: "Forbidden: Not an IITD domain" });
    }

    if (decodedToken.email_verified !== true) {
      return res.status(403).json({ error: "Forbidden: Email not verified" });
    }
    
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust the first proxy to ensure express-rate-limit correctly captures 
  // the client's IP from the 'X-Forwarded-For' headers provided by Cloud Run / Nginx.
  app.set("trust proxy", 1);

  // Enterprise Security: Helmet headers
  app.use(helmet({
    contentSecurityPolicy: false, // CSP blocks inline scripts in Vite dev mode, managed by platform
    crossOriginEmbedderPolicy: false // Allows loading external images (Cloudinary)
  }));

  // Enterprise Security: Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500, // Limit each IP to 500 requests per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
  });
  
  // Stricter limiter for image uploads
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // strictly up to 100 images per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Upload limit exceeded, please try again in an hour.' }
  });

  app.use('/api/', apiLimiter);

  app.use(express.json());

  // Initialize Cloudinary
  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // API Route to upload image to Cloudinary (secure signed upload via server)
  app.post("/api/images/upload", uploadLimiter, requireAuth, upload.single("file"), async (req, res) => {
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
      console.error("ADMIN-API [Upload Error]:", error);
      res.status(500).json({ 
        error: "Server processing error during upload",
        message: error.message 
      });
    }
  });

  // API Route to delete image from Cloudinary
  app.post("/api/images/delete", requireAuth, async (req, res) => {
    console.log("ADMIN-API [Delete Request]:", req.body.imageUrl);
    try {
      const { imageUrl } = req.body;
      const user = (req as any).user;
      
      if (!imageUrl || typeof imageUrl !== "string") {
        return res.status(400).json({ error: "Missing imageUrl" });
      }

      // Hardened Ownership Check: Ensure only the seller or admin can delete
      const isAdmin = user.email === 'cs24mt002@iitdh.ac.in';
      if (!isAdmin) {
        const db = admin.firestore();
        // Check admins collection as fallback
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        if (!adminDoc.exists) {
          const productSnapshot = await db.collection('products')
            .where('images', 'array-contains', imageUrl)
            .where('sellerId', '==', user.uid)
            .limit(1)
            .get();

          if (productSnapshot.empty) {
            return res.status(403).json({ error: "Forbidden: You do not own this image" });
          }
        }
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
      console.error("ADMIN-API [Delete Error]:", error);
      res.status(500).json({ 
        error: "Failed to delete resource",
        message: error.message
      });
    }
  });

  // --- API GUARDIAN ---
  // Ensure any unmatched /api calls or internal errors don't drift into Vite fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
  });

  // Global Error Handler for /api
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error("CRITICAL [API Error]:", err);
      return res.status(500).json({ 
        error: "Internal Server Error in API",
        message: err.message
      });
    }
    next(err);
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
