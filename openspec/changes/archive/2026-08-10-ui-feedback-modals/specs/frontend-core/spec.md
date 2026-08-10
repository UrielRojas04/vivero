## ADDED Requirements

### Requirement: Global Feedback Container
The main authenticated layout (`DashboardLayout`) SHALL mount a global feedback container that renders toasts and confirmation/permission dialogs on top of the page content, so feedback is visible in all authenticated pages without per-page wiring.

#### Scenario: Toast visible from any authenticated page
- **WHEN** a page triggers a toast through the UI store
- **THEN** the toast renders from the global container mounted in `DashboardLayout` without the page needing its own toast markup

#### Scenario: Dialog renders above page content
- **WHEN** a confirmation or permission denied dialog is triggered
- **THEN** it renders as a fixed overlay above the page content with the standard z-index stacking