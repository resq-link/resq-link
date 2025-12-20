# Simplified Firestore Rules (Temporary Fix)

If you're still getting permission errors, try this simplified version first to test if authentication is working:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Dispatchers collection
    match /dispatchers/{userId} {
      allow read, write: if isAuthenticated();
    }
    
    // Command Centers collection
    match /commandCenters/{userId} {
      allow read, write: if isAuthenticated();
    }
    
    // Emergency Reports collection - SIMPLIFIED FOR TESTING
    match /emergencies/{reportId} {
      // Allow any authenticated user to create/read/update
      allow read, write: if isAuthenticated();
    }
    
    // Incidents collection (your existing)
    match /incidents/{incidentId} {
      allow read, write: if isAuthenticated();
    }
    
    // Responders collection
    match /responders/{responderId} {
      allow read, write: if isAuthenticated();
    }
    
    // Hospitals collection
    match /hospitals/{hospitalId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

**⚠️ WARNING**: These are simplified rules for testing only. Once you confirm authentication is working, switch back to the full security rules.

## Testing Steps:

1. Deploy these simplified rules
2. Try submitting an emergency report
3. If it works → Authentication is working, use the full rules
4. If it still fails → Authentication issue, check Firebase Auth setup

