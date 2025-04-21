// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    'nuxt-icon',
    '@nuxt/content',
    '@nuxtjs/cloudinary',
    '@vueuse/motion/nuxt'
  ],
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  },
  runtimeConfig: {
    githubToken: process.env.GITHUB_TOKEN
  },
  content: {
    // https://content.nuxtjs.org/api/configuration
    highlight: {
      theme: 'nord',
      preload: ['ts','js','css','java','json','bash','vue', 'python']
    }
  },
  css: [
    '@/assets/css/main.css',
    '@/assets/css/gradients.css'
  ]
})
  