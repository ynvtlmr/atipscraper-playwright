# ATIP Scraper

ATIP Scraper is an automation tool designed to streamline the process of submitting Access to Information and Privacy (ATIP) requests on the Government of Canada's Open Government portal.

It automates the following workflow:

1.  **Scraping**: Searches for ATIP records based on a provided search URL.
2.  **Filtering**: Identifies new records that haven't been processed yet.
3.  **Submission**: Navigates to each record and automatically fills out the request form with your personal/organization details.

## Features

- **Visual Configuration**: A local web-based editor to easily configure your contact details and target search parameters.
- **Smart Pagination**: Automatically traverses multiple pages of search results to find all relevant links.
- **Interactive Control Panel**: During submission, a floating control panel allows you to:
  - **Submit Now**: Submit the current form immediately.
  - **Skip**: Skip the current form and proceed to the next one.
  - **Stop**: Halt the entire scraping process safely.
- **Graceful Exit**: Cleanly shuts down browser instances when interrupted (Ctrl+C).
- **Headless Mode**: Option to run the scraper visibly or in the background (headless).
- **Robust Logging**: Detailed logs are written to both the console and `latest.log`.
- **Deduplication**: Tracks submitted URLs in `urls.csv` so you never double-submit.
- **Two Modes**:
  - **Test Mode**: Scrapes and fills forms but _does not_ click submit (unless you manually click "Submit Now" in the panel). Perfect for verifying your configuration.
  - **Live Mode**: Fully automates the submission process with a 5-second interactive countdown before auto-submitting.
- **Standalone Capable**: Can be packaged into a single executable file.

## Prerequisites

- [Node.js](https://nodejs.org/) (v24.x recommended to match build targets)
- **Playwright Browsers**: The tool uses Chromium. You might need to install it on first run (script will attempt to use bundled or system browser).

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

The easiest way to run the tool is via the start command:

```bash
npm start
```

- This command will start a local server and open your default web browser to the configuration page.
- **Microservice Port**: The tool attempts to use port 3000 but will automatically find the next available port if it's busy.
- Enter your **Target URL** (e.g., a search result page from `open.canada.ca`) and your personal details.
- Toggle **Headless Mode** if you prefer the browser to run in the background.
- Select **Test Mode** (default) or **Live Mode**.
- Click **Start Scraper**. A new browser window will open (if not headless) and you can watch the automation in progress.

### Interactive Control Panel

When the scraper visits a page, an overlay will appear in the bottom-right corner:

- **Countdown (Live Mode)**: Auto-submits in 5 seconds.
- **Buttons**:
  - **Submit Now**: Overrides timer and submits immediately.
  - **Skip**: Skips this URL and logs it as skipped.
  - **Stop**: Ends the automated session.

### Running via Command Line (Advanced)

If you prefer to run the `main.js` script directly (equivalent to `npm start`):

```bash
node main.js
```

### Building a Standalone Executable

To compile the project into a single executable file (for Windows x64):

```bash
npm run package
```

The output file will be generated in the project root (e.g., `atipscraper.exe`).

## CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration and Deployment.

- **Build Workflow** (`.github/workflows/build.yml`):
  - Triggered on push/PR to `main`.
  - Sets up Node.js v24.
  - Installs dependencies and Playwright browsers.
  - Runs tests.
  - Compiles a Windows x64 executable using `@yao-pkg/pkg`.
  - Uploads the executable as a build artifact.
  - Creates a GitHub Release (on main branch) with the executable attached.

## Project Structure

- `main.js`: The entry point. Starts the config server which orchestrates the pipeline (Config -> Scrape -> Filter -> Submit).
- `config_editor.js`: Code for the local configuration web server/UI. Handles dynamic port allocation.
- `scrape_links.js`: Logic for traversing search result pages and extracting links.
- `transcribe.js`: Logic for visiting individual request pages, filling forms, and handling the interactive control panel.
- `logger.js`: Customized logger supporting console output and file logging (`latest.log`).
- `selectors.json`: Centralized configuration for all DOM selectors used in scraping and form filling.
- `form_data.json`: Stores your user configuration (auto-generated).
- `urls.csv`: A history log of all URLs that have been successfully processed/submitted.
- `scraped_results.csv`: A log of all links found during the last scrape.
- `latest.log`: Log file from the most recent run (do not share if containing sensitive info).
- `tests/`: functionality tests using Playwright.
- `examples/`: Sample HTML files used for testing.

## Testing

To run the functional tests:

```bash
npx playwright test
```
