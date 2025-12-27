// config_handler.js

const fs = require('fs/promises');
const path = require('path');

const CONFIG_FILE = path.join(process.cwd(), 'form_data.json');

// Required fields for a valid configuration
const REQUIRED_FIELDS = ['url'];

// Optional fields with expected types (for validation warnings)
const KNOWN_FIELDS = [
    'url', 'requestor_category', 'delivery_method', 'given_name', 'family_name',
    'email', 'phone', 'address', 'address_2', 'city', 'postal_code',
    'state_province', 'country', 'preferred_language', 'consent',
    'additional_comments', 'countdown_seconds'
];

/**
 * Validates the configuration object.
 * @param {Object} config - The parsed configuration
 * @throws {Error} If required fields are missing
 */
function validateConfig(config) {
    if (!config || typeof config !== 'object') {
        throw new Error('Configuration must be a valid object.');
    }

    const missingFields = REQUIRED_FIELDS.filter(field => !config[field]);
    if (missingFields.length > 0) {
        throw new Error(`Missing required configuration field(s): ${missingFields.join(', ')}`);
    }

    // Validate URL format
    if (config.url && !config.url.startsWith('https://')) {
        throw new Error("Configuration 'url' must start with 'https://'");
    }

    // Validate countdown_seconds if provided
    if (config.countdown_seconds !== undefined) {
        const countdown = Number(config.countdown_seconds);
        if (isNaN(countdown) || countdown < 1 || countdown > 60) {
            throw new Error("Configuration 'countdown_seconds' must be between 1 and 60");
        }
    }
}

/**
 * Loads and validates form data from the configuration file.
 * @returns {Promise<Object>} The validated configuration object
 * @throws {Error} If file not found, parse error, or validation fails
 */
async function loadFormData() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(data);
        validateConfig(config);
        return config;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Configuration file '${CONFIG_FILE}' not found. Please create it or use the config editor.`);
        }
        if (error instanceof SyntaxError) {
            throw new Error(`Configuration file contains invalid JSON: ${error.message}`);
        }
        // Re-throw validation errors and other errors as-is
        throw error;
    }
}

module.exports = {
    loadFormData,
    validateConfig,
};