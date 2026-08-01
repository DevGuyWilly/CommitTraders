const DEFAULT_CONTRACT_CODE = '088691' // GOLD
const HEATMAP_MAX_ALPHA = 0.45
const GREEN_RGB = '34, 197, 94'
const RED_RGB = '239, 68, 68'

const numberFormatter = new Intl.NumberFormat('en-US')
const pctFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

function formatSigned(value, formatter) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatter.format(Math.abs(value))}`
}

function signClass(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}

function formatDate(isoDate) {
  // isoDate is YYYY-MM-DD; parse as UTC so the local timezone can't shift it a day
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

function arrowFor(current, previous) {
  if (previous === undefined) return ''
  if (current > previous) return '<span class="arrow up" title="Up from prior week">&#9650;</span>'
  if (current < previous) return '<span class="arrow down" title="Down from prior week">&#9660;</span>'
  return '<span class="arrow flat" title="Unchanged from prior week">&ndash;</span>'
}

function columnRange(rows, accessor) {
  const values = rows.map(accessor)
  return { min: Math.min(...values), max: Math.max(...values) }
}

// Unipolar min-max heat: darker toward the column's own max in the visible window.
function heatColor(value, range, rgb) {
  if (range.max === range.min) return ''
  const intensity = (value - range.min) / (range.max - range.min)
  return `rgba(${rgb}, ${(intensity * HEATMAP_MAX_ALPHA).toFixed(2)})`
}

// Diverging min-max heat for signed columns (Net, Net % of OI): positive
// values shade toward green scaled against the column's max, negative values
// shade toward red scaled against the column's min.
function divergingHeatColor(value, range) {
  if (range.max === range.min) return ''
  if (value > 0 && range.max > 0) {
    return `rgba(${GREEN_RGB}, ${((value / range.max) * HEATMAP_MAX_ALPHA).toFixed(2)})`
  }
  if (value < 0 && range.min < 0) {
    return `rgba(${RED_RGB}, ${((value / range.min) * HEATMAP_MAX_ALPHA).toFixed(2)})`
  }
  return ''
}

function renderRows(rows) {
  const tbody = document.getElementById('cot-table-body')

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="status">No data available yet.</td></tr>'
    return
  }

  const longRange = columnRange(rows, (r) => r.long)
  const shortRange = columnRange(rows, (r) => r.short)
  const netRange = columnRange(rows, (r) => r.net)
  const netPctOiRange = columnRange(rows, (r) => r.netPctOi)

  tbody.innerHTML = rows.map((row, i) => {
    // Direction arrow compares net_pct_oi week-over-week (not raw net),
    // since raw net can occasionally disagree when open interest itself swings.
    const previousNetPctOi = rows[i + 1] ? rows[i + 1].netPctOi : undefined

    return `
      <tr>
        <td>${formatDate(row.date)}</td>
        <td style="background-color:${heatColor(row.long, longRange, GREEN_RGB)}">${numberFormatter.format(row.long)}</td>
        <td style="background-color:${heatColor(row.short, shortRange, RED_RGB)}">${numberFormatter.format(row.short)}</td>
        <td class="${signClass(row.changeLong)}">${formatSigned(row.changeLong, numberFormatter)}</td>
        <td class="${signClass(row.changeShort)}">${formatSigned(row.changeShort, numberFormatter)}</td>
        <td style="background-color:${divergingHeatColor(row.net, netRange)}">${formatSigned(row.net, numberFormatter)}</td>
        <td style="background-color:${divergingHeatColor(row.netPctOi, netPctOiRange)}">${formatSigned(row.netPctOi, pctFormatter)}%${arrowFor(row.netPctOi, previousNetPctOi)}</td>
      </tr>
    `
  }).join('')
}

// Guards against an older, slower request resolving after a newer one and
// clobbering its result — matters more now that stale content stays visible
// (blurred) during the fetch instead of being wiped immediately.
let latestRequestId = 0

async function loadHistory(contractCode) {
  const requestId = ++latestRequestId
  const table = document.getElementById('cot-table')
  const tbody = document.getElementById('cot-table-body')

  // Keep the current rows visible but blurred/dimmed while the new data
  // loads, instead of flashing to a bare "Loading…" row.
  table.classList.add('is-loading')

  try {
    const res = await fetch(`/api/cot-reports/${contractCode}`)
    if (requestId !== latestRequestId) return

    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7" class="status error">No data found (HTTP ${res.status}).</td></tr>`
      return
    }

    const body = await res.json()
    renderRows(body.data)
  } catch (err) {
    if (requestId !== latestRequestId) return
    tbody.innerHTML = '<tr><td colspan="7" class="status error">Failed to load data.</td></tr>'
    console.error(err)
  } finally {
    if (requestId === latestRequestId) table.classList.remove('is-loading')
  }
}

async function loadInstrumentOptions() {
  const select = document.getElementById('instrument-select')

  try {
    const res = await fetch('/api/cot-reports')
    if (!res.ok) return

    const instruments = await res.json()
    instruments.sort((a, b) => a.instrument.localeCompare(b.instrument))

    select.innerHTML = instruments
      .map((inst) => `<option value="${inst.contractCode}">${inst.instrument}</option>`)
      .join('')

    const hasDefault = instruments.some((inst) => inst.contractCode === DEFAULT_CONTRACT_CODE)
    select.value = hasDefault ? DEFAULT_CONTRACT_CODE : (instruments[0]?.contractCode ?? '')

    select.addEventListener('change', () => {
      loadHistory(select.value)
    })
  } catch (err) {
    console.error('Failed to load instrument list', err)
  }
}

loadInstrumentOptions()
loadHistory(DEFAULT_CONTRACT_CODE)
