// main.js

const { loadFormData } = require('./config_handler');
const scrapeLinks = require('./scrape_links');
const transcribeAndSubmit = require('./transcribe');
const fs = require('fs/promises');
const path = require('path');

// --- Helper Pure Functions ---

async function loadSubmittedUrls(filePath) {
    try {
        const content = await fs.readFile(filePath, { encoding: 'utf-8' });
        return new Set(
            content.split('\n')
                   .map(line => line.trim().split(',')[0]) // Take the first column (URL)
                   .filter(url => url.length > 0)
        );
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(filePath, '', { encoding: 'utf-8' });
            return new Set();
        }
        console.warn(`Warning: Could not load submitted URLs from urls.csv. (${error.message})`);
        return new Set();
    }
}

async function persistScrapedLinks(links) {
    const scrapedCsvPath = path.join(process.cwd(), 'scraped_results.csv');
    try {
        await fs.writeFile(scrapedCsvPath, links.join('\n'), 'utf-8');
        console.log(`Saved all scraped links to ${scrapedCsvPath}`);
    } catch (err) {
        console.error(`Failed to save scraped links: ${err.message}`);
    }
}

// --- Main Pipeline ---

const { startConfigServer } = require('./config_editor');

// --- Main Pipeline ---

// --- Main Pipeline ---

async function runPipeline(options = {}) {
    const { mode } = options;
    const isDryRun = mode === 'test';
    
    console.log("--- ATIP Scraper (Node.js/Playwright) ---");
    console.log(`Mode: ${mode.toUpperCase()}`);
    
    // 1. Configuration Phase
    const formData = await loadFormData();
    if (!formData.url) {
        throw new Error("Missing 'url' in configuration.");
    }
    
    // 2. Scraping Phase (Visual)
    console.log("Starting visual scraper...");
    const allLinks = await scrapeLinks(formData.url, null, { headless: false });
    console.log(`\nFound ${allLinks.length} total unique links.`);
    
    await persistScrapedLinks(allLinks);

    // 3. Filtering Phase
    const csvPath = path.join(process.cwd(), 'urls.csv');
    const submittedUrls = await loadSubmittedUrls(csvPath);
    const newLinks = allLinks.filter(link => !submittedUrls.has(link));
    
    console.log(`\nStats: ${submittedUrls.size} previously submitted. ${newLinks.length} new to process.`);

    if (newLinks.length === 0) {
        console.log("No new links found. Pipeline complete.");
        return;
    }

    // 4. Execution Phase (Visual)
    await transcribeAndSubmit(formData, newLinks, { 
        headless: false,
        dryRun: isDryRun 
    });
    
    console.log("\n--- Pipeline finished successfully! ---");
}

// --- Entry Point ---

// Start the config UI and wait for user trigger
startConfigServer(async ({ mode } = {}) => {
    try {
        await runPipeline({ mode });
    } catch (err) {
        console.error("\n--- FATAL ERROR ---");
        console.error(err);
        // Do not exit process, so user can potentially restart or read logs
    }
});