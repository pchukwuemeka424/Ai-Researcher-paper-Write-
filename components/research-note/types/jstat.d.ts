/**
 * Minimal ambient types for the bits of jStat we use. jStat ships no types and
 * @types/jstat is stale, so we declare just our surface here — keeps the
 * dependency count down and the usage type-checked.
 */
declare module 'jstat' {
  export const jStat: {
    mean(arr: number[]): number
    median(arr: number[]): number
    /** Population by default; pass true for the sample (n-1) estimate. */
    stdev(arr: number[], sample?: boolean): number
    variance(arr: number[], sample?: boolean): number
    min(arr: number[]): number
    max(arr: number[]): number
    sum(arr: number[]): number
    /** Returns [Q1, Q2 (median), Q3]. */
    quartiles(arr: number[]): [number, number, number]
    corrcoeff(x: number[], y: number[]): number
    studentt: { cdf(x: number, dof: number): number; inv(p: number, dof: number): number }
    centralF: { cdf(x: number, df1: number, df2: number): number }
    chisquare: { cdf(x: number, dof: number): number }
  }
}
