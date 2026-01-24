# Change: Add Icons and Badges to Dashboard Stats Widgets

## Why
Enhance the visual information density of the dashboard stats widgets by adding contextual icons and status badges. This will help dispatchers quickly identify active cases requiring immediate attention (via "NOW" badge) and understand the resolution rate (via percentage badge) at a glance.

## What Changes
- Add an icon on the top left of both Active Cases and Resolved Cases widgets
- Add a "NOW" text badge on the top right of the Active Cases (blue) widget
- Add a percentage text badge on the top right of the Resolved Cases (green) widget
- Calculate percentage as (resolved cases / total cases) * 100, rounded to nearest integer

## Impact
- Affected specs: dashboard
- Affected code: `src/app/dashboard.jsx` (lines 263-318, stats widgets section)




