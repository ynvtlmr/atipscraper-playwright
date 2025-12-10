// main.js

const { loadFormData } = require('./config_handler');
const scrapeLinks = require('./scrape_links');
const transcribeAndSubmit = require('./transcribe');
const fs = require('fs/promises');
const path = require('path');
const logger = require('./logger');

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
        logger.warn(`Warning: Could not load submitted URLs from urls.csv. (${error.message})`);
        return new Set();
    }
}

async function persistScrapedLinks(links) {
    const scrapedCsvPath = path.join(process.cwd(), 'scraped_results.csv');
    try {
        await fs.writeFile(scrapedCsvPath, links.join('\n'), 'utf-8');
        logger.info(`Saved all scraped links to ${scrapedCsvPath}`);
    } catch (err) {
        logger.error(`Failed to save scraped links: ${err.message}`);
    }
}

// --- Main Pipeline ---

const { startConfigServer } = require('./config_editor');

async function runPipeline(options = {}) {
    const { mode, headless = false } = options;
    const isDryRun = mode === 'test';
    
    logger.info("--- ATIP Scraper (Node.js/Playwright) ---");
    logger.info(`Mode: ${mode.toUpperCase()} | Headless: ${headless}`);
    
    // 1. Configuration Phase
    const formData = await loadFormData();
    if (!formData.url) {
        throw new Error("Missing 'url' in configuration.");
    }
    
    // 2. Scraping Phase (Visual/Headless based on config)
    logger.info("Starting scraper...");
    const allLinks = await scrapeLinks(formData.url, null, { headless });
    logger.info(`Found ${allLinks.length} total unique links.`);
    
    await persistScrapedLinks(allLinks);

    // 3. Filtering Phase
    const csvPath = path.join(process.cwd(), 'urls.csv');
    const submittedUrls = await loadSubmittedUrls(csvPath);
    const newLinks = allLinks.filter(link => !submittedUrls.has(link));
    
    logger.info(`Stats: ${submittedUrls.size} previously submitted. ${newLinks.length} new to process.`);

    if (newLinks.length === 0) {
        logger.info("No new links found. Pipeline complete.");
        return;
    }

    // 4. Execution Phase
    await transcribeAndSubmit(formData, newLinks, { 
        headless,
        dryRun: isDryRun 
    });
    
    logger.info("--- Pipeline finished successfully! ---");
}

// --- Graceful Exit ---
process.on('SIGINT', async () => {
    logger.info("\nCaught interrupt signal (SIGINT). Exiting gracefully...");
    // Future: Add logic here to close browsers if they are exposed globally or via an event bus
    process.exit(0);
});

// --- Entry Point ---

// Start the config UI and wait for user trigger
startConfigServer(async ({ mode, headless } = {}) => {
    try {
        await runPipeline({ mode, headless });
    } catch (err) {
        logger.error("\n--- FATAL ERROR ---");
        logger.error(err.message);
        logger.error(err.stack);
        // Do not exit process, so user can potentially restart or read logs
    }
});
