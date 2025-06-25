# Nexus Color Scheme - Cyberpunk Theme

## Design Philosophy
- **Dark mode first** - all colors optimized for dark backgrounds
- **Cyberpunk aesthetic** - futuristic, high-tech visual identity
- **High contrast** - ensure accessibility and readability
- **Consistent usage** - always reference this doc for colors

## Component Colors

### **Backgrounds**
- `bg-primary`: `#0D0D0D` - **Neo Void Black** (primary background)
- `bg-secondary`: `#1A1A1A` - **Deep Shadow** (secondary background - very dark)
- `bg-surface`: `#A9AEED` - **Quantum Drift** (surface cards/panels)
- `bg-legacy-slate`: `#4D5072` - **Circuit Slate** (legacy color - borders/accents only)

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
- `topic-science`: `#64C5FF` - **Photon Wave** (Science)
- `topic-history`: `#FF8B48` - **Cyber Ember** (History)
- `topic-literature`: `#B585FF` - **Neon Orchid** (Literature)
- `topic-art`: `#FF007F` - **Neon Fuchsia** (Art)
- `topic-coding`: `#334089` - **Flux Indigo** (Coding)
- `topic-languages`: `#C7EC68` - **Acid Forest** (Languages)
- `topic-music`: `#3A3F59` - **Neon Grid Gray** (Music)
- `topic-design`: `#3AA4A8` - **Neon Cyan** (Design)

## Node States (For Graph Visualization)

### **Node Colors**
- `node-base`: `#4D5072` - **Circuit Slate** (unexplored nodes)
- `node-learned`: `#5B8DF2` - **Electric Pulse** (learned nodes - matches Math for CNN)
- `node-glow`: `#5B8DF2` - **Electric Pulse** (glow color - same as learned)
- `node-hover`: `#64C5FF` - **Photon Wave** (hover state)

### **Connection Colors**
- `link-all`: `#8B93C3` - **Data Stream** (all connections - light gray)

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
  --bg-primary: #0D0D0D;      /* Neo Void Black */
  --bg-secondary: #1A1A1A;    /* Deep Shadow */
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
  
  /* Nodes */
  --node-base: #4D5072;       /* Circuit Slate */
  --node-learned: #5B8DF2;    /* Electric Pulse */
  --node-glow: #5B8DF2;       /* Electric Pulse */
  
  /* Connections */
  --link-all: #8B93C3;        /* Data Stream - light gray */
}
```

### **Quick Reference**
- **Primary Action**: Electric Pulse (`#5B8DF2`)
- **Accent/Glow**: Neon Fuchsia (`#FF007F`) 
- **Background**: Neo Void Black (`#0D0D0D`)
- **Text**: Light Gray (`#B3B3B3`)
- **CNN Topic**: Electric Pulse (`#5B8DF2`) - Math domain
- **Connections**: Data Stream (`#8B93C3`) - light gray

## Notes
- Colors are subject to change as design evolves
- Topic colors can be reassigned based on content domains
- Glow effects should use accent color or match element color
- Maintain cyberpunk aesthetic across all components
- All connections now use light gray for subtlety 