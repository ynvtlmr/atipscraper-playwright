const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logFile = path.join(process.cwd(), 'latest.log');
        // Use a write stream for non-blocking I/O
        this.stream = fs.createWriteStream(this.logFile, { flags: 'w', encoding: 'utf-8' });
        
        // Ensure stream is closed on process exit
        process.on('exit', () => this.close());
        process.on('SIGINT', () => this.close());
        process.on('SIGTERM', () => this.close());
    }

    _write(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        // Write to file stream (non-blocking)
        if (this.stream && !this.stream.destroyed) {
            this.stream.write(logEntry);
        }

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

    close() {
        if (this.stream && !this.stream.destroyed) {
            this.stream.end();
        }
    }
}

module.exports = new Logger();
