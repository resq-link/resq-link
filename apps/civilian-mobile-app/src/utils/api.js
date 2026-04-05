// API configuration for mobile app
import Constants from 'expo-constants';

// UI MODE: Set to true to use mock data for UI development (no backend needed)
// UI Mode: mock data for UI development. Set to false to hit real backend.
export const UI_MODE = Constants.expoConfig?.extra?.uiMode === true;

// Get the API base URL
// Priority: 1. Environment variable, 2. App config, 3. Expo dev server IP, 4. localhost fallback
const getApiBaseUrl = () => {
  // Check environment variable first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Check app config
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }
  
  // Try to get the Expo dev server IP (works when running in Expo Go)
  // The hostUri format is like "192.168.1.100:8081"
  if (Constants.expoConfig?.hostUri) {
    const [ip] = Constants.expoConfig.hostUri.split(':');
    return `http://${ip}:4000`;
  }
  
  // Fallback to localhost (only works on web or if using tunnel)
  return 'http://localhost:4000';
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL for debugging (only in development)
if (__DEV__) {
  if (UI_MODE) {
    console.log('🎨 UI MODE: Using mock data (no backend required)');
    console.log('💡 To use real API, set "uiMode": false in app.json extra config');
  } else {
    console.log('📱 API Base URL:', API_BASE_URL);
    console.log('💡 If connection fails, make sure:');
    console.log('   1. Web server is running on port 4000');
    console.log('   2. Your device/emulator can reach this IP');
    console.log('   3. Firewall allows connections on port 4000');
  }
}

export const apiConfig = {
  baseURL: API_BASE_URL,
  endpoints: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    emergency: {
      list: '/api/emergency/list',
      submit: '/api/emergency/submit',
    },
    responders: {
      locations: '/api/responders/locations',
    },
  },
};

export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Mock data for UI development
export const mockData = {
  login: {
    user: {
      id: "mock-user-123",
      uid: "mock-user-123",
      email: "civilian@test.com",
      phone_number: "+639123456789",
      phone: "+639123456789",
      name: "Test User",
      role: "civilian",
      created_at: new Date().toISOString(),
    },
  },
  register: {
    user: {
      id: "mock-user-123",
      phone_number: "0000000000",
      name: "New User",
      created_at: new Date().toISOString(),
    },
  },
  emergencyList: {
    reports: [
      {
        id: "1",
        incident_type: "fire",
        location_text: "123 Main St",
        status: "pending",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "2",
        incident_type: "medical",
        location_text: "456 Oak Ave",
        status: "in_progress",
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  },
  emergencySubmit: {
    report: {
      id: "new-report-123",
      incident_type: "fire",
      location_text: "789 Pine Rd",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  },
  responders: {
    responders: [
      {
        id: "1",
        unit_type: "Fire Truck",
        latitude: 17.6132,
        longitude: 121.7270,
        status: "available",
      },
      {
        id: "2",
        unit_type: "Ambulance",
        latitude: 17.6232,
        longitude: 121.7370,
        status: "en_route",
      },
    ],
  },
  /** Sample footage request history for UI_MODE */
  footageRequestHistory: [
    {
      id: "mock-fr-1",
      purpose: "robbery",
      purposeOtherText: null,
      locationText: "Rizal Ave, near City Hall",
      incidentDate: "2026-04-01",
      status: "pending",
      createdAt: new Date(Date.now() - 86400000 * 2),
    },
    {
      id: "mock-fr-2",
      purpose: "vehicular_accident",
      purposeOtherText: null,
      locationText: "Highway 54 intersection",
      incidentDate: "2026-03-28",
      status: "footage_found",
      createdAt: new Date(Date.now() - 86400000 * 5),
    },
    {
      id: "mock-fr-3",
      purpose: "other",
      purposeOtherText: "Property damage",
      locationText: "Mall parking area B",
      incidentDate: "2026-03-20",
      status: "footage_not_found",
      createdAt: new Date(Date.now() - 86400000 * 10),
    },
  ],
};
