# AI/ML Seed Network Generation Prompt

## Context
Generate a comprehensive knowledge graph seed for an AI/ML learning platform called "Nexus". The platform follows these core principles:

**Learning Philosophy:**
- Skip boring basics until you NEED them (just-in-time learning)
- Learn through building cool projects and solving real problems
- Prerequisites should chain back to dead basics but timing matters more than order
- Foundations are super important, but context makes them stick better
- One amazing project teaches fundamentals better than 10 random assignments

**Content Sources Priority:**
1. **YouTube Videos** (primary for most topics)
2. **Research Papers** (for advanced/bleeding-edge topics)
3. **Textbooks** (supplementary, high-quality references)

**Structure:**
- **Nodes**: Bite-sized learning materials (single concept/skill)
- **Groups**: Specific topics (e.g., "Reinforcement Learning", "Computer Vision")  
- **Domains**: Broader areas (e.g., "Machine Learning", "Deep Learning")

## Seed Topics to Include

### Core RL Path (User's Current Journey):
Agent, Reinforcement Learning, Deep Reinforcement Learning, Deep Learning, Markov Decision Process, Markov Property, Policy Based Methods, Value Based Methods, Value Function, Greedy Policy, Epsilon-Greedy Policy, State Value vs. Action Value, Deep Neural Networks, Value-based vs. Policy-based learning, Proximal Policy Optimization (PPO), Q Learning, Monte Carlo vs. Temporal Difference Learning, Expected Cumulative Reward, State Space, Action Space, Rewards, Environment, Procedural Animation

### Prerequisites to Chain Back To:
- Python Programming Basics
- NumPy/Mathematical Operations  
- Linear Algebra Fundamentals
- Probability & Statistics
- Calculus (Derivatives/Gradients)
- Matrix Operations
- Basic Programming Concepts

### Adjacent ML Areas (Breadth):
- Computer Vision fundamentals
- Natural Language Processing basics
- Neural Network architectures
- Training/Optimization concepts
- Data preprocessing

## Output Format

Generate a JSON structure matching your current nexus format with additional metadata:

```json
{
  "nodes": [
    {
      "id": 0,
      "label": "Node Name", 
      "description": "1-2 sentence description of what this teaches",
      "difficulty": 1-10,
      "content_type": "youtube|research_paper|textbook",
      "domain": "Machine Learning|Deep Learning|Computer Vision|etc",
      "group": "Reinforcement Learning|Neural Networks|etc", 
      "why_important": "Why someone would want to learn this concept",
      "cool_projects": ["Specific project ideas that use this concept"]
    }
  ],
  "links": [
    { "source": 1, "target": 0, "relation": "prerequisite" },
    { "source": 0, "target": 2, "relation": "advance" },
    { "source": 3, "target": 0, "relation": "lateral" }
  ]
}
```

**Relations:**
- `"prerequisite"`: Source must be learned before target
- `"advance"`: Target builds directly on source 
- `"lateral"`: Related concepts that connect across domains

## Key Requirements

1. **Create natural learning paths** where advanced topics clearly need their prerequisites
2. **Include "gateway" projects** that make boring fundamentals exciting
3. **Map bleeding-edge research** (like "Attention is All You Need" for transformers)
4. **Show cross-domain connections** (how RL connects to computer vision, etc.)
5. **Start with basics but make them RELEVANT** to the cool stuff users want to build

## Example Gateway Projects to Reference
- Building a game AI (makes RL exciting)
- Creating art with GANs (makes deep learning visual)
- Building a chatbot (makes NLP practical)
- Stock prediction (makes time series relevant)

Generate a comprehensive seed network that would take someone from absolute beginner to implementing research papers, while maintaining excitement and relevance throughout the journey. 