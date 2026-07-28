/**
 * useSprintData — central data hook for the dashboard.
 *
 * Responsibilities:
 *   1. Fetch sprint list on mount
 *   2. Fetch analytics when selected sprint changes
 *   3. Expose loading / error / retry
 *   4. Client-side cache to avoid re-fetching on tab switches
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchSprints,
  fetchSprintSummary,
  invalidateCache as apiInvalidateCache,
} from "../services/api.js";

export default function useSprintData() {
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Client-side cache: { [sprintId]: analyticsData }
  const cacheRef = useRef({});

  // ── Load sprint list ─────────────────────────────────────────────

  /**
   * Fetch the sprint list and auto-select the current sprint.
   * Returns the selected sprint id, or null if there was nothing to select —
   * callers use that to decide whether anything downstream will clear `loading`.
   */
  const loadSprints = useCallback(async () => {
    try {
      const data = await fetchSprints();
      const list = data.sprints || [];
      setSprints(list);

      const current = list.find((s) => s.current) || list[0];
      if (!current) return null;

      setSelectedSprintId(current.id);
      return current.id;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const sprintId = await loadSprints();
      // With no sprint selected the analytics effect below bails out, so this
      // is the only place that can take the UI out of its initial loading
      // state — otherwise a failed sprint list leaves the skeleton spinning.
      if (!cancelled && !sprintId) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [loadSprints]);

  // ── Load analytics when sprint changes ───────────────────────────

  useEffect(() => {
    if (!selectedSprintId) return;
    let cancelled = false;

    async function loadAnalytics() {
      // Check client cache first
      if (cacheRef.current[selectedSprintId]) {
        setAnalytics(cacheRef.current[selectedSprintId]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchSprintSummary(selectedSprintId);
        if (cancelled) return;

        cacheRef.current[selectedSprintId] = data;
        setAnalytics(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { cancelled = true; };
  }, [selectedSprintId]);

  // ── Refresh: clear server + client cache, re-fetch ───────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    cacheRef.current = {}; // flush client cache

    try {
      await apiInvalidateCache();
    } catch {
      // Best-effort: a stale server cache shouldn't block the re-fetch below.
    }

    if (!selectedSprintId) {
      // Nothing selected means the sprint list itself failed to load. Retry
      // that instead of returning early — the analytics effect picks up the
      // new selection from here.
      const sprintId = await loadSprints();
      if (!sprintId) setLoading(false);
      return;
    }

    try {
      const data = await fetchSprintSummary(selectedSprintId);
      cacheRef.current[selectedSprintId] = data;
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId, loadSprints]);

  // ── Select a different sprint ────────────────────────────────────

  const selectSprint = useCallback((sprintId) => {
    setSelectedSprintId(sprintId);
  }, []);

  return {
    sprints,
    selectedSprintId,
    selectSprint,
    analytics,
    loading,
    error,
    refresh,
  };
}
