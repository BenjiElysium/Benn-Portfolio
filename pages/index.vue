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
        I have experience in the areas of 3D production, creative coding, generative AI, and product rendering. I have worked professionally in New York City, Los Angeles and the Bay Area where I currently live. I have an MFA in Design Technology, and I am passionate about all things related to computer graphics, art and design.
      </p>
      <p class="text-lg py-2">
        I am application agnostic, I can learn any application required by the project and team. Cinema4D, Maya, Nuke, Adobe Creative Cloud, Unity, Rhino and Blender are some of the 3D production applications I have used including many others.<br><br>
        I write code with Python and Javascript using the VS Code IDE. I'm getting comfortable with the JAMstack web dev architecture. Along these lines, I've been integrating APIs into web apps to take advantage of cloud services for OpenAI LLM APIs, databases and vector stores, machine learning models, and authorization.<br><br>
        I am deeply immersed and even slightly obsessed with open-source Stable Diffusion machine learning models and I use ComyUI and Automatic1111 for Txt2Img, Txt2Vid, Img2Img and AnimDiff. See some of my blogs entries for details!
      </p>
    </div>
    <div class="w-1/2 md:max-w-sm p-8 mx-auto mt-12 aspect-w-16 aspect-h-9">
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
