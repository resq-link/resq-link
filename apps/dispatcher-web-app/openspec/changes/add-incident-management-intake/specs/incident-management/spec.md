## ADDED Requirements
### Requirement: Command Center Incident Intake
The system SHALL allow an authenticated command center user to create an incident record using the fixed SPUP incident subtype catalog.

#### Scenario: Create incident from intake
- **WHEN** the command center user submits a valid incident intake form
- **THEN** the system creates a Firestore incident record with the selected subtype, derived category, derived priority, and audit metadata

### Requirement: Mandatory Agency Routing
The system SHALL derive the assigned agencies for an incident from the configured subtype rule and SHALL not allow free-form agency routing during intake.

#### Scenario: Incident subtype applies routing
- **WHEN** a user selects an incident subtype
- **THEN** the system displays and applies the mandatory agencies defined for that subtype

### Requirement: Live Resource Dispatch
The system SHALL dispatch only real resources and SHALL limit selectable resources to records that match the mandatory agency routing and are currently available.

#### Scenario: Dispatch matching resources
- **WHEN** a user selects resources during incident intake
- **THEN** the system creates dispatch records and marks the selected resources as assigned to the created incident

### Requirement: Team Provisioning
The system SHALL store nullable team linkage fields on incidents and dispatches so a future teams module can attach without changing the incident workflow contract.

#### Scenario: Create incident without teams module
- **WHEN** the teams module is not yet configured
- **THEN** the incident and dispatch records are still created successfully with nullable team linkage fields
