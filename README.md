# ATIP Scraper

ATIP Scraper is an automation tool designed to streamline the process of submitting Access to Information and Privacy (ATIP) requests on the Government of Canada's Open Government portal.

It automates the following workflow:

1.  **Scraping**: Searches for ATIP records based on a provided search URL.
2.  **Filtering**: Identifies new records that haven't been processed yet.
3.  **Submission**: Navigates to each record and automatically fills out the request form with your personal/organization details.

## Features

- **Visual Configuration**: A local web-based editor to easily configure your contact details and target search parameters.
- **Smart Pagination**: Automatically traverses multiple pages of search results to find all relevant links.
- **Deduplication**: Tracks submitted URLs in `urls.csv` so you never double-submit.
- **Two Modes**:
  - **Test Mode**: Scrapes and fills forms but _does not_ click submit. Perfect for verifying your configuration.
  - **Live Mode**: Fully automates the submission process.
- **Standalone Capable**: Can be packaged into a single executable file.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- **Playwright Browsers**: The tool uses Chromium. You might need to install it on first run.

## Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Install Playwright browsers (if not already installed):
    ```bash
    npx playwright install chromium
    ```

## Usage

### Running the Scraper

The easiest way to run the tool is via the Configuration Editor:

```bash
npm run config-editor
```

- This command will start a local server and open your default web browser to the configuration page.
- Enter your **Target URL** (e.g., a search result page from `open.canada.ca`) and your personal details.
- Select **Test Mode** (default) or **Live Mode**.
- Click **Start Scraper**. A new browser window will open and you can watch the automation in progress.

### Running via Command Line (Advanced)

If you prefer to run the `main.js` script directly (assuming configuration is already saved in `form_data.json`):

```bash
node main.js
```

### Building a Standalone Executable

To compile the project into a single executable file (for Windows x64):

```bash
npm run package
```

The output file will be generated in the project root (e.g., `atipscraper.exe`).

## Project Structure

- `main.js`: The entry point. Orchestrates the pipeline (Config -> Scrape -> Filter -> Submit).
- `config_editor.js`: Code for the local configuration web server/UI.
- `scrape_links.js`: Logic for traversing search result pages and extracting links.
- `transcribe.js`: Logic for visiting individual request pages and filling the forms.
- `form_data.json`: Stores your user configuration (auto-generated).
- `urls.csv`: A history log of all URLs that have been successfully processed/submitted.
- `scraped_results.csv`: A log of all links found during the last scrape.
- `tests/`: functionality tests using Playwright.
- `examples/`: Sample HTML files used for testing.

## Testing

To run the functional tests:

```bash
npx playwright test
```
