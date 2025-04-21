<template>
  <div
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 800 } }"
    class="flex flex-col justify-center p-6 max-w-7xl mx-auto">
    
    <!-- Page Header Section -->
    <div class="pt-24 pb-8">
      <h1 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
        class="text-4xl font-bold mb-6 text-gradient">Projects & Experience</h1>
      <p 
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 400, duration: 700 } }"
        class="mb-6 text-lg max-w-3xl">
        I&apos;m a developer and designer focused on creating innovative solutions at the intersection of design, code, and generative AI. Explore my projects and professional experience below.
      </p>
    </div>

    <!-- Experience Highlights Section -->
    <div 
      v-motion
      :initial="{ opacity: 0, y: 30 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 500, duration: 800 } }"
      class="w-full mb-12">
      <div class="flex justify-between items-center flex-wrap gap-4 mb-6">
        <h2 class="text-2xl font-semibold text-blue-300">Professional Experience</h2>
        <a 
          v-motion
          :initial="{ opacity: 0, scale: 0.9 }"
          :enter="{ opacity: 1, scale: 1, transition: { delay: 600, duration: 700 } }"
          href="/PhilipBennResume-2024.pdf" 
          download 
          class="px-5 py-2.5 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-700/90 hover:to-indigo-700/90 text-white rounded-md hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2 shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download Full Resume
        </a>
      </div>
      
      <!-- Experience Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Experience Card: Logitech -->
        <div 
          v-motion
          :initial="{ opacity: 0, scale: 0.95 }"
          :enter="{ opacity: 1, scale: 1, transition: { delay: 700, duration: 600 } }"
          class="bg-zinc-800/50 p-6 rounded-xl shadow-lg border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="flex items-center mb-4">
            <div class="bg-blue-500/20 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <h3 class="text-xl font-medium text-blue-200">Logitech</h3>
          </div>
          <p class="mb-2"><span class="text-blue-300">Position:</span> Senior 3D Designer</p>
          <p class="mb-2"><span class="text-blue-300">Duration:</span> 4 years</p>
          <p class="text-zinc-300 text-sm">Led product visualization initiatives and developed 3D workflows for marketing campaigns across the product line.</p>
        </div>
        
        <!-- Experience Card: Nvidia -->
        <div 
          v-motion
          :initial="{ opacity: 0, scale: 0.95 }"
          :enter="{ opacity: 1, scale: 1, transition: { delay: 800, duration: 600 } }"
          class="bg-zinc-800/50 p-6 rounded-xl shadow-lg border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="flex items-center mb-4">
            <div class="bg-blue-500/20 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h3 class="text-xl font-medium text-blue-200">Nvidia</h3>
          </div>
          <p class="mb-2"><span class="text-blue-300">Position:</span> Technical Artist</p>
          <p class="mb-2"><span class="text-blue-300">Duration:</span> 3 years</p>
          <p class="text-zinc-300 text-sm">Developed real-time rendering solutions and GPU-accelerated creative workflows for internal and partner projects.</p>
        </div>
        
        <!-- Experience Card: Freelance -->
        <div 
          v-motion
          :initial="{ opacity: 0, scale: 0.95 }"
          :enter="{ opacity: 1, scale: 1, transition: { delay: 900, duration: 600 } }"
          class="bg-zinc-800/50 p-6 rounded-xl shadow-lg border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="flex items-center mb-4">
            <div class="bg-blue-500/20 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <h3 class="text-xl font-medium text-blue-200">Freelance Digital Artist</h3>
          </div>
          <p class="mb-2"><span class="text-blue-300">Locations:</span> NYC, LA, Bay Area</p>
          <p class="mb-2"><span class="text-blue-300">Specialization:</span> 3D Production</p>
          <p class="text-zinc-300 text-sm">Created 3D assets, visualizations, and interactive experiences for clients in entertainment, tech, and advertising.</p>
        </div>
      </div>
      
      <!-- Skills & Education -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <!-- Skills -->
        <div 
          v-motion
          :initial="{ opacity: 0, scale: 0.95 }"
          :enter="{ opacity: 1, scale: 1, transition: { delay: 1000, duration: 600 } }"
          class="bg-zinc-800/50 p-6 rounded-xl shadow-lg border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="flex items-center mb-4">
            <div class="bg-blue-500/20 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                <path d="M17 6.1H3"></path>
                <path d="M21 12.1H3"></path>
                <path d="M15.1 18H3"></path>
              </svg>
            </div>
            <h3 class="text-xl font-medium text-blue-200">Key Skills</h3>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center space-x-2">
              <div class="bg-blue-500/10 p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="text-zinc-300">3D Production</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="bg-blue-500/10 p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="text-zinc-300">Product Rendering</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="bg-blue-500/10 p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="text-zinc-300">Generative AI</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="bg-blue-500/10 p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="text-zinc-300">Web Development</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="bg-blue-500/10 p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="text-zinc-300">UX/UI Design</span>
            </div>
            <div class="flex items-center space-x-2">
              <div class="bg-blue-500/10 p-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="text-zinc-300">Animation</span>
            </div>
          </div>
        </div>
        
        <!-- Education -->
        <div 
          v-motion
          :initial="{ opacity: 0, scale: 0.95 }"
          :enter="{ opacity: 1, scale: 1, transition: { delay: 1100, duration: 600 } }"
          class="bg-zinc-800/50 p-6 rounded-xl shadow-lg border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="flex items-center mb-4">
            <div class="bg-blue-500/20 p-2 rounded-full mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <h3 class="text-xl font-medium text-blue-200">Education</h3>
          </div>
          <p class="mb-2"><span class="text-blue-300">Degree:</span> MFA in Design Technology</p>
          <p class="mb-2"><span class="text-blue-300">Institution:</span> San Francisco Art Institute</p>
          <p class="text-zinc-300 text-sm">Specialized in interactive design, digital fabrication, and immersive technologies with a thesis on algorithmic aesthetics and participatory media.</p>
        </div>
      </div>
    </div>

    <!-- Portfolio Projects Section -->
    <div 
      v-motion
      :initial="{ opacity: 0, y: 30 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 1200, duration: 800 } }"
      class="w-full mb-16">
      <h2 class="text-2xl font-semibold mb-8 text-blue-300">Featured Projects</h2>
      
      <!-- Project Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Project Card: Synthemo/Fluxion -->
        <div 
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 1300, duration: 600 } }"
          class="bg-zinc-800/50 rounded-xl overflow-hidden shadow-xl border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="relative h-52">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1745176223/SynthemoLP/Fluxion-April2025_ovrimh.png" alt="Synthemo Fluxion" class="w-full h-full object-cover">
            <div class="absolute top-0 right-0 bg-blue-600/90 py-1 px-3 text-xs font-medium text-white rounded-bl-lg">
              Node-based AI
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold mb-2 text-white">Synthemo - Fluxion</h3>
            <p class="text-zinc-300 mb-4">A node-based image generation platform built with Next.js, Supabase, and Replicate. Empowers visual creators to generate AI art through a modular UI.</p>
            
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Next.js</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Supabase</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">React</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Replicate API</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Diffusion Models</span>
            </div>
            
            <div class="flex justify-start">
              <a 
                href="https://synthemo.com" 
                target="_blank" 
                class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
              >
                Visit Project
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <!-- Project Card: Elysium 2084 -->
        <div 
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 1400, duration: 600 } }"
          class="bg-zinc-800/50 rounded-xl overflow-hidden shadow-xl border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="relative h-52">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1697726328/Elysium2084WebApp/Elysium_5_rprhj6.jpg" alt="Elysium 2084" class="w-full h-full object-cover">
            <div class="absolute top-0 right-0 bg-indigo-600/90 py-1 px-3 text-xs font-medium text-white rounded-bl-lg">
              AI Narrative Game
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold mb-2 text-white">Elysium 2084</h3>
            <p class="text-zinc-300 mb-4">An AI-driven narrative game that merges interactive fiction with avatar-based worldbuilding in a cyberpunk universe with branching storylines.</p>
            
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Python/FastAPI</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">OpenAI API</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">MongoDB</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Pinecone</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">LangChain</span>
            </div>
            
            <div class="flex justify-start">
              <a 
                href="https://elysium2084.wl.r.appspot.com/" 
                target="_blank" 
                class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
              >
                Visit Project
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <!-- Project Card: Hopeflo -->
        <div 
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 1500, duration: 600 } }"
          class="bg-zinc-800/50 rounded-xl overflow-hidden shadow-xl border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="relative h-52">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1745176761/Hopeflo/Hopeflo_1_ztwwy4.jpg" alt="Hopeflo" class="w-full h-full object-cover">
            <div class="absolute top-0 right-0 bg-green-600/90 py-1 px-3 text-xs font-medium text-white rounded-bl-lg">
              Civic Tech
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold mb-2 text-white">Hopeflo</h3>
            <p class="text-zinc-300 mb-4">A civic-focused platform that combines positive news aggregation with tools for community-driven action, fostering engagement in local initiatives.</p>
            
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Next.js</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Supabase</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">MCP</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Tailwind CSS</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Agentic AI</span>
            </div>
            
            <div class="flex justify-start">
              <a 
                href="#" 
                class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
              >
                Coming Soon
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <!-- Project Card: NovelSpace -->
        <div 
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 1600, duration: 600 } }"
          class="bg-zinc-800/50 rounded-xl overflow-hidden shadow-xl border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
        >
          <div class="relative h-52">
            <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1702515925/LandingPage-Images/Elysium-SDXL_img2img_00002_yw0y6f.png" alt="NovelSpace" class="w-full h-full object-cover">
            <div class="absolute top-0 right-0 bg-purple-600/90 py-1 px-3 text-xs font-medium text-white rounded-bl-lg">
              Creative Platform
            </div>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold mb-2 text-white">NovelSpace.tech</h3>
            <p class="text-zinc-300 mb-4">Novelspace is a creative launchpad for AI-enhanced story-worlds and experimental digital media. Novelspace supports experimental formats that fuse code, story, and visual design into living, evolving worlds.</p>
            
            <div class="flex flex-wrap gap-2 mb-4">
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Next.js</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Tailwind CSS</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Cloudinary</span>
              <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Image Generation</span>
            </div>
            
            <div class="flex justify-start">
              <a 
                href="https://novelspace-website-novel-space-team.vercel.app/" 
                target="_blank" 
                class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
              >
                Visit Project
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 