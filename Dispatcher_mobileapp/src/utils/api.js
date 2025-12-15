// API configuration for mobile app
import Constants from 'expo-constants';

// UI MODE: Set to true to use mock data for UI development (no backend needed)
export const UI_MODE = Constants.expoConfig?.extra?.uiMode !== false; // Default to true for UI development

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
// Dummy credentials for dispatcher agencies
export const dispatcherCredentials = {
  "bfp@dispatcher.com": { password: "bfp123", agency: "BFP", name: "Bureau of Fire Protection" },
  "pnp@dispatcher.com": { password: "pnp123", agency: "PNP", name: "Philippine National Police" },
  "pcg@dispatcher.com": { password: "pcg123", agency: "PCG", name: "Philippine Coast Guard" },
  "mdrrmo@dispatcher.com": { password: "mdrrmo123", agency: "MDRRMO", name: "Municipal Disaster Risk Reduction and Management Office" },
  "ambulance@dispatcher.com": { password: "ambulance123", agency: "AMBULANCE", name: "Ambulance Service" },
};

export const mockData = {
  login: {
    user: {
      id: "mock-user-123",
      email: "bfp@dispatcher.com",
      agency: "BFP",
      name: "Bureau of Fire Protection",
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
        location_text: "123 Main St, Barangay Central",
        status: "pending",
        priority: "high",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        reporter_name: "John Doe",
        reporter_phone: "+63 912 345 6789",
        description: "Building fire on 3rd floor, multiple people trapped",
      },
      {
        id: "2",
        incident_type: "medical",
        location_text: "456 Oak Ave, Barangay North",
        status: "responding",
        priority: "critical",
        created_at: new Date(Date.now() - 1800000).toISOString(),
        reporter_name: "Jane Smith",
        reporter_phone: "+63 923 456 7890",
        description: "Cardiac arrest, elderly person needs immediate medical attention",
      },
      {
        id: "3",
        incident_type: "accident",
        location_text: "Highway 101, KM 45",
        status: "pending",
        priority: "high",
        created_at: new Date(Date.now() - 900000).toISOString(),
        reporter_name: "Mike Johnson",
        reporter_phone: "+63 934 567 8901",
        description: "Multiple vehicle collision, injuries reported",
      },
      {
        id: "4",
        incident_type: "flood",
        location_text: "Riverside District, Barangay South",
        status: "pending",
        priority: "medium",
        created_at: new Date(Date.now() - 2700000).toISOString(),
        reporter_name: "Sarah Williams",
        reporter_phone: "+63 945 678 9012",
        description: "Rising floodwaters, residents need evacuation",
      },
      {
        id: "5",
        incident_type: "crime",
        location_text: "789 Pine Rd, Barangay East",
        status: "responding",
        priority: "high",
        created_at: new Date(Date.now() - 600000).toISOString(),
        reporter_name: "Robert Brown",
        reporter_phone: "+63 956 789 0123",
        description: "Robbery in progress, suspect armed",
      },
      {
        id: "6",
        incident_type: "medical",
        location_text: "321 Elm St, Barangay West",
        status: "resolved",
        priority: "low",
        created_at: new Date(Date.now() - 7200000).toISOString(),
        reporter_name: "Lisa Davis",
        reporter_phone: "+63 967 890 1234",
        description: "Minor injury, already treated on scene",
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
        latitude: 37.7749,
        longitude: -122.4194,
        status: "available",
      },
      {
        id: "2",
        unit_type: "Ambulance",
        latitude: 37.7849,
        longitude: -122.4094,
        status: "en_route",
      },
    ],
  },
};
