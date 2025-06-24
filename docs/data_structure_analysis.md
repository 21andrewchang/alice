# Data Structure Analysis & Requirements

> **⚠️ HIGH PRIORITY**: Must complete during Epic 1 to finalize data format before building more features

## Current CNN.json Analysis
**What we have now**:
```json
{
  "nodes": [
    {
      "id": "convolution",
      "label": "Convolution",
      "difficulty": 3,
      "content_type": "youtube",
      "domain": "cv",
      "group": "core",
      "why_important": "Foundation of how computers see patterns",
      "cool_projects": ["Image filters", "Edge detection"]
    }
  ],
  "links": [
    {
      "source": "convolution",
      "target": "filtering", 
      "type": "prerequisite"
    }
  ]
}
```

## Brainstorming Questions

### Content & Learning Path Questions
1. **Content Sources**: Do we need multiple content types per node? (YouTube + research paper + textbook?)
2. **Learning Outcomes**: Should we track specific skills/knowledge gained from each node?
3. **Time Estimates**: Do we need estimated learning time per node?
4. **Prerequisites Complexity**: Are simple prerequisite links enough, or do we need conditional prerequisites?
5. **Difficulty Granularity**: Is 1-10 scale sufficient, or do we need sub-categories (conceptual difficulty vs. mathematical difficulty)?

### User Progress & Personalization
6. **Progress Tracking**: What states do we need? (not_started, in_progress, completed, mastered?)
7. **User Preferences**: Should nodes store user-specific data (bookmarked, liked, difficulty rating)?
8. **Learning Paths**: Do we need predefined learning sequences vs. just graph exploration?
9. **Adaptive Content**: Should difficulty or content recommendations change based on user performance?

### Content Management & Quality
10. **Content Quality**: Do we need ratings, reviews, or quality scores for content?
11. **Multiple Sources**: If a node has multiple content options, how do we rank/organize them?
12. **Content Updates**: How do we handle when YouTube videos get deleted or content becomes outdated?
13. **Content Creator Info**: Do we need to track who created/curated each node's content?

### Relationship Complexity
14. **Relationship Strength**: Do prerequisite connections need strength/importance ratings?
15. **Bidirectional Info**: Should relationships store different data for each direction?
16. **Conditional Relationships**: Do we need "nice to have" vs. "required" prerequisites?
17. **Learning Order**: Within lateral connections, is there a suggested order?

### Metadata & Organization
18. **Categories/Tags**: Is the current domain/group system sufficient for organization?
19. **Search Keywords**: Do we need additional searchable metadata beyond labels?
20. **Visual Metadata**: Do we need custom colors, icons, or visual properties per node?
21. **Content Length**: Should we track if content is a 5-min video vs. 2-hour course?

### Alice Integration & AI Features
22. **AI Metadata**: What data does Alice need to make good recommendations?
23. **Dynamic Content**: Should Alice be able to create temporary nodes for custom explanations?
24. **Learning Analytics**: What data do we need to improve AI recommendations over time?
25. **Content Gaps**: How should Alice identify and fill missing prerequisite knowledge?

### Scalability & Performance
26. **Node Limits**: How many nodes should we optimize for per domain?
27. **Relationship Density**: What's the max number of connections per node we should support?
28. **Loading Strategy**: Do we need to partition large graphs for performance?
29. **Caching**: What data should be precomputed vs. calculated on-demand?

### Business & Growth Features
30. **Premium Content**: Do we need to flag paid vs. free content?
31. **User-Generated Content**: Should users be able to suggest or create nodes?
32. **Collaborative Features**: Do we need social features in the data model?
33. **Analytics Tracking**: What business metrics should we embed in the data structure?

## Analysis Framework

### Must-Have (Core MVP)
- [ ] Basic node identification and labeling
- [ ] Relationship types (prerequisite, advancement, lateral)
- [ ] Content linking (at minimum one source per node)
- [ ] Basic organization (domain/group or similar)

### Should-Have (Alpha/Beta)
- [ ] User progress tracking integration
- [ ] Difficulty and time estimates
- [ ] Content quality indicators
- [ ] Search and discovery metadata

### Could-Have (Future Versions)
- [ ] Advanced relationship properties
- [ ] Multiple content sources per node
- [ ] User-generated content support
- [ ] Advanced AI integration metadata

## Questions for Andrew
1. **Content Strategy**: Are you planning to curate all content initially, or want user submissions from the start?
2. **Alice Scope**: How sophisticated should Alice's content recommendations be in Alpha vs. later?
3. **User Data**: How much user-specific data should live in the graph vs. separate user profiles?
4. **Growth Strategy**: Will you be adding new domains frequently, or focusing on depth in AI/ML first?

## Next Steps
- [ ] Review current CNN.json against these questions
- [ ] Identify critical data missing for Epic 1-3 features
- [ ] Design minimal viable data structure for Alpha
- [ ] Plan migration strategy if structure needs to change 