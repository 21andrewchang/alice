<script lang="ts">
  // Reuse the existing root page component for the authenticated “app” route.
  import HomePage from '../+page.svelte';
  export let data;
</script>

<HomePage {...data} />
