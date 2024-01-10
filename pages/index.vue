<script setup>
const { data: posts } = await useAsyncData('latest-posts', () =>
  queryContent('/blog')
    .sort({ data: 1 })
    .limit(3)
    .find()
)
</script>

<template>
  <section>
    <h1 class="text-5xl font-bold mt-20">🌞 Hello, I'm Philip Benn</h1>
    <p class="text-base text-zinc-300 p-2 italic">Digital Artist: 3d Graphics, Product Rendering, Generative AI</p>
  </section>
  <section class="flex flex-col md:flex-row">
    <div class="md:w-3/4">
      <h2 class="text-3xl font-bold mt-8">My Background</h2>
      <p class="text-lg py-2">
        I have deep experience and knowlege in the areas of 3d production, creative coding, generative art, and product rendering. I have worked professionally in New York City, Los Angeles and the Bay Area where I currently live. I have an MFA in Design Technology, and I am passionate about all things related to computer graphics, art and design.
      </p>
      <p class="text-lg py-2">
        I am application agnostic, but I am most comfortable with Cinema4D, Maya, Nuke, Adobe Creative Cloud, Rhino and Blender.<br><br>
        I write code with Python, and Javascript. I am getting comfortable with the JAMstack web dev architecture (I'm cool withintegrating APIs into web apps). I use VScode for development.<br><br>
        I am deeply immersed and slightly obsessed with opensource Stable Diffusion image diffusion models and I use ComyUI and Automatic1111 for Txt2Img, Txt2Vid, Img2Img and AnimDiff.
      </p>
    </div>
    <div class="w-1/2 md:max-w-sm p-8 mx-auto aspect-w-16 aspect-h-9">
      <img src="~/assets/images/Philip-Gradient1.jpg" class="object-cover rounded-lg" />
    </div>
  </section>

  <section class="mb-20">
    <h2 class="text-3xl font-bold mt-8">Latest Blog Posts</h2>
    <div class="grid md:grid-cols-3 pt-8 gap-10">
      <Post :posts="posts" />
    </div>
  </section>
</template>
