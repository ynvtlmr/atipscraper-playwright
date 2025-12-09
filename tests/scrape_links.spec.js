const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');
const scrapeLinks = require('../scrape_links');

test.describe('Scrape Links Functional Tests', () => {
  const indexHtmlPath = path.resolve(__dirname, '../examples/atip_index_example.html');
  const indexUrl = pathToFileURL(indexHtmlPath).toString();

  test('should scrape exactly 7 links from the example index page', async ({ page }) => {
    // scrapeLinks now accepts a page fixture for faster testing
    const links = await scrapeLinks(indexUrl, page);
    
    expect(links).toHaveLength(7);
    
    // Verify structure of scraped links
    links.forEach(link => {
      expect(link).toContain('/en/search/ati/reference/');
    });
  });

  test('should handle non-existent pages gracefully (or throw known error)', async () => {
    // Depending on implementation, it might return empty array or throw.
    // Let's assume it returns empty array for bad connection, or we trap the error.
    // scrapeLinks has a try/catch block that logs error and returns found links.
    // If it fails to load, it might return empty array.
    const badUrl = 'http://localhost:9999/nonexistent';
    const links = await scrapeLinks(badUrl);
    expect(links).toEqual([]);
  });
});
