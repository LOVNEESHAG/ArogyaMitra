# ArogyaMitra - Healthcare Management Platform

A comprehensive telemedicine platform built with Next.js, Firebase, and AI-powered health assistance.

## Quick Start

1. **Install dependencies**: `npm install`
2. **Set up environment variables**: Copy Firebase config to `.env.local`
3. **Seed the database**: `npm run seed`
4. **Start development**: `npm run dev`

**Detailed Setup Instructions**: See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)

## Features

### Patient Dashboard
- Book and manage appointments
- Upload/download health records
- AI-powered health assistant with Gemini integration
- Real-time appointment status updates

### Doctor Dashboard
- View and manage patient appointments
- Access shared patient health records
- Add consultation notes and prescriptions
- Real-time patient data updates

### Pharmacy Dashboard
- Complete inventory management system
- CSV bulk upload for medicine stock
- Low-stock alerts and notifications
- Supplier and batch tracking

### AI Health Assistant
- Powered by Google Gemini API
- Intelligent symptom assessment
- Emergency detection and warnings
- Multi-language support (English, Hindi, Punjabi)

### Admin Dashboard
- User management across all roles
- System analytics and metrics
- User verification and role assignment
- Real-time platform statistics

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI**: Google Gemini API for intelligent health responses
- **UI Components**: Radix UI with custom design system
- **Real-time**: Firestore real-time listeners
- **File Upload**: Firebase Storage integration

## Current Status

Fully Functional with Firebase Integration
- Real user authentication and role-based access
- Complete Firestore backend with live data
- Working AI chatbot with conversation history
- File upload system for health records
- API endpoints for all major operations
- Mobile-responsive design maintained
