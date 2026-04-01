/**
 * useProjectionChart.js
 * Shared 10-year P/E (or P/DE) projection chart builder.
 * Used by both the NVDA and BX analyzer tabs in StockAnalyzer.
 *
 * @param {object} Chart        - Chart.js constructor (passed in to keep SSR-safe)
 * @param {HTMLCanvasElement} canvasEl - Target canvas element
 * @param {number} today        - Current price (the "Now" anchor point)
 * @param {number} metric1      - Year-1 EPS or DE
 * @param {number} metric2      - Year-2 EPS or DE
 * @param {number} multMin      - Min P/E or P/DE multiple
 * @param {number} multMax      - Max P/E or P/DE multiple
 * @param {number} g            - Annual growth rate (decimal, e.g. 0.336)
 * @param {object|null} existingChart - Prior Chart instance to destroy before creating
 * @param {number} [maxYears=10]    - How many years to show (3 = zoom to 1–2yr targets)
 * @returns {object} New Chart.js instance
 */
export function buildProjectionChart(Chart, canvasEl, today, metric1, metric2, multMin, multMax, g, existingChart, maxYears = 10) {
  if (existingChart) existingChart.destroy()

  const dk = window.matchMedia('(prefers-color-scheme:dark)').matches
  const gc = dk ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
  const allLabels = ['Now', 'Yr 1', 'Yr 2', 'Yr 3', 'Yr 4', 'Yr 5', 'Yr 6', 'Yr 7', 'Yr 8', 'Yr 9', 'Yr 10']
  const labels = allLabels.slice(0, maxYears + 1)
  const N = maxYears

  const hi = [], lo = []
  for (let y = 0; y <= N; y++) {
    if (y === 0) { hi.push(+today.toFixed(2)); lo.push(+today.toFixed(2)); continue }
    const m = y === 1 ? metric1 : y === 2 ? metric2 : metric2 * Math.pow(1 + g, y - 2)
    hi.push(+(m * multMax).toFixed(2))
    lo.push(+(m * multMin).toFixed(2))
  }

  // Solid lines cover yr 0–2 (targets); dotted lines cover yr 2–N (extrapolated)
  const hiS = hi.map((v, i) => i <= 2 ? v : null)
  const loS = lo.map((v, i) => i <= 2 ? v : null)
  const hiD = hi.map((v, i) => i >= 2 ? v : null)
  const loD = lo.map((v, i) => i >= 2 ? v : null)
  const todayArr = Array(N + 1).fill(null)
  todayArr[0] = +today.toFixed(2)

  return new Chart(canvasEl, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { data: todayArr, borderColor: '#888780', backgroundColor: 'transparent', pointRadius: [6, ...Array(10).fill(0)], pointBackgroundColor: '#888780', borderWidth: 2, spanGaps: false },
        { data: hiS, borderColor: '#378ADD', backgroundColor: 'transparent', pointRadius: hiS.map((v, i) => v !== null && i > 0 ? 4 : 0), borderWidth: 2, spanGaps: false },
        { data: hiD, borderColor: '#378ADD', backgroundColor: 'transparent', borderDash: [5, 4], pointRadius: hiD.map((v, i) => v !== null && i === N ? 4 : 0), borderWidth: 2, spanGaps: false },
        { data: loS, borderColor: '#1D9E75', backgroundColor: 'transparent', pointRadius: loS.map((v, i) => v !== null && i > 0 ? 4 : 0), borderWidth: 2, spanGaps: false },
        { data: loD, borderColor: '#1D9E75', backgroundColor: 'transparent', borderDash: [5, 4], pointRadius: loD.map((v, i) => v !== null && i === N ? 4 : 0), borderWidth: 2, spanGaps: false },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => c.raw !== null ? '$' + c.raw.toFixed(2) : null } },
      },
      scales: {
        y: { grid: { color: gc }, ticks: { font: { size: 11 }, callback: v => '$' + v } },
        x: { grid: { color: gc }, ticks: { font: { size: 11 } } },
      },
    },
  })
}
