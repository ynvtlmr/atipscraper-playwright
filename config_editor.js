const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const FILE_PATH = path.join(process.cwd(), 'form_data.json');

// HTML Template for the Configuration Form
const getHtml = (data, message = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ATIP Scraper Configuration</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f7f6; color: #333; display: flex; justify-content: center; padding: 20px; }
        .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; width: 100%; }
        h1 { text-align: center; color: #2c3e50; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 0.9em; color: #555; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
        input:focus, textarea:focus { border-color: #3498db; outline: none; }
        textarea { resize: vertical; min-height: 80px; }
        button { width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.3s; }
        button:hover { background: #2980b9; }
        .message { padding: 15px; background: #d4edda; color: #155724; border-radius: 4px; margin-bottom: 20px; text-align: center; display: ${message ? 'block' : 'none'}; }
        .help { font-size: 0.8em; color: #888; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>ATIP Configuration Editor</h1>
        <div class="message">${message}</div>
        <form method="POST" action="/save">
            
            <div class="form-group">
                <label for="url">Target URL</label>
                <input type="url" id="url" name="url" value="${data.url || ''}" required placeholder="https://open.canada.ca/en/search/ati?..." pattern="https://.*">
                <div class="help">The search URL from open.canada.ca (Must start with https://)</div>
            </div>

            <div class="form-group">
                <label for="requestor_category">Requestor Category</label>
                <select id="requestor_category" name="requestor_category">
                    <option value="Member of the Public" ${data.requestor_category === 'Member of the Public' ? 'selected' : ''}>Member of the Public</option>
                    <option value="Media" ${data.requestor_category === 'Media' ? 'selected' : ''}>Media</option>
                    <option value="Academia" ${data.requestor_category === 'Academia' ? 'selected' : ''}>Academia</option>
                    <option value="Business" ${data.requestor_category === 'Business' ? 'selected' : ''}>Business</option>
                    <option value="Organization" ${data.requestor_category === 'Organization' ? 'selected' : ''}>Organization</option>
                </select>
            </div>

            <div class="form-group">
                <label for="delivery_method">Delivery Method</label>
                <select id="delivery_method" name="delivery_method">
                    <option value="Electronic Copy" ${data.delivery_method === 'Electronic Copy' ? 'selected' : ''}>Electronic Copy</option>
                    <option value="Paper Copy" ${data.delivery_method === 'Paper Copy' ? 'selected' : ''}>Paper Copy</option>
                </select>
            </div>

            <div style="display: flex; gap: 20px;">
                <div class="form-group" style="flex: 1;">
                    <label for="given_name">Given Name</label>
                    <input type="text" id="given_name" name="given_name" value="${data.given_name || ''}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label for="family_name">Family Name</label>
                    <input type="text" id="family_name" name="family_name" value="${data.family_name || ''}">
                </div>
            </div>

            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" value="${data.email || ''}">
            </div>

            <div class="form-group">
                <label for="phone">Telephone Number</label>
                <input type="tel" id="phone" name="phone" value="${data.phone || ''}">
            </div>

            <div class="form-group">
                <label for="address">Mailing Address</label>
                <input type="text" id="address" name="address" value="${data.address || ''}">
            </div>

            <div class="form-group">
                <label for="address_2">Address Line 2 (Optional)</label>
                <input type="text" id="address_2" name="address_2" value="${data.address_2 || ''}">
            </div>

            <div style="display: flex; gap: 20px;">
                <div class="form-group" style="flex: 2;">
                    <label for="city">City</label>
                    <input type="text" id="city" name="city" value="${data.city || ''}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label for="postal_code">Postal Code</label>
                    <input type="text" id="postal_code" name="postal_code" value="${data.postal_code || ''}">
                </div>
            </div>

            <div style="display: flex; gap: 20px;">
                <div class="form-group" style="flex: 1;">
                    <label for="state_province">Province</label>
                    <input type="text" id="state_province" name="state_province" value="${data.state_province || ''}">
                </div>
                <div class="form-group" style="flex: 1;">
                    <label for="country">Country</label>
                    <input type="text" id="country" name="country" value="${data.country || 'Canada'}">
                </div>
            </div>

            <div class="form-group">
                <label for="preferred_language">Preferred Language</label>
                 <select id="preferred_language" name="preferred_language">
                    <option value="English" ${data.preferred_language === 'English' ? 'selected' : ''}>English</option>
                    <option value="French" ${data.preferred_language === 'French' ? 'selected' : ''}>French</option>
                </select>
            </div>
             <div class="form-group">
                <label for="consent">Consent</label>
                 <select id="consent" name="consent">
                    <option value="Yes" ${data.consent === 'Yes' ? 'selected' : ''}>Yes</option>
                    <option value="No" ${data.consent === 'No' ? 'selected' : ''}>No</option>
                </select>
            </div>

            <div class="form-group">
                <label for="additional_comments">Additional Comments</label>
                <textarea id="additional_comments" name="additional_comments">${data.additional_comments || ''}</textarea>
            </div>

            <button type="submit">Save Configuration</button>
        </form>
    </div>
</body>
</html>
`;

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
            res.end(getHtml(formData, 'Configuration Saved Successfully! You can now close this window and run the scraper.'));
        } catch (err) {
            res.writeHead(500);
            res.end(`Error Saving: ${err.message}`);
        }
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Config Editor running at ${url}`);
    
    // Auto-open browser
    const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} ${url}`);
});
