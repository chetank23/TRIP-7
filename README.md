# BVC Trip 🌴💳
### Premium Banking-Style Shared Trip Budget Management Web Application

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Vercel Blob** persistent storage. Designed specifically for a group of seven friends sharing a single trip budget.

---

## 🌟 Key Features

1. **Travel-Themed Welcome & Landing Page**:
   - Visual travel background with friends on coastal cliff at sunset.
   - Script signature lettering (*"Same people Different places BVC ♡"* with airplane trail) using **Remachine Script**.
   - First-time name entry with quick suggested member chips (`Chetan`, `Rahul`, `Priya`, `Aakash`, `Rohan`, `Neha`, `Sneha`).
   - Remembered display name stored locally; returning visitors bypass the landing page directly into the dashboard.

2. **Dashboard & Virtual BVC Card**:
   - Signature deep red gradient (`#B90F24` to `#D7192D`) card with fluid vector contour lines and realistic golden metallic chip.
   - User-specified card details: `BVC`, `•••• 7890`, `EXP 09/2026`, `CVV 007`.
   - **Show Balance / Hide Balance** toggle: Masked with `••••••••` by default; tapping reveals the configured shared trip budget amount in Indian Rupees (`₹`). Accessible with full keyboard and screen reader support.

3. **Shared Trip Budget Summary**:
   - Total trip budget, total expenditure, remaining budget, and percentage spent.
   - Visual horizontal progress bar indicating budget consumption, with explicit overspending alert.
   - Edit button linking to the budget configuration modal.

4. **Category Summary Grid**:
   - 6 categories with specific design reference accents:
     - **Food**: Coral red (`#E24A4A`)
     - **Stay**: Lavender (`#8A74D4`)
     - **Transport**: Blue (`#4A94E8`)
     - **Activities**: Pink (`#E65C8C`)
     - **Shopping**: Apricot/Amber (`#EFA43A`)
     - **Others**: Neutral Gray (`#8E8994`)
   - Real calculated expenditures derived directly from persistent expense records.
   - Tapping any category card navigates directly to `/transactions?category=[Category]`.

5. **Operations / Recent Transactions**:
   - Compact dashboard transaction rows with category icons, purpose, amount, and payer attribution (*"by Chetan"*).
   - Three-dot popover menu for quick editing or deleting.

6. **Central Floating Add Expense Action Sheet**:
   - Apple-style bottom action sheet that slides up on mobile and renders as a modal on desktop.
   - Prominent numerical amount input with quick preset buttons (`+ ₹100`, `+ ₹500`, `+ ₹1,000`).
   - Purpose/description, category picker, payer selector, datetime picker, and optional split info.
   - Form validation, duplicate prevention, and atomic server persistence.

7. **Transactions Page (`/transactions`)**:
   - Search bar filtering by purpose, payer, and category in real time.
   - Category filter pills (`All`, `Food`, `Stay`, `Transport`, `Activities`, `Shopping`, `Others`).
   - Grouped chronologically by date (`Today`, `Yesterday`, earlier dates).
   - Full edit and delete flows.

8. **Delete Confirmation Dialog**:
   - Soft blurred backdrop, red trash badge, item summary card with category icon, amount, and payer.
   - Permanently logs deletions in the audit trail without destroying historical evidence.

9. **Budget Analytics (`/analytics`)**:
   - Time range dropdown (`Last 7 days`, `Last 30 days`, `Entire Trip`).
   - SVG Donut Chart with centered total spending and category legend percentages.
   - SVG Daily Expenditure Bar Chart showing daily burn rates.
   - Full category breakdown list with progress bars.

10. **Documents Manager (`/documents`)**:
    - Booking documents library for trip vouchers, flight tickets, hotel confirmations, and activity passes.
    - Category filter pills (`All`, `Stay`, `Tickets`, `Transport`, `Activities`, `Others`).
    - Upload modal supporting PDF files up to 15 MB with magic byte signature verification (`%PDF-`).
    - Persistent storage via Vercel Blob (with local persistent fallback).

11. **In-App PDF Viewer**:
    - Full-screen document preview without external redirects.
    - Dark toolbar with page indicator (`1 / 1`), zoom controls (`-`, `+`, `reset`), fit-to-width, and direct download.

12. **Activity History (`/history`)**:
    - Comprehensive chronological audit trail.
    - Tracks expense creations, updates, deletions, budget changes, and document uploads.
    - Explicitly separates the actor who logged the entry from the person who paid.

13. **Settings & Profile (`/settings`)**:
    - User initials avatar and display name editor.
    - Shared budget configuration and refresh trigger.
    - Group members management (customize or add friends).
    - Live persistent storage status indicator.
    - Switch member / logout action.

14. **Apple-Inspired Floating Bottom Navigation**:
    - Translucent glass pill (`glass-nav`) with backdrop blur, soft border, and ambient shadow.
    - Destinations: Home, Transactions, elevated central red `+` Add Expense button, Analytics, Documents.

---

## 🔒 Storage & Concurrency Architecture

- **Zero Hardcoded Data**: Initial state starts clean; all totals, remaining balances, percentages, and breakdowns derive 100% dynamically from real user input.
- **Vercel Blob Integration**: When deployed on Vercel with `BLOB_READ_WRITE_TOKEN`, shared state and PDF files are stored persistently in Vercel Blob.
- **Server-Side Security**: `BLOB_READ_WRITE_TOKEN` is never exposed to the client. All reads and writes occur inside Next.js API route handlers.
- **Optimistic Concurrency Control**: State mutations carry `expectedVersion`. If another member updates state simultaneously, the server returns `409 Conflict`, reloading the latest state and preventing silent overwrites.
- **Local Persistence Fallback**: In local development without Vercel credentials, the server automatically persists state to `data/bvc-trip-state.json` and uploaded documents to `data/uploads/`.
- **Background Synchronization**: Automatic periodic synchronization every 7 seconds keeps all open browser tabs and devices in sync.

---

## 🚀 Running the Project

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Verification Test Suite
```bash
npm test
```
Executes the comprehensive 9-point unit and integration test suite verifying state initialization, budget updates, expense math, concurrency protection, audit logging, and PDF signature verification.

### Production Build
```bash
npm run build
npm start
```

---

## 🌐 Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. Import the project into Vercel.
3. In the Vercel dashboard, navigate to the **Storage** tab and create a **Vercel Blob** store.
4. Link the Blob store to your project (this automatically provides `BLOB_READ_WRITE_TOKEN`).
5. Deploy!
