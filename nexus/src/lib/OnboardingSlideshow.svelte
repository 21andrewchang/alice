<script lang="ts">
import { guestProgress, currentLevel, setGoal, setCurrentPaper, completeLesson, onboardingComplete } from '$lib/onboarding';
import { fade, scale } from 'svelte/transition';
import { onMount } from 'svelte';
let step: 'goal' | 'paper' | 'lesson' | 'complete' = 'goal';
let goalInput = '';
let lessonAnswers: string[] = [];
let showSuccess = false;
let confettiLaunched = false;

const samplePapers = [
  { id: 'attention_is_all_you_need', title: 'Attention Is All You Need', difficulty: 'Beginner' },
  { id: 'dqn_atari', title: 'Playing Atari with Deep Reinforcement Learning', difficulty: 'Intermediate' },
  { id: 'cnn', title: 'ImageNet Classification with Deep Convolutional Neural Networks', difficulty: 'Beginner' }
];

const lessonQuestions = [
  {
    question: "What is the main innovation in the Transformer architecture?",
    options: ["Recurrent connections", "Attention mechanism", "Convolutional layers", "Backpropagation"],
    correct: 1
  },
  {
    question: "Which component allows the model to focus on different parts of the input?",
    options: ["Feed-forward network", "Multi-head attention", "Layer normalization", "Positional encoding"],
    correct: 1
  },
  {
    question: "What problem does positional encoding solve?",
    options: ["Vanishing gradients", "No sequence order information", "Overfitting", "Slow training"],
    correct: 1
  }
];

let progressBarWidth = 25;
$: {
  if (step === 'goal') progressBarWidth = 25;
  else if (step === 'paper') progressBarWidth = 50;
  else if (step === 'lesson') progressBarWidth = 75;
  else if (step === 'complete') progressBarWidth = 100;
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
    step = 'paper';
  }
}

function handlePaperSelect(paperId: string) {
  setCurrentPaper(paperId);
  step = 'lesson';
}

function handleLessonSubmit() {
  const correctAnswers = lessonAnswers.filter((answer, index) => 
    parseInt(answer) === lessonQuestions[index].correct
  ).length;
  if (correctAnswers >= 2) {
    completeLesson();
    showSuccess = true;
    launchConfetti();
    setTimeout(() => {
      showSuccess = false;
      step = 'complete';
    }, 2000);
  } else {
    lessonAnswers = [];
  }
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

<!-- Progress Bar (hidden during success animation) -->
<div class="w-full bg-gray-800 rounded-full h-2 mb-6">
  <div 
    class="bg-indigo-500 h-2 rounded-full transition-all duration-500"
    style="width: {progressBarWidth}%"
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
    {:else if step === 'paper'}
      <div class="w-full">
        <div class="text-center space-y-6 w-full" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
          <div>
            <h2 class="text-2xl font-bold mb-2">Perfect! Here's your first paper:</h2>
            <p class="opacity-80">Based on your goal: <span class="text-indigo-400">{$guestProgress.goal}</span></p>
          </div>
          <div class="space-y-4">
            {#each samplePapers as paper}
              <button
                class="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-indigo-500 transition text-left"
                on:click={() => handlePaperSelect(paper.id)}
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-semibold text-lg">{paper.title}</h3>
                    <p class="text-sm opacity-60 mt-1">Difficulty: {paper.difficulty}</p>
                  </div>
                  <span class="text-indigo-400">→</span>
                </div>
              </button>
            {/each}
          </div>
          <div class="text-center text-sm opacity-60">
            We'll guide you through this paper with interactive lessons and explanations.
          </div>
        </div>
      </div>
    {:else if step === 'lesson'}
      <div class="space-y-6 w-full" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
        {#if !showSuccess}
          <div class="text-center">
            <h2 class="text-2xl font-bold mb-2">Quick Knowledge Check</h2>
            <p class="opacity-80">Let's make sure you understand the key concepts!</p>
          </div>
          <div class="space-y-6">
            {#each lessonQuestions as question, index}
              <div class="space-y-3">
                <h3 class="font-semibold">{index + 1}. {question.question}</h3>
                <div class="space-y-2">
                  {#each question.options as option, optionIndex}
                    <label class="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={optionIndex}
                        bind:group={lessonAnswers[index]}
                        class="text-indigo-500"
                      />
                      <span>{option}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
          <button 
            class="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-lg font-semibold transition disabled:opacity-50"
            disabled={lessonAnswers.length < lessonQuestions.length}
            on:click={handleLessonSubmit}
          >
            Check Answers
          </button>
        {:else}
          <div class="fixed inset-0 flex items-center justify-center z-60"
            style="background: transparent; backdrop-filter: none;"
            in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}
            on:outroend={() => {
              showSuccess = false;
              step = 'complete';
            }}>
            <div class="text-center space-y-4" in:scale={{ duration: 300, start: 0.7 }} out:scale={{ duration: 200 }}>
              <div class="text-6xl">🎉</div>
              <h3 class="text-2xl font-bold">Great job!</h3>
              <p class="text-lg">+10 XP earned!</p>
            </div>
            {launchConfetti()}
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