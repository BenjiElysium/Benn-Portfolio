<template>
  <div
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 600 } }"
    class="motion-initial flex flex-col p-6 max-w-7xl mx-auto">

    <!-- Page Header -->
    <div class="pt-24 pb-12">
      <h1
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
        class="motion-initial text-4xl sm:text-5xl font-medium leading-tight mb-4 text-gradient">
        Projects &amp; Experience
      </h1>
      <p
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 350, duration: 700 } }"
        class="motion-initial text-lg text-zinc-500 max-w-2xl">
        Creative Technologist building at the intersection of generative AI, 3D production, and full-stack development.
      </p>
    </div>

    <!-- ── Professional Experience ─────────────────────────── -->
    <section class="mb-20">
      <div class="flex justify-between items-center flex-wrap gap-4 mb-10">
        <h2
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 400, duration: 600 } }"
          class="motion-initial text-xl font-semibold text-zinc-100">
          Professional Experience
        </h2>
        <a
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { delay: 500, duration: 600 } }"
          class="motion-initial px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-md hover:border-zinc-500 hover:text-white transition-colors inline-flex items-center gap-2"
          href="/Philip Benn Resume 2026.pdf"
          download>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Resume
        </a>
      </div>

      <!-- Timeline -->
      <div class="relative">
        <div class="absolute left-0 top-0 bottom-0 w-px bg-zinc-800"></div>

        <!-- Synthemo Creative -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -16 }"
          :visibleOnce="{ opacity: 1, x: 0, transition: { delay: 0, duration: 600 } }"
          class="motion-initial relative pl-8 pb-10">
          <div class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-indigo-400"></div>
          <div class="flex flex-wrap items-center gap-3 mb-1">
            <a href="https://synthemo.com" target="_blank" rel="noopener noreferrer"
              class="text-base font-semibold text-zinc-100 hover:text-indigo-300 transition-colors">
              Synthemo Creative
            </a>
            <span class="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full font-medium">Current</span>
          </div>
          <p class="text-sm text-zinc-500 mb-3">Art Director &amp; Developer &nbsp;·&nbsp; 2024–Present</p>
          <ul class="space-y-1.5 text-sm text-zinc-400">
            <li>Founded creative studio specializing in generative AI workflows for brand content.</li>
            <li>Produces cinematic brand films and marketing assets using custom ML pipelines: Flux, Veo, NanoBanana, ComfyUI, and LLM integrations.</li>
            <li>Focus on rapid prototyping and premium motion delivery.</li>
          </ul>
        </div>

        <!-- California College of Art -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -16 }"
          :visibleOnce="{ opacity: 1, x: 0, transition: { delay: 80, duration: 600 } }"
          class="motion-initial relative pl-8 pb-10">
          <div class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-indigo-400"></div>
          <div class="flex flex-wrap items-center gap-3 mb-1">
            <a href="https://portal.cca.edu/people/pbenn" target="_blank" rel="noopener noreferrer"
              class="text-base font-semibold text-zinc-100 hover:text-indigo-300 transition-colors">
              California College of Art
            </a>
            <span class="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full font-medium">Current</span>
          </div>
          <p class="text-sm text-zinc-500 mb-3">Adjunct Faculty, MFA Design &nbsp;·&nbsp; 2015–Present</p>
          <ul class="space-y-1.5 text-sm text-zinc-400">
            <li>Teach Motion Studio and MFA exhibition courses.</li>
            <li>Developed curriculum in generative AI for design and motion.</li>
          </ul>
        </div>

        <!-- XYZ Studios -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -16 }"
          :visibleOnce="{ opacity: 1, x: 0, transition: { delay: 160, duration: 600 } }"
          class="motion-initial relative pl-8 pb-10">
          <div class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-indigo-400"></div>
          <div class="flex flex-wrap items-center gap-3 mb-1">
            <a href="https://wearexyz.com" target="_blank" rel="noopener noreferrer"
              class="text-base font-semibold text-zinc-100 hover:text-indigo-300 transition-colors">
              XYZ Studios
            </a>
            <span class="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full font-medium">Current</span>
          </div>
          <p class="text-sm text-zinc-500 mb-3">Lighting Designer &nbsp;·&nbsp; 2015–Present</p>
          <ul class="space-y-1.5 text-sm text-zinc-400">
            <li>Design and produce high-end marketing imagery for Apple and Google.</li>
            <li>Tools: Maya, Nuke, Photoshop.</li>
          </ul>
        </div>

        <!-- Logitech -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -16 }"
          :visibleOnce="{ opacity: 1, x: 0, transition: { delay: 240, duration: 600 } }"
          class="motion-initial relative pl-8 pb-10">
          <div class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-zinc-600"></div>
          <p class="text-base font-semibold text-zinc-100 mb-1">Logitech</p>
          <p class="text-sm text-zinc-500 mb-3">Staff Lead Visual Designer &nbsp;·&nbsp; 2019–2023</p>
          <ul class="space-y-1.5 text-sm text-zinc-400">
            <li>Led visual design across 10+ product launches for the Mobility team, coordinating deliverables across engineering, industrial design, and product management.</li>
            <li>3D rendering and 2D design visualization across the Mobility product line.</li>
            <li>Created photorealistic imagery for Logitech website, in-store POS, packaging, and partner sites.</li>
            <li>Performed CAD data conversion into DCC-renderable assets.</li>
          </ul>
        </div>

        <!-- Schawk -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -16 }"
          :visibleOnce="{ opacity: 1, x: 0, transition: { delay: 320, duration: 600 } }"
          class="motion-initial relative pl-8 pb-10">
          <div class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-zinc-600"></div>
          <p class="text-base font-semibold text-zinc-100 mb-1">Schawk</p>
          <p class="text-sm text-zinc-500 mb-3">Staff 3D Technical Director &nbsp;·&nbsp; 2017–2018</p>
          <ul class="space-y-1.5 text-sm text-zinc-400">
            <li>Digital asset production for Apple product refresh and launch events.</li>
            <li>High-resolution, photorealistic imagery for product launches and in-store POS.</li>
          </ul>
        </div>

        <!-- Nvidia -->
        <div
          v-motion
          :initial="{ opacity: 0, x: -16 }"
          :visibleOnce="{ opacity: 1, x: 0, transition: { delay: 400, duration: 600 } }"
          class="motion-initial relative pl-8 pb-4">
          <div class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-zinc-600"></div>
          <p class="text-base font-semibold text-zinc-100 mb-1">Nvidia</p>
          <p class="text-sm text-zinc-500 mb-3">Staff 3D Technical Director &nbsp;·&nbsp; 2014–2017</p>
          <ul class="space-y-1.5 text-sm text-zinc-400">
            <li>Researched and developed offline and real-time GPU rendering pipelines.</li>
            <li>Performed product testing for Nvidia's in-house progressive and programmable renderer.</li>
            <li>Created workflows for CAD data conversion into DCC-renderable assets.</li>
          </ul>
        </div>
      </div>

      <!-- Education -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 600 } }"
        class="motion-initial mt-10 border border-zinc-800 rounded-lg p-5">
        <h3 class="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Education</h3>
        <p class="text-base font-medium text-zinc-100">MFA in Design Technology</p>
        <p class="text-sm text-zinc-500 mt-1">San Francisco Art Institute &nbsp;·&nbsp; Interactive design, digital fabrication, and immersive technologies</p>
      </div>
    </section>

    <!-- ── Featured Web Development Projects ────────────────────────────────── -->
    <section class="mb-16">
      <h2
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :visibleOnce="{ opacity: 1, y: 0, transition: { duration: 600 } }"
        class="motion-initial text-xl font-semibold text-zinc-100 mb-10">
        Featured Web Development Projects
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Synthemo Creative -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { delay: 0, duration: 600 } }"
          class="motion-initial border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors duration-300">
          <div class="h-48 overflow-hidden">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1771526868/SynthemoLP/SynthemoCreative-LP-2026jpg_h7iewl.jpg"
              alt="Synthemo Creative" class="w-full h-full object-cover" />
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-base font-semibold text-zinc-100">Synthemo Creative</h3>
              <span class="text-xs text-zinc-600 shrink-0 ml-2 mt-0.5">Brand Film / GenAI</span>
            </div>
            <p class="text-sm text-zinc-500 mb-2 leading-relaxed">
              <span class="text-zinc-400 font-medium">What:</span> Creative studio producing cinematic brand content with generative AI pipelines.
            </p>
            <p class="text-sm text-zinc-500 mb-4 leading-relaxed">
              <span class="text-zinc-400 font-medium">Why:</span> Brands need premium motion content at the speed and flexibility only AI workflows can deliver.
            </p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Flux</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Veo</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">ComfyUI</span>
            </div>
            <a href="https://synthemo.com" target="_blank" rel="noopener noreferrer"
              class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              Visit synthemo.com
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Fluxion -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { delay: 80, duration: 600 } }"
          class="motion-initial border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors duration-300">
          <div class="h-48 overflow-hidden">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1745176223/SynthemoLP/Fluxion-April2025_ovrimh.png"
              alt="Fluxion" class="w-full h-full object-cover" />
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-base font-semibold text-zinc-100">Fluxion</h3>
              <span class="text-xs text-zinc-600 shrink-0 ml-2 mt-0.5">AI Tool</span>
            </div>
            <p class="text-sm text-zinc-500 mb-2 leading-relaxed">
              <span class="text-zinc-400 font-medium">What:</span> Node-based image generation platform giving artists direct control over diffusion workflows.
            </p>
            <p class="text-sm text-zinc-500 mb-4 leading-relaxed">
              <span class="text-zinc-400 font-medium">Why:</span> Existing diffusion tools hid the pipeline — Fluxion exposes it as a modular, artist-friendly node graph.
            </p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Next.js</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Supabase</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Replicate</span>
            </div>
            <a href="https://app.synthemo.com" target="_blank" rel="noopener noreferrer"
              class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              Visit project
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Elysium System -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { delay: 160, duration: 600 } }"
          class="motion-initial border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors duration-300">
          <div class="h-48 overflow-hidden">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1697726328/Elysium2084WebApp/Elysium_5_rprhj6.jpg"
              alt="Elysium System" class="w-full h-full object-cover" />
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-base font-semibold text-zinc-100">Elysium System</h3>
              <span class="text-xs text-zinc-600 shrink-0 ml-2 mt-0.5">AI Game Engine</span>
            </div>
            <p class="text-sm text-zinc-500 mb-2 leading-relaxed">
              <span class="text-zinc-400 font-medium">What:</span> AI-driven narrative game with LLM-powered story generation and avatar-based worldbuilding.
            </p>
            <p class="text-sm text-zinc-500 mb-4 leading-relaxed">
              <span class="text-zinc-400 font-medium">Why:</span> Exploring how LLMs can generate coherent, branching narrative arcs with persistent character memory.
            </p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Python / FastAPI</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">OpenAI</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">LangChain</span>
            </div>
            <a href="https://elysium2084.wl.r.appspot.com/" target="_blank" rel="noopener noreferrer"
              class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              Visit project
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Hopeflo -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { delay: 240, duration: 600 } }"
          class="motion-initial border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors duration-300">
          <div class="h-48 overflow-hidden">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1745176761/Hopeflo/Hopeflo_1_ztwwy4.jpg"
              alt="Hopeflo" class="w-full h-full object-cover" />
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-base font-semibold text-zinc-100">Hopeflo</h3>
              <span class="text-xs text-zinc-600 shrink-0 ml-2 mt-0.5">Civic Tech</span>
            </div>
            <p class="text-sm text-zinc-500 mb-2 leading-relaxed">
              <span class="text-zinc-400 font-medium">What:</span> Civic platform combining AI-curated positive news with tools for community-driven action.
            </p>
            <p class="text-sm text-zinc-500 mb-4 leading-relaxed">
              <span class="text-zinc-400 font-medium">Why:</span> Countering doom-scroll fatigue by surfacing hopeful narratives and local opportunities to engage.
            </p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Next.js</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Supabase</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Agentic AI</span>
            </div>
            <a href="https://hopeflo.org" target="_blank" rel="noopener noreferrer"
              class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              Visit hopeflo.org
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- NovelSpace -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { delay: 320, duration: 600 } }"
          class="motion-initial border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors duration-300 md:col-span-2 lg:col-span-1">
          <div class="h-48 overflow-hidden">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1702515925/LandingPage-Images/Elysium-SDXL_img2img_00002_yw0y6f.png"
              alt="NovelSpace" class="w-full h-full object-cover" />
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-base font-semibold text-zinc-100">NovelSpace.tech</h3>
              <span class="text-xs text-zinc-600 shrink-0 ml-2 mt-0.5">Creative Platform</span>
            </div>
            <p class="text-sm text-zinc-500 mb-2 leading-relaxed">
              <span class="text-zinc-400 font-medium">What:</span> Creative platform for AI-enhanced story-worlds and experimental digital media.
            </p>
            <p class="text-sm text-zinc-500 mb-4 leading-relaxed">
              <span class="text-zinc-400 font-medium">Why:</span> Exploring new formats that fuse code, story, and visual design into living, evolving worlds.
            </p>
            <div class="flex flex-wrap gap-1.5 mb-4">
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Next.js</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Cloudinary</span>
              <span class="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">Image Generation</span>
            </div>
            <a href="https://novelspace-website-novel-space-team.vercel.app/" target="_blank" rel="noopener noreferrer"
              class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              Visit project
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

      </div>
    </section>

  </div>
</template>
