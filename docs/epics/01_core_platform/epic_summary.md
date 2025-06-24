# Epic 1: Basic Graph Visualization - FOCUSED SCOPE

**Timeline**: 3-4 days (Week 1)  
**Priority**: P0 - Critical Path

## Epic Goal
Users can see and interact with a clean, dark-themed knowledge graph with basic glow effects. Foundation for explore → learn flow that will get the product to first users.

## Success Criteria - REFINED FOR ALPHA
- [ ] Force-directed graph displays CNN.json data smoothly
- [ ] Users can zoom, pan, and navigate intuitively  
- [ ] Dark theme with clean, game-like feel (not overwhelming)
- [ ] Learned nodes glow ("lighting up the Nexus")
- [ ] Domain-based color coding works
- [ ] Click node → opens lesson view (side-by-side with toggle options)
- [ ] Performance is smooth (60fps) on desktop browsers

## High Priority Tasks (Must Complete This Epic)
- [ ] **Design Language Document**: ✅ **COMPLETED** - Refined scope established
- [ ] **Data Structure Analysis**: Complete analysis during development
- [ ] **Core Interaction**: Click node to enter lesson view

## **CRITICAL FOR UPCOMING EPIC (Epic 2-3)**
- [ ] **Content Expansion System**: Easy way to add new nodes/lessons to the network
  - *Vision*: Drop files in local directory → runtime fetches → creates nodes automatically
  - *Future*: Upload to database system for production
  - *Priority*: **HIGH** - Essential for making Nexus actually useful beyond demo

## Stories

### Story 1: Core D3 Graph Setup (1-2 days)
**Goal**: Working force-directed graph with essential navigation

**User Story**: As a user, I want to see a knowledge graph that I can explore through zooming and panning so that I can navigate learning topics visually.

**Acceptance Criteria - FOCUSED**:
- [ ] D3 force-directed graph renders CNN.json data
- [ ] Smooth zoom in/out with mouse wheel
- [ ] Pan by clicking and dragging
- [ ] Basic dark theme styling  
- [ ] Nodes and edges clearly visible
- [ ] Good default positioning

**Technical Requirements**:
- Use existing nexus D3 implementation as starting point
- Essential zoom/pan only
- Dark theme colors
- Clean, minimal styling

### Story 2: Visual Polish & Core Interactions (1-2 days)  
**Goal**: Dark theme polish + learn mode interaction

**User Story**: As a user, I want learned nodes to glow and be able to click nodes to see lessons, so I feel like I'm lighting up my knowledge and can seamlessly transition between exploring and learning.

**Acceptance Criteria - FOCUSED**:
- [ ] **Learned nodes glow** - core "lighting up" effect
- [ ] **Domain-based colors** - single color scheme for one topic
- [ ] **Unexplored nodes dimmed** but still visible
- [ ] **Click node → lesson view** - side-by-side layout with view toggles:
  - Graph full screen (exploring mode)
  - Side-by-side (learning + context mode)  
  - Lesson full screen (focused learning mode)
- [ ] Clean, game-like dark aesthetic
- [ ] Hover states for interactivity

**Technical Requirements**:
- Implement glow effect for learned nodes
- Domain color coding
- Node click handler → lesson view
- Dark theme polish
- Basic hover feedback

## Technical Architecture - SIMPLIFIED
- **Platform**: Desktop web only
- **Framework**: SvelteKit + D3.js  
- **Visual**: Dark theme, single domain colors, basic glow
- **Interactions**: Zoom, pan, click → lesson
- **Data**: CNN.json (analyze during development)

## MOVED TO LATER EPICS
- **Node sizes** → Beta
- **Mixed colors** → Beta  
- **Animations** (shooting stars, etc.) → Beta
- **AI suggestions visual** → Epic 2-3
- **Search/filters** → Future
- **Free vs Premium** → Launch
- **Advanced clustering** → Beta
- **Onboarding** → Beta

## Dependencies
- Existing nexus D3 implementation
- CNN.json data structure
- Lesson view component (basic)

## Notes
- **Focus**: Get working product for founders first
- **Scope**: Essential functionality only - no complexity creep
- **Goal**: Foundation that works, looks good, proves concept
- **Philosophy**: Build → test → iterate, not perfect on first try 