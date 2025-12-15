# Command Center Web System

A modern web-based command center for monitoring and managing emergency incidents in real-time.

## Features

- **Live Incident Dashboard**: Real-time monitoring of active emergency incidents
- **Incident Map**: Geographic visualization of all incidents with interactive markers
- **Incident History**: Historical records and analytics of past incidents

## Tech Stack

- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Leaflet & React-Leaflet** - Map integration
- **Mapbox** - Map tiles and styling

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd command-center-web
```

2. Install dependencies:
```bash
npm install
```

3. Set up Mapbox API key:
   - Create a `.env.local` file in the `command-center-web` folder
   - Get your Mapbox access token from [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
   - Add the following to `.env.local`:
   ```env
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
   NEXT_PUBLIC_MAPBOX_STYLE=mapbox/streets-v12
   ```
   - Optional: Change `NEXT_PUBLIC_MAPBOX_STYLE` to use different map styles:
     - `mapbox/streets-v12` (default)
     - `mapbox/outdoors-v12`
     - `mapbox/light-v11`
     - `mapbox/dark-v11`
     - `mapbox/satellite-v9`
     - `mapbox/satellite-streets-v12`
     - `mapbox/navigation-day-v1`
     - `mapbox/navigation-night-v1`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
command-center-web/
├── app/
│   ├── layout.tsx          # Root layout with navigation
│   ├── page.tsx             # Live Incident Dashboard
│   ├── map/
│   │   └── page.tsx         # Incident Map page
│   ├── history/
│   │   └── page.tsx         # Incident History page
│   └── globals.css          # Global styles
├── components/
│   ├── Navigation.tsx       # Main navigation component
│   ├── IncidentCard.tsx     # Incident card component
│   ├── StatusBadge.tsx      # Status badge component
│   └── MapComponent.tsx     # Map component with Leaflet
└── public/                  # Static assets
```

## Pages

### Live Incidents (`/`)
- Real-time dashboard showing active incidents
- Statistics cards for total, active, and pending incidents
- Live incident cards with details and actions

### Map (`/map`)
- Interactive map showing all incidents
- Color-coded markers by priority and status
- Filter by incident status
- Click markers to view incident details

### History (`/history`)
- Historical records of resolved incidents
- Search and filter functionality
- Statistics and analytics
- Response time tracking

## Future Integration

This is a UI-only implementation. Future Firebase integration points:

- **Firestore Database**: Store and sync incident data
- **Firebase Realtime Database**: Real-time updates for live incidents
- **Firebase Authentication**: User authentication and authorization
- **Firebase Cloud Functions**: Backend logic and notifications
- **Firebase Storage**: Media files and attachments

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Mapbox Setup

The map uses Mapbox for high-quality map tiles. To use the map:

1. Sign up for a free Mapbox account at [https://www.mapbox.com/](https://www.mapbox.com/)
2. Get your access token from [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
3. Create a `.env.local` file in the `command-center-web` folder
4. Add your token:
   ```env
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token_here
   ```
5. Restart your development server

**Note**: The `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to the browser.

## Notes

- All data is currently mock data for UI demonstration purposes
- Map requires a Mapbox access token (free tier available)
- Responsive design works on desktop and tablet devices
- Ready for Firebase integration when backend is implemented

