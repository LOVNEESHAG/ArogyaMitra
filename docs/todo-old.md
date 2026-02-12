# Backend TODO and Milestones

This file tracks the backend feature backlog for ArogyaMitra based on UI flows in `src/app/` and specs in `docs/blueprint.md`.

Conventions

- [~] in progress
- [x] done
- Priority tags: [MVP], [Pilot], [Scale]
- Note: Only update this TODO when a task is actually completed. Mark items as done promptly when you finish them.

## Milestone: MVP (Pilotable in one village)

- [x] Platform & Repo Setup [MVP]
- [x] Monorepo structure or separate backend repo finalized — Chosen: single repo with Next.js API routes and server helpers under `src/server/*`.
- [x] Auth API endpoints: POST/DELETE `/api/auth/session`, GET `/api/auth/me`
- [x] Session cookies for server auth (Firebase Admin)
  <!-- - [ ] Device binding and refresh token handling -->
  <!-- - [ ] RBAC on endpoints and storage (Firestore Security Rules v1) -->

- [x] User Profiles [MVP]
- [x] Basic profile API and schemas: `GET/PUT /api/profile/me` (patients/doctors/pharmacies)
- [x] Patient profile: demographics, contact, address, optional ABHA
- [x] Doctor: specialties, registration numbers, availability, fee
- [x] Pharmacy: license, addresses, geo, hours

- [x] Appointments & Scheduling [MVP]

  - [x] Slot generation API (consultation)
  - [x] Book/reschedule/cancel with conflict prevention and audit
  <!-- - [ ] Reminders (SMS/WhatsApp) and confirmations -->

- [ ] Video Consultations [MVP]

  - [ ] Token minting API with provider (Twilio/Agora/Jitsi) (Jitsi Meet Embed is recommended)
  - [ ] Session lifecycle: create/join/end, waiting room, events logging (can leave this if it becomes too complex)
  <!-- - [ ] Optional consent capture; call recording toggle -->

- [ ] Clinical Records [MVP]

  - [ ] Consultation notes (SOAP), diagnoses, vitals
    <!-- - [ ] E‑prescription model and signed PDF render -->
    <!-- - [ ] Share prescription via link/QR + SMS/WhatsApp -->

- [ ] Digital Health Records [MVP]

  - [ ] Document upload (PDF/JPG/PNG) to secure storage (signed URLs)
  - [ ] Metadata: type, date, provider; listing + filtering
  - [ ] Access control + consent log

- [ ] Pharmacy Stock [MVP]

  - [ ] Medicine master (generic/brand, strength, form)
  - [ ] Inventory CRUD for pharmacies; stock state (in/low/out)
  - [ ] Nearby search by geo radius

- [ ] Role-based Dashboard Features [MVP]
  - Patient
    - [ ] Book an appointment and join video call
    - [ ] Upload/download health records (reports)
    - [ ] AI chatbot (basic Q&A / triage)
  - Doctor
    - [ ] View booked appointments and start call with patient
    - [ ] View health records for patients who booked with the doctor
  - Pharmacy Owner
    - [ ] Upload CSV or manually add medicines in stock
  - Admin
    - [ ] List of all users categorized by roles

<!--
- [ ] Notifications [MVP]
  - [ ] Provider integration for SMS/WhatsApp (templates)
  - [ ] Push notifications (FCM)
  - [ ] i18n templates (en/hi/pa) with variables -->

- [x] Localization (Client-side) [MVP]
  - [x] Message catalogs align with `src/lib/i18n.tsx`
  - [x] Language switcher in UI with persistence (localStorage + cookie)
  <!-- Intentionally skipping server-side localization for MVP -->

<!-- - [ ] Geo [MVP]
  - [ ] Geocoding for addresses; store lat/long
  - [ ] Geohash indexes for nearby queries -->

- [ ] Security & Privacy [MVP]
  - [ ] Since this is just a live prototype, we don't need to worry about security and privacy.
  <!-- - [ ] Firestore rules for row/document-level access
  - [ ] Storage rules for patient documents; signed URL expiries -->
  <!-- - [ ] Audit logs for sensitive reads/writes -->

<!-- - [ ] Observability & Ops [MVP]
  - [ ] Structured logging, error reporting
  - [ ] Health checks, uptime monitoring
  - [ ] Backups/snapshots policy -->

- [ ] Offline & Sync [MVP]

  - [ ] Local-first sync queues for recent data
  - [ ] Conflict resolution policy (LWW/CRDT where needed)

- [x] Demo Utilities [MVP]
  - [x] Seed users script (Auth + Firestore): `tools/seed-users.cjs`

## Milestone: Pilot Enhancements (Multi-village, partner labs/pharmacies)

<!-- - [ ] Appointment Enhancements [Pilot]
  - [ ] Waitlist, overbooking rules
  - [ ] Triage tags and reason for visit analytics

- [ ] Video & Communications [Pilot]
  - [ ] In-call chat and file share (if supported by provider)
  - [ ] Call quality metrics, diagnostics endpoint

- [ ] Clinical & eRx [Pilot]
  - [ ] Tamper-evident PDF and doctor digital signature
  - [ ] QR verification for pharmacies

- [ ] Pharmacy Fulfillment [Pilot]
  - [ ] Reservation workflow (hold stock, pickup window)
  - [ ] Substitution policy and acknowledgment

- [ ] Toll-free IVR [Pilot]
  - [ ] IVR menu flows (en/hi/pa) for booking and status
  - [ ] DTMF capture, call recordings with consent
  - [ ] Escalation to human agent + ticket creation

- [ ] Analytics & Impact Metrics [Pilot]
  - [ ] KPIs for landing page impact counters (time/cost saved; youth jobs)
  - [ ] Admin dashboards and CSV export

- [ ] Payments & Billing [Pilot]
  - [ ] UPI/cards integration for consults
  - [ ] Invoices, refunds, GST fields -->

## Milestone: Scale (Compliance, automation, performance)

<!-- - [ ] Interoperability [Scale]
  - [ ] FHIR resource mapping for key entities
  - [ ] ABDM/ABHA linking and consent artifacts

- [ ] Advanced Ops [Scale]
  - [ ] Job orchestration for reminders, stock sync, cleanups
  - [ ] Alerts, SLOs, error budgets
  - [ ] DR drills and restore testing

- [ ] API Platform [Scale]
  - [ ] Versioning, idempotency keys, rate limiting
  - [ ] WebSockets/SSE for real-time updates
  - [ ] Partner webhooks management console

- [ ] Data Governance [Scale]
  - [ ] Retention and deletion workflows (DPDP/GDPR-style)
  - [ ] Export/my-data endpoints and consent revocation -->

## Suggested Stack Mapping (Firebase-first)

- Auth: Firebase Authentication (phone/email OTP)
- Data: Firestore (fine-grained Security Rules) or Cloud SQL for relational needs
- Files: Firebase Storage with signed URLs and AV scanning via Functions
- Realtime: Firestore listeners or WebSockets via Functions
- Functions: token minting, notifications, schedulers, webhooks
- Messaging: FCM + SMS/WhatsApp provider (e.g., Twilio/Exotel)
- Scheduler: Cloud Scheduler + Functions for reminders
- Analytics: BigQuery sink for events/logs

## Entities (High-level)

- Users, Roles, Sessions, Devices
- Patient, Doctor, Pharmacy
- Appointment, ConsultationSession, CallLog
- Prescription, Medication, Diagnosis, ClinicalNote
- HealthRecordDocument, Consent, AuditLog
- Medicine, PharmacyInventory
- Notification, Template, Ticket
- Payment, Invoice, Refund
- GeoLocation, Address

## Immediate Next Steps

- [ ] Confirm MVP scope and providers (Video, SMS/WhatsApp, Geocoding)
- [ ] Generate API specs for MVP surfaces (Appointments, Consultations, Records, Pharmacy)
- [ ] Draft Firestore/Storage Security Rules v1
- [ ] Set up Cloud Functions scaffolding and CI
