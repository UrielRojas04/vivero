## ADDED Requirements

### Requirement: User Profile Indicator
The global UI layout SHALL display a visual indicator of the currently authenticated user at all times.

#### Scenario: User is logged in
- **WHEN** a user logs in successfully and views the dashboard or any other page
- **THEN** a profile component appears in the top right corner showing a circular avatar (with the first letter of their username), the username, and the primary role name (e.g. "JEFE")
