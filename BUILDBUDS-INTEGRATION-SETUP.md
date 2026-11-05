# Build Buds — Integration & Deployment Setup Guide

This guide walks you through configuring **Cloudinary** (signed image uploads for the Public Community), **Resend** (student verification and approval emails), **Firebase Admin / Security Rules**, and **Vercel Environment Variables** for `https://buildbuds.vercel.app`.

---

## 1. Architecture Overview

Build Buds operates two distinct, independently controlled community environments:

1. **Public Community (`/community`, `/community/creations`, `/community/updates`, `/community/posts/:id`)**
   - Publicly accessible without signing in for browsing published posts, games, websites, tutorials, announcements, comments, and categories.
   - Google sign-in creates a basic public profile (`users/{uid}`) allowing any visitor to react, comment, reply, bookmark, and publish creations **without** forcing student registration fields or granting access to the private Student Hub.
2. **Private Student Hub (`/hub`)**
   - Preserves the Discord-inspired real-time `CommunityHub` interface.
   - Strictly gated at both the UI routing layer and Firestore Security Rules (`isApprovedStudent()`) to students verified under Jaystarbliss Studios (`communityMemberships/{uid}.status == 'approved'`) and authorised administrators.
3. **Student Verification & Admin Control Panel (`/student-access`, `/student-access/status`, `/admin/student-access`)**
   - Students submit verification requests at `/student-access`.
   - Authorised administrators verify applicants against official Jaystarbliss Studios student records at `/admin/student-access` and approve, request more info, reject, or suspend access, plus migrate pre-existing registered builders.

---

## 2. Cloudinary Setup (Signed Image Uploads)

Public community posts use **signed Cloudinary uploads** (`/api/cloudinary/signature` and `/api/cloudinary/delete`) so your `CLOUDINARY_API_SECRET` is never exposed in the browser.

### Step-by-Step Cloudinary Configuration

1. Sign in to your [Cloudinary Console](https://console.cloudinary.com/).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the **Dashboard / Programmable Media** overview.
3. Go to **Settings (Gear Icon) → Upload → Upload Presets** and click **Add upload preset**:
   - **Upload preset name:** `buildbuds-public-posts`
   - **Signing Mode:** Select **Signed** (recommended for authenticated server-signed uploads)
   - **Folder:** `buildbuds/public-posts`
   - **Allowed formats:** `jpg, jpeg, png, webp, avif`
   - **Overwrite:** `Off` (or unique filename enabled)
   - Click **Save**.
4. Add the following environment variables in Vercel (and locally if testing uploads):
   ```env
   VITE_CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   CLOUDINARY_UPLOAD_PRESET="buildbuds-public-posts"
   CLOUDINARY_UPLOAD_FOLDER="buildbuds/public-posts"
   ```

### Upload Limits Enforced Automatically
- Maximum **5 images** per post.
- Maximum **5 MB** per image.
- Allowed MIME types & extensions: `JPEG`, `JPG`, `PNG`, `WebP`, `AVIF`.
- Responsive delivery URLs automatically apply `f_auto,q_auto` transformations.

---

## 3. Resend Setup (Approval & Verification Emails)

When a student submits a verification request or an administrator approves/updates their status, Build Buds creates an **in-app notification** in Firestore (`userNotifications/{uid}/items/{notificationId}`) AND calls Resend via `/api/student-access/*` to send a branded HTML email.

### Step-by-Step Resend Configuration

1. Sign in to [Resend](https://resend.com/).
2. Go to **Domains** and add/verify your sending domain (for example, `jaystarbliss.com` or `notifications.jaystarbliss.com`) by adding the DNS records Resend provides.
   - *Testing Note:* Before your custom domain is verified, you can test using `onboarding@resend.dev` to send emails to your own Resend-registered email address.
3. Go to **API Keys → Create API Key** and copy your key (`re_...`).
4. Configure these environment variables in Vercel:
   ```env
   RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
   BUILDBUDS_FROM_EMAIL="Build Buds <notifications@jaystarbliss.com>"
   BUILDBUDS_APP_URL="https://buildbuds.vercel.app"
   ```

### Resilience & Retry Support
- If Resend is temporarily unavailable or unconfigured, the student's Firestore approval (`communityMemberships/{uid}`) and in-app notification still succeed without failing the admin action.
- Admins can view the email delivery status (`sent`, `failed`, `skipped`) for every applicant in `/admin/student-access` and click **"Send / Retry Notification Email"** (`POST /api/student-access/notify`) at any time.

---

## 4. Firebase Admin & Security Rules Setup

### Critical Naming Rule for Firebase Admin Service Account
Because `vite.config.ts` uses `envPrefix: ['VITE_', 'FIREBASE_']` to support your Vercel client Firebase variables without `VITE_`, **never** name a server secret starting with `FIREBASE_` or `VITE_`.

Always name the service account variable:
```env
FB_ADMIN_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

### How to Generate `FB_ADMIN_SERVICE_ACCOUNT_JSON` (Optional Server Admin Key)
1. Open the [Firebase Console](https://console.firebase.google.com/) and select your project.
2. Go to **Project Settings → Service accounts**.
3. Click **Generate new private key** to download the JSON file.
4. Minify the JSON into a single line and paste it as the value of `FB_ADMIN_SERVICE_ACCOUNT_JSON` in Vercel Environment Variables (mark as **Sensitive / Secret**).

### Admin Access & Existing Builder Migration
- Primary bootstrap administrator email: `johnrufai242@gmail.com`.
- After deploying, sign in with `johnrufai242@gmail.com` and visit:
  `https://buildbuds.vercel.app/admin/student-access`
- Open the **"Existing Builder Migration"** tab to approve any pre-existing registered student builders in `users/{uid}` into `communityMemberships/{uid}` with one click so they keep seamless access to `/hub` and their chat history.

---

## 5. Vercel Environment Variables Checklist

In your Vercel Project (**Settings → Environment Variables**), ensure the following variables are added for **Production, Preview, and Development**:

| Variable Name | Scope | Purpose |
| :--- | :--- | :--- |
| `FIREBASE_API_KEY` | Client & Server | Firebase Web API Key |
| `FIREBASE_AUTH_DOMAIN` | Client | Firebase Auth domain |
| `FIREBASE_PROJECT_ID` | Client & Server | Firebase GCP project ID |
| `FIREBASE_STORAGE_BUCKET` | Client | Firebase Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase Messaging sender ID |
| `FIREBASE_APP_ID` | Client | Firebase Web App ID |
| `FIREBASE_DATABASE_ID` | Client & Server | Firestore Database ID (`ai-studio-buildbuds-a4725ca5-9593-48cb-bfe5-18796b5f77ee`) |
| `FB_ADMIN_SERVICE_ACCOUNT_JSON` | **Server Secret** | Optional Firebase Admin service account JSON (no `FIREBASE_` prefix) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Client | Cloudinary Cloud Name |
| `CLOUDINARY_CLOUD_NAME` | **Server** | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | **Server Secret** | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | **Server Secret** | Cloudinary API Secret for signed uploads |
| `CLOUDINARY_UPLOAD_PRESET` | **Server** | `buildbuds-public-posts` |
| `CLOUDINARY_UPLOAD_FOLDER` | **Server** | `buildbuds/public-posts` |
| `RESEND_API_KEY` | **Server Secret** | Resend API key for approval/status emails |
| `BUILDBUDS_FROM_EMAIL` | **Server** | Verified sender address (e.g. `Build Buds <notifications@jaystarbliss.com>`) |
| `BUILDBUDS_APP_URL` | **Server** | `https://buildbuds.vercel.app` |

After adding or updating environment variables in Vercel, trigger a **Redeploy** so the serverless `/api/*` functions and Vite build pick up the latest values.
