// Default Stock Analyzer watchlist, split into the groups the table shows.
// Names are static (Finnhub has no profile for ETFs). Visitors can add or
// remove tickers; their list lives in localStorage and anything they add
// that isn't below shows under "Added".

export const WATCHLIST_STOCKS = Object.freeze([
  { t: 'AAPL', name: 'Apple' },
  { t: 'AMD', name: 'Advanced Micro Devices' },
  { t: 'ANET', name: 'Arista Networks' },
  { t: 'APO', name: 'Apollo Global Management' },
  { t: 'ARM', name: 'Arm Holdings (ADR)' },
  { t: 'ASML', name: 'ASML Holding' },
  { t: 'AVGO', name: 'Broadcom' },
  { t: 'BX', name: 'Blackstone' },
  { t: 'CBRS', name: 'Cerebras Systems' },
  { t: 'CEG', name: 'Constellation Energy' },
  { t: 'COST', name: 'Costco Wholesale' },
  { t: 'CRWD', name: 'CrowdStrike' },
  { t: 'CRWV', name: 'CoreWeave' },
  { t: 'FIX', name: 'Comfort Systems USA' },
  { t: 'GOOG', name: 'Alphabet (Class C)' },
  { t: 'LOGI', name: 'Logitech International' },
  { t: 'META', name: 'Meta Platforms' },
  { t: 'MSFT', name: 'Microsoft' },
  { t: 'MU', name: 'Micron Technology' },
  { t: 'NFLX', name: 'Netflix' },
  { t: 'NOW', name: 'ServiceNow' },
  { t: 'NVDA', name: 'NVIDIA' },
  { t: 'ORCL', name: 'Oracle' },
  { t: 'PANW', name: 'Palo Alto Networks' },
  { t: 'PRME', name: 'Prime Medicine' },
  { t: 'SKHY', name: 'SK hynix (ADR)' },
  { t: 'TSM', name: 'Taiwan Semiconductor (ADR)' },
  { t: 'WMT', name: 'Walmart' },
])

export const WATCHLIST_ETFS = Object.freeze([
  { t: 'ESML', name: 'iShares ESG Aware MSCI USA Small-Cap' },
  { t: 'GRID', name: 'First Trust Clean Edge Smart Grid Infrastructure' },
  { t: 'IGM', name: 'iShares Expanded Tech Sector' },
  { t: 'IGV', name: 'iShares Expanded Tech-Software Sector' },
  { t: 'IXN', name: 'iShares Global Tech' },
  { t: 'QTEC', name: 'First Trust Nasdaq-100 Technology Sector' },
  { t: 'SOXQ', name: 'Invesco PHLX Semiconductor' },
  { t: 'VCIT', name: 'Vanguard Intermediate-Term Corporate Bond' },
  { t: 'VSGX', name: 'Vanguard ESG International Stock' },
  { t: 'XAR', name: 'SPDR S&P Aerospace & Defense' },
  { t: 'XLI', name: 'Industrial Select Sector SPDR' },
  { t: 'XLV', name: 'Health Care Select Sector SPDR' },
])

export const DEFAULT_WATCHLIST = Object.freeze([...WATCHLIST_STOCKS, ...WATCHLIST_ETFS].map(e => e.t))
