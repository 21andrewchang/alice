# Cursor Rules for Nexus Development

## Project Overview
Building an AI-powered, curiosity-driven learning platform with knowledge graphs, gamification, and viral sharing. Target: 100+ paying users by Nov 1 for YC application.

## Development Philosophy
- **Move fast, don't break things**: Prioritize shipping over perfection
- **User-first**: Every feature must solve a real user problem
- **Data-driven**: Implement analytics to measure engagement and learning outcomes
- **Curiosity-driven**: Features should encourage exploration and discovery

## Workflow Requirements

### 1. Epic/Story Approval Process
**BEFORE starting any epic or story:**
1. Read the epic summary and user story completely
2. Present implementation plan to user for approval
3. Highlight any technical decisions or trade-offs
4. Get explicit "✅ APPROVED" before proceeding
5. If changes needed, revise plan and seek re-approval

### 2. Story Development Process
**For each story:**
1. **Story Consultation Phase** (see format below)
2. Break down into specific, testable tasks
3. Implement incrementally with frequent commits
4. Test thoroughly before marking complete
5. Demo functionality to user for approval
6. Only move to next story after user approval

### Story Consultation Process
**BEFORE starting any story implementation:**

#### Consultation Format
```markdown
# Story Consultation: [Story Name]

## Current Story Understanding
- **User Story**: [Restate the user story from story file]
- **Key Acceptance Criteria**: [List main requirements]
- **Estimated Timeline**: [X days]

## Context Gathering Questions
1. **User Experience**: What should the user journey feel like for this feature?
2. **Edge Cases**: What unusual scenarios should we handle?
3. **Integration Points**: How does this connect with existing features?
4. **Performance Requirements**: Any specific speed/responsiveness needs?
5. **Design Preferences**: Visual style, layout, or interaction preferences?
6. **Technical Constraints**: Any limitations or requirements to consider?
7. **Success Metrics**: How will we know this story is successful?

## Proposed Implementation Approach
- **Technical Strategy**: High-level approach to implementation
- **Key Components**: Main pieces that need to be built
- **Potential Challenges**: Risks or complex areas identified
- **Alternative Approaches**: Other ways we could solve this

## Story Optimization Recommendations
- **Scope Adjustments**: Suggestions to maximize value within timeline
- **Priority Features**: Must-have vs. nice-to-have elements
- **Future Considerations**: What might we want to expand later?
```

#### Consultation Goals
1. **Clarify Requirements**: Ensure complete understanding of what to build
2. **Optimize Scope**: Focus on highest-value features within time constraints
3. **Identify Risks**: Surface technical or UX challenges early
4. **Align Vision**: Make sure implementation matches user expectations
5. **Refine Story**: Update acceptance criteria if needed for better outcomes

#### Consultation Approval
- User reviews consultation document
- Discusses and refines approach as needed
- Approves with "✅ CONSULTATION APPROVED" 
- Story file updated if scope/requirements change
- Implementation begins only after approval

### 3. Technical Standards

#### Code Quality
- Use TypeScript for all new code
- Follow SvelteKit best practices
- Write clean, readable code with meaningful variable names
- Add comments for complex logic
- Implement error handling and loading states

#### Performance Requirements
- Graph interactions must be smooth (60fps)
- Page load times under 2 seconds
- Mobile-responsive design mandatory
- Progressive loading for large datasets

#### Testing Requirements
- Unit tests for core logic
- Integration tests for user flows
- Manual testing on Chrome, Firefox, Safari
- Mobile testing on iOS and Android

### 4. File Organization
```
nexus/
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable UI components
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── routes/
│   │   ├── api/            # API endpoints
│   │   └── (app)/          # Main application routes
│   └── app.html
├── static/                 # Static assets
└── docs/                   # Documentation and epics
```

### 5. Data Architecture

#### Node Structure (Extended)
```typescript
interface Node {
  id: number;
  label: string;
  description: string;
  difficulty: number; // 1-10
  content_type: 'youtube' | 'research_paper' | 'textbook';
  domain: string;
  group: string;
  why_important: string;
  cool_projects: string[];
}
```

#### Link Structure
```typescript
interface Link {
  source: number;
  target: number; 
  relation: 'prerequisite' | 'advance' | 'lateral';
}
```

### 6. API Design Principles
- RESTful endpoints with clear naming
- Consistent error handling with proper HTTP codes
- JSON responses with standard structure:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  meta?: {
    timestamp: string;
    requestId: string;
  }
}
```

### 7. UI/UX Guidelines
- **Design System**: Use Tailwind CSS consistently
- **Color Palette**: 
  - Primary: Blue (#3182bd) for prerequisites
  - Secondary: Green (#31a354) for advances  
  - Accent: Orange (#e6550d) for lateral connections
- **Typography**: System fonts for performance
- **Interactions**: Smooth animations, clear loading states
- **Accessibility**: WCAG 2.1 AA compliance

### 8. AI Agent Integration (Alice)
- Start with simple integration (manual triggers)
- Use existing LLM APIs (OpenAI/Anthropic)
- Implement rate limiting and cost controls
- Plan for async processing with user notifications
- Content validation before adding to graph

### 9. Analytics Requirements
Track key metrics:
- User engagement (time on platform, nodes explored)
- Learning paths (which routes users take through graph)
- Drop-off points (where users leave)
- Social sharing behavior
- Alice usage patterns

### 10. Security Guidelines
- Input validation on all user data
- SQL injection prevention (use parameterized queries)
- XSS protection (sanitize outputs)
- Rate limiting on API endpoints
- User authentication for personal features

## Approval Gates

### Epic Start Gate
Before starting any epic, conduct **Epic Consultation IN CHAT ONLY**:
- **Purpose**: Lock down epic scope, add/remove features, ensure alignment on goals
- **Process**: Ask clarifying questions about epic objectives, approach, priorities
- **High Priority TODO Notification**: Report ALL high priority todos found anywhere in docs
- **Outcome**: Clear go/no-go decision with any epic adjustments made directly to files
- **Requirement**: User must explicitly approve before epic implementation begins

### Story Consultation Gate ⭐ NEW
Before implementing any story, conduct consultation **IN CHAT ONLY** (no documents):
- **Purpose**: Lock down exactly what will be built, add/remove features, ensure alignment
- **Process**: Ask clarifying questions about scope, approach, design decisions
- **High Priority TODO Notification**: Report ALL high priority todos found anywhere in docs
- **Outcome**: Clear go/no-go decision with any epic/story adjustments made directly to files
- **Requirement**: User must explicitly approve before implementation begins

### Story Completion Gate
Before marking story complete:
1. **Demo** - Working functionality that can be tested
2. **Testing** - User validates core functionality works
3. **Approval** - Explicit approval before moving to next story

### Epic Completion Gate
Before starting next epic:
1. **Completion Summary Document** - What was built, testing areas, known issues
2. **Metrics Review** - Success criteria assessment
3. **Next Epic Generation** - Only after current epic fully approved

## High Priority TODO Tracking
- **Mandatory Reporting**: At start of every epic and story, scan all docs for high priority todos
- **Notification Format**: List all found high priority todos with file locations
- **Scope Impact**: High priority todos may affect story/epic scope and should be addressed

## Scope Limiting Rules
- **Epic Duration**: Maximum 4 days
- **Story Duration**: Maximum 2 days  
- **Stories Per Epic**: Maximum 3 stories
- **Scope Growth**: Split into new epics rather than extend timeline

## Development Principles
- **Incremental Delivery**: Each story must produce working functionality
- **User Validation**: No story complete without user testing
- **Fast Iteration**: Prefer smaller, tested increments over large features
- **Scope Discipline**: When in doubt, cut scope and move to next epic

## Communication Guidelines
- **Story consultations**: Always start each story with consultation document
- **Daily updates**: Progress summary with blockers/questions
- **Clear asks**: When needing user input, be specific about what's needed
- **Show, don't tell**: Use screenshots, demos, code snippets
- **Transparency**: Highlight risks, trade-offs, and technical debt
- **Questions first**: When unsure, ask before implementing

## Development Flow Summary
1. **Epic Start**: Present epic summary → Get approval → Begin first story
2. **Story Consultation**: Create consultation doc → Discuss approach → Get approval
3. **Story Development**: Implement → Test → Demo → Get completion approval
4. **Repeat**: Next story consultation → Development → Completion
5. **Epic Complete**: Write completion summary → Get epic approval → Generate next epic

## Error Handling Protocol
1. Immediately stop work if encountering blockers
2. Document the issue clearly with reproduction steps
3. Present 2-3 potential solutions with trade-offs
4. Get user guidance before proceeding
5. Update timeline if needed

## Timeline Pressure Management
Given the aggressive Nov 1 deadline:
- **Prioritize ruthlessly**: Focus on user-facing value
- **MVP mindset**: Ship minimum viable features, iterate later
- **Parallel development**: Work on independent features simultaneously when possible
- **Risk mitigation**: Identify and address critical path blockers early
- **Scope flexibility**: Be ready to adjust features based on progress

Remember: The goal is paying users by Nov 1, not perfect code. Ship early, get feedback, iterate based on real user behavior. 