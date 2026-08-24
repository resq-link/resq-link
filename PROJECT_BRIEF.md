# RESQ-Link Project Brief

| Document field | Details |
|---|---|
| Project name | RESQ-Link Emergency Response and Dispatch System |
| Project type | Integrated mobile and web emergency-response platform |
| Primary service area | Tuguegarao City |
| Version | 1.0 |
| Prepared on | 21 August 2026 |
| Repository baseline | Commit `5ff8f17` |
| Project owner / sponsor | To be confirmed |
| Project manager | To be confirmed |
| Current stage | Working implementation under active development and operational validation |

## 1. Project Summary

RESQ-Link is a coordinated emergency-reporting and dispatch platform for civilians, command-center personnel, field responders, and system administrators. It provides a single operational flow through which an emergency can be reported, assessed, prioritized, assigned to the appropriate team and resources, monitored in real time, and closed with a traceable outcome.

The system consists of two mobile applications, two web applications, and a shared Firebase service layer. It is designed to reduce fragmented communication and manual information handoffs while improving visibility, accountability, and coordination throughout an emergency response.

## 2. Background and Problem Statement

Emergency response can be slowed by incomplete reports, disconnected communication channels, unclear resource availability, and limited visibility into the status of an active incident. Information may need to be repeated as it moves between a civilian, the command center, and field personnel, increasing the risk of delay or inconsistency.

RESQ-Link addresses this problem by turning each report into a shared, real-time operational record. The same record can carry the location, incident details, supporting media, priority, assigned agencies and resources, responder updates, communications, timestamps, and final outcome.

## 3. Project Goal

To provide Tuguegarao City with a secure and reliable digital platform that connects the public, command center, emergency-response agencies, and administrators in one coordinated and traceable emergency-response workflow.

## 4. Objectives

- Make emergency reporting faster and more structured through guided forms, location capture, supporting photos, and report confirmation.
- Give dispatchers a real-time view of incoming reports, active incidents, priorities, teams, responders, and resources.
- Support consistent triage, incident creation, agency routing, assignment, escalation, and resolution processes.
- Give responders clear assignment details, navigation context, communication tools, and field-status controls.
- Keep civilians informed through report history, status tracking, map context, and communication entry points.
- Improve accountability through role-based access, timestamps, acknowledgments, assignment history, status transitions, and post-incident records.
- Support operational review through searchable history, response analytics, printable reports, and PDF/Excel exports.
- Centralize account provisioning, civilian KYC review, and access governance.

## 5. Target Users and Stakeholders

| Stakeholder | Primary need | System support |
|---|---|---|
| Civilians and emergency reporters | A quick and trustworthy way to request help | Registration, verified accounts, guided reports, GPS/manual location, photos, report history, tracking, and calls |
| Command-center dispatchers | Accurate intake, triage, and coordinated deployment | Live intake, prioritization, incident management, maps, team/resource assignment, alerts, messaging, reporting, and exports |
| Field responders | Clear assignments and safe field coordination | Case details, maps/navigation, accept or decline actions, en-route/on-scene updates, chat/calls, assessments, and post-incident reporting |
| Response agencies | Coordinated routing and resource visibility | Agency-based assignment for BFP, PNP, MDRRMO, ambulance, PCG, and other supported partners |
| Super administrators | Secure control of users and organizational accounts | Account provisioning, role control, command-center management, KYC decisions, verification, and account recovery support |
| City leadership and project sponsors | Service visibility and evidence for decisions | Operational summaries, response-time data, incident history, outcomes, and exportable reports |
| Engineering and operations team | A maintainable, secure, and deployable platform | Shared typed services, security rules, environment conventions, deployment configuration, and maintenance scripts |

## 6. Scope

### In Scope

- Civilian account registration, email verification, KYC review states, authentication, and password recovery.
- Structured emergency reporting with incident type, narrative, people involved, GPS or manual location, photos, review, and submission.
- Civilian dashboard, report history, live status timeline, map tracking, and incident communication.
- Command-center intake from civilian, call, SMS, walk-in, radio, and manual sources.
- Report validation, grouping, deduplication support, categorization, prioritization, and elevation into a canonical incident.
- Incident lifecycle management, including assignment, dispatch, reassignment, escalation, acknowledgment, response, resolution, and unresolved outcomes.
- Operational team, responder, vehicle, equipment, availability, maintenance, and location management.
- Responder assignment receipt, accept/decline actions, navigation, en-route and on-scene updates, field assessments, and post-incident reporting.
- Real-time maps, alerts, notifications, direct/group messaging, and incident voice calls.
- Incident history, footage requests, analytics, print views, and PDF/Excel exports.
- Super-admin management of civilian, dispatcher, responder, and command-center accounts.
- Firebase authentication, operational records, media storage, responder presence, security rules, and real-time synchronization.
- Web deployment configuration and mobile build profiles.

### Out of Scope Unless Separately Approved

- Replacement of national emergency hotlines, agency radio systems, or existing government dispatch procedures.
- Procurement or maintenance of radios, vehicles, CCTV systems, mobile devices, network infrastructure, or other physical equipment.
- Automatic control of third-party agency systems that do not expose an approved integration.
- Guaranteed emergency connectivity where mobile data, internet, GPS, or third-party services are unavailable.
- Public rollout outside the approved Tuguegarao City service area.
- Medical diagnosis, automated legal decisions, or autonomous dispatch without authorized human oversight.

## 7. Core Deliverables

| Deliverable | Purpose |
|---|---|
| Civilian Mobile App | Public registration, emergency reporting, tracking, history, account settings, and communication |
| Dispatcher Web App | Command-center intake, triage, dispatch, incident/resource/team management, maps, communication, analytics, and reporting |
| Responder Mobile App | Field assignments, case context, navigation, presence, status updates, assessments, communication, and completion reporting |
| Super-Admin Web App | Account provisioning, command-center administration, KYC review, verification support, and recovery operations |
| Shared Firebase Package | Common authentication, data access, lifecycle rules, messaging, calls, presence, storage, and typed domain operations |
| Security and Data Configuration | Firestore, Storage, and Realtime Database rules and indexes |
| Deployment Configuration | Vercel setup for web applications and Expo/EAS profiles for mobile builds |
| Technical and Operational Documentation | Setup, architecture, environment, security, troubleshooting, and system reference material |

## 8. High-Level Operational Workflow

1. A civilian submits an emergency report, or command-center personnel record a report received through another channel.
2. A dispatcher validates the information and determines the type, priority, required agencies, location, and follow-up details.
3. Eligible reports are grouped or elevated into a canonical incident while preserving their source records and evidence.
4. The command center assigns an operational team, responders, agencies, vehicles, and equipment.
5. Responders accept or decline the assignment, navigate to the location, and update their en-route and on-scene status.
6. Civilians, dispatchers, and responders receive the role-appropriate live status, alerts, and communication options.
7. The incident is completed or marked unresolved, resources are released, and response details become available for history and analysis.

## 9. Functional Requirements

- Users must authenticate and be authorized according to their account type, role, designation, and active status.
- The system must preserve the relationship between source reports, incidents, dispatch assignments, teams, resources, and communications.
- Operational changes must synchronize to authorized users in near real time.
- Dispatchers must be able to classify, prioritize, assign, reassign, acknowledge, and close incidents.
- Responders must be able to receive assignments and record accepted, declined, en-route, on-scene, and completion actions.
- Civilians must be able to submit sufficient emergency details and review the progress of their reports.
- Administrators must be able to manage accounts and civilian KYC decisions through privileged operations.
- The system must maintain evidence and audit information, including timestamps, assignment history, status transitions, and outcomes.
- Reporting tools must support filters, operational summaries, printing, and export where implemented.

## 10. Non-Functional Requirements

- **Security:** Role- and ownership-based access, protected administrative routes, secure server credentials, and controlled media paths.
- **Privacy:** Personal data, government ID/KYC media, locations, and emergency evidence must be handled only for authorized operational purposes.
- **Reliability:** Critical flows should tolerate missing indexes or optional map/presence configuration where supported, with clear operational fallbacks.
- **Performance:** Active incidents, assignments, alerts, and messages should update fast enough for operational use under expected load.
- **Usability:** Interfaces should remain clear under time pressure and support mobile field conditions and desktop command-center workflows.
- **Maintainability:** Shared lifecycle functions and typed domain services should remain the authoritative way to change operational records.
- **Traceability:** Significant operational actions must retain the actor, time, affected record, assignment context, and result where applicable.
- **Compatibility:** Mobile builds must validate Android and iOS permissions; web applications must support approved modern browsers.

## 11. Technology Overview

| Layer | Technology |
|---|---|
| Mobile applications | Expo 54, React Native 0.81, React 19, Expo Router 6 |
| Web applications | Next.js 15, React 19, TypeScript |
| Backend and data | Firebase Authentication, Cloud Firestore, Firebase Storage, Realtime Database, Firebase Admin SDK |
| Mapping | Google Maps/react-native-maps on mobile; Leaflet with Mapbox tiles on web |
| Communication | Firestore messaging, Agora voice calls, Expo notifications |
| Reporting | jsPDF, jsPDF AutoTable, xlsx |
| Deployment | Vercel for web; Expo Application Services (EAS) for mobile |
| Repository model | npm workspaces monorepo with a shared Firebase/domain package |

## 12. Proposed Success Measures

The following measures should be baselined during pilot operations and assigned approved targets before production acceptance:

- Median time from report submission or intake to dispatcher acknowledgment.
- Median time from acknowledgment to team/resource assignment.
- Median time from dispatch to responder acceptance, en route, and on scene.
- Percentage of submitted reports containing a usable location and required incident details.
- Percentage of active incidents with a complete assignment and status trail.
- Percentage of resolved incidents with a documented outcome or post-incident report.
- Delivery and acknowledgment rate for critical operational alerts.
- System availability and rate of failed report submissions, synchronization errors, or call failures.
- Number and severity of unauthorized-access findings during security testing.
- User acceptance results for civilians, dispatchers, responders, and administrators.

## 13. Constraints and Dependencies

- Reliable internet or mobile-data connectivity is required for real-time operations.
- Firebase configuration, security rules, indexes, service accounts, and quotas must be correctly managed.
- Google Maps, Mapbox, Agora, Resend, Vercel, Expo/EAS, and device notification services introduce third-party availability, credential, quota, and cost dependencies.
- GPS accuracy and background behavior depend on the user’s device, permissions, operating system, and environment.
- Response quality still depends on trained personnel, approved standard operating procedures, accurate user input, and available field resources.
- Production use requires approved privacy, retention, cybersecurity, incident-response, and account-governance policies.
- Budget, staffing, production support ownership, and service-level commitments remain to be confirmed.

## 14. Key Risks and Mitigations

| Risk | Potential impact | Recommended mitigation |
|---|---|---|
| Connectivity loss or poor mobile coverage | Delayed reports and status updates | Define offline/continuity procedures, visible connection states, retries, and fallback communication channels |
| Incorrect or incomplete reports | Misclassification or response delay | Required fields, confirmation screens, dispatcher validation, follow-up details, and report grouping |
| Unauthorized access or data exposure | Harm to users and loss of trust | Least-privilege rules, server-only admin operations, security testing, access reviews, and secure secret management |
| False, duplicate, or malicious reports | Wasted resources and operational confusion | Verified accounts, KYC where approved, triage, deduplication, audit history, and escalation procedures |
| Incorrect lifecycle changes | Conflicting incident, report, or resource state | Enforce shared transition functions, validation, automated tests, and audit records |
| Third-party service outage or quota exhaustion | Maps, calls, email, builds, or backend functions become unavailable | Monitoring, quota alerts, documented fallbacks, vendor limits, and continuity plans |
| Location inaccuracy | Responders may be routed incorrectly | Display accuracy/context, permit dispatcher correction, confirm landmarks, and support manual pins/addresses |
| Insufficient user training | Slow or inconsistent adoption | Role-specific training, drills, quick guides, and supervised pilot operations |
| Unclear ownership after launch | Slow incident resolution and maintenance | Name product, security, data, support, and operational owners before go-live |

## 15. Delivery and Validation Plan

Because an approved calendar was not found in the repository, the project should use the following stage gates and assign dates through the project sponsor:

1. **Scope and governance confirmation** — approve the brief, owners, service area, agency roles, policies, budget, and success targets.
2. **Technical readiness** — validate environments, credentials, security rules, indexes, backups, monitoring, and release pipelines.
3. **Functional verification** — test each application and the complete report-to-resolution lifecycle, including negative and degraded scenarios.
4. **Security and privacy review** — assess access control, KYC/evidence handling, secrets, logging, retention, and incident response.
5. **User acceptance and training** — conduct scenario-based testing with civilians or representatives, dispatchers, responders, and administrators.
6. **Controlled pilot** — operate within an approved area and period, measure results, and address defects and process gaps.
7. **Production rollout** — release after formal go-live approval, with support coverage, escalation contacts, and rollback/continuity procedures.
8. **Post-launch review** — evaluate metrics, user feedback, incidents, costs, and improvement priorities.

## 16. Roles and Governance to Confirm

| Role | Expected responsibility | Assigned person/team |
|---|---|---|
| Executive sponsor | Funding, strategic decisions, and final go-live approval | To be confirmed |
| Product owner | Scope, priorities, acceptance criteria, and stakeholder alignment | To be confirmed |
| Emergency operations lead | SOP alignment, dispatch rules, exercises, and operational acceptance | To be confirmed |
| Technical lead | Architecture, implementation quality, releases, and technical risk | To be confirmed |
| Security/privacy owner | Access reviews, data handling, retention, security testing, and incident response | To be confirmed |
| Data/reporting owner | Definitions, data quality, dashboards, exports, and performance metrics | To be confirmed |
| Agency representatives | Resource details, routing rules, training, and user acceptance | To be confirmed |
| Support/operations team | Monitoring, account support, issue triage, and continuity procedures | To be confirmed |

## 17. Acceptance Criteria

RESQ-Link may be considered ready for an approved production rollout when:

- The end-to-end emergency workflow passes documented user-acceptance scenarios for all four user groups.
- Role, ownership, account-status, and administrative access controls pass security review.
- Emergency reports, incidents, assignments, resources, communications, and outcomes remain correctly linked and synchronized.
- Critical alerts, location functions, maps, messaging, calls, reports, and exports meet agreed acceptance tests or have approved fallbacks.
- Backup, monitoring, support, escalation, recovery, and continuity procedures are documented and exercised.
- Required privacy notices, user consent, retention rules, agency agreements, and operating procedures are approved.
- Named owners, support contacts, target metrics, pilot results, budget, and go-live authorization are recorded.

## 18. Assumptions and Open Decisions

- Tuguegarao City is treated as the initial operating area based on the application identifiers, mapping assets, and repository naming.
- The current repository represents a working implementation, but repository presence alone does not confirm production approval or field readiness.
- Success-measure targets, rollout dates, budget, sponsor, operational owners, data-retention periods, and formal service levels require stakeholder approval.
- Agency routing rules and responder designations must be validated against the latest local organizational structure and emergency SOPs before rollout.
- Any expansion to additional cities, agencies, languages, or external government systems should be handled as separately approved scope.

## 19. Approval

| Approval role | Name | Signature | Date |
|---|---|---|---|
| Executive sponsor |  |  |  |
| Product owner |  |  |  |
| Emergency operations lead |  |  |  |
| Technical lead |  |  |  |
| Security/privacy owner |  |  |  |

