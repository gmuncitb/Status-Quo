# GMUNC's Status Quo

A premium, web-based real-time collaborative workspace for creating monthly geopolitical recaps and exporting high-resolution slides.

---

## 🌟 Overview for the Academics Team

**GMUNC's Status Quo** is a digital workspace designed to help the academics team collaborate, edit, and export monthly macro-recaps of world affairs. It features a responsive 3D globe and a card-based editor, allowing multiple users to edit the same map simultaneously.

Here is everything the team can do on the website:

### 1. Interactive Editions Dashboard
- **Month Selection:** Choose from a list of monthly editions (e.g., July 2026).
- **Auto-Edition Creation:** On the 1st of every month, a new edition is automatically created.
- **Status Badges:** Each edition card displays its status:
  - `● Live — Edit`: The current month's globe is open for editing.
  - `● Open for Editing`: A future or past month's globe is still editable.
  - `🔒 View Only`: Past editions that have been locked.

### 2. Google Docs-style Real-Time Collaboration
- **Simultaneous Editing:** Multiple team members can edit the same month's globe at the same time. Edits (text, colors, relationships, and callout layout offsets) sync across all open browsers in under ~200ms.
- **Sync Indicator:** A pulsing **`● Live`** badge in the top bar confirms you are connected and actively syncing with the cloud database.
- **Conflict Avoidance:** Typing and drag offsets use debounced writes to ensure edits merge smoothly without disrupting other active editors.

### 3. Interactive 3D Globe Workspace
- **Smooth Rotation:** Select from 7 key geopolitical regions (Asia, North America, South America, Europe, Middle East, Africa, Oceania) to automatically rotate and focus the globe on that region.
- **Drag-and-Drop Callout Boxes:** If a news callout box overlaps with another or covers an important part of the globe, simply **click and drag the callout box** directly on the globe to reposition it. Offsets are saved persistently.
- **Hover Syncing:** Hovering over a country on the globe automatically highlights its news card in the editor panel, and vice-versa.
- **Dynamic Country Flags:** Flags are rendered inline inside news headers, country lists, and callout boxes for visual clarity.

### 4. Canva-Style Color Customizer & News Sources
- **Preset Swatches:** Apply pre-curated grayscale and accent swatches to country fills.
- **Native Color Wheel (`+` Button):** Click the `+` button to open a native color spectrum picker.
- **HEX Input:** Copy/paste or manually type hexadecimal color codes directly to change the country fill.
- **News Source Tagging:** Assign publication sources (e.g., AP, BBC, Reuters) to a news card. The source's logo will automatically render on the country's globe callout box.
- **Automatic Clean-up:** Unselecting a country immediately resets its color and sources back to default.

### 5. Geopolitical Relationship Mapping ("Affected Relations")
- **Define Connections:** Connect the primary highlighted country with other affected countries globally.
- **Status Vectors:** Toggle the relationship status:
  - **`▲` (Green)**: Signifies improving relationships/cooperation.
  - **`▼` (Red)**: Signifies deteriorating relationships/friction.
- **Visual Connectors:** Centroids, leader curves, and border outlines update to visually map these relations.

### 6. Automated Editing Lock (The 5th-of-the-Month Rule)
- **Edit Windows:** Editions remain editable until the **5th day of the following month** (e.g., June's recap locks on July 5th).
- **Automatic Read-Only Lock:** Once locked, the workspace switches to a view-only mode for historical archiving:
  - Editing input fields are replaced with read-only summary panels.
  - Country additions, deletions, color customizers, and relationship toggles are hidden.
  - The globe and news summaries remain interactive and viewable.

### 7. 4K Transparent PNG Exporter
- **Instagram-Ready Exports:** Click the **`↓ Export PNG`** button to download a high-resolution (4K) image of the active region.
- **Transparent Background:** The exported image contains a transparent background, making it perfect for creative teams to overlay onto design templates or social media assets.

---

## 🚀 How to Use: Step-by-Step Guide

### Step 1: Open an Edition
Go to the homepage and select the month you want to work on. If it's a new month, it will be automatically created on your first visit.

### Step 2: Choose Your Region
Use the region bar at the bottom of the editor workspace to select the focus area (e.g., Asia).

### Step 3: Highlight a Country
- Click a country directly on the 3D globe, or select it from the **"Highlight Country"** list at the bottom of the editor panel.
- A card will appear in the editor, and a callout box will appear on the globe.

### Step 4: Add News, Sources, & Customize Colors
- Type the macro-recap summary in the text box.
- Tag up to two **News Sources** (e.g., AP, Reuters) for the recap.
- Use the Canva-style color picker on the card to set the country's highlight color.

### Step 5: Adjust Callout Positions
If callout boxes overlap, click and drag them to clear space. Your custom positions will immediately sync to everyone else on the team.

### Step 6: Map Relationships (Optional)
On any country card, use the **"Affected Relations"** dropdown to link other countries. Select whether the relation is improving (`▲`) or deteriorating (`▼`).

### Step 7: Export
Click **`↓ Export PNG`** in the top right to download a high-res, transparent 4K slide of your current region recap.

---

## 🛠 Developer Setup

### Installation
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/gmuncitb/Status-Quo.git
   cd Status-Quo
   npm install
   ```
2. Run the local development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000).

### Environment Configuration
Create a `.env.local` file in the root directory to enable cloud persistence:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
If credentials are not provided, the application automatically falls back to an in-memory session state (edits will not persist across browser reloads).

### Database Migration
If setting up a new Supabase backend, run the SQL schema defined in [supabase-migration.sql](supabase-migration.sql) inside the Supabase SQL Editor. This initializes the `globes` and `news_items` tables, configures automated Row-Level Security (RLS) policies, and registers realtime replication.

### Cloudflare Deployment
This project is configured to be deployed on **Cloudflare Workers** using the `@opennextjs/cloudflare` OpenNext adapter.

1. Authenticate with Cloudflare using Wrangler:
   ```bash
   npx wrangler login
   ```
2. Build and deploy directly to your Cloudflare Worker:
   ```bash
   npm run deploy
   ```
