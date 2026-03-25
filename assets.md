# Scythe Tutor Asset Checklist

Use this checklist to track all visual/audio assets needed for the full tutoring experience.

## Base Rules
- Preferred image format:
  - UI/icons: `.svg`
  - Board/scenario illustrations: `.webp` (fallback `.png`)
- Naming style:
  - lowercase kebab-case
  - no spaces
  - include category prefix
- Versioning pattern:
  - `<asset-name>-v1.ext`, `<asset-name>-v2.ext`

## Storage Location
Put all assets under `public/assets/` using these folders:
- `public/assets/boards/`
- `public/assets/icons/`
- `public/assets/tokens/`
- `public/assets/ui/`
- `public/assets/audio/`

## Tutor Walkthrough Assets
- [ ] Tutorial hero banner art
  - Suggested name: `public/assets/ui/tutorial-hero-v1.webp`
- [ ] Progress rail background texture
  - Suggested name: `public/assets/ui/progress-rail-texture-v1.webp`
- [ ] Stage badge icons (subtype, single, multiplayer, speed)
  - Suggested names:
    - `public/assets/icons/stage-subtype-v1.svg`
    - `public/assets/icons/stage-single-player-v1.svg`
    - `public/assets/icons/stage-multiplayer-v1.svg`
    - `public/assets/icons/stage-speed-v1.svg`
- [ ] Mastered check icon set (normal, highlighted)
  - Suggested names:
    - `public/assets/icons/mastery-check-v1.svg`
    - `public/assets/icons/mastery-check-glow-v1.svg`

## Scoring Content Assets
- [ ] Popularity track visual (0-18 with tier markers)
  - Suggested name: `public/assets/boards/popularity-track-v1.webp`
- [ ] Stars scoring example board slice
  - Suggested name: `public/assets/boards/example-stars-v1.webp`
- [ ] Territories scoring example board slice
  - Suggested name: `public/assets/boards/example-territories-v1.webp`
- [ ] Resources scoring example board slice
  - Suggested name: `public/assets/boards/example-resources-v1.webp`
- [ ] Structure bonus tile reference sheet
  - Suggested name: `public/assets/boards/structure-bonus-reference-v1.webp`
- [ ] Factory territory rule callout image
  - Suggested name: `public/assets/boards/factory-territory-rule-v1.webp`
- [ ] Tiebreaker priority infographic
  - Suggested name: `public/assets/ui/tiebreaker-priority-v1.webp`

## Token/Marker Assets
- [ ] Star token icon
  - Suggested name: `public/assets/tokens/star-token-v1.svg`
- [ ] Territory marker icon
  - Suggested name: `public/assets/tokens/territory-token-v1.svg`
- [ ] Resource pair icon
  - Suggested name: `public/assets/tokens/resource-pair-v1.svg`
- [ ] Coin icon
  - Suggested name: `public/assets/tokens/coin-token-v1.svg`
- [ ] Structure bonus icon set (6 types)
  - Suggested names:
    - `public/assets/tokens/bonus-tunnel-adjacent-v1.svg`
    - `public/assets/tokens/bonus-lake-adjacent-v1.svg`
    - `public/assets/tokens/bonus-encounter-adjacent-v1.svg`
    - `public/assets/tokens/bonus-on-tunnel-v1.svg`
    - `public/assets/tokens/bonus-row-structures-v1.svg`
    - `public/assets/tokens/bonus-on-tundra-farm-v1.svg`

## Multiplayer and Speed Mode Assets
- [ ] 2-player scenario board image set (at least 3)
  - Suggested names:
    - `public/assets/boards/scenario-2p-01-v1.webp`
    - `public/assets/boards/scenario-2p-02-v1.webp`
    - `public/assets/boards/scenario-2p-03-v1.webp`
- [ ] 3-player scenario board image set (at least 3)
  - Suggested names:
    - `public/assets/boards/scenario-3p-01-v1.webp`
    - `public/assets/boards/scenario-3p-02-v1.webp`
    - `public/assets/boards/scenario-3p-03-v1.webp`
- [ ] 4-player scenario board image set (at least 3)
  - Suggested names:
    - `public/assets/boards/scenario-4p-01-v1.webp`
    - `public/assets/boards/scenario-4p-02-v1.webp`
    - `public/assets/boards/scenario-4p-03-v1.webp`
- [ ] 5-player scenario board image set (at least 3)
  - Suggested names:
    - `public/assets/boards/scenario-5p-01-v1.webp`
    - `public/assets/boards/scenario-5p-02-v1.webp`
    - `public/assets/boards/scenario-5p-03-v1.webp`
- [ ] Speed mode timer ring art
  - Suggested name: `public/assets/ui/speed-timer-ring-v1.svg`
- [ ] Speed mode completion banner
  - Suggested name: `public/assets/ui/speed-clear-banner-v1.webp`

## Audio (Optional)
- [ ] Correct-answer cue
  - Suggested name: `public/assets/audio/correct-chime-v1.mp3`
- [ ] Incorrect-answer cue
  - Suggested name: `public/assets/audio/incorrect-buzz-v1.mp3`
- [ ] Stage complete cue
  - Suggested name: `public/assets/audio/stage-complete-v1.mp3`
- [ ] Speed mode countdown tick
  - Suggested name: `public/assets/audio/speed-countdown-tick-v1.mp3`

## Notes
- Add source/license notes for every external asset in this file under a future `Asset Sources` section.
- Prefer creating original assets to avoid licensing issues.
