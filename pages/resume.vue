<template>
    <div class="flex flex-col justify-center p-6">
        <div class="pt-20 pb-8">
        <h1 class="text-3xl font-bold mb-4">Philip Benn's Resume</h1>
        <p class="mb-4">Download my detailed resume below.</p>
        <a 
          href="/PhilipBennResume-2024.pdf" 
          download 
          class="px-4 py-2 bg-sky-700/80 text-white rounded hover:bg-sky-900/80 transition duration-300"
        >
          Download Resume
        </a>
        </div>
        <div class="w-half mt-8 mb-8">
            <h2 class="text-xl font-semibold mb-3">Resume Highlights</h2>
            <ul class="list-disc list-inside">
                <li><strong>Experience:</strong> 4 years at Logitech</li>
                <li><strong>Experience:</strong> 3 years at Nvidia</li>
                <li><strong>Experience:</strong> Freelance Digital Artist: New York City, Los Angeles, Bay Area </li>
                <li><strong>Key Skills:</strong> 3D Production, Product Rendering, Generative AI.</li>
                <li><strong>Education:</strong> MFA in Design Technology from San Francisco Art Institute</li>
                <!-- Add more list items as needed -->
            </ul>
        </div>
        <!-- Portfolio Links Section -->
        <div class="w-half mb-8">
            <h2 class="text-xl font-semibold mb-6">Portfolio Projects</h2>
            <a 
              href="https://www.novelspace.tech/" 
              target="_blank" 
              class="px-4 py-2 bg-sky-700/80 text-white rounded hover:bg-sky-900/80 transition duration-300 mr-4"
            >
              NovelSpace.tech
            </a>
            <a 
              href="https://elysium.novelspace.tech/" 
              target="_blank" 
              class="px-4 py-2 bg-sky-700/80 text-white rounded hover:bg-sky-900/80 transition duration-300"
            >
              Elysium 2084
            </a>
        </div>
    </div>
</template>
