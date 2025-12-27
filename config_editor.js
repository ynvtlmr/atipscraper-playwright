const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const net = require('net');
const ejs = require('ejs');

const DEFAULT_PORT = 3000;
const FILE_PATH = path.join(process.cwd(), 'form_data.json');
const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'config_form.ejs');

/**
 * Finds the first available port counting up from startPort.
 * @param {number} startPort 
 * @returns {Promise<number>}
 */
function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref(); // Don't let this keep the process alive
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
    });
}

// Render the EJS template (async)
async function getHtml(data, message = '') {
    try {
        const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');
        return ejs.render(template, { data, message });
    } catch (e) {
        return `<h1>Error loading template</h1><pre>${e.message}</pre>`;
    }
}

// Load existing config (async)
async function loadConfig() {
    try {
        const content = await fs.readFile(FILE_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (e) {
        if (e.code === 'ENOENT') {
            return {}; // Return empty config if file doesn't exist
        }
        console.error("Error reading config:", e);
        return {};
    }
}

// Save config (async)
async function saveConfig(data) {
    await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper: Parse URL-encoded body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        const MAX_BODY_SIZE = 1024 * 100; // 100KB limit
        
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > MAX_BODY_SIZE) {
                req.destroy();
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const data = {};
            for (const [key, value] of params.entries()) {
                data[key] = value;
            }
            resolve(data);
        });
        req.on('error', reject);
    });
}

/**
 * Starts the configuration server.
 * @param {Function} onStart - Callback function when user clicks "Start Scraper". Receives { mode: 'test'|'live' }
 */
async function startConfigServer(onStart) {
    const port = await findAvailablePort(DEFAULT_PORT);
    
    const server = http.createServer(async (req, res) => {
        try {
            if (req.method === 'GET' && req.url === '/') {
                const data = await loadConfig();
                const html = await getHtml(data);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } 
            else if (req.method === 'POST' && req.url === '/save') {
                const formData = await parseBody(req);
                await saveConfig(formData);
                const html = await getHtml(formData, 'Configuration Saved Successfully!');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } 
            else if (req.method === 'POST' && req.url === '/start') {
                const body = await parseBody(req);
                const mode = body.mode || 'test';
                const headless = body.headless === 'true';
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<h1>Scraper Started in ${mode.toUpperCase()} Mode!</h1><p>Check the console/logs for progress...</p>`);
                
                // Trigger the callback with mode
                if (onStart) onStart({ mode, headless });
            }
            else {
                res.writeHead(404);
                res.end('Not Found');
            }
        } catch (err) {
            console.error('Server error:', err);
            res.writeHead(500);
            res.end(`Server Error: ${err.message}`);
        }
    });

    server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(`Config Editor running at ${url}`);
        
        // Auto-open browser
        const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        exec(`${startCmd} ${url}`);
    });
}

// Allow standalone execution if running directly
if (require.main === module) {
    startConfigServer(() => console.log("Start triggered in standalone mode."));
}

module.exports = { startConfigServer };
