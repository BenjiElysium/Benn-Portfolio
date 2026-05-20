<script setup>
// components/apps/CurveEditor.vue
// A drawable canvas editor for annual return or spend curves.
// Props drive all config; emits 'update:modelValue' with the new data array.

const props = defineProps({
  modelValue: { type: Array, required: true },   // array of decimals, length = yrs
  yrs:        { type: Number, required: true },
  min:        { type: Number, default: -0.40 },
  max:        { type: Number, default:  0.40 },
  signed:     { type: Boolean, default: true },   // true = ±, false = 0–max
  color:      { type: String, default: '#E040FB' },
  label:      { type: String, default: 'return' },
  enabled:    { type: Boolean, default: false },
  height:     { type: Number, default: 160 },
  valueStep:  { type: Number, default: 0.001 },
  amountData: { type: Array, default: () => [] },
  amountLabel:{ type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:enabled'])

import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

const canvas = ref(null)
const isDrawing = ref(false)
const hover = ref(null)

const pad = { l: 44, r: 10, t: 10, b: 24 }

function fmtPct(v) {
  const sign = props.signed && v > 0 ? '+' : ''
  return sign + (v * 100).toFixed(2) + '%'
}

function fmtMoney(v) {
  return '$' + Math.round(v).toLocaleString()
}

function snapValue(v) {
  if (!props.valueStep) return v
  return Math.round(v / props.valueStep) * props.valueStep
}

function hoverStyle() {
  if (!hover.value) return {}
  return {
    left: hover.value.x + 'px',
    top: Math.max(8, hover.value.y - 14) + 'px',
  }
}

// ── Draw ───────────────────────────────────────────────────────────────
function redraw() {
  const ec = canvas.value
  if (!ec) return
  const W = ec.offsetWidth || 600
  const H = props.height
  ec.width = W * 2
  ec.height = H * 2
  ec.style.height = H + 'px'
  const ctx = ec.getContext('2d')
  ctx.scale(2, 2)

  const data = props.modelValue
  const yrs = data.length || 1
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  const range = props.max - props.min
  const zeroY = pad.t + ch * (1 - (0 - props.min) / range)

  ctx.clearRect(0, 0, W, H)

  // background bands
  if (props.signed) {
    ctx.fillStyle = 'rgba(29,158,117,.07)';  ctx.fillRect(pad.l, pad.t, cw, zeroY - pad.t)
    ctx.fillStyle = 'rgba(192,57,43,.07)';   ctx.fillRect(pad.l, zeroY, cw, pad.t + ch - zeroY)
  } else {
    ctx.fillStyle = 'rgba(255,152,0,.05)';   ctx.fillRect(pad.l, pad.t, cw, ch)
  }

  // grid + labels
  ctx.font = '11px ui-monospace, monospace'
  ctx.textAlign = 'right'
  const ticks = props.signed
    ? [-0.40, -0.30, -0.20, -0.10, 0, 0.10, 0.20, 0.30, 0.40]
    : [0, 0.015, 0.03, 0.045, 0.06, 0.075, 0.09, 0.105, 0.12, 0.135, 0.15]
  ticks.forEach(v => {
    if (v < props.min - 0.001 || v > props.max + 0.001) return
    const yt = pad.t + ch * (1 - (v - props.min) / range)
    ctx.strokeStyle = 'rgba(113,113,122,.25)'; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(pad.l, yt); ctx.lineTo(pad.l + cw, yt); ctx.stroke()
    ctx.fillStyle = 'rgba(161,161,170,.9)'
    const decimals = props.signed || Math.abs(v * 100 - Math.round(v * 100)) < 0.01 ? 0 : 1
    ctx.fillText((v * 100).toFixed(decimals) + '%', pad.l - 5, yt + 4)
  })

  // zero line (signed)
  if (props.signed) {
    ctx.strokeStyle = 'rgba(113,113,122,.5)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(pad.l + cw, zeroY); ctx.stroke()
  }

  // bars
  const bw = Math.max(1.5, cw / yrs - 1)
  data.forEach((v, i) => {
    const x = pad.l + i / yrs * cw
    if (props.signed) {
      const vh = Math.abs(v) / range * ch
      ctx.fillStyle = v >= 0 ? 'rgba(29,158,117,.65)' : 'rgba(192,57,43,.65)'
      ctx.fillRect(x, v >= 0 ? zeroY - vh : zeroY, bw, vh)
    } else {
      const vh = (v - props.min) / range * ch
      ctx.fillStyle = 'rgba(255,152,0,.6)'
      ctx.fillRect(x, pad.t + ch - vh, bw, vh)
    }
  })

  // curve line
  ctx.beginPath()
  data.forEach((v, i) => {
    const x = pad.l + (i + 0.5) / yrs * cw
    const y = pad.t + ch * (1 - (v - props.min) / range)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = props.enabled ? props.color : 'rgba(113,113,122,.35)'
  ctx.lineWidth = 2; ctx.stroke()

  // x labels
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(113,113,122,.8)'; ctx.font = '10px ui-monospace, monospace'
  const step = Math.ceil(yrs / 8)
  for (let i = 0; i < yrs; i += step) {
    ctx.fillText('Yr ' + (i + 1), pad.l + (i + 0.5) / yrs * cw, H - 4)
  }

  // disabled overlay
  if (!props.enabled) {
    ctx.fillStyle = 'rgba(9,9,11,.35)'
    ctx.fillRect(pad.l, pad.t, cw, ch)
    ctx.fillStyle = 'rgba(161,161,170,.7)'; ctx.font = '13px ui-sans-serif, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Enable to edit ' + props.label + ' curve', pad.l + cw / 2, H / 2 + 4)
  }
}

// ── Interaction ────────────────────────────────────────────────────────
function coordToValue(clientX, clientY) {
  const ec = canvas.value
  const rect = ec.getBoundingClientRect()
  const W = ec.offsetWidth
  const cw = W - pad.l - pad.r
  const ch = props.height - pad.t - pad.b
  const x = clientX - rect.left
  const y = clientY - rect.top
  const yrs = props.modelValue.length || 1
  const col = Math.max(0, Math.min(yrs - 1, Math.floor((x - pad.l) / cw * yrs)))
  const raw = props.max - (y - pad.t) / ch * (props.max - props.min)
  const val = Math.max(props.min, Math.min(props.max, snapValue(raw)))
  return { col, val, x, y }
}

function setHover(clientX, clientY, forcedValue = null) {
  if (!props.enabled) { hover.value = null; return }
  const { col, val, x, y } = coordToValue(clientX, clientY)
  const displayValue = forcedValue ?? props.modelValue[col] ?? val
  const amountBase = props.amountData[col] ?? null
  hover.value = {
    col,
    x,
    y,
    value: displayValue,
    amount: amountBase === null ? null : amountBase * displayValue,
  }
}

function applyDraw(clientX, clientY) {
  if (!props.enabled) return
  const { col, val, x, y } = coordToValue(clientX, clientY)
  const next = [...props.modelValue]
  next[col] = val
  hover.value = {
    col,
    x,
    y,
    value: val,
    amount: props.amountData[col] == null ? null : props.amountData[col] * val,
  }
  emit('update:modelValue', next)
}

function onMouseDown(e) { if (!props.enabled) return; isDrawing.value = true; applyDraw(e.clientX, e.clientY) }
function onMouseMove(e) { if (!props.enabled) return; isDrawing.value ? applyDraw(e.clientX, e.clientY) : setHover(e.clientX, e.clientY) }
function onMouseLeave() { if (!isDrawing.value) hover.value = null }
function onMouseUp()    { isDrawing.value = false }
function onTouchStart(e){ if (!props.enabled) return; isDrawing.value = true; applyDraw(e.touches[0].clientX, e.touches[0].clientY) }
function onTouchMove(e) { if (!isDrawing.value) return; e.preventDefault(); applyDraw(e.touches[0].clientX, e.touches[0].clientY) }
function onTouchEnd()   { isDrawing.value = false }

// redraw on any prop change
watch(() => [props.modelValue, props.enabled, props.yrs], redraw, { deep: true })
onMounted(() => { nextTick(redraw); window.addEventListener('mouseup', onMouseUp) })
onUnmounted(() => window.removeEventListener('mouseup', onMouseUp))
</script>

<template>
  <div class="relative">
    <canvas
      ref="canvas"
      :style="{ height: height + 'px', cursor: enabled ? 'crosshair' : 'default' }"
      class="w-full block rounded-lg border border-zinc-700/50 touch-none select-none"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    />
    <div
      v-if="enabled && hover"
      class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-zinc-700 bg-zinc-950/95 px-2.5 py-2 text-[11px] text-zinc-200 shadow-xl tabular-nums"
      :style="hoverStyle()"
    >
      <div class="font-semibold text-zinc-100">Yr {{ hover.col + 1 }}</div>
      <div>{{ label }}: {{ fmtPct(hover.value) }}</div>
      <div v-if="amountLabel && hover.amount !== null" class="text-orange-300">
        {{ amountLabel }}: {{ fmtMoney(hover.amount) }}
      </div>
    </div>
  </div>
</template>
