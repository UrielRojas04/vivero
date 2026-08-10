## 1. Setup & Auth Store Updates

- [x] 1.1 Update `useAuthStore` to fetch and store user roles/permissions on login or initial app load if not already present.
- [x] 1.2 Create helper functions in `useAuthStore` (e.g. `hasPermission(perm)`) to make checking permissions easy across components.

## 2. Profile Component & Layout

- [x] 2.1 Create a `ProfileBadge` component that displays a circular avatar with the user's initial, username, and their primary role.
- [x] 2.2 Integrate the `ProfileBadge` into the main Layout (navbar or sidebar) so it's visible globally.

## 3. UI RBAC Restrictions

- [x] 3.1 Update the main Layout/Navbar to conditionally render the "Admin" link only if the user has `ADMIN_DB`.
- [x] 3.2 Update the main Layout/Navbar to conditionally render the "Insumos" link only if the user has `LEER_INSUMOS` (or related write permission).
- [x] 3.3 Update the main Layout/Navbar to conditionally render the "Productos" link only if the user has `LEER_PRODUCTOS`.

## 4. Route Protection

- [x] 4.1 Update the React Router configuration in `App.jsx` (or similar) to implement a `ProtectedRoute` wrapper that checks permissions before rendering the component.
- [x] 4.2 Wrap the Admin, Insumos, and Productos routes with their respective required permissions.
- [x] 4.3 Verify that navigating manually to a forbidden route redirects to an unauthorized page or dashboard.
