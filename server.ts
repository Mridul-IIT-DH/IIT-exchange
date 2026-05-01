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
import { sendListingVerificationEmail } from "./server/email.ts";
import { generateMagicToken, verifyMagicToken } from "./server/tokens.ts";

// Load environment variables for development
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Increased to 10MB for enterprise flexibility
});

// Enterprise Security: Initialize Firebase Admin for authenticating backend requests.
const initializeFirebaseAdmin = () => {
  try {
    if (admin.apps.length > 0) return admin.app();

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = "iit-exchange-368e9";
    
    if (serviceAccountKey) {
      try {
        let keyContent = serviceAccountKey.trim();
        
        // Remove surrounding quotes if present (common issue when pasting into env var fields)
        if (keyContent.startsWith('"') && keyContent.endsWith('"')) {
          keyContent = keyContent.substring(1, keyContent.length - 1);
        }
        
        // Handle cases where the JSON might be escaped (e.g. \" instead of ")
        if (keyContent.includes('\\"')) {
          keyContent = keyContent.replace(/\\"/g, '"');
        }

        // If it doesn't look like JSON (starts with {), try base64 decoding
        if (!keyContent.startsWith('{')) {
          try {
            console.log("FIREBASE_SERVICE_ACCOUNT_KEY does not start with '{'. Attempting base64 decode...");
            keyContent = Buffer.from(keyContent, 'base64').toString('utf8');
          } catch (decodeError) {
            console.error("FIREBASE_SERVICE_ACCOUNT_KEY failed base64 decoding.");
          }
        }

        const serviceAccount = JSON.parse(keyContent);
        const credProjectId = serviceAccount.project_id;
        
        console.log(`[Firebase Admin] Attempting to initialize for project: ${credProjectId || projectId}`);
        
        if (credProjectId && credProjectId !== projectId) {
          console.warn(`[Firebase Admin] Warning: Service account project_id (${credProjectId}) does not match hardcoded projectId (${projectId}). Using ${credProjectId}.`);
        }

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: credProjectId || projectId
        });
      } catch (e: any) {
        console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
        console.warn("[Firebase Admin] Falling back to application default credentials. This will likely cause PERMISSION_DENIED on server-side Firestore calls.");
        return admin.initializeApp({
          projectId: projectId
        });
      }
    } else {
      console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY is missing. Using application default credentials.");
      return admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      return admin.app();
    }
    console.error("Firebase admin initialization error:", error);
    throw error;
  }
};

const firebaseAdminApp = initializeFirebaseAdmin();
const adminDb = admin.firestore();

async function isAdminUser(uid: string, email?: string) {
  if (email === 'cs24mt002@iitdh.ac.in') return true;
  try {
    const adminDoc = await adminDb.collection('admins').doc(uid).get();
    return adminDoc.exists;
  } catch (error) {
    console.error("[Admin Check Error]:", error);
    return false;
  }
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

  // Enterprise Security: Helmet headers configuration for Firebase Auth compatibility
  app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Required for Firebase Auth Popups/Redirects on custom domains
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // --- MAGIC LINK ROUTES (TOP PRIORITY) ---
  app.get("/api/confirm-relist", async (req, res) => {
    console.log(`[Magic Link] RELIST hit: ${req.originalUrl}`);
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') return res.status(400).send("Invalid token");

      const payload = verifyMagicToken(token);
      if (!payload || payload.action !== 'relist') return res.status(400).send("Invalid or expired token");

      const productRef = adminDb.collection('products').doc(payload.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) return res.status(404).send("Listing no longer exists");

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 10);

      await productRef.update({ 
        status: 'active',
        expiresAt: admin.firestore.Timestamp.fromDate(newExpiry),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.send(`<!DOCTYPE html><html><head><title>Relisted</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen p-4"><div class="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center"><div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6"><svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></div><h1 class="text-3xl font-black text-black italic uppercase tracking-tight mb-2">Relisted!</h1><p class="text-gray-500 font-medium mb-8">Your item "${productDoc.data()?.title}" is back on the market.</p><a href="/" class="inline-block px-10 py-4 bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 transition-transform">Back to Market</a></div></body></html>`);
    } catch (error: any) {
      console.error("[Magic Link RELIST Error]:", error);
      res.status(500).send("Error relisting item.");
    }
  });

  app.get("/api/confirm-sold", async (req, res) => {
    console.log(`[Magic Link] SOLD hit: ${req.originalUrl}`);
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') return res.status(400).send("Invalid token");

      const payload = verifyMagicToken(token);
      if (!payload || payload.action !== 'mark_sold') return res.status(400).send("Invalid or expired token");

      const productRef = adminDb.collection('products').doc(payload.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) return res.status(404).send("Listing no longer exists");

      await productRef.update({ 
        status: 'sold',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.send(`<!DOCTYPE html><html><head><title>Sold</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen p-4"><div class="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center"><div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><h1 class="text-3xl font-black text-black italic uppercase tracking-tight mb-2">Listing Sold!</h1><p class="text-gray-500 font-medium mb-8">Thanks for keeping the community active.</p><a href="/" class="inline-block px-10 py-4 bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 transition-transform">Back to Market</a></div></body></html>`);
    } catch (error: any) {
      console.error("[Magic Link SOLD Error]:", error);
      res.status(500).send("Error marking as sold.");
    }
  });

  // Enterprise Security: Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500, // Limit each IP to 500 requests per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
  });
  
  // Stricter limiter for image uploads (relaxed for campus NAT)
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 300, // increased from 100 to support campus/shared IP environments
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Upload limit exceeded, please try again in an hour.' }
  });

  app.use('/api', apiLimiter);

  app.use(express.json());

  // Logging middleware for API routes to debug 404s
  app.use('/api', (req, res, next) => {
    console.log(`[API Request] Method=${req.method} Path=${req.path} OriginalUrl=${req.originalUrl}`);
    next();
  });

  // Initialized Cloudinary
  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // API Route to upload image to Cloudinary (secure signed upload via server)
  app.post("/api/images/upload", uploadLimiter, requireAuth, upload.single("file"), async (req, res) => {
    console.log(`[Upload] Request received from ${ (req as any).user.email }`);
    try {
      if (!req.file) {
        console.warn("[Upload] No file in request");
        return res.status(400).json({ error: "No image file provided" });
      }

      console.log(`[Upload] File size: ${req.file.size} bytes`);

      if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.error("[Upload] Missing Cloudinary keys");
        throw new Error("Missing Cloudinary API keys on server");
      }

      // Use a Promise to handle the upload_stream properly
      const uploadToCloudinary = (buffer: Buffer) => {
        return new Promise((resolve, reject) => {
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
                console.error("[Upload] Cloudinary error:", error);
                reject(error);
              } else {
                console.log("[Upload] Success:", result?.secure_url);
                resolve(result);
              }
            }
          );
          Readable.from(buffer).pipe(uploadStream);
        });
      };

      const result: any = await uploadToCloudinary(req.file.buffer);
      res.json({ secure_url: result?.secure_url });
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

  // Status Page API Proxy
  app.get("/api/status", async (req, res) => {
    try {
      const response = await fetch("https://iit-exchange.betteruptime.com/index.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch status feed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Status API Error]:", error);
      res.status(500).json({ error: "Failed to fetch status updates." });
    }
  });

  // Diagnostic: Check Firebase Admin Health
  app.get("/api/admin/health", async (req, res) => {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection('products').limit(1).get();
      
      let keyStatus = "Missing";
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        keyStatus = "Present (Length: " + process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length + ")";
      }

      res.json({ 
        status: 'ok', 
        message: 'Firebase Admin is healthy and has Firestore access.',
        listingsFound: snapshot.size,
        apps: admin.apps.length,
        env: {
          projectId: "iit-exchange-368e9",
          keyStatus: keyStatus
        }
      });
    } catch (error: any) {
      console.error("[Admin Health Check Failed]:", error);
      res.status(500).json({ 
        status: 'error', 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: "Check FIREBASE_SERVICE_ACCOUNT_KEY in settings. Ensure it is the full JSON string from the service account key file."
      });
    }
  });

  // Magic Link: Send confirmation email (ADMIN ONLY)
  app.post("/api/listings/:id/send-verification", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Strict Admin Check
      if (!(await isAdminUser(user.uid, user.email))) {
        return res.status(403).json({ error: "Forbidden: Only admins can trigger manual verifications" });
      }
      
      const productDoc = await adminDb.collection('products').doc(id).get();
      if (!productDoc.exists) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      const product = productDoc.data();
      if (!product) throw new Error("Product data missing");

      // Generate tokens for both actions
      const soldToken = generateMagicToken({ productId: id, sellerId: product.sellerId, action: 'mark_sold' });
      const relistToken = generateMagicToken({ productId: id, sellerId: product.sellerId, action: 'relist' });

      // Use PUBLIC_URL if available, otherwise derive from request
      const baseUrl = process.env.PUBLIC_URL 
        ? (process.env.PUBLIC_URL.endsWith('/') ? process.env.PUBLIC_URL.slice(0, -1) : process.env.PUBLIC_URL)
        : `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

      const links = {
        sold: `${baseUrl}/api/confirm-sold?token=${soldToken}`,
        relist: `${baseUrl}/api/confirm-relist?token=${relistToken}`
      };

      const { error } = await sendListingVerificationEmail(
        product.sellerEmail, 
        {
          title: product.title,
          price: product.price,
          imageUrl: product.images?.[0] || null,
          createdAt: product.createdAt,
          url: `${baseUrl}/product/${id}`
        },
        links
      );

      if (error) {
        console.error("[Resend Error Object]:", JSON.stringify(error, null, 2));
        return res.status(400).json({ 
          error: "Email verification failed", 
          details: (error as any).message || "Validation error from Resend"
        });
      }

      res.json({ success: true, message: "Confirmation email sent" });
    } catch (error: any) {
      console.error("[Magic Link Send Error]:", error);
      res.status(500).json({ error: "Failed to send confirmation email", details: error.message });
    }
  });

  // The Sentinel: Automation Trigger (Admin Only)
  app.post("/api/admin/trigger-sentinel", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!(await isAdminUser(user.uid, user.email))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const results = await runSentinelJob(req);
      res.json({ success: true, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  async function runSentinelJob(req?: express.Request) {
    console.log("[Sentinel] Starting daily expiry scan...");
    const now = new Date();
    const expiredSnap = await adminDb.collection('products')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(now))
      .get();

    const stats = { scanned: expiredSnap.size, updated: 0, emailsSent: 0, errors: 0 };

    for (const doc of expiredSnap.docs) {
      try {
        const product = doc.data();
        
        // 1. Mark as expired
        await doc.ref.update({ status: 'expired' });
        stats.updated++;

        // 2. Generate and send magic links
        const soldToken = generateMagicToken({ productId: doc.id, sellerId: product.sellerId, action: 'mark_sold' });
        const relistToken = generateMagicToken({ productId: doc.id, sellerId: product.sellerId, action: 'relist' });

        // Use PUBLIC_URL if available, otherwise derive from request or fallback
        const baseUrl = process.env.PUBLIC_URL 
          ? (process.env.PUBLIC_URL.endsWith('/') ? process.env.PUBLIC_URL.slice(0, -1) : process.env.PUBLIC_URL)
          : (req ? `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}` : 'https://iitdh.market');
        
        const links = {
          sold: `${baseUrl}/api/confirm-sold?token=${soldToken}`,
          relist: `${baseUrl}/api/confirm-relist?token=${relistToken}`
        };

        const { error } = await sendListingVerificationEmail(
          product.sellerEmail, 
          {
            title: product.title,
            price: product.price,
            imageUrl: product.images?.[0] || null,
            createdAt: product.createdAt,
            url: `${baseUrl}/product/${doc.id}`
          },
          links
        );

        if (!error) stats.emailsSent++;
        else console.warn(`[Sentinel] Email failed for ${doc.id}:`, error);

      } catch (err) {
        console.error(`[Sentinel] Job failed for doc ${doc.id}:`, err);
        stats.errors++;
      }
    }

    console.log("[Sentinel] Job completed:", stats);
    return stats;
  }

  // Self-Triggering Loop (Runs every 24 hours)
  const sentinelInterval = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runSentinelJob().catch(e => console.error("[Sentinel Scheduled Error]:", e));
  }, sentinelInterval);

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
