<script lang="ts">
import { guestProgress, currentLevel, setGoal, setCurrentPaper, completeLesson, onboardingComplete } from '$lib/onboarding';
import { fade, scale } from 'svelte/transition';
import { onMount } from 'svelte';
import { tweened } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';
import placementQuestions from '../data/placement_questions.json';
const placementQuestionsTyped: PlacementQuestion[] = (placementQuestions as any[]).map((q: any) => ({ ...q, bracket: q.bracket as Bracket }));
import { writable, derived } from 'svelte/store';
import mergedGraph from '../merged_graph.json';

export let onSetRecommendation;

let step: 'goal' | 'quiz' | 'complete' = 'goal';
let goalInput = '';
let showSuccess = false;
let confettiLaunched = false;
type PlacementQuestion = {
  id: number;
  question: string;
  choices: string[];
  answerIndex: number;
  bracket: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  nodeId: string;
};
type QuizAnswer = {
  questionId: number;
  selected: number | null;
  correct: boolean | null;
  bracket: Bracket;
  skipped?: boolean;
};

let quizQuestions: PlacementQuestion[] = [];
let currentQuizIndex = 0;
let userQuizAnswers: QuizAnswer[] = [];
let userElo = 1000;
let quizFeedback: boolean | null = null;
let quizInFeedback = false;
let quizProgress = 0;
let quizDone = false;
let quizRank = '';

let lastSkipped = false;

// Quiz config
const QUIZ_LENGTH = 10;
const TOTAL_SLIDES = 1 + QUIZ_LENGTH + 1; // 1 for goal, 10 for quiz, 1 for complete

// State for adaptive Elo
let streak = 0;
let lastCorrect: boolean | null = null;
let kFactor = 32;
let difficultyTrend: 'up' | 'down' | 'flat' | null = null;
let lastElo = 1000;
let lastQuestionElo: number | null = null;

// Bracket system
const BRACKETS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
type Bracket = typeof BRACKETS[number];
let currentBracket: Bracket = 'intermediate';
let finalBracket: Bracket = 'beginner';

function getBracketIndex(bracket: Bracket) {
  return BRACKETS.indexOf(bracket);
}

function promoteBracket(bracket: Bracket): Bracket {
  const idx = getBracketIndex(bracket);
  return BRACKETS[Math.min(idx + 1, BRACKETS.length - 1)];
}
function demoteBracket(bracket: Bracket): Bracket {
  const idx = getBracketIndex(bracket);
  return BRACKETS[Math.max(idx - 1, 0)];
}


// --- Progress Bar State ---
const progress = tweened(0, { duration: 400, easing: cubicOut });

// Create writable stores for step, currentQuizIndex, and quizQuestionsLength
const stepStore = writable<'goal' | 'quiz' | 'complete'>(step);
const quizIndexStore = writable(currentQuizIndex);
const quizLenStore = writable(quizQuestions.length);

// Keep stores in sync with local variables
$: stepStore.set(step);
$: quizIndexStore.set(currentQuizIndex);
$: quizLenStore.set(quizQuestions.length);

// Derived store for current slide index
const currentSlideIndex = derived([
  stepStore,
  quizIndexStore,
  quizLenStore
], ([$step, $currentQuizIndex, $quizLen]) => {
  if ($step === 'goal') return 0;
  if ($step === 'quiz') return 1 + $currentQuizIndex;
  if ($step === 'complete') return TOTAL_SLIDES - 1; // last slide
  return 0;
});

function getTotalSlides() {
  return TOTAL_SLIDES;
}

// Update progress bar whenever currentSlideIndex or quizQuestions.length changes
$: {
  const percent = ((($currentSlideIndex + 1) / TOTAL_SLIDES) * 100);
  progress.set(percent);
}

// --- Static Recommendations by Placement Level ---
const staticRecommendations = {
  beginner: 1, // nodeId
  intermediate: 3,
  advanced: 0,
  expert: 0
};

type StaticRecommendation = { nodeId: number; label: string; description: string } | null;

let staticRecommendation: any = null;
let staticRecommendationExplanation: string = '';

const staticRecommendationExplanations = {
  beginner: 'Start here to build a strong foundation in neural networks, the building blocks of all modern AI.',
  intermediate: 'You have the basics down! Next, learn how models map input sequences to outputs—core to translation, summarization, and more.',
  advanced: 'You’re ready for the cutting edge! Dive straight into the Transformer paper that revolutionized deep learning.',
  expert: 'You’re ready for the cutting edge! Dive straight into the Transformer paper that revolutionized deep learning.'
};

$: if (step === 'complete') {
  const nodeId = staticRecommendations[finalBracket] ?? staticRecommendations['beginner'];
  const node = mergedGraph.nodes.find((n: any) => n.id === nodeId);
  staticRecommendation = node;
  staticRecommendationExplanation = staticRecommendationExplanations[finalBracket] ?? staticRecommendationExplanations['beginner'];
  if (typeof localStorage !== 'undefined' && staticRecommendation) {
    localStorage.setItem('onboardingRecommendedNode', JSON.stringify(staticRecommendation));
  }
  if (onSetRecommendation && staticRecommendation) {
    onSetRecommendation(staticRecommendation);
  }
}

let interests = [
  {
    title: 'Transformers & Sequence Modeling',
    description: 'Learn how modern AI models understand and generate sequences, from language to time series.'
  },
  {
    title: 'Monocular SLAM & Autonomous Navigation',
    description: 'Explore how robots and drones map and navigate the world using a single camera.'
  },
  {
    title: 'Deep Reinforcement Learning',
    description: 'Master the algorithms that let agents learn to solve complex tasks through trial and error.'
  }
];
let selectedInterest: { title: string; description: string } | null = null;
let selectedSeedPaper = '';

function handleGoalContinue() {
  if (selectedInterest) {
    setGoal(selectedInterest.title);
    quizQuestions = [];
    currentQuizIndex = 0;
    userQuizAnswers = [];
    userElo = 1000;
    quizFeedback = null;
    quizInFeedback = false;
    quizProgress = 0;
    quizDone = false;
    quizRank = '';
    streak = 0;
    lastCorrect = null;
    kFactor = 32;
    difficultyTrend = null;
    lastElo = 1000;
    lastQuestionElo = null;
    currentBracket = 'beginner'; // Start with beginner questions
    // --- Randomize first question from starting bracket (beginner) ---
    const bracketQuestions = placementQuestionsTyped.filter(q => q.bracket === currentBracket);
    if (bracketQuestions.length > 0) {
      const firstQ = bracketQuestions[Math.floor(Math.random() * bracketQuestions.length)];
      quizQuestions.push(firstQ);
    } else if (placementQuestionsTyped.length > 0) {
      // fallback: pick any question if none in bracket
      const firstQ = placementQuestionsTyped[Math.floor(Math.random() * placementQuestionsTyped.length)];
      quizQuestions.push(firstQ);
    }
    lastQuestionElo = null;
    step = 'quiz';
  }
}

// Remove selectQuizQuestions and selectNextQuestion functions entirely, as they are not used in the bracket-based system and reference q.elo.

function updateKFactor(numAnswered: number, streak: number): number {
  // Decay K as more questions are answered or streak grows
  return Math.max(8, 32 - Math.floor(numAnswered / 2) - Math.min(Math.abs(streak), 8));
}

let selectedQuizChoice: number | null = null;
let showQuizFeedback = false;

function handleQuizAnswer(idx: number) {
  if (quizInFeedback || userQuizAnswers.length > currentQuizIndex) return;
  selectedQuizChoice = idx;
}

function handleQuizSkip() {
  if (quizInFeedback) return;
  const q = quizQuestions[currentQuizIndex];
  userQuizAnswers.push({
    questionId: q.id,
    selected: null,
    correct: null,
    bracket: q.bracket,
    skipped: true
  });
  finalBracket = currentBracket;
  // Skipping slightly decreases streak, but not as much as a wrong answer
  streak = (streak || 0) - 1;
  lastCorrect = false;
  lastSkipped = true;
  // Bracket logic (demote if 2+ skips in a row)
  const prevBracket = currentBracket;
  currentBracket = selectNextBracket(streak, lastCorrect, currentBracket);
  difficultyTrend = currentBracket === prevBracket ? 'flat' : (getBracketIndex(currentBracket) > getBracketIndex(prevBracket) ? 'up' : 'down');
  quizFeedback = null;
  quizInFeedback = true;
  showQuizFeedback = true;
  setTimeout(() => {
    quizInFeedback = false;
    quizFeedback = null;
    showQuizFeedback = false;
    selectedQuizChoice = null;
    if (currentQuizIndex < QUIZ_LENGTH - 1) {
      // Select next question from current bracket
      const usedIds = new Set(quizQuestions.map(q => q.id));
      const nextQ = selectNextQuestionBracketed(placementQuestionsTyped, usedIds, currentBracket);
      if (nextQ) quizQuestions.push(nextQ);
      currentQuizIndex++;
    } else {
      quizDone = true;
      finalBracket = currentBracket;
      step = 'complete';
    }
  }, 500);
}

function selectNextBracket(streak: number, lastCorrect: boolean | null, currentBracket: Bracket): Bracket {
  if (streak >= 2 && lastCorrect === true) {
    return promoteBracket(currentBracket);
  } else if (streak <= -2 && lastCorrect === false) {
    return demoteBracket(currentBracket);
  } else {
    return currentBracket;
  }
}

function selectNextQuestionBracketed(allQuestions: PlacementQuestion[], usedIds: Set<number>, bracket: Bracket): PlacementQuestion | null {
  let unused = allQuestions.filter(q => q.bracket === (bracket as Bracket) && !usedIds.has(q.id));
  if (unused.length === 0) {
    // fallback: pick from any bracket not used
    unused = allQuestions.filter(q => !usedIds.has(q.id));
    if (unused.length === 0) return null;
  }
  // Pick randomly from bracket
  return unused[Math.floor(Math.random() * unused.length)];
}

function handleQuizContinue() {
  if (selectedQuizChoice === null || quizInFeedback) return;
  const q = quizQuestions[currentQuizIndex];
  const correct = selectedQuizChoice === q.answerIndex;
  userQuizAnswers.push({
    questionId: q.id,
    selected: selectedQuizChoice,
    correct,
    bracket: q.bracket
  });
  finalBracket = currentBracket;
  // Streak logic
  if (lastCorrect === null || lastCorrect === correct) {
    streak = (streak || 0) + (correct ? 1 : -1);
  } else {
    streak = correct ? 1 : -1;
  }
  lastCorrect = correct;
  // Bracket logic
  const prevBracket = currentBracket;
  currentBracket = selectNextBracket(streak, lastCorrect, currentBracket);
  difficultyTrend = currentBracket === prevBracket ? 'flat' : (getBracketIndex(currentBracket) > getBracketIndex(prevBracket) ? 'up' : 'down');
  quizFeedback = correct;
  quizInFeedback = true;
  showQuizFeedback = true;
  setTimeout(() => {
    quizInFeedback = false;
    quizFeedback = null;
    showQuizFeedback = false;
    selectedQuizChoice = null;
    if (currentQuizIndex < QUIZ_LENGTH - 1) {
      // Select next question from current bracket
      const usedIds = new Set(quizQuestions.map(q => q.id));
      const nextQ = selectNextQuestionBracketed(placementQuestionsTyped, usedIds, currentBracket);
      if (nextQ) quizQuestions.push(nextQ);
      currentQuizIndex++;
    } else {
      quizDone = true;
      finalBracket = currentBracket;
      step = 'complete';
    }
  }, 1000);
}

function getQuizRank(elo: number) {
  if (elo < 950) return 'Beginner';
  if (elo < 1150) return 'Intermediate';
  return 'Advanced';
}

function finishOnboarding() {
  onboardingComplete.set(true);
}

function launchConfetti() {
  if (typeof window !== 'undefined') {
    import('canvas-confetti').then((module) => {
      const confetti = module.default;
      // Use a custom canvas with high z-index
      let confettiCanvas = document.getElementById('onboarding-confetti-canvas');
      if (!confettiCanvas) {
        confettiCanvas = document.createElement('canvas');
        confettiCanvas.id = 'onboarding-confetti-canvas';
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.inset = '0';
        confettiCanvas.style.zIndex = '2000';
        confettiCanvas.style.pointerEvents = 'none';
        document.body.appendChild(confettiCanvas);
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        // @ts-ignore
        canvas: confettiCanvas
      });
    });
  }
}
</script>

<!-- Progress Bar (tweened, always visible at top) -->
<div class="w-full bg-gray-800 rounded-full h-2 mb-8">
  <div
    class="bg-indigo-500 h-2 rounded-full"
    style="width: {$progress}%"
  ></div>
</div>

<div class="relative" style="min-height: 420px;">
  {#key step}
    {#if step === 'goal'}
      <div class="w-full">
        <div class="flex flex-col min-h-[480px] justify-between w-full">
          <div>
            <h2 class="text-3xl font-bold mb-2 mt-2">Welcome to Alice! 🎉</h2>
            <p class="text-lg opacity-80 mb-8">
              What are you most interested in mastering?
            </p>
            <div class="grid grid-cols-2 gap-6 mb-8">
              {#each interests as interest, i}
                <button
                  class="w-full h-full py-6 px-4 border text-left transition shadow-md focus:outline-none flex flex-col items-start justify-start"
                  class:bg-black={true}
                  class:border-white={selectedInterest === interest}
                  class:border-[#333]={selectedInterest !== interest}
                  class:text-white={true}
                  class:shadow-lg={selectedInterest === interest}
                  style="min-height: 140px; border-width: 1px; border-radius: 0; height: 100%;"
                  on:click={() => selectedInterest = interest}
                  type="button"
                >
                  <div class="flex flex-col flex-1 w-full justify-start items-start">
                    <div class="text-lg mb-2">{interest.title}</div>
                    <div class="text-sm opacity-80">{interest.description}</div>
                  </div>
                </button>
              {/each}
              {#if interests.length % 2 !== 0}
                <div></div> <!-- Empty cell for 2x2 grid if only 3 options -->
              {/if}
            </div>
          </div>
          <div class="mt-8">
            <button
              class="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-lg font-semibold transition disabled:opacity-50"
              disabled={!selectedInterest}
              on:click={handleGoalContinue}
              style="margin-top: 32px;"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    {:else if step === 'quiz'}
      <div class="w-full">
        <!-- DEV/DEBUG VIEW: Show current and next question difficulty, streak, bracket, etc. -->
        <div class="fixed top-4 right-4 z-50 bg-black bg-opacity-80 text-xs p-3 rounded shadow border border-gray-700" style="min-width: 220px; max-width: 320px; color: #BFCAF3;">
          <div><strong>DEV VIEW</strong></div>
          <div>Current Q ID: {quizQuestions[currentQuizIndex]?.id}</div>
          <div>Current Topic: {quizQuestions[currentQuizIndex]?.nodeId}</div>
          <div>Current Difficulty: {quizQuestions[currentQuizIndex]?.bracket}</div>
          <div>Current Bracket: {currentBracket}</div>
          <div>Streak: {streak}</div>
          <div>Last Correct: {lastCorrect === null ? 'N/A' : lastCorrect ? '✔️' : '❌'}</div>
          <div>Questions Answered: {userQuizAnswers.length}</div>
          <div>Most Likely Next Difficulty: {
            (() => {
              // Predict next bracket based on streak and lastCorrect
              let predBracket = currentBracket;
              if (streak >= 2 && lastCorrect === true) predBracket = promoteBracket(currentBracket);
              else if (streak <= -2 && lastCorrect === false) predBracket = demoteBracket(currentBracket);
              return predBracket;
            })()
          }</div>
        </div>
        <!-- END DEV/DEBUG VIEW -->
        <div class="text-center mb-4 text-lg font-semibold">
          Question {currentQuizIndex + 1} of {QUIZ_LENGTH}
        </div>
        {#if !quizDone}
          <div class="mb-8">
            <div class="text-xl mb-4">{quizQuestions[currentQuizIndex].question}</div>
            <div class="grid grid-cols-1 gap-4 max-w-xl mx-auto">
              {#each quizQuestions[currentQuizIndex].choices as choice, idx}
                <button
                  class="w-full h-full py-6 px-4 border text-left transition focus:outline-none"
                  class:bg-black={true}
                  class:border-[#333]={selectedQuizChoice !== idx || showQuizFeedback}
                  class:border-white={selectedQuizChoice === idx && !showQuizFeedback}
                  class:bg-[#222]={selectedQuizChoice === idx && !showQuizFeedback}
                  class:text-white={true}
                  class:shadow-lg={selectedQuizChoice === idx}
                  class:bg-green-600={showQuizFeedback && selectedQuizChoice === idx && quizFeedback === true}
                  class:bg-red-600={showQuizFeedback && selectedQuizChoice === idx && quizFeedback === false}
                  style="min-height: 60px; border-width: 1px; border-radius: 0;"
                  disabled={userQuizAnswers.length > currentQuizIndex || quizInFeedback}
                  on:click={() => handleQuizAnswer(idx)}
                >
                  <div class="text-base mb-1">{choice}</div>
                </button>
              {/each}
            </div>
            <div class="flex gap-4 mt-8">
              <button
                class="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-lg font-semibold transition disabled:opacity-50"
                disabled={selectedQuizChoice === null || quizInFeedback}
                on:click={handleQuizContinue}
              >
                {currentQuizIndex === QUIZ_LENGTH - 1 ? 'Finish' : 'Continue'}
              </button>
              <button
                class="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-lg font-semibold transition disabled:opacity-50"
                disabled={quizInFeedback || userQuizAnswers.length > currentQuizIndex}
                on:click={handleQuizSkip}
              >
                Skip
              </button>
            </div>
          </div>
        {/if}
        {#if quizDone}
          <div class="text-center mt-8">
            <div class="text-2xl mb-2">Your Placement Level: {finalBracket.charAt(0).toUpperCase() + finalBracket.slice(1)}</div>
            <div class="mt-4 text-left max-w-md mx-auto">
              <strong>Questions by Difficulty:</strong>
              <ul>
                {#each BRACKETS as b}
                  <li>{b.charAt(0).toUpperCase() + b.slice(1)}: {userQuizAnswers.filter(a => a.bracket === b).length}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}
      </div>
    {:else if step === 'complete'}
      <div class="text-center space-y-6 w-full" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
        <div>
          <h2 class="text-3xl font-bold mb-4">Congratulations! 🚀</h2>
          <div class="text-2xl mb-2">Your Placement Level: {finalBracket.charAt(0).toUpperCase() + finalBracket.slice(1)}</div>
          <p class="text-lg opacity-80">
            You've completed your first lesson and earned <span class="text-indigo-400">{$guestProgress.xp} XP</span>!
          </p>
        </div>
        <!-- Static Recommendation Section -->
        {#if staticRecommendation}
          <div class="bg-indigo-900 bg-opacity-80 p-6 rounded-lg mt-6 text-left max-w-xl mx-auto">
            <div class="text-lg font-bold mb-2">Recommended Next Step</div>
            <div class="text-sm opacity-90 mb-4">
              {staticRecommendationExplanation}
            </div>
            <div class="text-xl text-indigo-300 mb-1">{staticRecommendation.label}</div>
          </div>
        {/if}
        <!-- End Static Recommendation Section -->
        <div class="bg-gray-800 p-6 rounded-lg space-y-4">
          <div class="text-center">
            <div class="text-2xl text-indigo-400">{$currentLevel}</div>
            <div class="text-sm opacity-60">{$guestProgress.xp} / {($currentLevel * 100)} XP</div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div>Lessons Completed</div>
              <div class="opacity-60">{$guestProgress.lessonsCompleted}</div>
            </div>
            <div>
              <div>Papers Read</div>
              <div class="opacity-60">{$guestProgress.papersCompleted}</div>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <p class="text-sm opacity-60">
            Ready to dive deeper? Create an account to save your progress and unlock more papers.
          </p>
          <button 
            class="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-lg font-semibold transition"
            on:click={finishOnboarding}
          >
            Continue to App
          </button>
          <button
            class="w-full py-3 mt-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-lg font-semibold transition border border-gray-600"
            on:click={() => window.location.href = '/login'}
          >
            Create account
          </button>
        </div>
      </div>
    {/if}
  {/key}
</div> 