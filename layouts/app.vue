<!-- layouts/app.vue -->
<!-- Full-bleed layout used by /apps/* pages.
     Reuses SiteHeader and SiteFooter but removes the max-width container
     so the calculator can use the full viewport width. -->
<template>
  <div class="h-full bg-zinc-950 text-zinc-100 overflow-hidden">
    <slot />
  </div>
</template>
