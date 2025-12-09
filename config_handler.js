// config_handler.js

const fs = require('fs/promises');
const path = require('path');

const CONFIG_FILE = path.join(process.cwd(), 'form_data.json');

async function loadFormData() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: Configuration file '${CONFIG_FILE}' not found. Please create it and fill your details.`);
            process.exit(1);
        }
        console.error(`Error loading configuration: ${error.message}`);
        process.exit(1);
    }
}

module.exports = {
    loadFormData,
};