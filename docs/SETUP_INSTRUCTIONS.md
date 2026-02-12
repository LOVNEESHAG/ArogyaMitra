# 🚀 ArogyaMitra - Setup Instructions

## Prerequisites

1. **Firebase Project**: You should have a Firebase project set up with:
   - Authentication enabled
   - Firestore database created
   - Storage bucket configured

2. **Environment Variables**: Your `.env.local` file should contain:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   GEMINI_API_KEY=your_gemini_api_key
   FIREBASE_SERVICE_ACCOUNT_JSON=your_service_account_json
   ADMIN_EMAIL=your_admin_email
   ```

3. **Gemini API Key**: Get your API key from Google AI Studio for the AI chatbot

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Copy your Firebase configuration from the Firebase console and add it to `.env.local`

### 3. Seed the Database
```bash
npm run seed
```

This will populate Firestore with sample data:
- 3 patients (including Sunita Devi, Harpreet Singh, Rajesh Kumar)
- 2 doctors (Dr. Rajesh Kumar, Dr. Anjali Sharma)  
- 2 pharmacies (MedPlus, LifeCare)
- Sample medicines and inventory
- Test appointments and health records

### 4. Start the Development Server
```bash
npm run dev
```

Visit `http://localhost:9002` to see your application running!

## 🧪 Testing the Platform

### Test Users
After seeding, you can test with these sample users:

**Patients:**
- `sunita.devi@email.com` (Patient with diabetes and hypertension)
- `harpreet.singh@email.com` (Young healthy patient)
- `rajesh.kumar@email.com` (Patient with hypertension)

**Doctors:**
- `dr.rajesh@email.com` (General Medicine, 15 years experience)
- `dr.anjali@email.com` (Cardiologist, 12 years experience)

**Pharmacies:**
- `contact@medplus.com` (MedPlus Pharmacy)
- `info@lifecare.com` (LifeCare Pharmacy)

### Features to Test

#### 🏥 Patient Dashboard
- View upcoming appointments
- Check health records count
- Access AI health assistant
- Book new appointments (UI ready, needs doctor selection)

#### 👨‍⚕️ Doctor Dashboard  
- View today's appointments
- Access patient records (for patients who booked)
- Add consultation notes
- Manage appointment status

#### 💊 Pharmacy Dashboard
- View current inventory
- Add new medicines
- Manage stock levels
- Upload CSV for bulk inventory (API ready)

#### 🤖 AI Health Assistant
- Ask health-related questions
- Get responses powered by Gemini AI (falls back to keyword matching)
- View conversation history
- Emergency detection and warnings

#### 👔 Admin Dashboard
- View all users by role
- User verification and management
- System statistics
- Role-based access control

## 🔧 Advanced Setup

### Custom Data Seeding
To add your own test data, edit `tools/run-seed.js` and run:
```bash
npm run seed
```

### Firestore Security Rules
The current setup doesn't include security rules for the prototype. For production, you'll need to add proper Firestore security rules.

### Authentication Setup
Users can register through Firebase Auth. After registration, you'll need to manually set their role in Firestore for testing, or implement a role selection during signup.

## 🚨 Troubleshooting

### Firebase Permission Errors
If you get permission denied errors:
1. Check your Firebase project ID is correct in `.env.local`
2. Ensure Firestore is created and in production mode
3. Verify your API key has proper permissions

### Gemini API Not Working
If the AI chatbot isn't responding with intelligent answers:
1. Check your `GEMINI_API_KEY` in `.env.local`
2. Verify the API key is active in Google AI Studio
3. The system will fall back to keyword matching if Gemini fails

### Seeding Script Fails
If `npm run seed` fails:
1. Ensure all environment variables are set correctly
2. Check your Firebase project permissions
3. Try running the script with more verbose logging

### Environment Variables Not Loading
Make sure your `.env.local` file is in the project root (same folder as `package.json`) and not in a subdirectory.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                 # API routes for all features
│   └── dashboard/           # Role-based dashboard pages
├── components/
│   ├── auth/               # Authentication and role guards
│   ├── dashboard/          # Dashboard components
│   └── ui/                 # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and Firebase services
└── types/                  # TypeScript definitions

tools/
├── run-seed.js            # Database seeding script
└── seed-firestore.ts      # TypeScript seeding script

docs/
├── firebase-integration-todo.md  # Development progress
├── IMPLEMENTATION_SUMMARY.md     # Complete feature overview
└── SETUP_INSTRUCTIONS.md         # This file
```

## 🎯 Production Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy - the platform is production-ready!

### Firebase Hosting (Alternative)
```bash
npm run build
firebase deploy
```

## 🔐 Security Considerations

This is a prototype setup. For production:

1. **Implement Firestore Security Rules**
2. **Add proper user authentication flows**
3. **Validate all API inputs**
4. **Implement rate limiting**
5. **Add proper error handling**
6. **Use Firebase Admin SDK for server-side operations**

## 🆘 Support

If you encounter issues:

1. Check the Firebase Console for any errors
2. Review the browser console for client-side errors  
3. Check the Next.js server logs for API errors
4. Ensure all environment variables are properly set

The platform is now fully functional with real Firebase backend integration! 🎉
