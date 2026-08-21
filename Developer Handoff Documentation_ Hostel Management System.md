# **Software Requirements Specification (SRS) & Developer Handoff**

**Project:** Hilda Hostel Operations & Utility Portal (Progressive Web App)

**Document Version:** 1.1 (Production Architecture Update)

## **1\. Project Overview**

This project is a mobile-first Progressive Web App (PWA) designed to streamline daily operations for Hilda Hostel (located in Tarkwa, Ghana). The core objectives are to reduce utility wastage (water/electricity) via real-time status broadcasting, digitize maintenance fault reporting, seamlessly manage academic year room transitions, and serve as a central communication hub.

*Note on Environment:* Given potential network instability in the region, aggressive offline tolerance and local caching are strict requirements for the frontend.

## **2\. Architecture & Technology Stack**

The developer is expected to utilize the following stack to ensure cost-effectiveness, speed, and real-time capabilities:

* **Frontend / Framework:** Next.js (App Router), React, TypeScript  
* **Styling & UI:** Tailwind CSS, shadcn/ui (or Lucide-React for iconography)  
* **Database & Authentication:** Supabase (PostgreSQL, Supabase Auth, Row Level Security)  
* **Real-time Engine:** Supabase Realtime (WebSockets for live utility updates)  
* **Media Storage & CDN:** ImageKit.io (Client-side direct uploads)  
  * **Endpoint:** https://ik.imagekit.io/codeconjurernanakojo  
* **Hosting:** Vercel

## **3\. Media Storage Architecture (ImageKit)**

To save server bandwidth and optimize loading times, all media is uploaded directly from the client to ImageKit.io using a signed backend token. The ImageKit storage is strictly organized under a master parent folder named **Hilda\_Hostel**.

**Folder Structure:**

* /Hilda\_Hostel/maintenance\_tickets/ \- Temporary fault report photos submitted by students.  
* /Hilda\_Hostel/rooms/ \- Permanent, high-quality gallery images of room interiors.  
* /Hilda\_Hostel/announcements/ \- Digital flyers or memos pinned to the noticeboard.  
* /Hilda\_Hostel/profiles/ \- Resident and staff avatar headshots.

## **4\. User Roles & Access Control**

The system utilizes Role-Based Access Control (RBAC) managed via Supabase Auth, custom profiles tracking, and PostgreSQL Row Level Security (RLS).

1. **Public / Applicant (Unauthenticated or Basic):**  
   * View public vacancy counters and room catalog.  
   * View general public announcements and contact directory.  
2. **Resident (Authenticated Student):**  
   * View real-time utility dashboard.  
   * Create, view, and track own maintenance tickets (RLS restricted).  
   * Execute "Retain Room" action during defined transition periods.  
3. **Staff (Caretaker / Security / Maintenance):**  
   * Access the mobile-optimized "Quick Action" panel.  
   * Toggle Utility statuses (Water / Power) which broadcasts to all clients.  
   * Update maintenance ticket statuses.  
4. **Admin (Hostel Manager):**  
   * Manage global application state (e.g., current booking phase).  
   * Manage room inventory, pricing, and capacities.  
   * Post and pin global announcements.

## **5\. Functional Specifications by Module**

### **Module 1: Real-Time Utility Tracker**

* **Data Structure:** Single rows for water and power in the utilities table.  
* **Staff Interface:** A mobile UI with large touch targets. Sends an UPDATE to the database.  
* **Resident Interface:** Subscribes to Supabase Realtime. When a staff member toggles a status, the UI updates instantly without page reload. Includes a delta-calculated countdown if estimated\_end\_time is provided for the generator.

### **Module 2: Maintenance & Issue Ticketing**

* **Submission Flow:** Resident fills out the form and snaps a photo. The client fetches an auth signature from /api/imagekit-auth, uploads directly to ImageKit (into /Hilda\_Hostel/maintenance\_tickets/), and saves the returned URL and fileId to Supabase.  
* **Tracking:** Ticket lifecycle flows through open \-\> in\_progress \-\> resolved.

### **Module 3: Room Allocation & Retention Engine**

* **Global State Machine:** Controlled by the system\_settings table (singleton row). The Admin sets the current\_booking\_phase (closed, retention\_only, open\_booking).  
* **Retention Phase:** Current residents submit requests. Handled via direct DB inserts governed by RLS (only allowed if phase is retention\_only).  
* **Open Booking Phase:**  
  * **Dynamic Vacancies:** The frontend queries the room\_availability\_current PostgreSQL View, which calculates beds live: Capacity \- Confirmed Allocations.  
  * **Concurrency Protection (CRITICAL):** Bookings *must* be routed through the book\_room() PostgreSQL RPC function. This function uses SELECT ... FOR UPDATE to lock the room row, preventing race conditions where two students claim the final bed simultaneously.

## **6\. Database Schema Summary (PostgreSQL / Supabase)**

* profiles: Synced automatically via the handle\_new\_user() Auth Trigger.  
* system\_settings: Singleton configuration table controlling academic year and booking phase.  
* rooms: Inventory and capacity limits.  
* utilities: Real-time state holders for water/power.  
* room\_allocations: Links students to rooms by academic year.  
* maintenance\_tickets: Fault tracking linked to ImageKit assets.  
* announcements: Noticeboard data with is\_pinned boolean.

*Note: Strict RLS policies and SECURITY DEFINER helper functions (is\_admin(), current\_user\_role()) are pre-configured to prevent role-escalation and infinite recursion.*

## **7\. Non-Functional & UI/UX Requirements**

* **Progressive Web App (PWA):** Must include a valid manifest.json and service worker for "Add to Home Screen" functionality.  
* **Offline Tolerance:** Client must cache utility states in localStorage. Disconnected users see the cached state with an "Offline" badge.  
* **Image Optimization:** All ImageKit URLs must append transformation query parameters (e.g., ?tr=w-600,f-auto) to minimize data consumption.  
* **Form Validation:** Use Zod for strict client/server form validation.