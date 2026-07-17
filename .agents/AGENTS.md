# Project-Scoped Rules: Status Quo

## 1. High-Performance React + D3 Integrations
- **Separate DOM Creation from Updates:** When building animated D3 charts, maps, or projections, do not clear and recreate DOM nodes on every frame (avoid `svg.selectAll('*').remove()`).
  - Implement a mount-once initialization function (`initGlobe`/`initMap`) to draw elements and register event listeners.
  - Implement an update function (`updateGlobe`/`updateMap`) that only adjusts path geometries (`d` attribute), translations, colors, and styles.
- **Reference Callbacks and Dynamic Sets via Refs:** When registering mouse event listeners (`mouseenter`, `click`) on large numbers of SVG paths, store callback props and active filter sets in React refs (`useRef`). Reference the `.current` property inside the listeners to avoid expensive re-binding operations when props change.

## 2. Robust Canvas & WebGL Layout Sizing
- **Explicit WebGL Resolutions:** Do not rely on mounting-time measurements (like `offsetWidth` or `getBoundingClientRect()`) for WebGL canvas buffer initializations when the canvas is inside a CSS Flexbox or Grid layout. This can cause the container to collapse to `0x0` pixels.
- **Responsive CSS Sizing:** Set WebGL render coordinates to a fixed fallback/prop value and use CSS width/height overrides (`width: 100% !important; height: 100% !important; max-width: SIZEpx;`) to handle responsive resizing safely.

## 3. Idempotent PostgreSQL Migrations
- **Safe Trigger Creation:** Always drop a trigger before creating it to prevent re-run errors.
  ```sql
  DROP TRIGGER IF EXISTS trigger_name ON table_name;
  CREATE TRIGGER trigger_name ...
  ```
- **Safe Publication Management:** Do not call `ALTER PUBLICATION ADD TABLE` directly on tables that might already be registered. Wrap it in a conditional PL/pgSQL `DO` block:
  ```sql
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr
      JOIN pg_publication p ON p.oid = pr.prpubid
      JOIN pg_class c ON c.oid = pr.prrelid
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'table_name'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
    END IF;
  END $$;
  ```
