# TravelMate — Smart Group Travel Matcher

> **Booking Holdings HACKCELLENCE Hackathon (Problem 3: Group Travel Matcher)**  
> *A full-stack, rule-based web platform connecting solo travellers through 6 strict compatibility rules, transparent explainable matching, dynamic accommodation cost-splitting, collaborative hotel shortlists, and mock group booking confirmation.*

---

## 1. Project Name and Purpose

**TravelMate** is a safety-conscious, transparent group travel matching platform designed to solve the primary friction points of solo travel: loneliness, high single-occupancy lodging costs, safety preferences, and complex group trip coordination.

Unlike black-box recommendation engines, TravelMate uses **deterministic, rule-based matching** that explains exactly *why* a group is a match, calculates dynamic equal cost-splitting across group members from real catalog hotel inventory, and provides an integrated collaborative group workspace.

---

## 2. Problem Statement Summary

Solo travellers often struggle to:
- Find compatible travel companions with similar interests, budgets, and travel dates.
- Ensure mutual safety and gender preferences before committing to a trip.
- Share hotel rooms and split costs equally without confusing spreadsheets.
- Coordinate group decisions and agree on hotel accommodations.

**TravelMate** solves this with two complementary workflows:
1. **Group Creator Flow (Scenario A: Sarah):** A solo traveller posts an upcoming trip (destination, dates, budget, itinerary, max group size) and reviews/approves incoming join requests.
2. **Group Seeker Flow (Scenario B: Priya):** A solo traveller enters destination dates, budget, and interests, discovers eligible groups matching all 6 strict rules, views transparent compatibility percentages, expresses interest, and upon approval joins the group workspace to search and finalize hotel bookings.

---

## 3. Core Features

### Mandatory Features (P0)
- **FR-01: Traveller Profile Registration:** Register profiles with Name, Age, Gender, Home City, Interests tags, and Gender Preference (`SAME_GENDER` or `ANY`). Includes persistent storage and instant switching between demo personas (Sarah, Priya, Meera, etc.).
- **FR-02: Create Group Trip Post:** Create trip posts for any of the 5 supported cities (Tokyo, Kyoto, Osaka, Dubai, Abu Dhabi) between April 1–20, 2027, with budget, max capacity (1–4), and itinerary.
- **FR-03: Dynamic Group Search:** Search for travel groups with any valid inputs. Form accepts any catalog city, date range, budget, and interest combination.
- **FR-04: Six Mandatory Matching Rules:** Backend engine strictly evaluates:
  1. *Same Destination* (exact city match)
  2. *Date Overlap* (at least 2 shared nights)
  3. *Budget Compatibility* (difference $\le 40\%$ of the lower budget)
  4. *Shared Interests* (at least 2 shared interests with the group owner)
  5. *Mutual Gender Preference* (both parties mutually consent)
  6. *Available Group Capacity* (current members + 1 $\le$ max group size, excluding existing members)
- **FR-05: Join Requests & Approvals:** Seekers express interest; group owners review applicant compatibility breakdowns and approve or decline requests with atomic capacity locks.
- **FR-06: Common Group Page / Workspace:** Approved members access a private collaborative workspace to view companion profiles, search hotels, compare room options, and discuss plans.
- **FR-07: Mock Booking Finalization:** Revalidates real inventory across all stay nights, calculates deterministic per-person allocations to the whole rupee, generates a unique reference code (`TM-XXXXXX`), and locks the finalized reservation.

### Competitive Differentiators (P1)
- **Unique Feature 1 — Explainable Matching Score:** 
  $$\text{Score} = \text{round}(0.40 \times \text{Interest Similarity} + 0.35 \times \text{Date Overlap} + 0.25 \times \text{Budget Similarity})$$
  Accompanied by an explainable checklist showing exact overlapping dates, shared interests, and budget difference.
- **Unique Feature 2 — Helpful No-Match Diagnostics:** When no groups match, the backend calculates aggregate failure diagnostics (e.g. 3 groups failed dates, 2 failed budget, 1 group full) and provides one-click action shortcuts.
- **Unique Feature 3 — Real Catalog Hotel Price Comparison:** Reads real hotels, rooms, and nightly room availability (April 1–20, 2027) from catalog files, computing required rooms based on group size (`ceil(members / maxAdults)`).
- **Unique Feature 4 — Dynamic Group Cost Split:** Automatically recalculates total stay cost and per-member shares whenever the group size changes.
- **Unique Feature 5 — Collaborative Hotel Shortlist:** Group members save hotel options, vote on preferences, see who saved each option, and compare equal per-person shares.

### Optional Enhancements (P2 & P3)
- **Optional G1: Filter & Sort Results:** Filter matches by specific interests and sort by Compatibility %, Lowest Budget, or Most Overlapping Nights.
- **Optional G2: Group Member Profile Modal:** View full member background (age, home city, airport, interests, joined groups) by clicking any member avatar.
- **Stretch S1: Group Coordination Chat:** Persistent in-workspace message board for members to coordinate offline before locking bookings.

---

## 4. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React icons, React Context (AuthContext & RouterContext).
- **Backend:** Node.js (ES modules), Express.js, RESTful architecture.
- **Database:** Resilient persistent document database engine with atomic disk writes (`server/data/*.json`) and optional MongoDB URI connector.
- **Testing:** Node.js built-in test runner (`node:test`, `node:assert`).
- **Styling:** Custom Tailwind travel theme with Plus Jakarta Sans typography, rounded cards, badges, and accessible contrast.

---

## 5. Architecture & Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TravelMate React SPA                     │
│  (Dashboard, Find Groups, Group Details, Common Workspace)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST HTTP Requests (/api)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express.js Backend                      │
├──────────────────────────────┬──────────────────────────────┤
│ Matching Engine (6 Rules)    │ Catalog Service (Read-Only)  │
│ Hotel Pricing & Availability │ Persistent Document Store    │
└──────────────────────────────┴──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     Catalog Data      │             │    Persistent Data    │
│ (destinations, hotels,│             │ (travellers, groups,  │
│   rooms, availability)│             │ requests, bookings)   │
└───────────────────────┘             └───────────────────────┘
```

---

## 6. Project Folder Structure

```text
TravelMate/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Notification.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── MemberProfileModal.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── RouterContext.jsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── CreateGroupPage.jsx
│   │   │   ├── FindGroupsPage.jsx
│   │   │   ├── GroupDetailsPage.jsx
│   │   │   └── CommonGroupWorkspacePage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/
│   ├── data/                   # Persistent runtime JSON database
│   │   ├── travellers.json
│   │   ├── groups.json
│   │   ├── join_requests.json
│   │   ├── saved_hotels.json
│   │   ├── bookings.json
│   │   └── messages.json
│   ├── src/
│   │   ├── controllers/        # Express route controllers
│   │   ├── models/             # Persistent Document DB engine (ACID atomic writes)
│   │   ├── routes/             # REST API routing
│   │   ├── services/           # Matching Engine & Hotel Pricing Service
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
│
├── data/                       # Official Hackathon Read-Only Data
│   ├── problem-3/
│   │   ├── travellers.json
│   │   ├── groups.json
│   │   └── interests.json
│   └── catalog/
│       ├── destinations.json
│       ├── hotels.json
│       ├── rooms.json
│       └── availability.json
│
├── images/
│   ├── hotels/                 # Hotel photos
│   └── ATTRIBUTIONS.md
│
├── tests/
│   ├── matchingEngine.test.js  # 10 comprehensive unit tests
│   ├── integration.test.js     # 5 integration & lifecycle tests
│   └── e2e.test.js             # End-to-end smoke test
│
├── package.json                # Root package with 1-command startup
├── .env.example
├── .gitignore
└── README.md
```

---

## 7. Prerequisites

- **Node.js:** v18.0.0 or later (Tested on Node.js v24).
- **npm:** v9.0.0 or later.
- Modern Web Browser (Chrome, Edge, Firefox, Safari).

---

## 8. Installation

Dependencies for both client and server are pre-configured. To install or verify dependencies:

```bash
# In project root
npm install
```

---

## 9. Database Setup

TravelMate includes a **resilient persistent document database engine** stored in `server/data/`:
- Does not require starting external database services or admin privileges.
- Uses **atomic write operations** (`.tmp` write + atomic rename) to guarantee zero file corruption.
- Automatically initializes and seeds the 24 travellers and 12 open groups from the read-only catalog on first boot.
- Preserves all user registrations, group creations, memberships, and mock bookings across server restarts and page refreshes.
- *(Optional)* If you wish to connect to an external MongoDB instance, set `MONGODB_URI` in `.env`.

---

## 10. Environment Variables

Copy the provided `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default variables:
```env
PORT=5000
NODE_ENV=production
# MONGODB_URI=mongodb://localhost:27017/travelmate
```

---

## 11. Seed Instructions

On initial startup, the backend automatically detects whether `server/data/travellers.json` and `server/data/groups.json` exist. If not, it automatically seeds them from `data/problem-3/`.

To manually reset the runtime database back to pristine hackathon state at any time:

```bash
# In PowerShell / terminal:
npm run test
```
The test suite validates data consistency, and clean seed files can be re-copied anytime from `data/problem-3/` into `server/data/`.

---

## 12. Quick Start (1 or 2 Commands)

### Single-Command Start (Recommended):
Runs the backend server, which serves both the REST API and the compiled React production client at `http://localhost:5000`:

```bash
npm start
```

### Two-Command Development Start:
Terminal 1 (Backend API on port 5000):
```bash
npm run server
```

Terminal 2 (Vite Frontend on port 5173 with auto-proxy):
```bash
npm run client
```

Open **`http://localhost:5000`** (or `http://localhost:5173`) in your browser.

---

## 13. Matching Rules

A group is eligible if and only if **all 6 mandatory rules** pass:

| Rule | Requirement | Backend Implementation |
|---|---|---|
| **Rule 1: Same Destination** | Exactly matching destination city. | `seeker.destination === group.city` (case-insensitive) |
| **Rule 2: Date Overlap** | At least 2 overlapping nights. Checkout day is exclusive. | `overlapNights = daysBetween(max(gIn, sIn), min(gOut, sOut)) >= 2` |
| **Rule 3: Budget Compatibility** | Difference $\le 40\%$ of lower budget. | `abs(sBudget - gBudget) <= min(sBudget, gBudget) * 0.40` |
| **Rule 4: Shared Interests** | $\ge 2$ shared interests with **group owner**. | `intersection(seekerInterests, ownerInterests).length >= 2` |
| **Rule 5: Mutual Gender Preference** | Both sides must allow the other. | `(sPref === 'ANY' \|\| sGender === oGender) && (oPref === 'ANY' \|\| oGender === sGender)` |
| **Rule 6: Available Capacity** | Seats available and seeker is not already a member. | `group.members.length + 1 <= group.max_size && !group.members.includes(seekerId)` |

---

## 14. Ranking Formula

Only groups passing all 6 eligibility rules receive a compatibility ranking:

$$\text{Interest Similarity} = \frac{|\text{Shared Interests}|}{|\text{Unique Combined Interests}|}$$

$$\text{Date Similarity} = \frac{\text{Overlapping Nights}}{\max(\text{Group Nights}, \text{Seeker Nights})}$$

$$\text{Budget Similarity} = 1 - \min\left(1, \frac{|\text{Group Budget} - \text{Seeker Budget}|}{\max(\text{Group Budget}, \text{Seeker Budget})}\right)$$

$$\text{Compatibility Score} = \text{round}(0.40 \times \text{Interest Similarity} + 0.35 \times \text{Date Overlap} + 0.25 \times \text{Budget Similarity})$$

### Deterministic Tie-Breaking:
1. Higher Compatibility Score
2. More Shared Interests
3. More Overlapping Nights
4. Stable Group ID (`group_id` ascending)

---

## 15. API Endpoint Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check and status timestamp |
| `GET` | `/api/destinations` | Supported cities, countries, and date window |
| `GET` | `/api/interests` | All 16 catalog interest tags with labels |
| `POST` | `/api/travellers` | Register a new traveller profile |
| `GET` | `/api/travellers` | List all registered travellers |
| `GET` | `/api/travellers/:id` | Get single traveller profile details |
| `GET` | `/api/travellers/:id/groups` | Get groups owned or joined by traveller |
| `POST` | `/api/groups` | Create a new group trip post |
| `GET` | `/api/groups` | List all open trip groups with member counts |
| `GET` | `/api/groups/:id` | Get detailed group info, owner, and members |
| `POST` | `/api/matches` | Execute 6-rule matching engine with explainable scoring |
| `POST` | `/api/groups/:id/requests` | Submit a join request |
| `GET` | `/api/groups/:id/requests` | List join requests for a group |
| `PATCH` | `/api/requests/:id` | Approve or reject a join request (Owner only) |
| `GET` | `/api/groups/:id/hotels` | Search catalog hotels for group city and stay dates |
| `POST` | `/api/groups/:id/saved-hotels` | Save a hotel option to the group shortlist |
| `GET` | `/api/groups/:id/saved-hotels` | Retrieve group hotel shortlist with dynamic split |
| `DELETE` | `/api/groups/:id/saved-hotels/:savedId` | Remove a saved option or member preference |
| `POST` | `/api/groups/:id/bookings` | Finalize a mock booking for the group |
| `GET` | `/api/groups/:id/bookings` | Get group finalized mock booking |
| `GET` | `/api/groups/:id/messages` | Get group discussion board messages |
| `POST` | `/api/groups/:id/messages` | Post a message to group discussion board |

---

## 16. Hotel Pricing & Dynamic Cost-Splitting Logic

From the official catalog (`destinations.json`, `hotels.json`, `rooms.json`, `availability.json`):
1. **Stay Nights:** Array of dates from `check_in` up to `check_out - 1` (checkout day is exclusive).
2. **Occupancy & Rooms Required:**
   $$\text{Rooms Needed} = \left\lceil \frac{\text{Members Count}}{\text{Room Max Adults}} \right\rceil$$
3. **Availability Verification:**
   Every night of the stay must have $\ge \text{Rooms Needed}$ in `availability.json`. If even one night has insufficient rooms, the option is disqualified.
4. **Total Stay Price:**
   $$\text{Total Cost} = \text{Nightly Price} \times \text{Nights Count} \times \text{Rooms Needed}$$
5. **Dynamic Cost Split:**
   $$\text{Per-Person Share} = \left\lfloor \frac{\text{Total Cost}}{\text{Members Count}} \right\rfloor$$
   Any remainder paise/rupee is deterministically allocated to the first $N$ members so the sum of individual allocations equals $\text{Total Cost}$ exactly.

---

## 17. Automated Tests

Run the full test suite in under 200ms using Node.js:

```bash
npm test
```

### Test Coverage (16 Test Cases):
- **Unit Tests (`tests/matchingEngine.test.js`):**
  - Date overlap calculation and exclusive checkout
  - Same destination vs different destination
  - Date overlap boundary (exactly 2 nights vs 1 night)
  - Budget difference boundary (exactly 40% vs 40% + 1)
  - Shared interests boundary (exactly 2 vs 1)
  - Mutual gender preference compatibility
  - Group capacity and existing member exclusion
  - Hackathon Priya vs Sarah matching scenario ($65\%$ score)
  - Hotel stay nights calculation
  - Deterministic odd rupee remainder allocation
- **Integration Tests (`tests/integration.test.js`):**
  - Profile retrieval & seeding
  - Initial group state
  - Express interest and atomic creator approval
  - Dynamic cost splitting for Kyoto hotels after member joins
  - Data persistence surviving simulated restart
- **End-to-End Smoke Test (`tests/e2e.test.js`):**
  - Complete 10-step lifecycle from registration to mock booking finalization and persistence verification.

---

## 18. Four-Minute Demo Steps

### Step 1: Persona Switcher & Creator Flow (Scenario A: Sarah)
1. In the top navbar, select **Sarah Thomas (T-001)**.
2. Click **Create Group Trip**.
3. Create a Kyoto trip:
   - Destination: **Kyoto**
   - Dates: **April 10 to April 15, 2027**
   - Budget: **₹60,000**
   - Max Size: **3 travellers**
   - Itinerary: *"Fushimi Inari at sunrise, Nishiki Market street food crawl, Gion historic walk."*
4. Click **Publish Group Trip** $\rightarrow$ Redirects to group details page (`G-01`).

### Step 2: Seeker Flow & 6-Rule Matching (Scenario B: Priya)
1. In the top navbar, switch persona to **Priya Shah (T-002)**.
2. Navigate to **Find Groups**.
3. Click the preset shortcut **"⚡ Load Scenario B (Priya in Kyoto)"**:
   - Destination: **Kyoto**
   - Dates: **April 9 to April 16, 2027** (7 nights, 5 overlap)
   - Budget: **₹62,000** (Difference: ₹2,000 $\le 40\%$)
   - Interests: **Temples, Street food, Adventure** (2 shared: Temples, Street food)
   - Preference: **Female Only**
4. Click **Find Compatible Groups**.
5. Observe Sarah's group at the top with **65% Match** and the 6-rule checklist breakdown.
6. Click **View & Express Interest** $\rightarrow$ Click **Express Interest to Join**.

### Step 3: Owner Approval Flow
1. Switch back to **Sarah Thomas (T-001)** in the navbar.
2. The navbar displays a **"1 Pending"** badge.
3. Open Sarah's group $\rightarrow$ View Priya's pending join request with compatibility breakdown.
4. Click **Approve Member** $\rightarrow$ Priya is officially added to group members (2 of 3 seats filled).

### Step 4: Common Group Workspace, Cost Split & Mock Booking
1. Click **Open Common Workspace**.
2. Notice the **Dynamic Group Cost Split Banner**: Live member count is 2; hotel prices are divided equally by 2!
3. Scroll through real catalog hotels in Kyoto (e.g. *Gion Corner Hotel - Twin Room*).
4. Notice the pricing:
   - 1 Twin Room is needed for 2 adults $\rightarrow$ Total: **₹23,800** (₹4,760 $\times$ 5 nights $\times$ 1 room).
   - Equal cost per member: **₹11,900 each**.
5. Click **Save Option** $\rightarrow$ Saved to the **Group Hotel Shortlist** with *"Saved by: Sarah, Priya"*.
6. Click **Finalize Booking** $\rightarrow$ Review confirmation modal with member allocations.
7. Click **Confirm & Finalize Booking** $\rightarrow$ Booking is confirmed with reference `TM-XXXXXX` and permanently locked!
8. **Refresh the browser** $\rightarrow$ The finalized booking, group members, and shortlist remain 100% persisted!

### Step 5: Dynamic Judge Verification (Unseen Inputs)
- Enter an arbitrary traveller with custom dates, new budget, or different interests.
- Show instant rule evaluation: if destination is different, dates don't overlap, or budget exceeds 40%, the group is disqualified and the diagnostic breakdown explains why!

---

## 19. Implemented Features Summary

| Requirement | Status | Verification |
|---|---|---|
| **M1: Sign up flow & persistent profile** | Complete | Tested in `tests/integration.test.js` |
| **M2: Group owner post creation** | Complete | Tested in `tests/e2e.test.js` |
| **M3: Dynamic traveller search** | Complete | Tested with unseen & demo queries |
| **M4: Six matching rules & ranking** | Complete | 10 unit tests in `tests/matchingEngine.test.js` |
| **M5: Express interest & creator approvals** | Complete | Atomic approval in `atomicApproveRequest` |
| **M6: Common group page & hotel comparison** | Complete | Real catalog inventory & dynamic cost split |
| **Mock Booking confirmation & locking** | Complete | Generated `TM-XXXXXX` references |
| **Helpful No-Match Diagnostics** | Complete | Backend tallies failure reasons |
| **Collaborative Hotel Shortlist** | Complete | Multi-member attribution & preference tracking |
| **G1: Result filtering & sorting** | Complete | Interest and sort filters on search page |
| **G2: Member Profile Modals** | Complete | Clickable member profile cards |
| **S1: Group Discussion Chat** | Complete | Persistent in-workspace messaging board |

---

## 20. Known Limitations

- **Prototype Identity Management:** As permitted by the hackathon specifications, authentication uses active session persona switching rather than complex OAuth/email-password tokens.
- **Fixed Catalog Window:** Real hotel availability and inventory is scoped to the catalog window of April 1–20, 2027 in Tokyo, Kyoto, Osaka, Dubai, and Abu Dhabi.
- **Mock Booking Finalization:** In accordance with the hackathon rules, no real payment gateway or live hotel reservation API is called.
- **Zero AI / LLM Calls:** All matching, ranking, room calculation, and pricing are strictly pure mathematical algorithms running on the Node.js backend.
