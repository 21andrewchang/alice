# Nexus Color Scheme - Cyberpunk Theme

## Design Philosophy
- **Dark mode first** - all colors optimized for dark backgrounds
- **Cyberpunk aesthetic** - futuristic, high-tech visual identity
- **High contrast** - ensure accessibility and readability
- **Consistent usage** - always reference this doc for colors

## Component Colors

### **Backgrounds**
- `bg-primary`: `#111111` - **Void Black** (primary background - safest dark color)
- `bg-secondary`: `#0F0F0F` - **Deep Shadow** (secondary background - darker)
- `bg-surface`: `#A9AEED` - **Quantum Drift** (surface cards/panels)
- `bg-legacy-slate`: `#4D5072` - **Circuit Slate** (legacy color - borders/accents only)

⚠️ **Browser Limitation**: Colors darker than `#111111` (such as `#0A0A0A`, `#0C0C0C`, `#0F0F0F`) cause visual striping artifacts in some browsers. Always use `#111111` as the darkest background color.

### **Buttons**
- `btn-primary`: `#5B8DF2` - **Electric Pulse** (primary button default)
- `btn-primary-hover`: `#64C5FF` - **Photon Wave** (primary button hover)
- `btn-secondary`: `#8060D0` - **Violet Circuit** (secondary button)
- `btn-secondary-hover`: `#B585FF` - **Neon Orchid** (secondary button hover)

### **Interactive Elements**
- `accent-glow`: `#FF007F` - **Neon Fuchsia** (accent highlights/glow)
- `link-color`: `#A1FFE7` - **Cyan Haze** (link/interactive text)

### **Typography**
- `text-primary`: `#B3B3B3` - **Light Gray** (primary text)
- `text-secondary`: `#3A3F59` - **Neon Grid Gray** (secondary text)

### **UI Elements**
- `border-color`: `#333333` - **Dark Gray** (borders & dividers)

### **Status Colors**
- `error-color`: `#B3335E` - **Augment Crimson** (error/destructive action)
- `warning-color`: `#FF8B48` - **Cyber Ember** (warning/caution)
- `success-color`: `#C7EC68` - **Acid Forest** (success/confirmation)
- `info-color`: `#3AA4A8` - **Neon Cyan** (info/tips)

## Topic-Tag Color Coding

### **Subject Domains**
- `topic-math`: `#5B8DF2` - **Electric Pulse** (Math)
- `topic-tech`: `#73DACA` - **Cyber Teal** (Tech)
- `topic-sciences`: `#BA6FFF` - **Cosmic Violet** (Sciences)
- `topic-humanities`: `#F88951` - **Sunset Amber** (Humanities)
- `topic-art`: `#F7768E` - **Rose Bloom** (Art)
- `topic-research-papers`: `#BFCAF3` - **Papyrus** (Research Papers)

## Node States (For Graph Visualization)

### **Node Colors**
- `node-base`: `#3A5A8F` - **Desaturated Electric Pulse** (unexplored nodes - less saturated)
- `node-learned`: `#5B8DF2` - **Electric Pulse** (learned nodes with glow)
- `node-glow`: `#5B8DF2` - **Electric Pulse** (glow color - same as learned)
- `node-hover`: `#64C5FF` - **Photon Wave** (hover state)
- `node-paper`: `#BFCAF3` - **Papyrus** (research paper nodes)

### **Connection Colors**
- `link-all`: `#333333` - **Dark Gray** (all connections - ALWAYS use this color)

## Usage Guidelines

### **Do's**
- ✅ Always reference colors by name from this document
- ✅ Use topic colors for domain-specific elements
- ✅ Maintain high contrast ratios for accessibility
- ✅ Use consistent glow colors matching node states
- ✅ Apply cyberpunk aesthetic consistently

### **Don'ts**
- ❌ Never use arbitrary hex codes in components
- ❌ Don't mix with other color schemes
- ❌ Avoid low contrast combinations
- ❌ Don't use more than 3-4 colors in a single component

## Implementation Reference

### **CSS Custom Properties**
```css
:root {
  /* Backgrounds */
  --bg-primary: #111111;      /* Void Black - safest dark */
  --bg-secondary: #0F0F0F;    /* Deep Shadow */
  --bg-surface: #A9AEED;      /* Quantum Drift */
  --bg-legacy-slate: #4D5072; /* Circuit Slate - borders only */
  
  /* Buttons */
  --btn-primary: #5B8DF2;     /* Electric Pulse */
  --btn-primary-hover: #64C5FF; /* Photon Wave */
  --btn-secondary: #8060D0;   /* Violet Circuit */
  --btn-secondary-hover: #B585FF; /* Neon Orchid */
  
  /* Interactive */
  --accent-glow: #FF007F;     /* Neon Fuchsia */
  --link-color: #A1FFE7;      /* Cyan Haze */
  
  /* Text */
  --text-primary: #B3B3B3;    /* Light Gray */
  --text-secondary: #3A3F59;  /* Neon Grid Gray */
  
  /* Status */
  --error-color: #B3335E;     /* Augment Crimson */
  --warning-color: #FF8B48;   /* Cyber Ember */
  --success-color: #C7EC68;   /* Acid Forest */
  --info-color: #3AA4A8;      /* Neon Cyan */
  
  /* Topic Domains */
  --topic-math: #5B8DF2;      /* Electric Pulse */
  --topic-tech: #73DACA;      /* Cyber Teal */
  --topic-sciences: #BA6FFF;  /* Cosmic Violet */
  --topic-humanities: #F88951; /* Sunset Amber */
  --topic-art: #F7768E;       /* Rose Bloom */
  --topic-research-papers: #BFCAF3; /* Papyrus */
  
  /* Nodes */
  --node-base: #3A5A8F;       /* Desaturated Electric Pulse for CNN */
  --node-learned: #5B8DF2;    /* Electric Pulse full saturation */
  --node-glow: #5B8DF2;       /* Electric Pulse */
  --node-paper: #BFCAF3;      /* Papyrus */
  
  /* Connections */
  --link-all: #333333;        /* Dark Gray - ALWAYS use for edges */
}
```

### **Quick Reference**
- **Primary Action**: Electric Pulse (`#5B8DF2`)
- **Accent/Glow**: Neon Fuchsia (`#FF007F`) 
- **Background**: Void Black (`#111111`)
- **Text**: Light Gray (`#B3B3B3`)
- **Math**: Electric Pulse (`#5B8DF2`)
- **Tech**: Cyber Teal (`#73DACA`) 
- **Sciences**: Cosmic Violet (`#BA6FFF`)
- **Humanities**: Sunset Amber (`#F88951`)
- **Art**: Rose Bloom (`#F7768E`)
- **Research Papers**: Papyrus (`#BFCAF3`)
- **Connections**: Dark Gray (`#333333`) - ALWAYS use for edges

## Notes
- Colors are subject to change as design evolves
- Topic colors can be reassigned based on content domains
- Glow effects should use accent color or match element color
- Maintain cyberpunk aesthetic across all components
- **CRITICAL**: All edges/connections must ALWAYS use `#333333` - never change this 