# IIT Exchange Backend Setup Guide

## 1. Firebase Configuration

Your app currently connects to the Firebase project ID: \`iit-exchange\`.

For production deployment, ensure the Firebase project is configured as follows:

### Authentication
- Enable **Google Sign-In**.
- (Optional) Use Identity Platform blocking functions to strictly block sign-ups server-side if not matching \`@iitdh.ac.in\`. Currently, the frontend and standard security rules enforce it, but a blocking function is safer.

### Firestore Database
Ensure \`asia-south1\` is your region. Deploy the Firestore Security Rules as detailed in \`firestore.rules\`.

To deploy rules:
\`\`\`bash
firebase deploy --only firestore:rules
\`\`\`

---

## 2. Cloud Functions (Cron Jobs & Rate Limiting)

Since Firebase Functions are a backend concern, here is the implementation you should deploy to your Firebase project.

Initialize functions locally:
\`\`\`bash
firebase init functions
\`\`\`
Choose Node.js and replace `functions/index.js` with the following:

\`\`\`javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// CRON JOB: Reset Daily Rate Limits
exports.resetDailyLimits = functions.pubsub.schedule('every day 00:00')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('listingsCountToday', '>', 0).get();
    
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { listingsCountToday: 0 });
    });
    
    await batch.commit();
    console.log("Daily limits reset successfully.");
  });

// CRON JOB: Mark Expired Listings
exports.markExpiredListings = functions.pubsub.schedule('every day 01:00')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const productsRef = db.collection('products');
    const now = Date.now();
    
    // Find active products that are past their expiresAt time
    const snapshot = await productsRef
      .where('status', '==', 'active')
      .where('expiresAt', '<', now)
      .get();
      
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'expired' });
    });
    
    await batch.commit();
    console.log(`Marked ${snapshot.size} listings as expired.`);
  });
\`\`\`

Deploy functions:
\`\`\`bash
firebase deploy --only functions
\`\`\`

---

## 3. Storage Rules

To allow image uploads securely, apply these Storage Rules in the Firebase Console:

\`\`\`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{productId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.token.email.matches('.*@iitdh\\.ac\\.in')
                   && request.resource.size < 5 * 1024 * 1024 // 5MB limit
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
\`\`\`

---

## 4. Hosting

Build and deploy your React app:

\`\`\`bash
npm run build
firebase init hosting
firebase deploy --only hosting
\`\`\`
