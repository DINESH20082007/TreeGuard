Design a complete, production-ready web application called **TreeGuard — AI-Powered Urban Tree Health & Emergency Monitoring Platform**.

This is a REAL-WORLD environmental technology product, not a hackathon demo. The UI must feel like a professional SaaS/public-service platform that could be used by citizens, environmental organizations, campuses, parks, municipalities, and tree-management teams.

## PRODUCT PURPOSE

TreeGuard helps communities and organizations monitor urban trees, identify potential tree-health problems, report dangerous tree conditions, and manage tree-related emergencies.

The platform combines:

* AI-powered tree health analysis
* AI-powered emergency/damage detection
* Location-based tree mapping
* Tree history and monitoring
* Emergency reporting
* Risk and severity assessment
* Maintenance/inspection management
* Notifications
* Analytics and environmental insights

The interface must communicate TRUST, CLARITY, SAFETY, and ENVIRONMENTAL RESPONSIBILITY.

Do NOT make it look like a generic AI dashboard.
Do NOT use excessive gradients, unnecessary glassmorphism, excessive animations, or a futuristic sci-fi style.
Keep it clean, modern, professional, accessible, and realistic.

---

# DESIGN SYSTEM

Use a professional environmental design language.

Primary visual direction:

* Clean white/light backgrounds
* Natural green as the primary accent
* Dark green for important headings
* Neutral gray for secondary content
* Amber/orange for warnings
* Red for emergencies
* Blue for informational states

Use:

* Modern sans-serif typography
* Clear visual hierarchy
* Rounded cards with moderate corner radius
* Subtle shadows
* Consistent spacing
* Accessible contrast
* Large readable numbers for dashboards
* Clear icons
* Professional charts
* Responsive layouts

Avoid:

* Cartoonish illustrations
* Excessive decorative leaves
* Neon colors
* Excessive gradients
* Overly rounded childish UI
* Fake statistics
* Fake logos
* Cluttered dashboards

Create a consistent design system with:

* Typography scale
* Color tokens
* Buttons
* Inputs
* Dropdowns
* Search fields
* Cards
* Badges
* Alerts
* Tables
* Modals
* Tabs
* Navigation
* Map markers
* Status indicators
* Empty states
* Loading states
* Error states

---

# USER ROLES

Design the product around three primary roles.

## 1. CITIZEN / GENERAL USER

Can:

* Register and log in
* View nearby trees
* Report a tree problem
* Upload tree images
* Submit emergency reports
* View AI analysis
* Track submitted reports
* View report history
* Receive notifications
* View tree information

## 2. INSPECTOR / FIELD TEAM

Can:

* View assigned inspections
* View emergency reports
* View tree locations
* Review AI analysis
* Perform field inspections
* Upload inspection photos
* Update tree condition
* Update report status
* Add notes
* Mark issues as resolved

## 3. ADMIN / ORGANIZATION

Can:

* View organization-wide dashboard
* Monitor all trees
* Manage reports
* Assign inspections
* Manage users
* Analyze trends
* View emergency hotspots
* View environmental statistics
* Configure organization settings

---

# PUBLIC LANDING PAGE

Create a professional landing page.

Hero section:

Headline:
**Protect Every Tree. Respond Before It's Too Late.**

Supporting text:
**TreeGuard uses AI, location intelligence, and real-world monitoring to help communities identify tree health risks and respond to dangerous tree conditions.**

Primary CTA:
**Report a Tree**

Secondary CTA:
**Explore Tree Map**

Hero visual:
Show a realistic urban tree/environment image combined with a subtle map/monitoring interface.

Sections:

1. How TreeGuard Works

   * Capture
   * Analyze
   * Prioritize
   * Respond

2. AI-Powered Tree Monitoring

3. Emergency Detection

4. Tree Health History

5. Interactive Tree Risk Map

6. Organization Dashboard

7. Environmental Impact

8. Call to Action

Footer with:

* About
* Features
* Contact
* Privacy
* Terms
* Help

---

# AUTHENTICATION

Create:

## Login

Fields:

* Email
* Password
* Remember me
* Forgot password

Buttons:

* Sign in
* Continue with Google

## Registration

Fields:

* Full name
* Email
* Password
* Confirm password
* Account type

Account type:

* Citizen
* Inspector
* Organization/Admin

Include proper validation states.

Also design:

* Forgot password
* Reset password
* Email verification
* Account success

---

# CITIZEN DASHBOARD

Create a clean dashboard.

Top navigation:

* Dashboard
* Tree Map
* Report
* My Reports
* Notifications
* Profile

Dashboard content:

Greeting:
**Good morning, [Name]**

Summary cards:

* Trees Reported
* Active Reports
* Resolved Reports
* Nearby Risk Alerts

Main sections:

### Nearby Tree Risks

List nearby trees requiring attention.

Each item:

* Tree image
* Tree ID
* Location
* Risk level
* Last inspection
* View button

### Recent Reports

Show:

* Report ID
* Type
* Date
* Status
* Priority

### Nearby Emergencies

Show emergency alerts on a map.

---

# TREE MAP

Create a full-screen interactive map interface.

Left panel:

* Search location
* Search Tree ID
* Filters

Filters:

* All
* Healthy
* Monitoring
* At Risk
* Emergency
* Recently Inspected

Map markers should visually communicate status.

Marker states:

* Green = Healthy
* Yellow = Monitoring
* Orange = At Risk
* Red = Emergency

Clicking a tree marker opens a detail card containing:

* Tree ID
* Image
* Health status
* Risk level
* Last inspection
* View details

Include map controls:

* Zoom
* Current location
* Layers
* Filter

---

# TREE DETAIL PAGE

Create a complete tree profile.

Header:

* Tree ID
* Current health status
* Risk level
* Location
* Last updated

Sections:

### Tree Overview

* Tree image
* Species
* Approximate age
* Location
* First recorded
* Last inspection

### AI Health Assessment

Show:

* Health score
* Confidence score
* Detected signs
* Potential stress factors
* Recommended action

Use language such as:
**Potential drought stress detected**
instead of claiming a definitive diagnosis.

### Health Timeline

Show historical observations:

Example:

* Jan — Healthy
* Mar — Mild stress
* May — Moderate stress
* Jul — Requires inspection

Use a line chart to visualize health changes.

### Environmental Context

Show:

* Recent rainfall
* Temperature
* Humidity
* Environmental risk indicators

### Emergency History

Show previous incidents involving this tree.

### Actions

* Report problem
* Request inspection
* Add observation

---

# REPORT A TREE

Create a multi-step reporting workflow.

Step 1:
**Select Report Type**

Options:

* Tree health concern
* Fallen tree
* Broken branch
* Trunk damage
* Severe storm damage
* Tree blocking road/path
* Tree near infrastructure
* Other

Step 2:
**Upload Photos**

Allow:

* Camera
* Upload image

Show image preview.

Step 3:
**Location**

Allow:

* Use current location
* Select location on map
* Search location

Step 4:
**Additional Information**

Fields:

* Description
* Date/time
* Optional notes

Step 5:
**AI Analysis**

Display:

* Detected issue
* Severity
* Confidence
* Possible risk
* Recommended next action

IMPORTANT:
Clearly label AI output as an assessment, not an official diagnosis.

Step 6:
**Review & Submit**

Show complete report summary.

CTA:
**Submit Report**

After submission:
Show confirmation:
**Report Submitted Successfully**

Display:

* Report ID
* Current status
* Expected review stage
* View report

---

# EMERGENCY DETECTION

Create a dedicated emergency interface.

Title:
**Tree Emergency Detection**

Allow users to upload or capture a photo.

After analysis show:

### Detection Result

Example:
**Potential fallen tree detected**

### Severity

**High**

### Confidence

**94%**

### Detected Conditions

* Road obstruction
* Severe structural damage

### Location Risk

* Main road
* High pedestrian activity

### Recommended Action

**Immediate field inspection recommended**

Buttons:

* Submit Emergency Report
* Retake Photo

Use strong but professional warning UI.

Do not make emergency screens overly dramatic.

---

# MY REPORTS

Create a report management page for citizens.

Tabs:

* All
* Pending
* Under Review
* Assigned
* Resolved
* Rejected

Each report card/table row:

* Report ID
* Image
* Issue
* Location
* Date
* Priority
* Status
* View

---

# REPORT DETAIL

Create a detailed report tracking page.

Show:

Report ID

Timeline:

**Submitted**
↓
**AI Analysis**
↓
**Under Review**
↓
**Inspector Assigned**
↓
**Inspection Completed**
↓
**Resolved**

Include:

* Original image
* AI analysis
* Location map
* Inspector notes
* Updated photos
* Status history

Allow citizens to see progress but do not expose sensitive internal information.

---

# INSPECTOR DASHBOARD

Create a professional field-operations dashboard.

Top navigation:

* Dashboard
* Assignments
* Emergency Reports
* Tree Map
* Inspections
* Notifications
* Profile

Dashboard cards:

* Assigned Today
* High Priority
* Pending Inspection
* Completed
* Emergency Cases

Main section:
**Priority Queue**

Sort by:

* Emergency severity
* Location risk
* Age of report
* Public safety impact

Each case shows:

* Image
* Issue
* Location
* AI assessment
* Priority
* Assigned date
* Action button

---

# INSPECTION PAGE

Inspector opens a case.

Show:

* Tree image
* AI assessment
* Location
* Tree history
* Previous reports

Inspector actions:

### Field Assessment

* Actual condition
* Damage severity
* Structural concern
* Accessibility
* Immediate action required

Allow:

* Upload inspection photos
* Add notes
* Update status
* Mark resolved
* Request additional resources

Include confirmation modal before critical status changes.

---

# ADMIN / ORGANIZATION DASHBOARD

Create a high-quality analytics dashboard.

Top cards:

* Total Trees Monitored
* Trees At Risk
* Active Emergencies
* Reports This Month
* Inspections Completed

Charts:

### Tree Health Distribution

* Healthy
* Monitoring
* At Risk
* Critical

### Emergency Reports Over Time

### Common Emergency Types

### Tree Health Trend

### Response Time

### Geographic Risk Hotspots

Use realistic placeholder values only as sample data and clearly label them as demo/sample data.

---

# EMERGENCY MAP

Create a dedicated operational map.

Show:

* Emergency incidents
* Tree locations
* High-risk zones
* Inspector locations/assignments if appropriate

Filters:

* Severity
* Issue type
* Date
* Status

Clicking an emergency opens:

* Incident ID
* Location
* Photo
* AI assessment
* Severity
* Assigned inspector
* Status
* Response time

---

# ANALYTICS

Create an analytics page.

Metrics:

### Tree Health

* Overall health distribution
* Health deterioration trends
* Trees requiring inspection

### Emergencies

* Emergency frequency
* Emergency categories
* Geographic concentration
* Average response time

### Environmental Insights

* Areas with repeated tree stress
* Seasonal patterns
* Areas requiring more monitoring

Include date range:

* 7 days
* 30 days
* 90 days
* 1 year
* Custom

---

# NOTIFICATIONS

Create notification center.

Types:

* Emergency nearby
* Report status update
* Inspection assigned
* Inspection completed
* Tree health alert
* System notification

Use read/unread states.

---

# PROFILE

Create profile page.

Sections:

* Personal information
* Account type
* Contact information
* Notification preferences
* Security
* Password change
* Connected accounts

For organization users include:

* Organization name
* Organization role
* Team information

---

# SETTINGS

Create settings page with:

Account

* Profile
* Password
* Authentication

Notifications

* Emergency alerts
* Report updates
* Tree alerts

Privacy

* Location permissions
* Data sharing
* Image usage

Organization settings for admins:

* Team members
* Roles
* Report categories
* Notification rules

---

# IMPORTANT UI STATES

Design all important states, not only the successful screens.

Include:

### Loading

* Skeleton cards
* Image analysis loading
* Map loading

### Empty

Example:
**No reports yet**
“Your submitted tree reports will appear here.”

### Error

Example:
**Unable to analyze image**
“Please try another image or submit the report for manual review.”

### AI Uncertainty

Example:
**Analysis inconclusive**
“The image does not provide enough visual information for a reliable assessment.”

Button:
**Submit for Manual Review**

### Offline / Poor Connection

Show a clear retry state.

### Success

Clear confirmation after report submission.

### Permission

Location permission request with explanation.

---

# RESPONSIVE DESIGN

Design for:

1. Desktop
2. Tablet
3. Mobile

The mobile experience is especially important for citizens and inspectors because they may use the application outdoors.

Mobile reporting flow should be extremely simple:

**Take Photo → Confirm Location → AI Analysis → Submit**

---

# ACCESSIBILITY

Follow accessible UI principles:

* High color contrast
* Keyboard navigation
* Clear focus states
* Large touch targets
* Meaningful icons with text labels
* Do not rely only on color to communicate status
* Readable typography

---

# REAL-WORLD PRODUCT REQUIREMENTS

The UI should account for real-world limitations.

AI predictions must never be presented as guaranteed facts.

Use wording such as:

* “Potential issue detected”
* “AI assessment”
* “Confidence”
* “Recommended inspection”
* “Manual review recommended”

For emergencies, show clear instructions to contact the appropriate local authority/emergency service when necessary.

Do not expose private user information publicly.

---

# DESIGN THE FOLLOWING COMPLETE SCREEN SET

Create a connected Figma prototype containing:

1. Landing Page
2. Login
3. Register
4. Forgot Password
5. Citizen Dashboard
6. Tree Map
7. Tree Detail
8. Report a Tree
9. Image Upload
10. AI Analysis Result
11. Emergency Detection
12. Report Confirmation
13. My Reports
14. Report Detail
15. Notifications
16. Profile
17. Settings
18. Inspector Dashboard
19. Inspector Assignment List
20. Inspection Detail
21. Field Inspection Form
22. Admin Dashboard
23. Emergency Operations Map
24. Analytics
25. User Management
26. Organization Settings
27. Loading States
28. Empty States
29. Error States
30. AI Uncertainty State

Connect the main user flows in the prototype:

### Citizen Flow

Landing → Register/Login → Dashboard → Tree Map → Tree Detail → Report → Upload → AI Analysis → Submit → Report Tracking

### Emergency Flow

Report → Emergency Type → Photo → Location → AI Detection → Severity → Submit Emergency → Tracking

### Inspector Flow

Login → Dashboard → Priority Queue → Case → Map → Inspection → Upload Evidence → Update Status → Resolve

### Admin Flow

Login → Dashboard → Emergency Map → Case Management → Assign Inspector → Analytics

Make the design coherent across every screen.

The final result should look like a **real deployable environmental monitoring platform**, not a student template or concept-only dashboard.
