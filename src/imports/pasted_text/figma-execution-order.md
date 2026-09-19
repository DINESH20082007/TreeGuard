# FIGMA EXECUTION ORDER

Do NOT generate all screens randomly. Build the product in the following exact order so that the design system, navigation, components, and user flows remain consistent.

## PHASE 1 — FOUNDATION

First create the global design foundation:

1. Color tokens
2. Typography system
3. Spacing system
4. Grid/layout system
5. Buttons
6. Inputs
7. Select/dropdown components
8. Search components
9. Cards
10. Badges
11. Alerts
12. Tabs
13. Tables
14. Modals
15. Navigation components
16. Map markers
17. Status indicators
18. Charts
19. Empty/loading/error states

Create reusable components and variants rather than designing each screen independently.

---

## PHASE 2 — PUBLIC EXPERIENCE

Design these first:

1. Landing Page
2. How TreeGuard Works
3. Features
4. Emergency Detection explanation
5. Tree Health Monitoring explanation
6. Tree Map preview
7. Environmental impact section
8. Contact/About
9. Footer

Then connect:

**Landing → Report a Tree**

and

**Landing → Explore Tree Map**

---

## PHASE 3 — AUTHENTICATION

Design:

1. Login
2. Register
3. Forgot Password
4. Reset Password
5. Email Verification
6. Account Created
7. Authentication error states

Create the role-selection experience:

**Citizen / Inspector / Organization Admin**

Then connect:

**Login → Role-specific Dashboard**

---

## PHASE 4 — CITIZEN CORE EXPERIENCE

Build the citizen experience before moving to administrative screens.

Order:

1. Citizen Dashboard
2. Tree Map
3. Tree Detail
4. Report a Tree
5. Report Type Selection
6. Photo Upload
7. Location Selection
8. Additional Information
9. AI Analysis Loading
10. AI Analysis Result
11. Review Report
12. Report Submitted
13. My Reports
14. Report Detail
15. Notifications
16. Profile
17. Settings

Connect the complete flow:

**Dashboard → Tree Map → Tree Detail → Report → Photo → Location → AI Analysis → Review → Submit → Report Detail**

---

## PHASE 5 — TREE HEALTH MONITORING

Now design the deeper tree-monitoring experience.

Create:

1. Tree Profile
2. Current Health Status
3. AI Health Assessment
4. Health Score
5. Confidence Indicator
6. Potential Stress Factors
7. Environmental Context
8. Historical Health Timeline
9. Health Trend Chart
10. Previous Images
11. Emergency History
12. Add New Observation
13. Request Inspection

Connect:

**Tree Detail → Health History → Add Observation → New AI Assessment**

The UI must make it obvious that AI provides an assessment and not a guaranteed diagnosis.

---

## PHASE 6 — EMERGENCY DETECTION

Build the emergency workflow separately and make it extremely clear.

Order:

1. Emergency Detection Entry
2. Emergency Type Selection
3. Camera/Photo Upload
4. Image Preview
5. Location Confirmation
6. AI Detection Loading
7. Detection Result
8. Severity Assessment
9. Confidence Score
10. Location Risk
11. Recommended Action
12. Review Emergency Report
13. Emergency Submitted
14. Emergency Tracking

Connect:

**Emergency Report → Photo → Location → AI Analysis → Severity → Review → Submit → Tracking**

Include states for:

* High severity
* Medium severity
* Low severity
* AI uncertain
* Image unclear
* Location unavailable
* Analysis failed

---

## PHASE 7 — INSPECTOR EXPERIENCE

After the citizen workflows are complete, design the field-team interface.

Order:

1. Inspector Dashboard
2. Priority Queue
3. Assignment List
4. Emergency Case Detail
5. Map Location
6. Tree History
7. AI Assessment
8. Field Inspection Form
9. Photo Evidence Upload
10. Inspector Notes
11. Condition Assessment
12. Update Status
13. Assign/Request Resources
14. Inspection Completed
15. Resolution Confirmation

Primary flow:

**Inspector Dashboard → Priority Queue → Case → Location → Inspection → Evidence → Update → Resolve**

The inspector interface should prioritize speed and usability on mobile devices.

---

## PHASE 8 — ADMIN / ORGANIZATION EXPERIENCE

Now create the organization management interface.

Order:

1. Admin Dashboard
2. Organization Tree Overview
3. Emergency Overview
4. Emergency Operations Map
5. Reports Management
6. Report Detail
7. Inspector Assignment
8. Inspection Management
9. Tree Management
10. User Management
11. Team Management
12. Organization Settings

The admin should be able to understand the organization's current situation within a few seconds.

---

## PHASE 9 — MAP & LOCATION SYSTEM

Create the map experience as a reusable system.

Design:

1. Full Tree Map
2. Tree markers
3. Emergency markers
4. Risk-zone overlays
5. Search
6. Filters
7. Tree information popup
8. Emergency popup
9. Inspector assignment popup
10. Location details
11. Map legend
12. Mobile map experience

Marker states:

* Healthy
* Monitoring
* At Risk
* Emergency

Ensure the map works visually for both citizen and admin experiences.

---

## PHASE 10 — ANALYTICS

Design analytics only after the underlying dashboards are complete.

Order:

1. Analytics Overview
2. Tree Health Distribution
3. Health Trends
4. Emergency Trends
5. Emergency Categories
6. Geographic Hotspots
7. Response Time
8. Inspection Performance
9. Environmental Insights
10. Date Filters
11. Export/Download interface

Charts should be simple and readable rather than visually decorative.

---

## PHASE 11 — NOTIFICATIONS & COMMUNICATION

Create:

1. Notification Center
2. Emergency Alert
3. Nearby Tree Risk Alert
4. Report Status Update
5. Inspector Assignment
6. Inspection Completed
7. Manual Review Required
8. System Notification

Create notification states:

* Unread
* Read
* Urgent
* Informational

---

## PHASE 12 — ERROR, EDGE & SAFETY STATES

Before finishing the design, create all important real-world edge cases.

Design:

1. AI analysis failed
2. AI confidence too low
3. Image too blurry
4. Wrong image uploaded
5. Location permission denied
6. GPS unavailable
7. No internet connection
8. Server unavailable
9. Report submission failed
10. Duplicate report detected
11. Tree not found
12. No nearby trees
13. No reports
14. No assignments
15. No emergency incidents
16. Unauthorized access
17. Session expired
18. Account verification required

For uncertain AI results, provide:

**“Analysis inconclusive”**

with:

**“The image does not provide enough information for a reliable assessment.”**

Then provide:

**Submit for Manual Review**

---

# PROTOTYPE CONNECTION ORDER

After all screens are created, connect the prototype in this order.

### FLOW 1 — CITIZEN

```text
Landing
 ↓
Login/Register
 ↓
Citizen Dashboard
 ↓
Tree Map
 ↓
Tree Detail
 ↓
Report Tree
 ↓
Upload Photo
 ↓
Location
 ↓
AI Analysis
 ↓
Review
 ↓
Submit
 ↓
Report Tracking
```

### FLOW 2 — EMERGENCY

```text
Report Emergency
 ↓
Emergency Type
 ↓
Photo
 ↓
Location
 ↓
AI Detection
 ↓
Severity
 ↓
Review
 ↓
Submit
 ↓
Emergency Tracking
```

### FLOW 3 — INSPECTOR

```text
Inspector Login
 ↓
Dashboard
 ↓
Priority Queue
 ↓
Emergency Case
 ↓
Location
 ↓
Field Inspection
 ↓
Upload Evidence
 ↓
Update Status
 ↓
Resolve
```

### FLOW 4 — ADMIN

```text
Admin Login
 ↓
Admin Dashboard
 ↓
Emergency Map
 ↓
Case Detail
 ↓
Assign Inspector
 ↓
Inspection Tracking
 ↓
Analytics
```

---

# RESPONSIVE EXECUTION ORDER

Do not design desktop and mobile as completely separate products.

First establish the **desktop design system**, then adapt it to:

1. Desktop
2. Tablet
3. Mobile

Prioritize mobile adaptation for:

* Report submission
* Emergency reporting
* Camera/photo upload
* Location selection
* Inspector field inspection
* Notifications

The mobile emergency workflow should require as few interactions as reasonably possible.

---

# FINAL QUALITY CHECK

Before considering the Figma design complete, verify:

* All screens use the same design system.
* Navigation is consistent.
* Components are reusable.
* Citizen, Inspector, and Admin experiences are clearly separated.
* Emergency states are visually distinguishable.
* AI uncertainty is clearly communicated.
* No fake statistics are presented as real data.
* Maps have clear legends and markers.
* Forms have validation states.
* Every major action has success and failure states.
* Mobile layouts are usable.
* Accessibility has been considered.
* The prototype flows are connected.
* The product looks like a real environmental management platform rather than a generic AI dashboard.

**IMPORTANT EXECUTION RULE:**

Build the product sequentially. Do not jump directly to the Admin Dashboard or Analytics before completing the Citizen reporting workflow. The core product journey must be visually complete first:

**Discover → Report → AI Analyze → Assess Risk → Assign → Inspect → Resolve → Monitor.**
