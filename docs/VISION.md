SUMMARY OF DISCUSSION
We’re building a self-directed learning platform that hand-curates YouTube lessons, generates personalized transcript-based summaries via “Alice,” quizzes users on each lesson, then uses quiz performance to recommend the next videos (forward, backward, lateral). Users dive in immediately, select or type an interest, watch a lesson, take a 5-question quiz (3 concept, 2 application), then see tailored suggestions. Progress is saved when they create an account. A zoomable graph view lets them explore every lesson and its connections. Social features will let users display their knowledge graph and earn ranks.

IMPORTANT NOTES (with user quotes)
- “the core problem we want to solve is that the education system sucks. self studying is way more effective and tends to give people much better results. the problem is, theres so much information online and not a lot of guidance.”
- “our first version will be youtube videos that we hand collect. in the future, we will make a bot ‘Alice’ that will look for material online for you real time and generate the next ‘lesson’. quizzes will be generated to assess your skill level”
- “5 questions? 3 concept 2 application?”
- “there is no real passing threshold. just how well you do will determine the next step. going back and reviewing SHOULD BE considered perfectly normal. its not a bad thing. you can literally go back, review, and jump right back in. there shouldnt be a ‘fail’”
- “we will get the transcript and use Alice to summarize. summary will be personalized to each user and use their graph to add in analogies based on what theyve already learned in that graph.”
- “interactive graph of everything available. literally everything. you can zoom in to get more detailed and see specific lessons. zoom out and nodes get grouped into topics. zoom out even more and topics get grouped into categories.”
- “ranks and have people be able to show off their rank and also their graph of knowledge as a visual. the deeper they go into the rabbit hole for certain topics, the higher their rank”

FEATURE LIST
- Interest input & static suggestions
- Hand-collected YouTube lesson player
- Transcript-based, personalized summaries via Alice
- Quiz module (5 multiple-choice questions per lesson)
- Next-up recommendations (3 videos labeled Forward/Lateral/Backward)
- Account creation flow & progress tracking
- Zoomable graph view of all lessons
- Social sharing & ranking of knowledge graph
- Conversational quiz engine (Alice-driven chat)

RELEASE TIMELINE V0

Alpha (Core Loop)
- Freeform interest input & popular topic suggestions (Stick to ML?)
- Hand-collected YouTube lessons stored in simple DB (connected to eachother in a graph)
- Personalized transcript summaries via Alice (using your knowledge graph)
- Quiz after lesson
- Next-up recommendations (3 videos)
- Basic account signup & progress saving
- Basic zoomable graph view

Beta (Social & Personalization)
- Shareable knowledge graph & user ranks
- Alice-driven conversational quizzes
- **Expanded recommendation logic (lateral/forward/backward mix)**
- UI polish on lesson and graph screens
- Notifications & basic community features

Launch (Monetization & Polish)
- Free vs. paid tiers with feature gating
   - talk to alice to get verified and verify your rank
- Full Alice automation for real-time lesson discovery
- Complete UX/UI polish across all screens
- User analytics dashboard
- Marketing rollout & version-1 launch campaign


V1 - Alice
Alice will automatically expand the knowledge graph
Users can request new topics that dont exist and Alice will take care of it
- connecting the new lesson to existing nodes
