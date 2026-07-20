import { jStat } from 'jstat'

/**
 * Statistics engine for the spreadsheet. Thin, well-labelled wrappers over
 * jStat for descriptives + distributions, with the inferential tests
 * (regression, Welch t-test, one-way ANOVA) computed explicitly so the formulas
 * are auditable. Every test returns a two-tailed p-value where applicable.
 */

export class StatsError extends Error {}

/** Drop null/NaN and coerce to finite numbers. */
export function cleanNumbers(values: Array<number | string | null>): number[] {
  const out: number[] = []
  for (const v of values) {
    if (v === null || v === '') continue
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

export interface Descriptives {
  n: number
  mean: number
  median: number
  sd: number
  se: number
  ci95lo: number
  ci95hi: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  sum: number
}

export function describe(raw: Array<number | string | null>): Descriptives {
  const x = cleanNumbers(raw)
  if (x.length === 0) throw new StatsError('No numeric values in this column.')
  const [q1, , q3] = jStat.quartiles(x)
  const n = x.length
  const mean = jStat.mean(x)
  const sd = n > 1 ? jStat.stdev(x, true) : 0
  const se = n > 1 ? sd / Math.sqrt(n) : 0
  // 95% CI for the mean using the t distribution (df = n-1).
  const tCrit = n > 1 ? jStat.studentt.inv(0.975, n - 1) : 0
  return {
    n,
    mean,
    median: jStat.median(x),
    sd,
    se,
    ci95lo: mean - tCrit * se,
    ci95hi: mean + tCrit * se,
    min: jStat.min(x),
    max: jStat.max(x),
    q1,
    q3,
    iqr: q3 - q1,
    skewness: sampleSkewness(x, mean, sd),
    sum: jStat.sum(x),
  }
}

/** Pair two columns row-wise, keeping only rows numeric in both. */
function pairwise(
  aRaw: Array<number | string | null>,
  bRaw: Array<number | string | null>,
): { a: number[]; b: number[] } {
  const a: number[] = []
  const b: number[] = []
  const len = Math.min(aRaw.length, bRaw.length)
  for (let i = 0; i < len; i++) {
    const av = aRaw[i]
    const bv = bRaw[i]
    const an = av === null || av === '' ? NaN : Number(av)
    const bn = bv === null || bv === '' ? NaN : Number(bv)
    if (Number.isFinite(an) && Number.isFinite(bn)) {
      a.push(an)
      b.push(bn)
    }
  }
  return { a, b }
}

export interface CorrelationResult {
  n: number
  r: number
  r2: number
  p: number
}

export function correlation(
  xRaw: Array<number | string | null>,
  yRaw: Array<number | string | null>,
): CorrelationResult {
  const { a: x, b: y } = pairwise(xRaw, yRaw)
  if (x.length < 3)
    throw new StatsError('Need at least 3 paired numeric rows for correlation.')
  const r = jStat.corrcoeff(x, y)
  const n = x.length
  // t-test for the correlation coefficient (df = n - 2).
  const denom = 1 - r * r
  const t = denom <= 0 ? Infinity : r * Math.sqrt((n - 2) / denom)
  const p = twoTailedT(Math.abs(t), n - 2)
  return { n, r, r2: r * r, p }
}

export interface RegressionResult {
  n: number
  slope: number
  intercept: number
  r2: number
}

/** Ordinary least squares: y = slope·x + intercept. */
export function linearRegression(
  xRaw: Array<number | string | null>,
  yRaw: Array<number | string | null>,
): RegressionResult {
  const { a: x, b: y } = pairwise(xRaw, yRaw)
  if (x.length < 3)
    throw new StatsError('Need at least 3 paired numeric rows for regression.')
  const n = x.length
  const mx = jStat.mean(x)
  const my = jStat.mean(y)
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my)
    sxx += (x[i] - mx) ** 2
  }
  if (sxx === 0) throw new StatsError('Predictor column has no variance.')
  const slope = sxy / sxx
  const intercept = my - slope * mx
  const r = jStat.corrcoeff(x, y)
  return { n, slope, intercept, r2: r * r }
}

export interface TTestResult {
  meanA: number
  meanB: number
  t: number
  df: number
  p: number
}

/** Welch's two-sample t-test (does not assume equal variances). */
export function welchTTest(
  aRaw: Array<number | string | null>,
  bRaw: Array<number | string | null>,
): TTestResult {
  const a = cleanNumbers(aRaw)
  const b = cleanNumbers(bRaw)
  if (a.length < 2 || b.length < 2)
    throw new StatsError('Each group needs at least 2 numeric values.')
  const ma = jStat.mean(a)
  const mb = jStat.mean(b)
  const va = jStat.variance(a, true)
  const vb = jStat.variance(b, true)
  const na = a.length
  const nb = b.length
  const se = Math.sqrt(va / na + vb / nb)
  if (se === 0) throw new StatsError('No variance in the data; t is undefined.')
  const t = (ma - mb) / se
  const df =
    (va / na + vb / nb) ** 2 /
    ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1))
  return { meanA: ma, meanB: mb, t, df, p: twoTailedT(Math.abs(t), df) }
}

export interface AnovaResult {
  f: number
  dfBetween: number
  dfWithin: number
  p: number
  groupMeans: number[]
}

/** One-way ANOVA across k groups. */
export function oneWayAnova(groupsRaw: Array<Array<number | string | null>>): AnovaResult {
  const groups = groupsRaw.map(cleanNumbers).filter((g) => g.length > 0)
  if (groups.length < 2)
    throw new StatsError('Need at least 2 non-empty groups for ANOVA.')
  const all = groups.flat()
  const N = all.length
  const k = groups.length
  if (N - k <= 0) throw new StatsError('Not enough data points for ANOVA.')
  const grand = jStat.mean(all)
  const groupMeans = groups.map((g) => jStat.mean(g))
  let ssb = 0
  let ssw = 0
  groups.forEach((g, i) => {
    ssb += g.length * (groupMeans[i] - grand) ** 2
    for (const v of g) ssw += (v - groupMeans[i]) ** 2
  })
  const dfBetween = k - 1
  const dfWithin = N - k
  const msb = ssb / dfBetween
  const msw = ssw / dfWithin
  if (msw === 0) throw new StatsError('No within-group variance; F is undefined.')
  const f = msb / msw
  const p = 1 - jStat.centralF.cdf(f, dfBetween, dfWithin)
  return { f, dfBetween, dfWithin, p, groupMeans }
}

/** Sample skewness (Fisher–Pearson) — a shape/normality cue. */
function sampleSkewness(x: number[], mean: number, sd: number): number {
  const n = x.length
  if (n < 3 || sd === 0) return 0
  const m3 = x.reduce((s, v) => s + (v - mean) ** 3, 0) / n
  return m3 / sd ** 3
}

export interface OneSampleTResult {
  n: number
  mean: number
  mu: number
  t: number
  df: number
  p: number
}

/** One-sample t-test: is the column mean different from a hypothesised value μ? */
export function oneSampleTTest(raw: Array<number | string | null>, mu: number): OneSampleTResult {
  const x = cleanNumbers(raw)
  if (x.length < 2) throw new StatsError('Need at least 2 numeric values.')
  const n = x.length
  const mean = jStat.mean(x)
  const sd = jStat.stdev(x, true)
  const se = sd / Math.sqrt(n)
  if (se === 0) throw new StatsError('No variance in the data; t is undefined.')
  const t = (mean - mu) / se
  const df = n - 1
  return { n, mean, mu, t, df, p: twoTailedT(Math.abs(t), df) }
}

export interface PairedTResult {
  n: number
  meanDiff: number
  t: number
  df: number
  p: number
}

/** Paired (dependent) t-test on the row-wise differences of two columns. */
export function pairedTTest(
  aRaw: Array<number | string | null>,
  bRaw: Array<number | string | null>,
): PairedTResult {
  const { a, b } = pairwise(aRaw, bRaw)
  if (a.length < 2) throw new StatsError('Need at least 2 paired numeric rows.')
  const diffs = a.map((v, i) => v - b[i])
  const n = diffs.length
  const meanDiff = jStat.mean(diffs)
  const sd = jStat.stdev(diffs, true)
  const se = sd / Math.sqrt(n)
  if (se === 0) throw new StatsError('The paired differences have no variance.')
  const t = meanDiff / se
  const df = n - 1
  return { n, meanDiff, t, df, p: twoTailedT(Math.abs(t), df) }
}

export interface SpearmanResult {
  n: number
  rho: number
  p: number
}

/** Spearman's rank correlation (nonparametric, monotonic association). */
export function spearman(
  xRaw: Array<number | string | null>,
  yRaw: Array<number | string | null>,
): SpearmanResult {
  const { a: x, b: y } = pairwise(xRaw, yRaw)
  if (x.length < 3) throw new StatsError('Need at least 3 paired numeric rows.')
  const rx = ranks(x)
  const ry = ranks(y)
  const rho = jStat.corrcoeff(rx, ry)
  const n = x.length
  const denom = 1 - rho * rho
  const t = denom <= 0 ? Infinity : rho * Math.sqrt((n - 2) / denom)
  return { n, rho, p: twoTailedT(Math.abs(t), n - 2) }
}

/** Fractional (tie-averaged) ranks of an array. */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((p, q) => p.v - q.v)
  const r = new Array<number>(values.length)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j++
    const avg = (i + j) / 2 + 1 // average rank (1-based) for ties
    for (let k = i; k <= j; k++) r[order[k].i] = avg
    i = j + 1
  }
  return r
}

export interface ChiSquareResult {
  chi2: number
  df: number
  p: number
  rows: string[]
  cols: string[]
  observed: number[][]
}

/** Chi-square test of independence between two categorical columns. */
export function chiSquareIndependence(
  rowRaw: Array<string | number | null>,
  colRaw: Array<string | number | null>,
): ChiSquareResult {
  const rowCats: string[] = []
  const colCats: string[] = []
  const table = new Map<string, number>()
  const len = Math.min(rowRaw.length, colRaw.length)
  for (let i = 0; i < len; i++) {
    const rv = rowRaw[i]
    const cv = colRaw[i]
    if (rv === null || rv === '' || cv === null || cv === '') continue
    const r = String(rv)
    const c = String(cv)
    if (!rowCats.includes(r)) rowCats.push(r)
    if (!colCats.includes(c)) colCats.push(c)
    table.set(`${r} ${c}`, (table.get(`${r} ${c}`) ?? 0) + 1)
  }
  if (rowCats.length < 2 || colCats.length < 2)
    throw new StatsError('Each categorical column needs at least 2 distinct values.')
  const observed = rowCats.map((r) => colCats.map((c) => table.get(`${r} ${c}`) ?? 0))
  const rowSums = observed.map((r) => r.reduce((a, b) => a + b, 0))
  const colSums = colCats.map((_, j) => observed.reduce((a, r) => a + r[j], 0))
  const total = rowSums.reduce((a, b) => a + b, 0)
  if (total === 0) throw new StatsError('No paired categorical rows.')
  let chi2 = 0
  for (let i = 0; i < rowCats.length; i++) {
    for (let j = 0; j < colCats.length; j++) {
      const exp = (rowSums[i] * colSums[j]) / total
      if (exp > 0) chi2 += (observed[i][j] - exp) ** 2 / exp
    }
  }
  const df = (rowCats.length - 1) * (colCats.length - 1)
  const p = Math.max(0, Math.min(1, 1 - jStat.chisquare.cdf(chi2, df)))
  return { chi2, df, p, rows: rowCats, cols: colCats, observed }
}

/** Two-tailed p-value from a t statistic and degrees of freedom. */
function twoTailedT(absT: number, df: number): number {
  if (!Number.isFinite(absT)) return 0
  return Math.max(0, Math.min(1, 2 * (1 - jStat.studentt.cdf(absT, df))))
}

/** Compact formatter for p-values in the UI. */
export function formatP(p: number): string {
  if (p < 0.001) return 'p < 0.001'
  return `p = ${p.toFixed(3)}`
}
