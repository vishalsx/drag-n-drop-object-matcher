// Device and Network Detection Utilities

interface DeviceInfo {
    platform: string;
    browser: string;
    app_version: string;
    network_type: string;
    screen_resolution: string;
    viewport_size: string;
    user_agent: string;
}

/**
 * Detect comprehensive device and network information
 */
export const detectDeviceInfo = (): DeviceInfo => {
    // Detect platform
    const platform = navigator.platform ||
        ((navigator as any).userAgentData?.platform) ||
        'unknown';

    // Detect browser and version
    const ua = navigator.userAgent;
    let browser = 'unknown';

    if (ua.includes('Chrome') && !ua.includes('Edg')) {
        const version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
        browser = `Chrome ${version}`;
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        const version = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
        browser = `Safari ${version}`;
    } else if (ua.includes('Firefox')) {
        const version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
        browser = `Firefox ${version}`;
    } else if (ua.includes('Edg')) {
        const version = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
        browser = `Edge ${version}`;
    }

    // Get app version from environment or default
    const app_version = import.meta.env.VITE_APP_VERSION || '1.0.0';

    // Detect network type using Network Information API
    const connection = (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
    const network_type = connection?.effectiveType || 'unknown';

    // Screen resolution
    const screen_resolution = `${screen.width}x${screen.height}`;

    // Viewport size
    const viewport_size = `${window.innerWidth}x${window.innerHeight}`;

    return {
        platform,
        browser,
        app_version,
        network_type,
        screen_resolution,
        viewport_size,
        user_agent: ua
    };
};

/**
 * Generate a unique session ID for this browser session
 * Call once per page load and store in memory
 */
export const generateSessionId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `sess_${timestamp}_${random}`;
};

/**
 * Get client timezone offset in ISO format
 * Example: "+05:30" or "-08:00"
 */
export const getClientTimezone = (): string => {
    const offset = -new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Get current timestamp in ISO 8601 format
 */
export const getISOTimestamp = (): string => {
    return new Date().toISOString();
};
