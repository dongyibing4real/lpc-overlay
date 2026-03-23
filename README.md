# LPC - Wafer Overlay Distortion Data Mocker

Create believable wafer overlay scenes in minutes.

LPC is a browser-based visual sandbox for teams who need realistic wafer overlay behavior before production metrology pipelines exist. It lets you shape wafer-level drift, field-level distortion, and local per-field exceptions in one workspace, inspect the result side by side, and export demo-ready data for UI, algorithm, and workflow development.

> This project is a simulation and mock-data tool. It is not a fab-qualified metrology or process control system.

## Why teams use LPC

- Build and demo overlay workflows before live data is available
- Generate believable distortion scenes for algorithm and analytics experiments
- Tell a clearer story in stakeholder reviews with editable visual scenarios
- Move between global wafer behavior and local field exceptions without changing tools

## See It In Action

### Agent workflow

![LPC Overlay agent workflow showcase](./docs/readme/showcase-agent.gif)

### Local field editor

![LPC Overlay field edit showcase](./docs/readme/showcase-field-edit.gif)

### Global scene controls

![LPC Overlay wafer-level transform showcase](./docs/readme/showcase-wafer-transform.gif)

![LPC Overlay field-level transform showcase](./docs/readme/showcase-field-transform.gif)

## What makes it different

- Side-by-side `Actual Map` and `Distortion Vector Map` views
- Wafer-level, field-level, and local per-field editing in one workspace
- Smart-positioned floating `Field Editor` that users can drag and resize
- Built-in `Showcase` preset for demo-ready walkthroughs and presentations
- `Die` / `Field` granularity switching for different analysis modes
- Export to `CSV` and `JSON` with `mm` / `nm` unit selection
- Agent-assisted planning flow for scene changes and analysis

## Who This Is For

- Frontend and product teams building overlay tooling before backend integrations are ready
- Algorithm and analytics engineers who need repeatable, tunable overlay scenes
- Demo and solution engineering teams who need credible visual stories fast
- Internal tooling teams exploring inspection, review, or export workflows

## 30-Second Demo

1. Start the app with `npm run dev`
2. Click `Load Complex Demo`
3. Compare `Actual Map` and `Distortion Vector Map`
4. Select a field and shape it in the floating `Field Editor`
5. Open `LPC Agent` to draft a scene change plan
6. Export the result to `CSV` or `JSON`

## Typical Use Cases

- Front-end prototyping before live metrology data or backend APIs are ready
- Distortion algorithm experiments with repeatable synthetic patterns
- Product demos that need realistic vector maps and exportable mock data
- Stakeholder reviews where local field edits need to be visual and interactive
- Internal tooling explorations around overlay behavior and inspection workflows

## Feature Highlights

- Dual-map workspace with side-by-side `Actual Map` and `Distortion Vector Map` views.
- Built-in `Showcase` preset for loading a presentation-ready distortion scene in one click.
- Default showcase now emphasizes `die` granularity with stronger but readable vectors.
- Parametric wafer-level controls for translation, rotation, magnification, and asymmetric scaling.
- Independent field-level controls for intra-field distortion shaping.
- EPE simulation with `none`, `random`, and `systematic` modes.
- Interactive field selection directly on the wafer map.
- Floating `Field Edit` inspector with transform overrides and corner residual editing.
- Local field deformation that can create gentle, continuous warped patches instead of only rigid transforms.
- Smart placement for the field editor based on the selected field, with drag and resize support.
- `Die` and `Field` granularity switching from the main header.
- Lightweight live statistics overlay on the vector map.
- Mini wafer overview inset for fast spatial context.
- Zoom, relocate, and model reset controls directly on the map surface.
- Export to `CSV` and `JSON`.
- Export unit switching between `mm` and `nm`.
- Reset model state independently from view relocation.

## Demo Preset

The `Load Complex Demo` action in the left-side `Showcase` card is intended for instant demos and walkthroughs.

It applies:

- A light wafer-level trend so the whole wafer still feels coherent.
- A subtle field-level contribution for intra-field texture.
- A center-weighted patch of locally warped fields to create a more interesting shape signature.
- A stronger `die`-mode vector presentation so the right-side map reads clearly at a glance.

This gives you a good "default story" for the product without having to manually tune dozens of controls before every demo.

## What You Can Model

- Wafer translation: `Tx`, `Ty`
- Wafer rotation: `theta`
- Wafer magnification / asymmetry: `M`, `Sx`, `Sy`
- Field translation: `FTx`, `FTy`
- Field rotation: `Ftheta`
- Field magnification / asymmetry: `FM`, `FSx`, `FSy`
- Edge placement error patterns with reproducible random seeds or systematic direction
- Per-field manual exceptions through direct map editing
- Per-corner residual offsets for localized shape changes
- Center-weighted warped field patches for more organic local deformation
- Two complementary visualizations: geometry-first on the left, vector-first on the right

## Workflow

1. Expand `Wafer Layout` and define wafer diameter, edge exclusion, field size, die counts, and layout offsets.
2. For a quick presentation-ready state, click `Load Complex Demo`.
3. Tune wafer-level and field-level distortion parameters from the left control panel.
4. Switch between `Die` and `Field` granularity to inspect different aggregation levels.
5. Select a field on the `Actual Map` to open the floating `Field Edit` panel.
6. Apply local transform overrides or corner residuals for that specific field.
7. Review statistics, magnitude coloring, and vector direction on the `Distortion Vector Map`.
8. Export the generated dataset as `CSV` or `JSON` in either `mm` or `nm`.

## Using LPC Agent

1. Click the floating `LPC Agent` button to open the panel.
2. Open `Settings` once to choose the active model source and fill in the connection details.
3. Pick a prompt shortcut such as `Generate Plan`, then describe the scene change or analysis you want.
4. Review the draft plan, including the executable actions and any warnings.
5. Click `Apply` to update the scene, or `Undo` to revert the last applied agent change.

## Interaction Model

- `Actual Map` prioritizes editable geometry and local field inspection.
- `Distortion Vector Map` prioritizes displacement direction and magnitude readability.
- Field edit handles support translation, rotation, scale-like edits, and per-corner adjustment.
- Empty-space click clears the selected field.
- `Reset` restores the model state; `Relocate` resets only the camera/view.
- The floating editor opens near the selected field, can be dragged anywhere, resized, and reset to its default position.

## Export Format

Generated exports include:

| Column | Meaning |
| --- | --- |
| `x`, `y` | Entity absolute design position |
| `xw`, `yw` | Parent field center position |
| `xf`, `yf` | Local in-field position |
| `dx`, `dy` | Overlay displacement |

Notes:

- In `field` granularity, `xf` and `yf` are exported as `0`.
- Position columns are converted to the selected export unit.
- Displacement columns export in `mm` or `nm` depending on the selected unit.

## Stack

- React 19
- TypeScript
- Zustand + Immer for state management
- D3 for zoom / pan interaction
- Vite for development and build tooling

## Getting Started

### Requirements

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Create a production build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Generate showcase GIFs

```bash
npm run showcase:gifs
```

## Project Structure

```text
src/
  components/
    ControlPanel/        Layout, distortion, and export UI
    WaferMap/            Actual map, vector map, mini map, field/die rendering
    FieldEditPanel.tsx   Floating local field editor
    StatsSidebar.tsx     Live distortion summary overlay
  store/
    useWaferStore.ts     Central simulation and interaction state
  utils/
    distortionMath.ts    Core distortion calculations and stats
    fieldEditGeometry.ts Field-edit geometry transforms
    renderCorners.ts     Render-space field and die projection helpers
    waferGeometry.ts     Field and die grid generation
  types/
    wafer.ts             Shared domain model definitions
```

## Design Goals

- Make distortion behavior easy to explore visually.
- Keep local field edits first-class instead of treating them as edge cases.
- Preserve a fast feedback loop while editing sliders and handles.
- Provide a "show it now" demo mode for walkthroughs, stakeholder reviews, and onboarding.
- Export data in formats that are useful outside the UI.
- Stay simple enough for experimentation, demos, and future extension.

## Current Limitations

- The app is currently a front-end simulation tool with no backend persistence.
- Export is the primary data handoff flow; there is no polished import workflow in the current UI.
- A deeper long-term engineering follow-up is to fully decouple field-edit math semantics from exaggerated display semantics.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
