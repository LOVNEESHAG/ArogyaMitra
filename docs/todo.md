# ArogyaMitra MVP TODO - Post-Redesign

This document outlines the MVP tasks for ArogyaMitra after the complete UI component cleanup. The focus is on building a minimum viable product with essential features only.

## Project Status
- ✅ **Component Cleanup Complete** - All existing UI components removed
- ✅ **URL Structure Preserved** - All routes functional with placeholder content  
- ✅ **Authentication Working** - Email/password only (Google OAuth removed)
- ✅ **Backend APIs Intact** - All server functionality preserved
- ✅ **Auth Simplified for Hackathon** - Simple-session cookie using raw Firebase ID token (no Admin SDK); cookies are session-only

## Recent Updates
- [x] Localized `dashboard/health-records/page.tsx` strings into shared `src/lib/i18n.tsx` (EN/HI/PA)
- [x] Updated landing page hero, features, and "How it works" sections with new copy and responsive layout per latest mockups

## Tech Stack Decisions
- **Component Library**: shadcn/ui (Radix + Tailwind based)
- **Authentication**: Firebase Auth - Email/Password only + simple-session (no Firebase Admin for MVP)
- **Database**: Firestore + Firebase Storage
- **Styling**: Tailwind CSS with custom color system
- **AI**: Google Genkit (already integrated)
- **Video**: LiveKit Cloud (frontend via `@livekit/components-react`, server token at `/api/livekit/token`)
- **Session Cookies**: `session` cookie without max-age (session-only). Language cookie also session-only.
- **Firestore Queries (MVP)**: No composite indexes; use single-field queries and sort/filter in memory to avoid index setup

## Current Backend Status (APIs Available)

### ✅ Authentication APIs
- `POST /api/auth/simple-session` - Store raw Firebase ID token in session cookie (session-only)
- `DELETE /api/auth/simple-session` - Clear session cookie  
- `GET /api/auth/me` - Get current user info + role (decodes token payload server-side)
  - Note: Legacy `/api/auth/session` route has been removed

### ✅ Profile Management APIs
- `GET /api/profile/me` - Get current user profile
- `PUT /api/profile/me` - Update user profile (role-specific fields)

### ✅ Appointments APIs  
- `GET /api/appointments` - Get appointments (filtered by role)
- `POST /api/appointments` - Create new appointment
- `GET /api/appointments/slots` - Get available time slots for doctor/date

### ✅ Doctors API
- `GET /api/doctors` - List doctors for appointment booking (compact fields)

### ✅ Video Token API
- `GET /api/livekit/token` - Mint LiveKit access token for room join

### ✅ Patient Overview API
- `GET /api/patient/overview` - Quick stats: upcomingCount, nextAppointment, recentRecords

### ✅ Pharmacies API
- `GET /api/pharmacies` - List pharmacies (compact fields)

### ✅ Users Management API
- `GET /api/users` - List all users (admin only)

### ✅ Health Records API
- `GET /api/health-records` - Get user's health documents (role-aware)
- `POST /api/health-records` - Upload new health document (patients only)
- `DELETE /api/health-records/{id}` - Delete uploaded documents (patients only)

### ✅ Pharmacy APIs
- `GET /api/pharmacy/inventory` - Get pharmacy inventory
- `POST /api/pharmacy/inventory` - Add/update inventory items
- `PATCH /api/pharmacy/inventory` - Bulk import/update (CSV)

### ✅ AI Chat API
- `POST /api/chat` - AI assistant chat endpoint (Genkit integration)

### ✅ Dashboard Stats API
- `GET /api/dashboard/stats` - Role-aware counts for dashboard widgets

## MVP Phase 1: Setup & Core UI (Week 1-2)

### Component Library Setup
- [x] Install and configure shadcn/ui
- [x] Add essential components:
  - [x] Button, Input, Card, Select
  - [ ] Form components with validation  
  - [ ] Textarea, Checkbox
  - [ ] Alert, Loading, Avatar components
- [x] Customize components with design system:
  - Primary: Raisin black (#1A181B)  
  - Background: Floral white (#FFF8F0)
  - Accent: Erin (#05F140)
  - Accent 2: Jasmine (#F4D06F)
- [x] Configure PT Sans font family

### Essential Pages (MVP)
- [x] **Homepage (/)**
  - [x] Hero section with clear value proposition
  - [x] Feature highlights (4 key benefits)
  - [x] Call-to-action buttons (Get Started/Call Helpline)
  - [x] Contact information and support details
  - [x] Professional footer with service categories

- [x] **Authentication (/login)**
  - [x] Redesign login form with new design system
  - [x] Role selection (Patient, Doctor, Pharmacy Owner)
  - [x] Email/Password only authentication (Google OAuth removed)
  - [x] Mobile-responsive design

## MVP Phase 2: Role-Based Dashboards (Week 3-4)
### Patient Dashboard (/dashboard - role: patient)
- [x] **Dashboard Overview**
  - [x] Welcome message with user name
  - [x] Quick stats (upcoming appointments, recent records)
  - [x] Quick action buttons
  - Backend: ✅ Integrated (`/api/appointments`, `/api/appointments/slots`, `/api/appointments/{id}/start-call`)

- [x] **Book Appointments (/dashboard/appointments)**
  - [x] Doctor selection dropdown 
  - [x] Calendar picker for available dates
  - [x] Time slot selection
  - [x] View upcoming appointments list
  - [x] Doctor avatar shown in upcoming/past lists
  - [x] Join call (Video or Voice) when within scheduled time window
  - Backend: ✅ Integrated (`/api/appointments`, `/api/appointments/slots`, `/api/appointments/{id}/start-call`)

 - [x] **Health Records (/dashboard/health-records)**
   - [x] Upload document interface (PDF/Images)
   - [x] View uploaded documents list  
   - [x] Download documents
   - [x] Polish: Improved empty/loading states and high-contrast hover/focus inputs
   - [x] Polish: Delete confirmation modal
   - [x] i18n strings (EN/HI/PA) for labels and messaging
   - Backend: ✅ APIs ready (`/api/health-records`)

### Doctor Dashboard (/dashboard - role: doctor)  
- [x] **Appointments Management**
  - [x] Today's appointments list
  - [x] Split view: Upcoming and Past blocks for clarity (responsive)
  - [x] View patient basic info with avatar
  - [x] Mark appointments as completed
  - Backend: ✅ Integrated (`/api/appointments?role=doctor`, `/api/appointments/{id}/start-call`, `/api/appointments/{id}/end-call`, `PUT /api/appointments`)

- [x] **Patient Records Access**
  - Backend: ✅ API ready (`GET /api/patients/{id}/records` with appointment validation)

### Pharmacy Owner Dashboard (/dashboard - role: pharmacyOwner)
- [x] **Inventory Management (/dashboard/pharmacy)**
  - [x] Add medicine manually (name, stock, price)
  - [x] CSV upload for bulk medicine import
  - [x] View current inventory list
  - [x] Low stock indicator on list (no notifications)
  - [x] Update stock levels
  - Backend: ✅ Integrated (`/api/pharmacy/inventory` GET/POST/PUT/PATCH)

### Admin Dashboard (/dashboard - role: admin)
- [x] **User Management (/dashboard)**
  - [x] Consolidated admin view into main dashboard route with role/status filters, search, and responsive table/cards
  - Backend: ✅ Integrated (`/api/users`)

## MVP Phase 3: Essential Integrations (Week 5-6)

### Video Consultation
- [x] **Basic Video Integration (LiveKit)**
  - [x] LiveKit UI at `/dashboard/call/{id}` via `@livekit/components-react` (supports `?call=video|voice` and optional `&demo=true`)
  - [x] Token mint route: `GET /api/livekit/token` using `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_WS_URL`
  - [x] Start-call sets status `in-progress` and stores `callStartTime` (`POST /api/appointments/{id}/start-call`)
  - [x] End-call sets status `completed` and stores duration (`POST /api/appointments/{id}/end-call`)
  - [x] Redirect to appointments on hang-up via LiveKit `onDisconnected`
  - [x] Optional: In-call toggle to switch to voice-only on poor network
- ℹ️ Dev notes: Mobile mic/camera require HTTPS. Use a tunnel (ngrok/cloudflared) and set `DEV_ALLOWED_ORIGINS` in `.env.local`, then restart `npm run dev`.

### AI Chatbot (Basic)  
- [x] **Patient Support Bot**
  - [x] Appointment booking assistance prompts
  - [x] Integration with existing Genkit AI setup
  - [x] Multi-language support (English, Hindi, Punjabi)
  - [x] Gemini responses render with markdown formatting and sanitization in `src/app/dashboard/ai-chat/page.tsx`
  - [x] Users can clear chat history via UI button (calls `DELETE /api/chat`)
  - [x] Responses mirror the user's language to avoid unnecessary token usage; fallback guidance localized
  - Backend: ✅ API integrated (`/api/chat`)

## MVP Phase 4: Polish & Launch Prep (Week 7-8)

### Performance & UX
- [ ] **Mobile Optimization**
  - [ ] Touch-friendly interface elements
  - [ ] Responsive design testing on devices
  - [ ] Fast loading times (< 3s)
  - [ ] Offline mode basic support

- [ ] **Error Handling**
  - [ ] User-friendly error messages
  - [ ] Fallback states for failed API calls
  - [ ] Form validation with clear feedback
  - [ ] 404 and error pages


## MVP Success Criteria

### Functional Requirements
- ✅ Users can register and login with their roles
- ✅ Patients can book appointments with doctors
- ✅ Doctors can view their appointments and patient records  
- ✅ Pharmacy owners can manage their inventory
- ✅ Admins can view all users
- ✅ Basic video consultation capability
- ✅ Document upload/download for health records

### Non-Functional Requirements
- ✅ Mobile-responsive design
- ✅ Multi-language support (English, Hindi, Punjabi)
- ✅ Page load times < 3 seconds
- ✅ Works on 3G internet connections
- ✅ 99% uptime during business hours

## Out of Scope for MVP

### Features Deferred to Post-MVP
- Advanced video features (recording, screen sharing)
- Payment integration
- SMS/WhatsApp notifications  
- Advanced analytics and reporting
- Prescription generation with digital signatures
- Integration with external lab systems
- Advanced AI features beyond basic Q&A
- Multi-pharmacy network features
- Advanced appointment scheduling (recurring, complex rules)

## Development Guidelines

### Code Standards
- Use TypeScript for all new components
- Follow React functional components with hooks
- Implement proper error boundaries
- Write mobile-first CSS with Tailwind
- Maintain existing API contracts
- Add basic unit tests for critical paths

### Design Principles  
- **Mobile-First**: Design for mobile, enhance for desktop
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Performance**: Lazy loading, optimized images, minimal JS bundles
- **Simplicity**: Each feature should have a clear, single purpose
- **Consistency**: Reuse components, maintain design patterns

## Weekly Milestones

- **Week 1**: Design system + Homepage + Login redesign
- **Week 2**: Patient dashboard + appointment booking
- **Week 3**: Doctor dashboard + health records
- **Week 4**: Pharmacy dashboard + admin panel  
- **Week 5**: Video integration + file management
- **Week 6**: AI chatbot + mobile optimization
- **Week 7**: Testing + bug fixes + performance
- **Week 8**: Final polish + deployment

## Backend APIs Still Needed

### High Priority (for MVP)
- [x] `GET /api/patients/{id}/records` - Doctor access to patient records (with appointment validation)
- [x] `POST /api/appointments/{id}/start-call` - Generate Jitsi video room for appointment
- [x] `POST /api/appointments/{id}/end-call` - End call and track duration
- [x] `PUT /api/appointments` - Update appointment status (completed, cancelled)

### Medium Priority (nice to have)
- [x] `GET /api/dashboard/stats` - Dashboard statistics (appointments count, etc.) (implemented)
- [x] `PATCH /api/pharmacy/inventory` - CSV bulk import/update for pharmacy inventory (implemented)
- [x] `GET /api/doctors` - List of available doctors for appointment booking (implemented)
- [x] `DELETE /api/health-records/{id}` - Delete uploaded documents (implemented)

### Data Models to Review/Complete
- [x] Ensure Appointment model has `callType` ('video'|'voice'), `callRoomId`, `callStartTime`, `callEndTime`, `callDuration` fields (implemented)
- [x] Ensure HealthRecord model has proper access control for doctor viewing (auto-access after appointments)
- [ ] Add `lowStockThreshold` to PharmacyInventory model
- [ ] Add appointment status enum: `scheduled`, `in-progress`, `completed`, `cancelled`

## Security Notes (Minimal for Hackathon MVP)
- ✅ Firebase Auth handles user authentication
- ✅ Session cookies for server-side validation  
- ✅ Firestore rules for basic row-level security
- ⚠️ For MVP, the server decodes the Firebase ID token from the `session` cookie without verification (no Admin SDK). Do not use this approach in production.
- ✅ Session cookies and language cookie are session-only (no persistent expiration)
 - ⚠️ Calls use public meet.jit.si rooms (no tokens) for speed. For production, use JaaS or self-hosted Jitsi with JWTs and role moderation.
- [ ] File upload validation (size, type) - implement client-side only for MVP
- [ ] Rate limiting on sensitive endpoints - skip for MVP

## Next Actions
1. Complete shadcn/ui setup and install essential components
2. Remove Google OAuth references from firebase config
3. Implement missing backend APIs (patient records access, video calls) — DONE
4. Start with login page redesign using shadcn/ui components
5. Build patient dashboard with appointment booking
