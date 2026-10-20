/**
 * Shared helpers for the Smart Medicine Lookup feature.
 */

/** Relative API base - Vite proxies /api to the Node backend in development. */
export const API_BASE = '/api'

/** External 1mg search link. Opens in a new tab wherever it is used. */
export function oneMgSearchUrl(name) {
  return `https://www.1mg.com/search/all?name=${encodeURIComponent(name)}`
}

/** Shown wherever medicine data is displayed. */
export const DEMO_DISCLAIMER =
  '⚠️ Educational Demo Only: This is sample data. Do not use for real medical decisions.'
