/**
 * useProjectionChart.js
 * Shared 10-year P/E (or P/DE) projection chart builder.
 * Used by both the NVDA and BX analyzer tabs in StockAnalyzer.
 *
 * Updates an existing Chart in place when possible (same canvas, same chart registry)
 * to avoid destroy/recreate flicker on live price ticks. Uses options.animation = false
 * so full chart.update() runs without visible animation (more reliable than update('none')
 * when replacing dataset arrays after slider changes).
 */

function gridColor() {
  const dk = window.matchMedia('(prefers-color-scheme:dark)').matches
  return dk ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
}

/**
 * Pure math → labels + per-dataset { data, pointRadius } for the five line series.
 */
export function computeProjectionSeries(today, metric1, metric2, multMin, multMax, g, maxYears = 10) {
  const allLabels = ['Now', 'Yr 1', 'Yr 2', 'Yr 3', 'Yr 4', 'Yr 5', 'Yr 6', 'Yr 7', 'Yr 8', 'Yr 9', 'Yr 10']
  const labels = allLabels.slice(0, maxYears + 1)
  const N = maxYears

  const hi = []
  const lo = []
  for (let y = 0; y <= N; y++) {
    if (y === 0) {
      hi.push(+today.toFixed(2))
      lo.push(+today.toFixed(2))
      continue
    }
    const m = y === 1 ? metric1 : y === 2 ? metric2 : metric2 * Math.pow(1 + g, y - 2)
    hi.push(+(m * multMax).toFixed(2))
    lo.push(+(m * multMin).toFixed(2))
  }

  const hiS = hi.map((v, i) => (i <= 2 ? v : null))
  const loS = lo.map((v, i) => (i <= 2 ? v : null))
  const hiD = hi.map((v, i) => (i >= 2 ? v : null))
  const loD = lo.map((v, i) => (i >= 2 ? v : null))
  const todayArr = Array(N + 1).fill(null)
  todayArr[0] = +today.toFixed(2)

  const pointToday = [6, ...Array(N).fill(0)]
  const pointHiS = hiS.map((v, i) => (v !== null && i > 0 ? 4 : 0))
  const pointHiD = hiD.map((v, i) => (v !== null && i === N ? 4 : 0))
  const pointLoS = loS.map((v, i) => (v !== null && i > 0 ? 4 : 0))
  const pointLoD = loD.map((v, i) => (v !== null && i === N ? 4 : 0))

  return {
    labels,
    datasets: [
      { data: todayArr, pointRadius: pointToday },
      { data: hiS, pointRadius: pointHiS },
      { data: hiD, pointRadius: pointHiD },
      { data: loS, pointRadius: pointLoS },
      { data: loD, pointRadius: pointLoD },
    ],
  }
}

function buildFullDatasets(series) {
  const [d0, d1, d2, d3, d4] = series.datasets
  return [
    {
      data: d0.data,
      borderColor: '#888780',
      backgroundColor: 'transparent',
      pointRadius: d0.pointRadius,
      pointBackgroundColor: '#888780',
      borderWidth: 2,
      spanGaps: false,
    },
    {
      data: d1.data,
      borderColor: '#378ADD',
      backgroundColor: 'transparent',
      pointRadius: d1.pointRadius,
      borderWidth: 2,
      spanGaps: false,
    },
    {
      data: d2.data,
      borderColor: '#378ADD',
      backgroundColor: 'transparent',
      borderDash: [5, 4],
      pointRadius: d2.pointRadius,
      borderWidth: 2,
      spanGaps: false,
    },
    {
      data: d3.data,
      borderColor: '#1D9E75',
      backgroundColor: 'transparent',
      pointRadius: d3.pointRadius,
      borderWidth: 2,
      spanGaps: false,
    },
    {
      data: d4.data,
      borderColor: '#1D9E75',
      backgroundColor: 'transparent',
      borderDash: [5, 4],
      pointRadius: d4.pointRadius,
      borderWidth: 2,
      spanGaps: false,
    },
  ]
}

function chartOptions(gc) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    /** Lets chart.update() fully resync datasets without tweening (avoids relying on update('none') alone). */
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c) => {
            const v = c.parsed?.y !== undefined ? c.parsed.y : c.raw
            return v !== null && v !== undefined && !Number.isNaN(v) ? '$' + Number(v).toFixed(2) : ''
          },
        },
      },
    },
    scales: {
      y: { grid: { color: gc }, ticks: { font: { size: 11 }, callback: v => '$' + v } },
      x: { grid: { color: gc }, ticks: { font: { size: 11 } } },
    },
  }
}

function canPatchProjectionChart(Chart, existingChart, canvasEl) {
  if (!existingChart || !canvasEl) return false
  try {
    if (!existingChart.canvas) return false
    if (existingChart.canvas !== canvasEl) return false
    const registered = Chart.getChart(canvasEl)
    if (registered != null && registered !== existingChart) return false
    if (existingChart.config?.type !== 'line') return false
    const n = existingChart.data?.datasets?.length
    return n === 5
  } catch {
    return false
  }
}

/**
 * @param {object} Chart        - Chart.js constructor (passed in to keep SSR-safe)
 * @param {HTMLCanvasElement} canvasEl - Target canvas element
 * @param {number} today        - Current price (the "Now" anchor point)
 * @param {number} metric1      - Year-1 EPS or DE
 * @param {number} metric2      - Year-2 EPS or DE
 * @param {number} multMin      - Min P/E or P/DE multiple
 * @param {number} multMax      - Max P/E or P/DE multiple
 * @param {number} g            - Annual growth rate (decimal, e.g. 0.336)
 * @param {object|null} existingChart - Prior Chart instance (updated in place when valid)
 * @param {number} [maxYears=10]    - How many years to show (3 = zoom to 1–2yr targets)
 * @returns {object} Chart.js instance
 */
export function buildProjectionChart(Chart, canvasEl, today, metric1, metric2, multMin, multMax, g, existingChart, maxYears = 10) {
  const gc = gridColor()
  const series = computeProjectionSeries(today, metric1, metric2, multMin, multMax, g, maxYears)

  if (canPatchProjectionChart(Chart, existingChart, canvasEl)) {
    existingChart.data.labels = series.labels
    series.datasets.forEach((src, i) => {
      const ds = existingChart.data.datasets[i]
      ds.data = src.data
      ds.pointRadius = src.pointRadius
    })
    existingChart.options.scales.y.grid.color = gc
    existingChart.options.scales.x.grid.color = gc
    existingChart.options.scales.y.ticks.callback = v => '$' + v
    /** Default mode re-parses / resyncs line elements; animation is off so this stays instant. */
    existingChart.update()
    return existingChart
  }

  if (existingChart) {
    try {
      existingChart.destroy()
    } catch {
      /* ignore */
    }
  }

  return new Chart(canvasEl, {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: buildFullDatasets(series),
    },
    options: chartOptions(gc),
  })
}
