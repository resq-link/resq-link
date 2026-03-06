## MODIFIED Requirements
### Requirement: Dashboard Statistics Display
The dashboard SHALL display statistics widgets for Active Cases and Resolved Cases. Each widget SHALL display:
- A count number in large, bold text
- A label text below the count
- An icon positioned at the top left of the widget
- A status badge positioned at the top right of the widget

The Active Cases widget (blue background) SHALL display:
- The count of active cases (pending, enroute, on_scene, or legacy active status)
- The label "Active Cases"
- An icon representing active/urgent cases at the top left
- A "NOW" text badge at the top right indicating immediate attention is needed

The Resolved Cases widget (green background) SHALL display:
- The count of resolved cases (done or legacy resolved status)
- The label "Resolved"
- An icon representing completion/success at the top left
- A percentage badge at the top right showing the resolution rate as (resolved cases / total cases) * 100, rounded to the nearest integer, displayed with a "%" symbol

#### Scenario: Active Cases widget displays with icon and NOW badge
- **WHEN** the dashboard loads with active cases
- **THEN** the Active Cases widget displays an icon at the top left
- **AND** the widget displays a "NOW" badge at the top right
- **AND** the badge is styled in a color that contrasts with the blue widget background

#### Scenario: Resolved Cases widget displays with icon and percentage badge
- **WHEN** the dashboard loads with cases (both active and resolved)
- **THEN** the Resolved Cases widget displays an icon at the top left
- **AND** the widget displays a percentage badge at the top right
- **AND** the percentage is calculated as (resolvedCount / totalCases) * 100, rounded to nearest integer
- **AND** the badge displays the percentage followed by "%" symbol
- **AND** the badge is styled in a color that contrasts with the green widget background

#### Scenario: Percentage calculation handles zero total cases
- **WHEN** there are no cases (totalCases = 0)
- **THEN** the percentage badge displays "0%" or handles the division by zero gracefully

#### Scenario: Widgets maintain layout with new elements
- **WHEN** icons and badges are added to the widgets
- **THEN** the existing count and label text remain visible and properly positioned
- **AND** the widget maintains its responsive layout and proportions
- **AND** all elements are properly aligned and do not overlap




