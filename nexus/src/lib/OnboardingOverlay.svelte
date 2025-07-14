<script lang="ts">
  import { 
    onboardingComplete, 
    guestProgress, 
    currentOnboardingStep, 
    currentLevel,
    shouldShowOnboarding,
    setGoal, 
    setCurrentPaper, 
    completeLesson, 
    completePaper,
    resetOnboarding,
    skipToStep,
    type OnboardingStep 
  } from '$lib/onboarding';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { fade, scale, slide } from 'svelte/transition';
  let confettiLaunched = false;
  
  let goalInput = '';
  let selectedPaper = '';
  let lessonAnswers: string[] = [];
  let showSuccess = false;
  let showDevControls = false;

  // Sample papers for onboarding (in real app, this would come from Supabase)
  const samplePapers = [
    { id: 'attention_is_all_you_need', title: 'Attention Is All You Need', difficulty: 'Beginner' },
    { id: 'dqn_atari', title: 'Playing Atari with Deep Reinforcement Learning', difficulty: 'Intermediate' },
    { id: 'cnn', title: 'ImageNet Classification with Deep Convolutional Neural Networks', difficulty: 'Beginner' }
  ];

  // Sample lesson questions
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
  $currentOnboardingStep;
  $: {
    if ($currentOnboardingStep === 'goal') progressBarWidth = 25;
    else if ($currentOnboardingStep === 'paper') progressBarWidth = 50;
    else if ($currentOnboardingStep === 'lesson') progressBarWidth = 75;
  }
  // Animate to 100% only when entering 'complete' step
  $: if ($currentOnboardingStep === 'complete') {
    setTimeout(() => { progressBarWidth = 100; }, 100);
  }

  function handleGoalSubmit() {
    if (goalInput.trim()) {
      setGoal(goalInput.trim());
      currentOnboardingStep.set('paper');
    }
  }

  function handlePaperSelect(paperId: string) {
    setCurrentPaper(paperId);
    currentOnboardingStep.set('lesson');
  }

  function handleLessonSubmit() {
    const correctAnswers = lessonAnswers.filter((answer, index) => 
      parseInt(answer) === lessonQuestions[index].correct
    ).length;
    
    if (correctAnswers >= 2) { // Pass with 2/3 correct
      completeLesson();
      showSuccess = true;
      setTimeout(() => {
        showSuccess = false;
        currentOnboardingStep.set('complete');
      }, 2000);
    } else {
      // Reset answers for retry
      lessonAnswers = [];
    }
  }

  function finishOnboarding() {
    onboardingComplete.set(true);
  }

  function toggleDevControls() {
    showDevControls = !showDevControls;
  }

  function launchConfetti() {
    if (!confettiLaunched && typeof window !== 'undefined') {
      confettiLaunched = true;
      import('canvas-confetti').then((module) => {
        const confetti = module.default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      });
    }
  }

  // Dev mode keyboard shortcuts
  onMount(() => {
    if (import.meta.env.DEV) {
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'd') {
          e.preventDefault();
          toggleDevControls();
        }
      };
      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }
  });

  let show: boolean | null = null;

  onMount(() => {
    const unsub = shouldShowOnboarding.subscribe(val => {
      show = val;
    });
    return unsub;
  });
</script>

{#if show === true}
  <div class="fixed inset-0 flex items-center justify-center z-50 text-white p-4 onboarding-bg">
    <div class="max-w-2xl w-full space-y-6 onboarding-panel">
      
      <!-- Dev Controls -->
      {#if import.meta.env.DEV}
        <div class="absolute top-4 right-4">
          <button 
            class="text-xs bg-gray-800 px-2 py-1 rounded opacity-50 hover:opacity-100"
            on:click={toggleDevControls}
          >
            Ctrl+D: Dev Controls
          </button>
        </div>
        
        {#if showDevControls}
          <div class="absolute top-12 right-4 bg-gray-900 p-4 rounded-lg space-y-2 text-sm">
            <div class="font-bold">Dev Controls:</div>
            <button class="block w-full text-left hover:bg-gray-800 px-2 py-1 rounded" on:click={() => skipToStep('goal')}>
              → Goal Step
            </button>
            <button class="block w-full text-left hover:bg-gray-800 px-2 py-1 rounded" on:click={() => skipToStep('paper')}>
              → Paper Step
            </button>
            <button class="block w-full text-left hover:bg-gray-800 px-2 py-1 rounded" on:click={() => skipToStep('lesson')}>
              → Lesson Step
            </button>
            <button class="block w-full text-left hover:bg-gray-800 px-2 py-1 rounded" on:click={() => skipToStep('complete')}>
              → Complete Step
            </button>
            <button class="block w-full text-left hover:bg-gray-800 px-2 py-1 rounded" on:click={resetOnboarding}>
              Reset Onboarding
            </button>
          </div>
        {/if}
      {/if}

      <!-- Progress Bar (hidden during success animation) -->
      {#if !showSuccess}
        <div class="w-full bg-gray-800 rounded-full h-2">
          <div 
            class="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style="width: {progressBarWidth}%"
          ></div>
        </div>
      {/if}

      <!-- Animated Step Content -->
      <div class="relative" style="min-height: 420px;">
        {#key $currentOnboardingStep}
          {#if $currentOnboardingStep === 'goal'}
            <div class="text-center space-y-6 w-full" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
              <div>
                <h2 class="text-3xl font-bold mb-4">Welcome to Alice! 🎉</h2>
                <p class="text-lg opacity-80">
                  Tell us what you want to master so we can curate your perfect first lesson.
                </p>
              </div>
              
              <div class="space-y-4">
                <label class="block">
                  <span class="block text-left mb-2 opacity-75">What's your primary goal?</span>
                  <input 
                    bind:value={goalInput}
                    class="w-full rounded-lg bg-gray-800 px-4 py-3 text-lg border border-gray-700 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Build a self-driving car, understand transformers, master reinforcement learning..."
                    on:keydown={(e) => e.key === 'Enter' && handleGoalSubmit()}
                  />
                </label>
                
                <div class="text-sm opacity-60">
                  Popular goals: "Understand transformers", "Master RL", "Build computer vision apps"
                </div>
                
                <button 
                  class="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-lg font-semibold transition disabled:opacity-50"
                  disabled={!goalInput.trim()}
                  on:click={handleGoalSubmit}
                >
                  Continue
                </button>
              </div>
            </div>
          {:else if $currentOnboardingStep === 'paper'}
            <div class="space-y-6 w-full" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
              <div class="text-center">
                <h2 class="text-2xl font-bold mb-2">Perfect! Here's your first paper:</h2>
                <p class="opacity-80">Based on your goal: <span class="text-indigo-400">"{$guestProgress.goal}"</span></p>
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
          {:else if $currentOnboardingStep === 'lesson'}
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
                    currentOnboardingStep.set('complete');
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
          {:else if $currentOnboardingStep === 'complete'}
            <div class="text-center space-y-6 w-full" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
              <div>
                <h2 class="text-3xl font-bold mb-4">Congratulations! 🚀</h2>
                <p class="text-lg opacity-80">
                  You've completed your first lesson and earned <span class="text-indigo-400">{$guestProgress.xp} XP</span>!
                </p>
              </div>
              
              <div class="bg-gray-800 p-6 rounded-lg space-y-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-indigo-400">Level {$currentLevel}</div>
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
    </div>
  </div>
{/if}

<style>
  .onboarding-bg {
    background: var(--bg-primary, #111111);
    backdrop-filter: blur(16px);
    background-color: rgba(17, 17, 17, 0.55);
  }
  .onboarding-panel {
    color: #fff !important;
  }
  .onboarding-panel h2, .onboarding-panel h3 {
    color: #fff !important;
  }
  .onboarding-panel label, .onboarding-panel p, .onboarding-panel span, .onboarding-panel div {
    color: #E0E0E0 !important;
  }
  .onboarding-panel .opacity-80, .onboarding-panel .opacity-75 {
    color: #E0E0E0 !important;
    opacity: 1 !important;
  }
  .onboarding-panel .opacity-60 {
    color: #B3B3B3 !important;
    opacity: 1 !important;
  }
  .onboarding-panel input {
    background: #111111;
    color: #fff;
    border: 1px solid var(--border-color, #333333);
  }
  .onboarding-panel input::placeholder {
    color: #B3B3B3;
    opacity: 1;
  }
  .onboarding-panel input:focus {
    border-color: var(--topic-research-papers, #BFCAF3);
    outline: none;
  }
  .onboarding-panel button {
    background: #22242C !important;
    color: #fff !important;
    border-radius: 0.5rem;
    font-weight: 700;
    transition: background 0.2s, color 0.2s;
  }
  .onboarding-panel button:hover:not(:disabled) {
    background: #35374A !important;
    filter: none;
  }
  .onboarding-panel button:disabled {
    background: #B3B3B3 !important;
    color: #222 !important;
    opacity: 1 !important;
  }
  .onboarding-panel .bg-gray-800, .onboarding-panel .bg-gray-700 {
    background: #111111 !important;
  }
  .onboarding-panel .border-gray-700 {
    border-color: var(--border-color, #333333) !important;
  }
  .onboarding-panel .text-indigo-400 {
    color: var(--topic-research-papers, #BFCAF3) !important;
  }
  .onboarding-panel .bg-indigo-500 {
    background: var(--topic-research-papers, #BFCAF3) !important;
  }
  .onboarding-panel .hover\:bg-indigo-600:hover {
    background: var(--topic-research-papers, #BFCAF3) !important;
    filter: brightness(1.1);
  }
  .onboarding-panel .rounded-lg {
    border-radius: 0.5rem !important;
  }
  .onboarding-panel .font-bold {
    font-weight: bold;
  }
  .onboarding-panel .font-semibold {
    font-weight: 600;
  }
  .onboarding-panel .transition {
    transition: background 0.2s, color 0.2s;
  }
  .onboarding-panel .disabled\:opacity-50:disabled {
    opacity: 0.5;
  }
  :global(body) {
    overflow: hidden;
  }
</style>
