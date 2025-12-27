// browser_registry.js
// Simple registry to track open browser instances for cleanup on SIGINT

const browsers = new Set();

/**
 * Register a browser instance for cleanup tracking.
 * @param {import('playwright').Browser} browser 
 */
function register(browser) {
    browsers.add(browser);
}

/**
 * Unregister a browser instance (call when browser is closed normally).
 * @param {import('playwright').Browser} browser 
 */
function unregister(browser) {
    browsers.delete(browser);
}

/**
 * Close all registered browser instances.
 * @returns {Promise<void>}
 */
async function closeAll() {
    const closePromises = [];
    for (const browser of browsers) {
        if (browser.isConnected()) {
            closePromises.push(browser.close().catch(() => {}));
        }
    }
    await Promise.all(closePromises);
    browsers.clear();
}

/**
 * Get the count of registered browsers.
 * @returns {number}
 */
function count() {
    return browsers.size;
}

module.exports = {
    register,
    unregister,
    closeAll,
    count,
};
