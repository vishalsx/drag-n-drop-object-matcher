// Contest Analytics Service
// Handles API communication for analytics submission with retry logic

import type {
    ContestAttemptAnalytics,
    AnalyticsSubmissionResponse,
    QueuedAnalytics
} from '../types/analyticsTypes';

// Get API base URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || 'http://localhost:8081';

const QUEUE_STORAGE_KEY = 'contest_analytics_queue';
const MAX_QUEUE_SIZE = 10;
const MAX_RETRIES = 3;

/**
 * Contest Analytics Service
 * Manages submission of analytics data to backend with retry logic
 */
export const analyticsService = {
    /**
     * Submit contest analytics to backend
     * @param analytics - Contest attempt analytics data
     * @param token - JWT authentication token
     * @returns Submission response with attempt_id
     */
    async submitContestAnalytics(
        analytics: ContestAttemptAnalytics,
        token: string
    ): Promise<AnalyticsSubmissionResponse> {
        console.log(`[Analytics Service] Attempting submission to ${API_BASE_URL}/analytics/contest-attempt`);
        try {
            const response = await fetch(`${API_BASE_URL}/analytics/contest-attempt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(analytics)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Analytics submission failed (${response.status}): ${errorText}`);
            }

            const result: AnalyticsSubmissionResponse = await response.json();
            console.log('[Analytics Service] Submitted successfully:', result.attempt_id);

            return result;
        } catch (error) {
            console.error('[Analytics Service] Submission failed:', error);

            // Queue for retry on failure
            this.queueFailedSubmission(analytics);

            throw error;
        }
    },

    /**
     * Queue failed submission for later retry
     * @param analytics - Analytics data to queue
     */
    queueFailedSubmission(analytics: ContestAttemptAnalytics): void {
        try {
            const queue = this.getFailedQueue();

            // Prevent queue from growing too large
            if (queue.length >= MAX_QUEUE_SIZE) {
                console.warn('[Analytics Service] Queue full, dropping oldest item');
                queue.shift();
            }

            queue.push({
                analytics,
                timestamp: new Date().toISOString(),
                retries: 0
            });

            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
            console.log(`[Analytics Service] Queued for retry (queue size: ${queue.length})`);
        } catch (error) {
            console.error('[Analytics Service] Failed to queue analytics:', error);
        }
    },

    /**
     * Get failed submission queue from localStorage
     * @returns Array of queued analytics
     */
    getFailedQueue(): QueuedAnalytics[] {
        try {
            const queueJson = localStorage.getItem(QUEUE_STORAGE_KEY);
            if (!queueJson) return [];

            const queue = JSON.parse(queueJson) as QueuedAnalytics[];

            // Filter out old items (> 7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            return queue.filter(item => {
                const itemTime = new Date(item.timestamp).getTime();
                return itemTime > sevenDaysAgo;
            });
        } catch (error) {
            console.error('[Analytics Service] Failed to read queue:', error);
            return [];
        }
    },

    /**
     * Retry all failed submissions in queue
     * @param token - JWT authentication token
     */
    async retryFailedSubmissions(token: string): Promise<void> {
        const queue = this.getFailedQueue();

        if (queue.length === 0) {
            return;
        }

        console.log(`[Analytics Service] Retrying ${queue.length} failed submission(s)...`);

        const remainingQueue: QueuedAnalytics[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const item of queue) {
            try {
                // Don't use queueing logic for retries to avoid infinite loop
                const response = await fetch(`${API_BASE_URL}/analytics/contest-attempt`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(item.analytics)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('[Analytics Service] Retry successful:', result.attempt_id);
                    successCount++;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                // Keep in queue if under retry limit
                if (item.retries < MAX_RETRIES) {
                    remainingQueue.push({
                        ...item,
                        retries: item.retries + 1
                    });
                } else {
                    console.warn('[Analytics Service] Dropping analytics after max retries:', error);
                }
                failCount++;
            }
        }

        // Update queue with remaining items
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));

        console.log(
            `[Analytics Service] Retry complete: ${successCount} succeeded, ` +
            `${failCount} failed, ${remainingQueue.length} queued`
        );
    },

    /**
     * Get queue size
     * @returns Number of items in queue
     */
    getQueueSize(): number {
        return this.getFailedQueue().length;
    },

    /**
     * Clear the entire queue (use with caution)
     */
    clearQueue(): void {
        localStorage.removeItem(QUEUE_STORAGE_KEY);
        console.log('[Analytics Service] Queue cleared');
    },

    /**
     * Get analytics for a specific contest and user
     * @param contestId - Contest ID
     * @param userId - User ID
     * @param token - JWT authentication token
     * @returns Array of analytics attempts
     */
    async getUserAnalytics(
        contestId: string,
        userId: string,
        token: string
    ): Promise<ContestAttemptAnalytics[]> {
        try {
            const response = await fetch(
                `${API_BASE_URL}/analytics/contest/${contestId}/user/${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch analytics: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[Analytics Service] Failed to fetch user analytics:', error);
            throw error;
        }
    }
};
