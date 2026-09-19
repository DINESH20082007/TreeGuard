TREEGUARD — AI TREE RISK PREDICTION
COMPLETE FIGMA IMPLEMENTATION PROMPT

PROJECT:
TreeGuard — AI-Powered Urban Tree Health & Emergency Monitoring Platform

==================================================
1. OBJECTIVE
==================================================

Add a new major feature called:

“AI Tree Risk Prediction”

to the existing TreeGuard product.

TreeGuard already supports:

- AI Tree Health Analysis
- Emergency / Damage Detection
- Tree Mapping
- Tree History
- Tree Reporting
- Tree Recovery Plans
- Continuous Monitoring
- AI Before/After Comparison
- Health Trends
- Inspector Workflows
- Organization Admin Management
- Notifications

The new feature extends the existing system by predicting potential future tree risk using available historical and current information.

The purpose is NOT to claim that a tree will definitely become dangerous.

The purpose is to identify potential future risk indicators and help users plan preventive inspection and maintenance.

Core concept:

CURRENT CONDITION
→ MONITORING
→ HISTORICAL DATA
→ AI RISK ANALYSIS
→ FUTURE RISK FORECAST
→ PREVENTIVE ACTION
→ INSPECTION / MAINTENANCE
→ NEW OBSERVATION
→ UPDATED RISK FORECAST

==================================================
2. CRITICAL EXISTING-DESIGN RULE
==================================================

DO NOT redesign the existing TreeGuard product.

Keep the existing:

- Sidebar
- Dashboard
- Tree Map
- Report a Tree
- My Reports
- Emergency
- Notifications
- Tree cards
- Tree Detail structure
- Existing components
- Existing typography
- Existing colors
- Existing spacing system
- Existing visual hierarchy
- Existing responsive behavior

IMPORTANT:

DO NOT add:

- “Monitoring” to the sidebar
- “Risk Prediction” to the sidebar
- “Recovery Plan” to the sidebar
- Any new primary navigation item

The existing sidebar must remain:

Dashboard
Tree Map
Report a Tree
My Reports
Emergency
Notifications

The new AI Tree Risk Prediction feature must be integrated into existing screens.

==================================================
3. EXISTING DASHBOARD MUST REMAIN UNCHANGED
==================================================

The current Citizen Dashboard contains:

- Dashboard
- Trees Reported
- Active Reports
- Resolved Reports
- Nearby Risk Alerts
- Nearby Tree Risks
- Report a Tree CTA
- Emergency nearby
- Recent Reports

Do not redesign this dashboard.

Do not replace the existing statistic cards.

Do not add a new sidebar menu.

Do not add a large new dashboard section unless it naturally fits the existing dashboard.

The existing:

Nearby Tree Risks

already contains tree statuses such as:

- At Risk
- Monitoring
- Emergency

Keep these.

The existing “View” button on each tree should continue to open the Tree Detail page.

The new AI Tree Risk Prediction feature is primarily accessed from Tree Detail.

==================================================
4. CORE AI TREE RISK PREDICTION WORKFLOW
==================================================

Implement this product lifecycle:

Tree Observation
↓
AI Health Analysis
↓
Current Health Assessment
↓
Tree Recovery / Monitoring
↓
Historical Data Collection
↓
Risk Indicators
↓
AI Tree Risk Prediction
↓
Future Risk Forecast
↓
Risk Explanation
↓
Preventive Recommendation
↓
Inspection / Maintenance
↓
Follow-up Observation
↓
AI Comparison
↓
Updated Health Assessment
↓
Updated Risk Prediction
↓
Continuous Monitoring

The prediction must update as new observations and information become available.

==================================================
5. TREE DETAIL PAGE — PRIMARY INTEGRATION
==================================================

When the user clicks:

Nearby Tree Risks
→ View

open the existing Tree Detail page.

Do not create a separate standalone Risk Prediction page as the primary experience.

Integrate the feature into Tree Detail.

Existing Tree Detail structure:

Tree Header
↓
Current Tree Image
↓
AI Health Assessment
↓
Emergency Status
↓
Tree Recovery Plan
↓
Continuous Monitoring
↓
Health Trend
↓
AI Comparison
↓
Health Timeline
↓
Maintenance History
↓
Inspection History
↓
Environmental Context
↓
Actions

Add:

AI Tree Risk Prediction

after the current monitoring / health trend information.

Recommended structure:

Tree Header
↓
Current Tree Image
↓
AI Health Assessment
↓
Emergency Status
↓
Tree Recovery Plan
↓
Continuous Monitoring
↓
Health Trend
↓
AI Tree Risk Prediction
↓
AI Risk Details
↓
Preventive Action
↓
AI Comparison
↓
Health Timeline
↓
Maintenance History
↓
Inspection History
↓
Environmental Context
↓
Actions

Keep the page visually clean and avoid making every section equally large.

==================================================
6. AI TREE RISK PREDICTION CARD
==================================================

Create a reusable card titled:

AI Tree Risk Prediction

Example:

Tree: TRE-0481
Species: London Plane

Current Health
74 / 100

Recent Change
-8 points

Current Risk
Moderate

90-Day Forecast
Elevated

AI Confidence
78%

Primary action:

[ View Risk Details ]

The card should clearly distinguish:

Current Health
Current Risk
Future Risk Forecast
Prediction Confidence

Do not visually imply certainty.

==================================================
7. RISK LEVELS
==================================================

Use these risk levels:

Low
Moderate
Elevated
High
Critical

Use TreeGuard's existing visual language.

Low:
Green

Moderate:
Yellow / Amber

Elevated:
Orange

High:
Red

Critical:
Strong emergency-oriented red styling

Do not use excessive glow, animation, gradients, or dramatic effects.

Risk badges must remain professional and readable.

==================================================
8. RISK FORECAST
==================================================

Create a forecast section:

AI Risk Forecast

Show:

Today
30 Days
60 Days
90 Days

Example:

Today
Moderate

30 Days
Moderate

60 Days
Elevated

90 Days
Elevated

Use a clean timeline or line chart.

The chart should communicate that the forecast is an AI estimate and can change.

Include:

AI Risk Forecast Trend

and:

Forecasts may change as new observations and environmental information become available.

==================================================
9. RISK FACTORS
==================================================

When the user clicks:

[ View Risk Details ]

show:

Risk Factors

Include:

1. Health Trend
Recent decline detected

2. Previous Damage
Previous branch damage reported

3. Weather Stress
High

4. Maintenance History
Recent maintenance required

5. Location Context
Near pedestrian pathway

6. AI Observation Changes
Recent visual deterioration detected

Each factor should have:

- Factor name
- Current status
- Short explanation

Do not create fake numerical values unless actual data exists.

==================================================
10. PREDICTION INPUTS
==================================================

Show the information considered by the AI:

Prediction Inputs

✓ Previous health assessments
✓ Tree history
✓ Damage reports
✓ Weather conditions
✓ Location context
✓ Maintenance history
✓ AI observation changes

This makes the system transparent.

Use:

Why is this tree showing elevated future risk?

Then explain:

The AI forecast considers recent health assessments, historical observations, reported damage, maintenance history, weather stress, location context, and changes observed across follow-up assessments.

==================================================
11. PREDICTION CONFIDENCE
==================================================

Show:

Prediction Confidence
78%

Use confidence states:

High Confidence
Medium Confidence
Low Confidence
Analysis Inconclusive

Do not present confidence as proof that the prediction is correct.

Add:

AI-generated forecast. Predictions support preventive planning but do not replace professional field inspection.

==================================================
12. PREVENTIVE ACTION
==================================================

Below the forecast, create:

Recommended Preventive Action

Example:

Schedule a field inspection within the recommended review period.

Additional checks:

• Inspect damaged branches
• Review soil moisture
• Check recent maintenance activity
• Review tree surroundings
• Capture a new observation if conditions change

Primary action:

[ Schedule Inspection ]

Secondary:

[ View Recovery Plan ]

For hazardous work, do not instruct citizens to perform it themselves.

Use:

Inspection or maintenance actions should be confirmed by a qualified professional.

==================================================
13. CONNECTION TO TREE RECOVERY PLAN
==================================================

Connect AI Tree Risk Prediction with the existing Tree Recovery Plan.

Example:

Active Recovery Plan

Potential drought stress

Status:
In Progress

Target Date:
Sep 25, 2026

Re-inspection:
Oct 9, 2026

Then show:

AI Risk Prediction

Current Risk:
Moderate

90-Day Forecast:
Elevated

Reason:

Recent health decline despite active recovery plan.

Recommended:

Review recovery plan during the next inspection.

Buttons:

[ View Recovery Plan ]
[ Schedule Inspection ]

==================================================
14. CONNECTION TO CONTINUOUS MONITORING
==================================================

Integrate the new feature with the existing Continuous Monitoring workflow.

Existing:

Follow-up Observation
↓
AI Comparison
↓
Improved / Stable / Potential Deterioration

Extend to:

Follow-up Observation
↓
AI Comparison
↓
Health Trend Updated
↓
AI Risk Prediction Recalculated
↓
Future Risk Forecast Updated
↓
Preventive Action

Example:

Previous Health:
74

Current Health:
68

Change:
-6

AI Comparison:
Potential Deterioration

Previous Risk:
Moderate

Updated Risk:
Elevated

Recommended:
Manual inspection recommended

==================================================
15. RISK PREDICTION STATES
==================================================

Create the following reusable states.

-------------------------
LOW RISK
-------------------------

AI Risk Forecast

Current Risk:
Low

No significant future risk indicators detected in the available data.

Recommendation:

Continue routine monitoring.

-------------------------
MODERATE RISK
-------------------------

AI Risk Forecast

Current Risk:
Moderate

Some risk indicators detected.

Recommendation:

Continue monitoring and consider preventive inspection.

-------------------------
ELEVATED RISK
-------------------------

AI Risk Forecast

Current Risk:
Elevated

Multiple risk indicators detected.

Recommendation:

Schedule inspection within the recommended review period.

-------------------------
HIGH RISK
-------------------------

AI Risk Forecast

Current Risk:
High

Several indicators suggest increased potential risk.

Recommendation:

Prioritize professional inspection.

[ Schedule Inspection ]

-------------------------
CRITICAL RISK
-------------------------

AI Risk Forecast

Current Risk:
Critical

Significant risk indicators require immediate professional review.

[ Review Case ]

Do not say:

“This tree will fall.”

“The tree will definitely become dangerous.”

“The tree will fail.”

“The tree must be removed.”

The system must communicate uncertainty.

==================================================
16. ANALYSIS INCONCLUSIVE
==================================================

Create an:

Analysis Inconclusive

state.

Example:

Risk Prediction Unavailable

There is not enough reliable information to generate a useful future risk forecast.

Possible reasons:

• Insufficient historical observations
• Poor-quality images
• Missing maintenance history
• Limited environmental data

Buttons:

[ Upload New Observation ]
[ Request Manual Review ]

Never invent a prediction when insufficient information is available.

==================================================
17. LOW-CONFIDENCE STATE
==================================================

Create:

AI Risk Forecast

Potential Risk:
Moderate

Confidence:
51%

The available data provides limited support for this forecast.

Recommended:

Collect another observation or request manual inspection.

Buttons:

[ Upload New Observation ]
[ Request Manual Review ]

==================================================
18. TREE RISK HISTORY
==================================================

Integrate risk prediction into the existing Tree Health Timeline.

Example:

Health & Risk Timeline

Sep 10
AI Health Assessment
Health: 62

Sep 12
Recovery Plan Created

Sep 15
Follow-up Observation
Health: 74

Sep 16
Risk Forecast Updated
Moderate

Sep 18
Risk Forecast Updated
Elevated

Reason:
Recent health decline detected

The timeline should make it easy to understand how the tree's condition and risk changed over time.

==================================================
19. RISK TREND
==================================================

Add:

AI Risk Forecast Trend

Use a clean chart.

Show:

- Previous risk
- Current risk
- Forecast risk
- Date
- Change

Example:

Low
↓
Moderate
↓
Moderate
↓
Elevated

Include:

Risk forecasts may change as new observations and information become available.

==================================================
20. INSPECTOR DASHBOARD INTEGRATION
==================================================

Do not create a new sidebar item.

Add a section to the existing Inspector Dashboard:

Future Risk Requiring Attention

Columns:

Tree
Current Health
Current Risk
Forecast
Recent Change
Recommended Action

Example:

TRE-0481
Health: 74
Risk: Moderate
90-Day: Elevated
Change: -8
Review

TRE-0392
Health: 81
Risk: Low
90-Day: Moderate
Change: -3
Monitor

TRE-0558
Health: 48
Risk: High
90-Day: High
Change: -24
Inspect

Each row:

[ View Tree ]

==================================================
21. INSPECTOR PRIORITY QUEUE
==================================================

Integrate risk prediction into the existing Inspector Priority Queue.

Example:

TRE-0558
White Oak

Current Health:
48

Current Risk:
High

90-Day Forecast:
High

Recent Change:
-24

Reason:

Potential deterioration + previous damage

[ Review ]

Risk prediction should be one transparent factor in prioritization.

Show:

Priority Factors

• Current health
• Recent health change
• Previous damage
• Risk forecast
• Overdue inspection

Do not create an unexplained black-box ranking.

==================================================
22. ADMIN DASHBOARD INTEGRATION
==================================================

Add a section to the existing Organization Admin Dashboard:

Future Tree Risk Overview

Trees Monitored
124

Low Future Risk
82

Moderate Future Risk
27

Elevated Future Risk
11

High Future Risk
4

Do not fabricate these numbers as real data.

Use them only as UI demonstration data.

Add:

Risk Forecast Trend

Use a clean chart.

Also:

Trees Requiring Preventive Action

TRE-0481
Elevated

TRE-0558
High

TRE-0621
Moderate

[ Review All ]

==================================================
23. TREE MAP INTEGRATION
==================================================

Do not create a new map.

Use the existing Tree Map.

Add an optional filter:

Risk Forecast

☐ Low
☐ Moderate
☐ Elevated
☐ High
☐ Critical

When a tree is selected:

TRE-0481
London Plane

Current Health:
74

Current Risk:
Moderate

90-Day Forecast:
Elevated

[ View Tree ]

Keep the existing Tree Map design.

==================================================
24. NOTIFICATIONS INTEGRATION
==================================================

Use the existing Notifications page.

Example notification:

AI Risk Forecast Updated

TRE-0481 — London Plane

Future risk changed from Moderate to Elevated based on recent observations.

Recommended:

Schedule preventive inspection.

[ View Tree ]

Another:

Preventive Review Recommended

TRE-0558

Risk forecast indicates increased potential risk over the next 30 days.

[ Review Case ]

Do not send alarming notifications when prediction confidence is low.

==================================================
25. CITIZEN VIEW
==================================================

For Citizen users, keep the experience simple.

Do not expose internal operational data.

Example:

Tree Health & Risk

Current Condition:
Monitoring

Future Risk:
Moderate

Last Updated:
Sep 18, 2026

The tree is being monitored based on recent observations.

[ View Details ]

Do not show:

- Internal inspector notes
- Internal administrative notes
- Internal priority calculations
- Sensitive operational information

==================================================
26. DATA TRANSPARENCY
==================================================

Add an expandable section:

How this forecast was generated

Show:

Previous health assessments
Tree history
Damage reports
Weather conditions
Location context
Maintenance history
AI observation changes

Use clear, non-technical language for Citizens.

For Inspectors/Admins, additional technical details may be displayed if appropriate.

==================================================
27. AI SAFETY LANGUAGE
==================================================

Use careful language throughout the product.

Preferred wording:

“AI Risk Forecast”

“Potential Future Risk”

“Risk Indicators”

“Forecast Confidence”

“Recommended Preventive Action”

“Manual Inspection Recommended”

“Analysis Inconclusive”

“Potential Deterioration”

Avoid definitive statements.

Never present AI prediction as an official diagnosis.

Always include where appropriate:

AI-generated forecast. Predictions support preventive planning but do not replace professional field inspection.

==================================================
28. ERROR AND EDGE STATES
==================================================

Create UI states for:

1. No historical data

2. Insufficient observations

3. Poor image quality

4. Weather data unavailable

5. Missing maintenance history

6. AI service unavailable

7. Prediction confidence too low

8. Analysis inconclusive

9. Forecast temporarily unavailable

10. Network error

Example:

Prediction Temporarily Unavailable

We could not generate a reliable forecast right now.

[ Try Again ]

Do not display fake predictions.

==================================================
29. REUSABLE FIGMA COMPONENTS
==================================================

Create reusable components:

AI Risk Prediction Card

Risk Level Badge

Risk Forecast Chart

Risk Factor Row

Prediction Confidence Badge

Risk Timeline Item

Preventive Action Card

Prediction Input List

Risk Forecast Status

Risk Filter

Risk Notification

Risk Explanation Panel

Use component variants.

Risk:

Low
Moderate
Elevated
High
Critical

Confidence:

High
Medium
Low
Inconclusive

Forecast Trend:

Stable
Increasing
Decreasing
Uncertain

==================================================
30. VISUAL DESIGN
==================================================

Follow the existing TreeGuard design.

Use:

- Clean light backgrounds
- Natural green
- Dark green headings
- Existing gray tones
- Amber for moderate warnings
- Orange for elevated risk
- Red for high / critical risk
- Existing blue informational states

Typography:

Modern professional sans-serif.

Cards:

Moderate corner radius.

Subtle borders.

Subtle shadows.

Good spacing.

Do not use:

- Neon colors
- Excessive gradients
- Excessive glassmorphism
- Cartoon graphics
- Overly rounded childish cards
- Excessive animations
- Fake AI robot imagery
- Futuristic sci-fi styling

The product should feel like a real professional environmental technology platform.

==================================================
31. RESPONSIVE DESIGN
==================================================

Desktop:

Show:

Risk Prediction
Risk Factors
Forecast Chart
Preventive Action
Prediction Inputs

using a clean multi-column layout where appropriate.

Tablet:

Stack sections naturally.

Mobile:

Prioritize:

Current Risk
↓
Future Forecast
↓
Why Risk Changed
↓
Recommended Action
↓
View Details

Buttons must remain easy to tap.

Charts must remain readable.

==================================================
32. ACCESSIBILITY
==================================================

Ensure:

- WCAG-conscious contrast
- Do not rely only on color
- Risk badges include text
- Charts have text alternatives
- Buttons have clear labels
- Keyboard navigation
- Visible focus states
- Screen-reader-friendly labels
- Clear error messages
- Accessible form controls

Example:

Do not show only a red dot.

Show:

● High Risk

==================================================
33. PROTOTYPE FLOW — CITIZEN
==================================================

Connect:

Dashboard
↓
Nearby Tree Risks
↓
View
↓
Tree Detail
↓
Continuous Monitoring
↓
AI Tree Risk Prediction
↓
View Risk Details
↓
Risk Explanation
↓
Preventive Recommendation

Citizen must not see internal inspector controls.

==================================================
34. PROTOTYPE FLOW — INSPECTOR
==================================================

Connect:

Inspector Dashboard
↓
Future Risk Requiring Attention
↓
View Tree
↓
Tree Detail
↓
AI Risk Prediction
↓
Risk Factors
↓
Schedule Inspection
↓
Inspection
↓
Follow-up Observation
↓
AI Comparison
↓
Updated Risk Prediction

==================================================
35. PROTOTYPE FLOW — ADMIN
==================================================

Connect:

Admin Dashboard
↓
Future Tree Risk Overview
↓
Trees Requiring Preventive Action
↓
View Tree
↓
Risk Prediction
↓
Risk Factors
↓
Inspection / Maintenance
↓
Monitoring

==================================================
36. COMPLETE SYSTEM CONNECTION
==================================================

The final TreeGuard lifecycle must become:

OBSERVE
↓
AI HEALTH ANALYSIS
↓
ASSESS CURRENT CONDITION
↓
CREATE RECOVERY PLAN
↓
ASSIGN
↓
INSPECT / MAINTAIN
↓
FOLLOW-UP OBSERVATION
↓
AI COMPARISON
↓
CONTINUOUS MONITORING
↓
AI TREE RISK PREDICTION
↓
FUTURE RISK FORECAST
↓
PREVENTIVE ACTION
↓
INSPECTION / MAINTENANCE
↓
RE-OBSERVE
↓
UPDATE HEALTH
↓
UPDATE RISK FORECAST
↓
REPEAT

==================================================
37. FIGMA EXECUTION ORDER
==================================================

Build the feature in this exact order.

PHASE 1 — EXISTING DESIGN REVIEW

Review the existing TreeGuard:

- Components
- Colors
- Typography
- Cards
- Buttons
- Badges
- Tree Detail
- Dashboard
- Inspector screens
- Admin screens
- Map
- Notifications

Do not redesign them.

PHASE 2 — RISK COMPONENTS

Create:

- Risk Prediction Card
- Risk Level Badge
- Forecast Chart
- Risk Factor Row
- Confidence Badge
- Preventive Action Card
- Risk Timeline
- Risk Explanation Panel

PHASE 3 — TREE DETAIL

Add:

AI Tree Risk Prediction

to the existing Tree Detail page.

PHASE 4 — RISK DETAILS

Add:

- Risk Factors
- Prediction Inputs
- Confidence
- Forecast Explanation
- Future Risk Forecast

PHASE 5 — PREVENTIVE ACTION

Connect prediction to:

- Schedule Inspection
- View Recovery Plan
- Manual Review

PHASE 6 — CONTINUOUS MONITORING

Connect:

Follow-up Observation
→ AI Comparison
→ Updated Health
→ Updated Risk Prediction

PHASE 7 — INSPECTOR

Update:

- Inspector Dashboard
- Priority Queue
- Inspection workflow

PHASE 8 — ADMIN

Update:

- Future Tree Risk Overview
- Risk Forecast Trend
- Preventive Action list

PHASE 9 — TREE MAP

Add:

Risk Forecast filter

without redesigning the existing map.

PHASE 10 — NOTIFICATIONS

Add:

- Risk Forecast Updated
- Preventive Review Recommended
- Low Confidence / Manual Review notification where appropriate

PHASE 11 — EDGE STATES

Create:

- No Data
- Low Confidence
- Analysis Inconclusive
- AI Unavailable
- Weather Data Unavailable
- Network Error
- Insufficient History

PHASE 12 — RESPONSIVE

Implement:

Desktop
→ Tablet
→ Mobile

PHASE 13 — PROTOTYPE CONNECTIONS

Connect all major user flows.

PHASE 14 — FINAL QUALITY CHECK

Verify:

- No duplicate navigation
- No new Monitoring sidebar item
- No new Risk Prediction sidebar item
- Existing Dashboard remains intact
- Existing Tree Map remains intact
- Existing Tree Detail remains visually consistent
- Risk prediction is clearly AI-generated
- Uncertainty is communicated
- No definitive AI diagnosis
- Citizen / Inspector / Admin permissions are respected
- Responsive layouts work
- Accessibility is maintained

==================================================
38. FINAL NAVIGATION — DO NOT CHANGE
==================================================

The left sidebar must remain exactly:

Dashboard
Tree Map
Report a Tree
My Reports
Emergency
Notifications

Do not add:

Monitoring
Risk Prediction
Recovery Plan

The new functionality must be integrated into the existing product structure.

==================================================
39. FINAL PRODUCT EXPERIENCE
==================================================

TreeGuard should now provide:

CURRENT TREE HEALTH
+
EMERGENCY DETECTION
+
TREE RECOVERY
+
CONTINUOUS MONITORING
+
AI COMPARISON
+
HEALTH HISTORY
+
AI FUTURE RISK PREDICTION
+
PREVENTIVE PLANNING

The key product idea is:

“TreeGuard does not only tell users what condition a tree is in today. It uses available history and recent changes to identify potential future risk and support preventive action.”

Keep the experience professional, realistic, transparent, safe, and suitable for a real-world urban tree management platform.

IMPORTANT FINAL RULE:

Do not redesign existing TreeGuard screens.

Do not add new primary navigation items.

Integrate AI Tree Risk Prediction into the existing Tree Detail, Continuous Monitoring, Inspector, Admin, Tree Map, and Notifications experiences.