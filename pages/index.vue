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
    <h1 class="text-5xl font-bold mt-20">Hello, I'm Philip Benn</h1>
    <p class="text-base text-zinc-300 p-2 italic">Digital Artist: 3d Graphics, Product Rendering, Generative AI</p>
  </section>
  <section class="flex flex-col md:flex-row">
    <div class="md:w-3/4">
      <h2 class="text-3xl font-bold mt-8">My Background</h2>
      <p class="text-lg py-2">
        I have experience in 3D production, creative coding, generative AI, and product rendering. My professional journey has taken me through New York City, Los Angeles, and the Bay Area, where I currently reside. Holding an MFA in Design Technology, I am deeply passionate about computer graphics, art, and design.
      </p>
      <p class="text-lg py-2">
        Application-agnostic, I can adeptly learn any software needed for a project or team. My toolkit includes Cinema4D, Maya, Nuke, Adobe Creative Cloud, Unity, Rhino, Blender, among many other 3D production applications.<br><br>
        In coding, I am proficient in Python and Javascript, using the VS Code IDE. I'm increasingly comfortable with the JAMstack web development architecture and have been integrating APIs into web apps. This includes leveraging cloud services for OpenAI LLM APIs, databases, vector stores, machine learning models, and authorization.<br><br>
        My current focus is on open-source Stable Diffusion machine learning models. Utilizing tools like ComyUI and Automatic1111, I explore Txt2Img, Txt2Vid, Img2Img, and AnimDiff functionalities. Check out my blog entries for more details on these projects!
      </p>
    </div>
    <div class="w-3/4 md:max-w-sm p-8 mx-auto mt-12 aspect-w-16 aspect-h-9">
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
