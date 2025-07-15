<script lang="ts">
import { guestProgress, currentLevel, setGoal, setCurrentPaper, completeLesson, onboardingComplete } from '$lib/onboarding';
import { fade, scale } from 'svelte/transition';
import { onMount } from 'svelte';
import { tweened } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';
import placementQuestions from '../data/placement_questions.json';
import { writable, derived } from 'svelte/store';

let step: 'goal' | 'quiz' | 'complete' = 'goal';
let goalInput = '';
let showSuccess = false;
let confettiLaunched = false;
type PlacementQuestion = {
  id: number;
  question: string;
  choices: string[];
  answerIndex: number;
  elo: number;
  nodeId: string;
};
type QuizAnswer = {
  questionId: number;
  selected: number;
  correct: boolean;
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
  if ($step === 'complete') return 1 + ($quizLen || 6);
  return 0;
});

function getTotalSlides() {
  // 1 for interest, quizQuestions.length for quiz, 1 for complete
  return 1 + (quizQuestions.length || 6) + 1;
}

// Update progress bar whenever currentSlideIndex or quizQuestions.length changes
$: {
  const percent = (($currentSlideIndex + 1) / getTotalSlides()) * 100;
  progress.set(percent);
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
    // Select 6 questions, starting with the lowest Elo, then use Elo logic
    quizQuestions = selectQuizQuestions(placementQuestions, 6);
    currentQuizIndex = 0;
    userQuizAnswers = [];
    userElo = 1000;
    quizFeedback = null;
    quizInFeedback = false;
    quizProgress = 0;
    quizDone = false;
    quizRank = '';
    step = 'quiz';
  }
}

function selectQuizQuestions(allQuestions: PlacementQuestion[], count: number): PlacementQuestion[] {
  // Start with the lowest Elo question, then use Elo logic to pick next
  let selected = [];
  let usedIds = new Set();
  let currentElo = 1000;
  let lastCorrect = null;
  let streak = 0;
  let available = [...allQuestions];
  // Sort by Elo ascending for first pick
  available.sort((a, b) => a.elo - b.elo);
  let q = available[0];
  selected.push(q);
  usedIds.add(q.id);
  for (let i = 1; i < count; i++) {
    // Find questions not used yet
    let unused = allQuestions.filter(q => !usedIds.has(q.id));
    // Pick the one closest to currentElo
    unused.sort((a, b) => Math.abs(a.elo - currentElo) - Math.abs(b.elo - currentElo));
    let nextQ = unused[0];
    selected.push(nextQ);
    usedIds.add(nextQ.id);
    // For now, just update currentElo up/down by 100 for demo
    // (real logic: update after each answer)
    currentElo = nextQ.elo;
  }
  return selected;
}

let selectedQuizChoice: number | null = null;
let showQuizFeedback = false;

function handleQuizAnswer(idx: number) {
  if (quizInFeedback || userQuizAnswers.length > currentQuizIndex) return;
  selectedQuizChoice = idx;
}

function handleQuizContinue() {
  if (selectedQuizChoice === null || quizInFeedback) return;
  const q = quizQuestions[currentQuizIndex];
  const correct = selectedQuizChoice === q.answerIndex;
  userQuizAnswers.push({
    questionId: q.id,
    selected: selectedQuizChoice,
    correct
  });
  // Elo update (simple)
  const expected = 1 / (1 + Math.pow(10, (q.elo - userElo) / 400));
  const K = 32;
  userElo = Math.round(userElo + K * ((correct ? 1 : 0) - expected));
  quizFeedback = correct;
  quizInFeedback = true;
  showQuizFeedback = true;
  setTimeout(() => {
    quizInFeedback = false;
    quizFeedback = null;
    showQuizFeedback = false;
    selectedQuizChoice = null;
    if (currentQuizIndex < quizQuestions.length - 1) {
      currentQuizIndex++;
    } else {
      quizDone = true;
      quizRank = getQuizRank(userElo);
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
                  class="w-full h-full py-6 px-4 border text-left font-semibold transition shadow-md focus:outline-none"
                  class:bg-black={true}
                  class:border-white={selectedInterest === interest}
                  class:border-[#333]={selectedInterest !== interest}
                  class:text-white={true}
                  class:shadow-lg={selectedInterest === interest}
                  style="min-height: 120px; border-width: 1px; border-radius: 0;"
                  on:click={() => selectedInterest = interest}
                  type="button"
                >
                  <div class="text-lg font-bold mb-2">{interest.title}</div>
                  <div class="text-sm opacity-80">{interest.description}</div>
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
        <div class="text-center mb-4 text-lg font-semibold">
          Question {currentQuizIndex + 1} of {quizQuestions.length}
        </div>
        {#if !quizDone}
          <div class="mb-8">
            <div class="text-xl font-bold mb-4">{quizQuestions[currentQuizIndex].question}</div>
            <div class="grid grid-cols-1 gap-4 max-w-xl mx-auto">
              {#each quizQuestions[currentQuizIndex].choices as choice, idx}
                <button
                  class="w-full h-full py-6 px-4 border text-left font-semibold transition focus:outline-none"
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
                  <div class="text-base font-bold mb-1">{choice}</div>
                </button>
              {/each}
            </div>
            <button
              class="w-full mt-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-lg font-semibold transition disabled:opacity-50"
              disabled={selectedQuizChoice === null || quizInFeedback}
              on:click={handleQuizContinue}
            >
              {currentQuizIndex === quizQuestions.length - 1 ? 'Finish' : 'Continue'}
            </button>
          </div>
        {/if}
        {#if quizDone}
          <div class="text-center mt-8">
            <div class="text-2xl font-bold mb-2">Your estimated skill: {quizRank}</div>
            <div class="text-lg opacity-80">Elo: {userElo}</div>
          </div>
        {/if}
      </div>
    {:else if step === 'complete'}
      <div class="text-center space-y-6 w-full" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
        <div>
          <h2 class="text-3xl font-bold mb-4">Congratulations! 🚀</h2>
          <p class="text-lg opacity-80">
            You've completed your first lesson and earned <span class="text-indigo-400">{$guestProgress.xp} XP</span>!
          </p>
        </div>
        <div class="bg-gray-800 p-6 rounded-lg space-y-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-400">{$currentLevel}</div>
            <div class="text-sm opacity-60">{$guestProgress.xp} / {($currentLevel * 100)} XP</div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="font-semibold">Lessons Completed</div>
              <div class="opacity-60">{$guestProgress.lessonsCompleted}</div>
            </div>
            <div>
              <div class="font-semibold">Papers Read</div>
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