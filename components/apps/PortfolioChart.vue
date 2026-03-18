<script setup>
// components/apps/PortfolioChart.vue
// Renders the main portfolio projection chart onto a <canvas>.
// All data is passed as props; drawing happens in a watcher.

const props = defineProps({
  smooth:          { type: Object,  required: true },   // { noms, reals, conts }
  vpaths:          { type: Array,   default: () => [] },
  scenPath:        { type: Array,   default: null },
  scenColor:       { type: String,  default: '#9B59B6' },
  customRetPath:   { type: Array,   default: null },
  customSpendPath: { type: Array,   default: null },
  yrs:             { type: Number,  required: true },
  height:          { type: Number,  default: 440 },
})

import { ref, watch, onMounted, nextTick } from 'vue'
import { yAxisLabel } from '~/composables/usePortfolioSim.js'

const canvas = ref(null)

function draw() {
  const cvs = canvas.value
  if (!cvs) return
  const W = cvs.offsetWidth || 800
  const H = props.height
  cvs.width = W * 2; cvs.height = H * 2; cvs.style.height = H + 'px'
  const ctx = cvs.getContext('2d')
  ctx.scale(2, 2)

  const pad = { t: 12, r: 14, b: 38, l: 68 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  ctx.clearRect(0, 0, W, H)

  // compute max
  let allV = [...props.smooth.noms, ...props.smooth.reals, ...props.smooth.conts]
  props.vpaths.forEach(p => allV.push(...p.arr))
  if (props.scenPath)        allV.push(...props.scenPath)
  if (props.customRetPath)   allV.push(...props.customRetPath)
  if (props.customSpendPath) allV.push(...props.customSpendPath)
  const maxV = Math.max(...allV) * 1.06 || 1
  const n = props.yrs + 1

  const xp = i => pad.l + i / (n - 1) * cw
  const yp = v => pad.t + ch - (Math.max(v, 0) / maxV) * ch

  // y-axis grid
  ctx.font = '12px ui-monospace, monospace'
  ctx.textAlign = 'right'
  for (let t = 0; t <= 8; t++) {
    const v = maxV * t / 8
    const yt = yp(v)
    ctx.fillStyle = 'rgba(161,161,170,.75)'
    ctx.fillText(yAxisLabel(v), pad.l - 6, yt + 4)
    ctx.beginPath(); ctx.strokeStyle = 'rgba(113,113,122,.15)'; ctx.lineWidth = 0.5
    ctx.moveTo(pad.l, yt); ctx.lineTo(pad.l + cw, yt); ctx.stroke()
  }

  // random vol paths
  props.vpaths.forEach(p => {
    ctx.beginPath()
    ctx.moveTo(xp(0), yp(p.arr[0]))
    p.arr.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
    ctx.strokeStyle = p.solvent ? 'rgba(200,120,60,.28)' : 'rgba(200,60,60,.2)'
    ctx.lineWidth = 0.9; ctx.stroke()
  })

  // contributed fill
  ctx.beginPath()
  ctx.moveTo(xp(0), yp(props.smooth.conts[0]))
  props.smooth.conts.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
  ctx.lineTo(xp(n - 1), yp(0)); ctx.lineTo(xp(0), yp(0)); ctx.closePath()
  ctx.fillStyle = 'rgba(170,200,232,.15)'; ctx.fill()
  ctx.beginPath()
  ctx.moveTo(xp(0), yp(props.smooth.conts[0]))
  props.smooth.conts.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
  ctx.strokeStyle = '#7BA7C4'; ctx.lineWidth = 1.5; ctx.stroke()

  // real value
  ctx.beginPath()
  ctx.moveTo(xp(0), yp(props.smooth.reals[0]))
  props.smooth.reals.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
  ctx.strokeStyle = '#1D9E75'; ctx.lineWidth = 2.5; ctx.stroke()

  // named scenario (dashed)
  if (props.scenPath?.length > 1) {
    ctx.beginPath()
    ctx.moveTo(xp(0), yp(props.scenPath[0]))
    props.scenPath.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
    ctx.strokeStyle = props.scenColor; ctx.lineWidth = 2.5
    ctx.setLineDash([8, 4]); ctx.stroke(); ctx.setLineDash([])
  }

  // custom return path (dashed purple)
  if (props.customRetPath?.length > 1) {
    ctx.beginPath()
    ctx.moveTo(xp(0), yp(props.customRetPath[0]))
    props.customRetPath.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
    ctx.strokeStyle = '#E040FB'; ctx.lineWidth = 3
    ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([])
  }

  // custom spend path (dashed orange)
  if (props.customSpendPath?.length > 1) {
    ctx.beginPath()
    ctx.moveTo(xp(0), yp(props.customSpendPath[0]))
    props.customSpendPath.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
    ctx.strokeStyle = '#FF9800'; ctx.lineWidth = 3
    ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([])
  }

  // smooth nominal — always on top
  ctx.beginPath()
  ctx.moveTo(xp(0), yp(props.smooth.noms[0]))
  props.smooth.noms.forEach((v, i) => { if (i > 0) ctx.lineTo(xp(i), yp(v)) })
  ctx.strokeStyle = '#6366F1'; ctx.lineWidth = 3; ctx.stroke()

  // x-axis labels
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(161,161,170,.75)'; ctx.font = '12px ui-monospace, monospace'
  const step = Math.ceil(n / 15)
  for (let i = 0; i < n; i += step) {
    ctx.fillText(i === 0 ? 'Now' : 'Yr ' + i, xp(i), H - pad.b + 20)
  }
}

watch(() => [props.smooth, props.vpaths, props.scenPath, props.customRetPath, props.customSpendPath, props.yrs],
  () => nextTick(draw), { deep: true })

onMounted(() => { nextTick(draw); window.addEventListener('resize', draw) })
</script>

<template>
  <canvas ref="canvas" class="w-full block" :style="{ height: height + 'px' }" />
</template>
