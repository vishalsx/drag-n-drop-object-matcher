// Contest Analytics Tracking Hook
// Captures all gameplay events and submits analytics to backend

import { useRef, useCallback, useMemo } from 'react';
import type {
    ContestAttemptAnalytics,
    PictureInteractionMetrics,
    BehavioralMetrics,
    AntiCheatMetrics,
    FocusLossEvent
} from '../types/analyticsTypes';
import { RoundStatus } from '../types/analyticsTypes';
import {
    detectDeviceInfo,
    generateSessionId,
    getClientTimezone,
    getISOTimestamp
} from '../utils/deviceDetection';
import { analyticsService } from '../services/analyticsService';

interface UseContestAnalyticsProps {
    contestId: string | null;
    userId: string | null;
    languageName: string;
    objectIds: string[];
    authToken: string | null;
}

/**
 * Custom hook for tracking contest gameplay analytics
 * 
 * This hook manages all analytics tracking including:
 * - Picture interaction metrics (hints, wrong matches, timing)
 * - Behavioral patterns (tab switches, focus loss)
 * - Anti-cheat detection (copy/paste, rapid guessing)
 * - Device and network information
 * 
 * Usage:
 * ```typescript
 * const analytics = useContestAnalytics({
 *   contestId: "contest_123",
 *   userId: "user_456",
 *   languageName: "Spanish",
 *   objectIds: ["obj_1", "obj_2"],
 *   authToken: userToken
 * });
 * 
 * // Start tracking
 * analytics.startRound();
 * 
 * // Track events
 * analytics.trackHintFlip("obj_1");
 * analytics.trackMatch("obj_1");
 * 
 * // Submit on completion
 * analytics.submitAnalytics(RoundStatus.COMPLETED, finalScore);
 * ```
 */
export const useContestAnalytics = ({
    contestId,
    userId,
    languageName,
    objectIds,
    authToken
}: UseContestAnalyticsProps) => {
    console.log(`[Analytics] Hook initialized for contest: ${contestId}, user: ${userId}, hasToken: ${!!authToken}`);

    // Session ID - generated once per page load
    const sessionId = useMemo(() => generateSessionId(), []);

    // Round start time
    const roundStartTime = useRef<Date | null>(null);

    // Picture interaction tracking - Map of picture_id to metrics
    const pictureMetrics = useRef<Map<string, PictureInteractionMetrics>>(new Map());

    // Behavioral tracking
    const behavior = useRef<BehavioralMetrics>({
        tab_switch_count: 0,
        focus_loss_events: [],
        pause_events: [],
        visibility_changes: 0
    });

    // Anti-cheat tracking
    const antiCheat = useRef<AntiCheatMetrics>({
        copy_paste_attempts: 0,
        rapid_guessing_patterns: [],
        repeated_pattern_score: 0,
        abnormal_timing_flags: [],
        keyboard_mouse_ratio: null,
        suspicious_activity_score: 0
    });

    // Focus loss tracking - when tab loses focus
    const focusLostAt = useRef<Date | null>(null);

    // Track last match time for rapid guessing detection
    const lastMatchTime = useRef<Date | null>(null);
    const recentMatchTimes = useRef<number[]>([]);

    /**
     * Initialize analytics for a new round
     */
    const startRound = useCallback((ids?: string[]) => {
        const targetIds = ids || objectIds;
        console.log(`[Analytics] Starting round tracking with ${targetIds.length} objects`);
        if (targetIds.length === 0) {
            console.warn('[Analytics] ⚠️ Starting round with ZERO objects. Metrics will be empty!');
        }

        roundStartTime.current = new Date();
        lastMatchTime.current = null;
        recentMatchTimes.current = [];

        // Initialize metrics for each picture
        pictureMetrics.current.clear();
        targetIds.forEach(id => {
            pictureMetrics.current.set(id, {
                picture_id: id,
                hint_flip_count: 0,
                wrong_match_attempts: [],
                time_to_match_seconds: null,
                match_timestamp: null
            });
        });

        // Reset behavioral metrics
        behavior.current = {
            tab_switch_count: 0,
            focus_loss_events: [],
            pause_events: [],
            visibility_changes: 0
        };

        // Reset anti-cheat metrics
        antiCheat.current = {
            copy_paste_attempts: 0,
            rapid_guessing_patterns: [],
            repeated_pattern_score: 0,
            abnormal_timing_flags: [],
            keyboard_mouse_ratio: null,
            suspicious_activity_score: 0
        };

        console.log(`[Analytics] Initialized tracking for: ${targetIds.join(', ')}`);
    }, [objectIds]);

    /**
     * Track hint flip for a picture
     */
    const trackHintFlip = useCallback((pictureId: string) => {
        const metrics = pictureMetrics.current.get(pictureId);
        if (metrics) {
            metrics.hint_flip_count++;
            console.log(`[Analytics] Hint flip: ${pictureId} (count: ${metrics.hint_flip_count})`);
        } else {
            console.warn(`[Analytics] Unknown picture ID for hint flip: ${pictureId}`);
        }
    }, []);

    /**
     * Track wrong match attempt
     */
    const trackWrongMatch = useCallback((pictureId: string, matchedWith: string) => {
        const metrics = pictureMetrics.current.get(pictureId);
        if (metrics) {
            metrics.wrong_match_attempts.push({
                matched_with: matchedWith,
                timestamp: getISOTimestamp()
            });
            console.log(`[Analytics] Wrong match: ${pictureId} -> ${matchedWith} (${metrics.wrong_match_attempts.length} total)`);
        } else {
            console.warn(`[Analytics] Unknown picture ID for wrong match: ${pictureId}`);
        }
    }, []);

    /**
     * Track successful match
     */
    const trackMatch = useCallback((pictureId: string) => {
        const metrics = pictureMetrics.current.get(pictureId);
        if (!metrics || !roundStartTime.current) {
            console.warn(`[Analytics] Cannot track match: missing data for ${pictureId}`);
            return;
        }

        const now = new Date();
        metrics.match_timestamp = now.toISOString();
        metrics.time_to_match_seconds =
            (now.getTime() - roundStartTime.current.getTime()) / 1000;

        console.log(`[Analytics] Match: ${pictureId} (${metrics.time_to_match_seconds.toFixed(2)}s from start)`);

        // Check for rapid guessing pattern
        if (lastMatchTime.current) {
            const timeSinceLastMatch = (now.getTime() - lastMatchTime.current.getTime()) / 1000;
            recentMatchTimes.current.push(timeSinceLastMatch);

            // Keep only last 3 match times
            if (recentMatchTimes.current.length > 3) {
                recentMatchTimes.current.shift();
            }

            // If 3+ consecutive matches within 0.5s average, flag as rapid guessing
            if (recentMatchTimes.current.length >= 3) {
                const avgTime = recentMatchTimes.current.reduce((a, b) => a + b, 0) / recentMatchTimes.current.length;
                if (avgTime < 0.5) {
                    const rapidPattern = {
                        picture_ids: [pictureId], // Could track more context if needed
                        average_time_seconds: avgTime,
                        start_timestamp: lastMatchTime.current.toISOString()
                    };
                    antiCheat.current.rapid_guessing_patterns.push(rapidPattern);
                    antiCheat.current.suspicious_activity_score = Math.min(100, antiCheat.current.suspicious_activity_score + 20);
                    console.warn(`[Analytics] Rapid guessing detected: ${avgTime.toFixed(3)}s average`);
                }
            }
        }

        lastMatchTime.current = now;
    }, []);

    /**
     * Track tab visibility change (using Page Visibility API)
     */
    const trackVisibilityChange = useCallback((isVisible: boolean) => {
        behavior.current.visibility_changes++;

        if (!isVisible) {
            // Tab became hidden - start tracking focus loss
            focusLostAt.current = new Date();
            behavior.current.tab_switch_count++;
            console.log('[Analytics] Tab hidden (focus lost)');
        } else if (focusLostAt.current) {
            // Tab became visible - end focus loss tracking
            const duration = (new Date().getTime() - focusLostAt.current.getTime()) / 1000;
            const focusEvent: FocusLossEvent = {
                timestamp: focusLostAt.current.toISOString(),
                duration_seconds: duration
            };
            behavior.current.focus_loss_events.push(focusEvent);
            focusLostAt.current = null;
            console.log(`[Analytics] Tab visible (focus regained after ${duration.toFixed(1)}s)`);
        }
    }, []);

    /**
     * Track copy/paste attempt
     */
    const trackCopyPaste = useCallback(() => {
        antiCheat.current.copy_paste_attempts++;
        antiCheat.current.suspicious_activity_score = Math.min(100, antiCheat.current.suspicious_activity_score + 10);
        console.log(`[Analytics] Copy/paste detected (count: ${antiCheat.current.copy_paste_attempts})`);
    }, []);

    /**
     * Get current analytics state (for debugging)
     */
    const getAnalyticsSnapshot = useCallback(() => {
        return {
            pictureMetrics: Array.from(pictureMetrics.current.values()),
            behavior: behavior.current,
            antiCheat: antiCheat.current,
            roundDuration: roundStartTime.current
                ? (new Date().getTime() - roundStartTime.current.getTime()) / 1000
                : 0
        };
    }, []);

    /**
     * Submit analytics to backend
     */
    const submitAnalytics = useCallback(async (
        roundStatus: RoundStatus,
        finalScore: number
    ): Promise<void> => {
        // Validation
        if (!contestId) {
            console.warn('[Analytics] ⚠️ No contest ID, skipping submission');
            return;
        }

        if (!userId) {
            console.warn('[Analytics] ⚠️ No user ID, skipping submission (payload requires user_id)');
            return;
        }

        if (!authToken) {
            console.warn('[Analytics] ⚠️ No auth token, skipping submission. Token value:', authToken);
            return;
        }

        if (!roundStartTime.current) {
            console.warn('[Analytics] ⚠️ Round not started, skipping submission (roundStartTime is null)');
            return;
        }

        console.log('[Analytics] 📤 Preparing payload for submission...');

        const now = new Date();
        const deviceInfo = detectDeviceInfo();

        // Build analytics payload
        const analytics: ContestAttemptAnalytics = {
            contest_id: contestId,
            user_id: userId,
            language_name: languageName,
            round_number: 1, // TODO: Support multi-round contests
            round_status: roundStatus,
            objects_played: objectIds,
            picture_interactions: Array.from(pictureMetrics.current.values()),
            total_time_seconds: (now.getTime() - roundStartTime.current.getTime()) / 1000,
            score_achieved: finalScore,
            behavioral_metrics: behavior.current,
            device_network_info: deviceInfo,
            anti_cheat_metrics: antiCheat.current,
            started_at: roundStartTime.current.toISOString(),
            completed_at: roundStatus === RoundStatus.COMPLETED ? now.toISOString() : null,
            client_timezone: getClientTimezone(),
            session_id: sessionId
        };

        if (analytics.picture_interactions.length === 0 && analytics.objects_played.length > 0) {
            console.warn('[Analytics] ⚠️ picture_interactions is EMPTY despite having objects. Tracking likely failed.');
        }

        console.log('[Analytics] Submitting analytics payload:', JSON.stringify(analytics, null, 2));

        try {
            const result = await analyticsService.submitContestAnalytics(analytics, authToken);
            console.log('[Analytics] ✅ Submission successful:', result.attempt_id);
        } catch (error) {
            console.error('[Analytics] ❌ Submission failed (queued for retry):', error);
            // Error is already queued by the service, no need to handle here
        }
    }, [contestId, userId, languageName, objectIds, authToken, sessionId]);

    /**
     * Retry any queued failed submissions
     */
    const retryQueuedSubmissions = useCallback(async () => {
        if (!authToken) {
            console.warn('[Analytics] Cannot retry without auth token');
            return;
        }

        const queueSize = analyticsService.getQueueSize();
        if (queueSize === 0) {
            return;
        }

        console.log(`[Analytics] Retrying ${queueSize} queued submission(s)...`);
        await analyticsService.retryFailedSubmissions(authToken);
    }, [authToken]);

    return {
        // Lifecycle
        startRound,

        // Event tracking
        trackHintFlip,
        trackWrongMatch,
        trackMatch,
        trackVisibilityChange,
        trackCopyPaste,

        // Submission
        submitAnalytics,
        retryQueuedSubmissions,

        // Debugging
        getAnalyticsSnapshot
    };
};
