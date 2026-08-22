## ADDED Requirements
### Requirement: Floating Messaging Entry Point
The system SHALL provide a bottom-right floating messaging entry point in both the dispatcher web app and responder mobile app authenticated shells.

#### Scenario: Authenticated user opens messaging
- **WHEN** an authenticated dispatcher or responder presses the messaging launcher
- **THEN** the system displays their available chat threads and a message composer surface

### Requirement: Dispatcher Chat Creation
The system SHALL allow dispatcher-side users to create direct responder chats and group chats containing one or more responders.

#### Scenario: Dispatcher creates a group chat
- **WHEN** a dispatcher selects multiple responders and submits a group chat title
- **THEN** the system creates a chat thread with the dispatcher and selected responders as participants

### Requirement: Responder Chat Restrictions
The system SHALL prevent responders from creating or participating in responder-only direct chats or responder-only group chats.

#### Scenario: Responder attempts responder-only chat
- **WHEN** a responder attempts to create a chat without any dispatcher-side participant
- **THEN** the system rejects the chat creation

### Requirement: Participant-Scoped Messaging
The system SHALL allow only chat participants to read chat threads, read messages, and send messages to those threads.

#### Scenario: Participant sends a message
- **WHEN** a participant sends text to a thread they belong to
- **THEN** the system stores the message and updates the thread's latest message metadata
