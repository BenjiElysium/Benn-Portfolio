<script setup>
// Redirect from resume to projects
definePageMeta({
  middleware: [
    function (to) {
      return navigateTo('/projects')
    }
  ]
});
</script>

<template>
  <div>Redirecting to Projects...</div>
</template>

<style scoped>
.text-gradient {
    background: linear-gradient(90deg, #8B5CF6, #3B82F6, #60A5FA);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
</style>
