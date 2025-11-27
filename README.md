🏋️‍♂️ AI-Powered Workout Tracker

A modern, offline-capable Progressive Web App (PWA) built to help you track workouts, visualize progress, and use AI to optimize your training.

✨ Key Features

🤖 AI Integration (Gemini)

Smart Routine Builder: Type a goal (e.g., "Leg day for mass") and the AI generates a full routine with exercises, set/rep targets, and form notes.

Adaptive Rest Timers: The AI analyzes your specific exercises to suggest optimal rest times (e.g., 3 mins for Squats, 90s for Curls).

Progress Insights: Get AI-generated feedback on your lifting consistency and strength trends.

📝 Routine Management

Custom Targets: Support for range-based targets (e.g., "3-4 sets", "8-12 reps").

Notes System: Add specific notes to routines or individual exercises (e.g., "Use the green band").

Edit & Organize: easily edit, delete, or reorder your routines.

⚡ Active Workout Mode

Live Logging: Log weight and reps in real-time.

History Comparison: See exactly what you lifted last time right next to your current input to ensure Progressive Overload.

Auto-Rest Timer: Timer starts automatically when you complete a set.

Minimize Mode: Minimize the active workout to check your history or progress charts without cancelling the session.

Safety Modals: Confirmation pop-ups prevent accidental cancellations or deletions.

📱 Mobile Ready (PWA)

Installable: Add to home screen on iOS and Android.

Offline Capable: Works even in gyms with poor signal.

Native Feel: Full-screen experience without browser bars.

🛠️ Tech Stack

Framework: React + Vite

Styling: Tailwind CSS

Icons: Lucide React

Database: Google Firebase (Firestore & Auth)

AI Model: Google Gemini API

Charts: Recharts

🚀 Getting Started

1. Clone the repository

git clone [https://github.com/YOUR_USERNAME/workout-tracker.git](https://github.com/YOUR_USERNAME/workout-tracker.git)
cd workout-tracker


2. Install dependencies

npm install


3. Configure Credentials

Open src/App.jsx and find the firebaseConfig section.

Replace the placeholder firebaseConfig object with your keys from the Firebase Console.

Find the callGemini function and replace const apiKey = "" with your API key from Google AI Studio.

4. Run Locally

npm run dev


📲 How to Install on Mobile

Deploy the app (e.g., using Vercel or Netlify).

Open the website on your phone.

iOS: Tap Share (Square with arrow) -> Add to Home Screen.

Android: Tap Menu (Three dots) -> Install App.

📄 License

Distributed under the MIT License.
