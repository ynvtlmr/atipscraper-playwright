const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const net = require('net');

const DEFAULT_PORT = 3000;
const FILE_PATH = path.join(process.cwd(), 'form_data.json');

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

// HTML Template for the Configuration Form
const ejs = require('ejs');
const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'config_form.ejs');

// Render the EJS template
const getHtml = (data, message = '') => {
    try {
        const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
        return ejs.render(template, { data, message });
    } catch (e) {
        return `<h1>Error loading template</h1><pre>${e.message}</pre>`;
    }
};

// Helper: Parse URL-encoded body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
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
        if (req.method === 'GET' && req.url === '/') {
            try {
                // Read current config, create if not exists
                let data = {};
                try {
                    if (fs.existsSync(FILE_PATH)) {
                        data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
                    }
                } catch (e) { console.error("Error reading config:", e); }

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(getHtml(data));
            } catch (err) {
                res.writeHead(500);
                res.end(`Server Error: ${err.message}`);
            }
        } 
        else if (req.method === 'POST' && req.url === '/save') {
            try {
                const formData = await parseBody(req);
                
                // Save to file
                fs.writeFileSync(FILE_PATH, JSON.stringify(formData, null, 2), 'utf-8');
                
                // Re-render form with success message
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(getHtml(formData, 'Configuration Saved Successfully!'));
            } catch (err) {
                res.writeHead(500);
                res.end(`Error Saving: ${err.message}`);
            }
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
