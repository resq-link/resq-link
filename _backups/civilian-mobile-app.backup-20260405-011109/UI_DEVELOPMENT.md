# UI Development Mode

## 🎨 Focus on UI Development Without Backend

The app is now configured with **UI Mode** enabled by default, which means you can develop and test the UI without needing the backend API server running!

## How It Works

When UI Mode is enabled:
- ✅ All API calls use **mock data** instead of real backend requests
- ✅ No network connection required
- ✅ Fast UI development and testing
- ✅ All screens work with realistic sample data

## Current Status

**UI Mode is ENABLED** by default in `app.json`:
```json
"extra": {
  "uiMode": true
}
```

## What You Can Test

### Login Screen
- Enter any phone number (10+ digits)
- See loading animation
- Successfully navigate to dashboard
- Mock user data is automatically created

### Registration Screen
- Fill in name and phone number
- See registration flow
- Navigate to dashboard after success

### Dashboard
- View mock emergency reports
- See different statuses (pending, in_progress)
- Test pull-to-refresh

### Emergency Form
- Fill out emergency report
- Select incident types
- Submit and see confirmation

### History Tab
- View list of past reports
- Test scrolling and refresh

### Responder Map
- See mock responder locations
- Test map interactions

## Switching to Real API

When you're ready to test with the real backend:

1. **Update `app.json`:**
   ```json
   "extra": {
     "uiMode": false,
     "apiUrl": "http://YOUR_IP:4000"
   }
   ```

2. **Start the web server:**
   ```bash
   cd _/apps/web
   npm run dev
   ```

3. **Restart Expo:**
   ```bash
   npx expo start --clear
   ```

## Console Logs

When UI Mode is active, you'll see:
```
🎨 UI MODE: Using mock login data
🎨 UI MODE: Using mock registration data
🎨 UI MODE: Using mock emergency list data
```

This helps you know when mock data is being used vs real API calls.

## Customizing Mock Data

Edit `src/utils/api.js` to customize the mock data:
```javascript
export const mockData = {
  login: { user: { ... } },
  register: { user: { ... } },
  emergencyList: { reports: [ ... ] },
  // etc.
};
```

## Benefits

- 🚀 **Faster Development**: No need to wait for API responses
- 🎯 **Focus on UI**: Work on design and user experience
- 🐛 **Easier Debugging**: Consistent mock data for testing
- 📱 **Offline Development**: Work anywhere, anytime

Enjoy building your UI! 🎨

