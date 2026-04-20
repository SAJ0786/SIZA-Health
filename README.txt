SIZA Health Tracker - Final Package

Included
- Updated SIZA branding with icon above text and teal SIZA text
- Dashboard, Profile, and Records tabs
- Local storage persistence for profile and saved records
- Guided image upload flow for sugar and BP scan modes
- Heuristic display detection and seven-segment parsing for meter screens

Important note
- This package is a static browser app and saves profile/records in localStorage on the device/browser.
- The glucose/BP detector is a front-end heuristic parser designed for clear meter photos. It may still need tuning against your exact meter models and real-world sample images.
- For production deployment with cross-device sync, replace localStorage with Firebase Auth + Firestore.

How to run
1. Unzip the package.
2. Open index.html in a browser, or host the folder on Firebase Hosting / any static host.
3. Use a clear, front-on photo of the meter display.

Recommended next production step
- Connect this UI to Firebase Auth + Firestore
- Add sample real meter photos for tuning the parser
- Add a server-side OCR or TensorFlow Lite model for higher reliability
