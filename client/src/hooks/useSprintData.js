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

  useEffect(() => {
    let cancelled = false;

    async function loadSprints() {
      try {
        const data = await fetchSprints();
        if (cancelled) return;

        const list = data.sprints || [];
        setSprints(list);

        // Auto-select the current sprint
        const current = list.find((s) => s.current) || list[0];
        if (current) setSelectedSprintId(current.id);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadSprints();
    return () => { cancelled = true; };
  }, []);

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
    if (!selectedSprintId) return;

    setLoading(true);
    setError(null);
    cacheRef.current = {}; // flush client cache

    try {
      await apiInvalidateCache();
      const data = await fetchSprintSummary(selectedSprintId);
      cacheRef.current[selectedSprintId] = data;
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

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
