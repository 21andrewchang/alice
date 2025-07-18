## MVP Alpha (≈July 1) - Theme: Foundations, building all core features but to a minimal level
### User Flow  
1. **First Visit (no login)**  
   - Land on “What do you want to learn?” (text input + suggestions)  
   - Select or type “Machine Learning”  
   - Pick subtopic (e.g. Computer Vision)  
   - Go straight to Lesson #1 (YouTube video + autogenerated summary + 3 next-step cards)  
2. **Post-Lesson**  
   - Quiz to get placement rank
   - After getting placement rank show modal: “Save your progress?” and share with friend 
   - “Create Account”  and save your progress. add this lesson to your knowledge graph
3. **Account Creation & Mini-Tutorial**  
   - If signup chosen: email/password or OAuth → onboarding overlay  
   - Walkthrough of:  
     1. Knowledge graph (pan/zoom)  
     2. Branching suggestions & difficulty labels  
     3. Profile ranks & progress bar  
   - Users first lesson will get saved to cookies
   - If they want to learn another lesson, we remind them of their previous one and say they need to make an account to save progress and proceed. 
   - Based on the first lesson and the quiz after the first lesson they get placed into a rank
   - Then they can immediately share with their friend so they can compare xD!
4. **Inviting Friends (MVP)**  
   - At end of tutorial: “Invite a friend to compare progress” → share link modal  
   Why the hell would you invite someone???
   - Ranked system
   - Show off your knowledge graph

### Core Features  
- Topic entry → subtopic → lesson flow  
- Embedded YouTube + autogenerated summary  
- Branching suggestions (reasonable vs. advanced)  
- Supabase: guest sessions & basic user accounts  
- Post-lesson signup trigger + mini-tutorial overlay  
