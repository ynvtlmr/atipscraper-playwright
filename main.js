// main.js

const { loadFormData } = require('./config_handler');
const scrapeLinks = require('./scrape_links');
const transcribeAndSubmit = require('./transcribe');
const fs = require('fs/promises');
const path = require('path');

// Replaces the old Python CSV loading logic
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
        console.warn(`Warning: Could not load submitted URLs from urls.csv. Proceeding anyway. Error: ${error.message}`);
        return new Set();
    }
}


async function main() {
    console.log("--- ATIP Scraper (Node.js/Playwright) ---");
    
    // 1. Load form data from JSON config file
    const formData = await loadFormData();
    
    const url = formData.url;
    if (!url) {
        console.error("Error: 'url' field is missing or empty in form_data.json. Aborting.");
        process.exit(1);
    }
    
    // 2. Scrape the links.
    const allLinks = await scrapeLinks(url);
    console.log(`\nFound ${allLinks.length} total unique links from search results.`);

    // 3. Filter out the URLs that have already been submitted
    const csvPath = path.join(__dirname, 'urls.csv');
    const submittedUrls = await loadSubmittedUrls(csvPath);
    
    const newLinks = allLinks.filter(link => !submittedUrls.has(link));
    
    console.log(`\n${submittedUrls.size} links previously submitted.`);
    console.log(`${newLinks.length} new links to process.`);

    if (newLinks.length === 0) {
        console.log("No new links found. Script finished.");
        return;
    }

    // 4. Transcribe and submit the new links
    await transcribeAndSubmit(formData, newLinks);
    
    console.log("\n--- Script finished successfully! ---");
}

// Execute the main function
main().catch(err => {
    console.error("\n--- FATAL ERROR ---");
    console.error(err);
    process.exit(1);
});