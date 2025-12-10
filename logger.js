const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logFile = path.join(process.cwd(), 'latest.log');
        // Clear log file on startup
        fs.writeFileSync(this.logFile, '', 'utf-8');
    }

    _write(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        // Write to file
        fs.appendFileSync(this.logFile, logEntry, 'utf-8');

        // Write to console with colors
        const colors = {
            INFO: '\x1b[36m', // Cyan
            WARN: '\x1b[33m', // Yellow
            ERROR: '\x1b[31m', // Red
            RESET: '\x1b[0m'
        };

        const consoleMethod = level === 'ERROR' ? console.error : console.log;
        consoleMethod(`${colors[level]}[${level}]${colors.RESET} ${message}`);
    }

    info(message) {
        this._write('INFO', message);
    }

    warn(message) {
        this._write('WARN', message);
    }

    error(message) {
        this._write('ERROR', message);
    }
}

module.exports = new Logger();
