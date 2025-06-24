# Design Language - Nexus Learning Platform

## Core Aesthetic - APPROVED FOR ALPHA
- **Theme**: Dark mode first ✅ **CORE REQUIREMENT**
- **Inspiration**: Dark background with glow effects (Glowy template)
- **Feel**: Clean, modern, game-like but not overwhelming

## Core Visualization - APPROVED FOR ALPHA
- **Graph Type**: Force-directed layout ✅ **CORE REQUIREMENT** 
- **Inspiration**: Obsidian-style organic clustering
- **Layout**: Natural, constellation-like connections

## Color System - APPROVED FOR ALPHA
- **Domain-based coloring**: Each subject gets distinct color ✅ **APPROVED**
- **Simple palette**: Clean, not overwhelming
- **Focus**: Single domain for Alpha (one seed network)

## Node States - APPROVED FOR ALPHA
- **Learned nodes**: **Glowing/lit up** ✅ **APPROVED** - "lighting up the Nexus" 
- **Unexplored**: Dim but visible ✅ **APPROVED**
- **Clicked/Focused**: Opens lesson view ✅ **CORE INTERACTION**

## Navigation - APPROVED FOR ALPHA
- **Zoom**: ✅ **HIGH PRIORITY** - Essential for graph exploration
- **Pan**: ✅ **HIGH PRIORITY** - Navigate around graph
- **Click to focus**: Opens node lesson view ✅ **CORE INTERACTION**

## Core Modes - APPROVED FOR ALPHA
- **Exploring mode**: Default graph view ✅ **APPROVED**
- **Learning mode**: Focused lesson view ✅ **APPROVED**

## User Flow - ALPHA SCOPE
- User sees lesson they learned and its connections
- Shows prerequisites and advancement paths
- Clean transition between explore → learn modes

---

## MOVED TO BETA
- **Node sizes**: Different sizes for complexity/importance
- **Mixed colors**: Interdisciplinary topic colors  
- **Animations**: Shooting star flows, flickering effects
- **Onboarding**: Structured first-time experience

## MOVED TO LAUNCH  
- **Free vs Premium**: Domain limits, feature restrictions

## HIGH PRIORITY TO FIGURE OUT (But not Epic 1)
- **"Next up" suggestions**: Visual treatment for multiple AI recommendations

## FUTURE FEATURES
- **Search**: Command+K search functionality
- **Filters**: Domain/topic filtering
- **Advanced animations**: Prerequisite flows, complex interactions
- **Social Learning Status**: See what friends are currently working on in real-time
  - *Vision*: "See that friend Nico is deep in Reinforcement Learning → Q-Learning right now"
  - *Effect*: Creates FOMO and motivation to "lock in" and study
  - *Implementation*: Real-time status, friend activity feed, competitive learning

## Technical Requirements - Alpha
- D3.js force-directed graph
- Dark theme implementation
- Zoom/pan functionality  
- Node click → lesson view transition
- Basic glow effects for learned nodes

## Design Philosophy
**Vision**: Create a modern, gamified learning platform that feels like an engaging game client rather than a boring educational tool.

**Core Principles**:
- **Modern/Gamified + Clean/Minimal**: Sophisticated visual effects used sparingly
- **Dark Mode First**: Primary focus on dark theme (light mode future consideration)
- **Game-Like Experience**: Should feel like League of Legends or Valorant client
- **Desktop-Only**: Optimized for desktop experience, no mobile considerations
- **Intuitive Navigation**: Users should be able to "click to play" without thinking

## Visual Effects Palette
### Glow & Pearlescent Effects
- **Philosophy**: "Nice in a limited way" - use sparingly for maximum impact
- **Primary Use Cases**: Node highlights, connection emphasis, focus states
- **Restraint**: Most interface should remain clean and minimal
- **Implementation**: Subtle glows for interactive elements, pearlescent accents for achievements/progress

### Focus & Attention System
- **Dimming**: Non-relevant nodes fade to background when user explores specific areas
- **Highlighting**: Active learning path remains bright and prominent
- **Progressive Disclosure**: Show information hierarchy through visual emphasis

## Node & Connection Design
> **⚠️ HIGH PRIORITY TODO**: Define visual design for all connection types and node states

### Connection Types (To Be Designed)
- **Prerequisite Connections**: [Design TBD - currently blue]
- **Advancement Connections**: [Design TBD - currently green] 
- **Lateral Connections**: [Design TBD - currently orange]

### Node States (To Be Designed)
- **Default State**: Base appearance
- **Hover State**: Interactive feedback
- **Active/Selected**: Currently focused node
- **Completed**: Learned/mastered content
- **Available**: Ready to learn
- **Locked**: Prerequisites not met

## Color Palette
> **⚠️ HIGH PRIORITY TODO**: Establish full color system beyond basic connection colors

### Current Placeholder Colors
- Prerequisite: Blue (#0066cc)
- Advancement: Green (#00cc66)
- Lateral: Orange (#cc6600)

### Future Color System Needs
- Primary brand colors
- Background/surface colors
- Text hierarchy colors
- Interactive state colors
- Success/warning/error states

## Typography
> **TODO**: Define text hierarchy and font system

## Spacing & Layout
> **TODO**: Define grid system and spacing scale

## Animation Principles
### Physics & Movement
- **Force-Directed Graphs**: Smooth, natural movement simulation
- **Transitions**: Meaningful animations that guide user attention
- **Performance**: Maintain 60fps on modern desktop browsers
- **Game-Like Feel**: Responsive interactions similar to game UIs

### Interaction Feedback
- **Hover States**: Immediate visual feedback
- **Click Response**: Clear indication of user actions
- **Loading States**: Engaging progress indicators

## Component Design System
> **TODO**: Define reusable UI components as they're built

## Inspiration & References
> **📋 ACTION ITEM FOR ANDREW**: Add design inspiration images and references

### Visual Reference Categories Needed
- [ ] Game client UIs (League, Valorant, etc.)
- [ ] Modern data visualization examples
- [ ] Glow/pearlescent effect examples
- [ ] Node network visualizations
- [ ] Dark mode educational interfaces

## Implementation Notes
### Technical Constraints
- **D3.js**: Working within D3 capabilities for Alpha version
- **Future Graphics**: Plan for custom graphics system in later versions
- **Browser Support**: Focus on modern browsers (Chrome, Firefox, Safari, Edge)

### Design Tokens
> **TODO**: Establish design token system for consistent implementation

## Future Considerations
- Light mode variant
- Desktop Electron app styling
- Advanced animation system beyond D3
- Accessibility considerations
- High contrast modes 

## Visual Ideas & Concepts
*Note: These are brainstormed ideas, not finalized designs. Direction and feasibility to be evaluated.*

### Node States & Visual Treatment
- **Learned nodes**: **Glowing/lit up** - "lighting up the Nexus" metaphor
- **Needs review**: **Flickering animation** - subtle pulse to draw attention
- **AI Suggestions**: **Moving glow around perimeter** - circular animation highlighting what's next
- **Available/suggested**: Soft highlight or pulse when prerequisites are met
- **Unexplored**: Dim but visible - no locks, exploration encouraged
- **Out-of-domain (free users)**: Heavily dimmed/transparent - visible but unfocused

### Node Sizing Concepts
- **Different sizes**: Nodes can vary in size to indicate importance, complexity, or other metrics
- **Size indicators could represent**: 
  - Topic complexity/depth
  - Amount of content available
  - Foundational importance to domain
  - User engagement/popularity

### Color System Concepts
- **Domain-based coloring**: Each subject gets distinct color (Math = Blue, Biology = Green)
- **Intersection topics**: **Mixed colors** for interdisciplinary subjects (Biotech = Teal from Blue+Green)
- **Intensity = Difficulty**: More saturated/brighter colors indicate harder topics
- **Limited palette**: Keep colorful but not overwhelming

### Animation Ideas
- **Prerequisite flow**: **"Shooting star" glow** that moves from prerequisite node to target node
  - *Direction*: Shows learning path direction
  - *Trigger*: Only when node is clicked (to avoid visual chaos)
  - *Purpose*: Makes prerequisite relationships intuitive

### User Experience Concepts
- **Initial view**: **Zoomed in** when client first opens
- **Free user limits**: Choose 2 domains, others become background/dimmed
- **No locked nodes**: Users can explore freely, prerequisites fuel curiosity rather than restrict

### Clustering & Layout
- **Natural clustering**: Similar to Obsidian graph - organic, constellation-like
- **Interconnected**: Everything connects somehow, showing knowledge relationships
- **Domain boundaries**: Visual grouping while maintaining cross-connections

### Technical Considerations
- Animations should be performant
- Visual effects need to scale with graph size
- Mobile responsiveness (future consideration) 