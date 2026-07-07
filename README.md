# GMUNC's Status Quo

A web-based editor for creating monthly globe-based news publications for Instagram.

## Overview

**GMUNC's Status Quo** is a flagship digital publication providing a comprehensive, monthly macro-recap of critical world news. This tool allows the GMUNC Academics Team to:

- Highlight countries on an interactive orthographic globe
- Add color-coded news callout boxes with automatic collision avoidance
- Navigate between 7 world regions (Asia, North America, South America, Europe, Middle East, Africa, Oceania)
- Export each region's slide as a high-resolution PNG for Instagram

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Mapping:** [D3.js](https://d3js.org/) with orthographic globe projection
- **Database:** [Supabase](https://supabase.com/) (optional — works locally without it)
- **Export:** [html-to-image](https://github.com/bubkoo/html-to-image)
- **Styling:** Vanilla CSS (minimalist light mode, Helvetica, grayscale)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Installation

```bash
git clone https://github.com/your-org/status-quo.git
cd status-quo
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials if you want persistent cloud storage:

```bash
cp .env.example .env.local
```

The app works entirely locally without Supabase — data is stored in-memory per session.

## Supabase Setup

If you want persistent collaboration, create a Supabase project and run the following SQL in the Supabase SQL editor:

```sql
CREATE TABLE publications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publication_id UUID REFERENCES publications(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  country_code TEXT NOT NULL,
  news_text TEXT DEFAULT '',
  color_shade TEXT DEFAULT '#000000'
);
```

## Project Structure

```
status-quo/
├── public/                  # Static assets
├── src/
│   ├── app/
│   │   ├── globals.css      # Design system (grayscale, Helvetica)
│   │   ├── layout.js        # Root layout
│   │   └── page.js          # Main editor page
│   ├── components/
│   │   ├── Globe.js         # D3 orthographic globe with callouts
│   │   └── Sidebar.js       # Editor panel (region tabs, news cards)
│   └── lib/
│       ├── colors.js        # Callout color presets
│       ├── regions.js       # Region metadata & coordinates
│       └── supabase.js      # Supabase client
├── .env.example             # Environment variable template
├── .gitignore
├── README.md
├── package.json
└── next.config.mjs
```

## Usage

1. Select a **region** from the tabs in the sidebar
2. **Add countries** using the dropdown
3. Write **news summaries** in each card
4. Choose a **shade** for each callout
5. Click **Export Globe as PNG** to download the slide

## License

Private — GMUNC Internal Use
