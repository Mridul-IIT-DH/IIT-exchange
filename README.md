# IIT Exchange Marketplace Documentation

## Project Overview
IIT Exchange is a secure, exclusive single-institution marketplace platform designed for the students, faculty, and staff of the Indian Institute of Technology (IIT) Dharwad. The platform facilitates the buying, selling, and exchanging of items (textbooks, electronics, furniture, cycles) within the campus environment. 

A primary design constraint of this system is exclusivity: only users with a verified `@iitdh.ac.in` institutional email address can access the marketplace features, view contact details, or manage listings.

## Technical Architecture

### Core Stack
- **Frontend**: React 19 with Vite, Tailwind CSS 4.0, and Motion (for UI transitions).
- **Backend**: Node.js/Express server providing secure API endpoints for resource management.
- **Database**: Google Cloud Firestore (NoSQL).
- **Authentication**: Firebase Authentication (Google OAuth) with institutional domain enforcement.
- **Storage**: Cloudinary (Image hosting and processing).
- **State Management**: React Context API (Auth and User Profile).

### Repository Structure
- `/src/pages`: Individual route components (Dashboard, Home, ProductDetail, Sell, Admin, etc.).
- `/src/components`: Reusable UI modules and application layout.
- `/src/contexts`: Global state providers, primarily `AuthContext.tsx`.
- `/src/lib`: Logic for Firebase initialization and utility functions.
- `/server.ts`: The primary backend entry point for development and production.
- `/firestore.rules`: Security logic applied at the database layer.

## Feature Set

### 1. Authentication and Onboarding
- **Domain Enforcement**: Users are restricted to `@iitdh.ac.in` Google accounts. Unauthorized domains are automatically rejected and signed out.
- **Profile Setup**: New users must provide a valid Indian phone number during onboarding to facilitate peer-to-peer communication.
- **Role-Based Access**: The system differentiates between standard student users and administrators using email identifiers and Firestore collection logic.

### 2. Marketplace Management
- **Listing Lifecycle**: Listings are active for a configurable duration (default 10 days).
- **Rich Content**: Support for up to 5 images per listing, including automated server-side compression before storage.
- **Metadata**: Detailed tracking of item age, price negotiability, and listing status (Active, Sold, Expired).

### 3. Image Optimization Flow
- **Client-Side**: Initial compression using `browser-image-compression`.
- **Server-Side API**: Images are sent to `/api/images/upload`. The server uses Multer to handle memory storage and the Cloudinary SDK for secure, signed uploads.
- **Resource Cleanup**: Deleting a listing or an image triggers the removal of the corresponding asset from Cloudinary via the backend.

### 4. Administrative Console
- **Platform Oversight**: Authorized admins can view all user profiles and marketplace listings.
- **Moderation**: Admins have override permissions to edit or delete any listing on the platform.
- **Analytics Dashboard**: Real-time stats on user growth, active listings, total views, and contact engagement.

## Security Model

### 1. Frontend Guards
Navigation is protected by the `AuthContext` and specialized redirects in the `Layout` component. User info is fetched lazily and updated using `onAuthStateChanged`.

### 2. Backend Security (server.ts)
- **Token Verification**: Every `/api` request requires a Bearer token, which is verified using the `firebase-admin` SDK.
- **Ownership Verification**: Before deleting image assets, the server verifies that the requesting user either owns the associated product listing or holds administrative permissions.

### 3. Database Security (firestore.rules)
The marketplace implements granular Firestore Security Rules:
- **Relational Integrity**: `exists()` and `get()` calls ensure that sellers are verified and that identity spoofing is impossible.
- **Field-Level Validation**: Strict checks for string lengths, data types, and immutable fields.
- **PII Isolation**: Contact details (Phone/Email) are only accessible to authenticated members of the IIT Dharwad community.

## Development Setup

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration
The application requires several environment variables for full-stack functionality. Create a `.env` file based on `.env.example`:

- `CLOUDINARY_API_KEY`: API Key for Cloudinary.
- `CLOUDINARY_API_SECRET`: API Secret for Cloudinary.
- `VITE_CLOUDINARY_CLOUD_NAME`: Cloud name for the frontend Cloudinary configuration.

*Note: Firebase configuration is loaded from `firebase-applet-config.json`.*

### Available Scripts
- `npm run dev`: Starts the Express server using `tsx`. The server integrates Vite as a middleware.
- `npm run build`: Compiles the React application into the `dist/` directory.
- `npm run start`: Executes the server in a production-ready environment.
- `npm run lint`: Performs a TypeScript check (`tsc --noEmit`) to verify type safety.

## Deployment Guidelines
- **Nginx/Reverse Proxy**: The server listens on port 3000. Ensure your reverse proxy routes all traffic to this port.
- **CORS/Cookies**: The platform handles security through Bearer tokens in headers. Ensure your frontend client is configured to send these headers for all `/api/` calls.
- **Firebase Deployment**: Use the Firebase CLI to deploy the `firestore.rules` file to ensure the database remains secure in production.
