# EcE Hub — Actual Systems v2

This version turns the visual dashboard into a functional local-first academic workspace.

## Implemented systems
- Dashboard with live counts from stored data
- Classes CRUD
- Library/PDF reference CRUD with Google Drive/PDF URLs
- Study Sets CRUD
- Flashcard study mode with reveal/previous/next
- Notes CRUD
- Quiz creation and quiz-taking
- Quiz scoring and activity history
- Pomodoro timer
- Calculator
- Profile editing
- Light/dark theme
- Global search
- Persistent browser storage using localStorage

## Run
Open `index.html` directly in a browser.

All data is stored locally in that browser. No server or external API is required yet.

## Next backend step
For multi-device accounts, Google Drive syncing, shared libraries, file uploads, and secure user data, replace localStorage with a backend such as Supabase/Firebase or a custom Node/Express + database API.
