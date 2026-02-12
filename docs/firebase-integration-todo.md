# Firebase Integration & Full Implementation TODO

> Note: This document is legacy. Current source of truth is `docs/todo.md`. The MVP now uses a simple-session cookie (no Firebase Admin SDK) and index-free Firestore queries. Refer to `docs/setup-firebase.md` for updated auth setup.

## Overview
Converting the role-based dashboard system from hardcoded data to full Firebase integration with Firestore backend.

## Current Status
- ✅ Role-based UI components completed
- ✅ Navigation system implemented
- ✅ Dashboard layouts created
- 🔄 Need to replace all hardcoded data with Firebase integration

## Priority Tasks

### 1. Firebase Setup & Configuration [COMPLETED] ✅
- [x] Update Firebase configuration for Firestore
- [x] Create Firestore collections and documents structure
- [x] Create dummy data seeding scripts
- [x] Set up Firebase API routes

### 2. Authentication & User Management [COMPLETED] ✅
- [x] Integrate real Firebase Auth with role detection
- [x] Create user profile management system
- [x] Implement role-based access control with Firestore
- [x] Update useUserRole hook to use Firestore

### 3. Patient Features - Firebase Integration [COMPLETED] ✅
- [x] Appointments booking system with Firestore
- [x] Health records upload/download with Firebase Storage
- [x] AI chatbot with conversation history in Firestore
- [x] Replace hardcoded patient dashboard data

### 4. Doctor Features - Firebase Integration [HIGH PRIORITY]
- [ ] Doctor appointment management with real data
- [ ] Patient records access system
- [ ] Consultation notes and records
- [ ] Replace hardcoded doctor dashboard data

### 5. Pharmacy Features - Firebase Integration [HIGH PRIORITY]
- [ ] Medicine inventory system with Firestore
- [ ] CSV upload functionality for stock
- [ ] Stock management and alerts
- [ ] Replace hardcoded pharmacy dashboard data

### 6. Admin Features - Firebase Integration [MEDIUM PRIORITY]
- [ ] User management system with Firestore
- [ ] User verification and role management
- [ ] System analytics and monitoring
- [ ] Replace hardcoded admin dashboard data

### 7. API Routes & Backend [COMPLETED] ✅
- [x] Create API routes for appointments
- [x] Create API routes for health records
- [x] Create API routes for pharmacy inventory
- [x] Create API routes for user management
- [x] Create API routes for AI chat

### 8. Data Models & Schemas [COMPLETED] ✅
- [x] Define Firestore data models
- [x] Create TypeScript interfaces
- [x] Set up data validation
- [x] Create database indexes

### 9. Real-time Features [MEDIUM PRIORITY]
- [ ] Real-time appointment updates
- [ ] Real-time chat for AI assistant
- [ ] Live inventory updates
- [ ] Real-time notifications

### 10. File Upload & Management [HIGH PRIORITY]
- [ ] Health records document upload
- [ ] Profile picture uploads
- [ ] CSV file processing for pharmacy
- [ ] File security and access control

## Implementation Plan

### Phase 1: Core Infrastructure
1. Firebase/Firestore setup and configuration
2. Data models and schemas
3. Authentication system integration
4. Basic API routes

### Phase 2: User Management
1. User profiles and role management
2. Authentication flows
3. Admin user management features

### Phase 3: Core Features
1. Appointment system (booking, management, updates)
2. Health records system
3. Pharmacy inventory system

### Phase 4: Advanced Features
1. AI chatbot with history
2. Real-time updates
3. File uploads and management
4. Analytics and reporting

## Files to Modify/Create

### New API Routes
- `src/app/api/users/route.ts`
- `src/app/api/appointments/route.ts`
- `src/app/api/health-records/route.ts`
- `src/app/api/pharmacy/route.ts`
- `src/app/api/chat/route.ts`

### Updated Components
- All dashboard components to use real data
- useUserRole hook for Firestore integration
- Authentication components

### New Utility Files
- `src/lib/firestore.ts` - Firestore helpers
- `src/lib/storage.ts` - Firebase Storage helpers
- `src/types/` - TypeScript interfaces
- `tools/seed-data.ts` - Data seeding scripts

### Data Models
- User profiles (patients, doctors, pharmacy owners)
- Appointments and scheduling
- Health records and documents
- Pharmacy inventory
- Chat conversations

## Success Criteria
- [ ] No 404 pages remaining
- [ ] All buttons functional (remove unused ones)
- [ ] Real data flowing from Firestore
- [ ] File uploads working
- [ ] Role-based access fully implemented
- [ ] Mobile-responsive design maintained
- [ ] Multi-language support preserved
