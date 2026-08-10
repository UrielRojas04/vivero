# ui-feedback Specification

## Purpose
TBD - created by archiving change ui-feedback-modals. Update Purpose after archive.
## Requirements
### Requirement: ConfirmDialog for Destructive Actions
The system SHALL provide a reusable confirmation dialog component for destructive actions (e.g. deleting records) that follows the existing modal aesthetic (backdrop blur, rounded panel, entrance animation).

#### Scenario: Delete confirmation with danger variant
- **WHEN** a user triggers a destructive action such as deleting a product, insumo or client
- **THEN** a confirmation dialog appears with a danger-styled confirm button and the action only executes if the user confirms

#### Scenario: Cancel closes without action
- **WHEN** the user clicks "Cancelar" or presses the Escape key, or clicks the overlay backdrop
- **THEN** the dialog closes and the action is NOT executed

#### Scenario: Warning variant for non-destructive risky actions
- **WHEN** an action has consequences that are not destructive but still require confirmation
- **THEN** the dialog renders with a warning-styled confirm button

### Requirement: Permission Denied Modal
The system SHALL show a consistent "Acceso Denegado" modal when an API action (save/delete) returns HTTP 403, instead of a native `alert`.

#### Scenario: 403 on save or delete action
- **WHEN** an API call to save or delete a record returns status 403
- **THEN** the system displays the Permission Denied modal with a clear message and a single close action

#### Scenario: Modal uses flat permission names
- **WHEN** the Permission Denied modal is shown
- **THEN** the message references the current flat permission name (e.g. `ESCRIBIR_STOCK`) and never legacy `VIVERO_` prefixed names

### Requirement: Global Toast Notifications
The system SHALL provide global toast notifications for transient feedback (success and error) managed by a UI store, with automatic dismissal.

#### Scenario: Error toast on failed save
- **WHEN** saving a record fails with a non-403 error
- **THEN** an error toast appears with an error icon and the message

#### Scenario: Success toast on saved record
- **WHEN** a record is created or updated successfully
- **THEN** a success toast appears with a success icon

#### Scenario: Toast auto-dismisses
- **WHEN** a toast is displayed
- **THEN** it disappears automatically after a few seconds

### Requirement: Backend Error Messages
The system SHALL display the backend error message (`error.response.data.message`) when available, falling back to a generic message.

#### Scenario: Backend provides a message
- **WHEN** an API call fails and the response body contains a `message` field
- **THEN** the toast or modal shows that backend message

#### Scenario: Backend provides no message
- **WHEN** an API call fails without a `message` field in the response body
- **THEN** the system shows the generic fallback message for the operation

