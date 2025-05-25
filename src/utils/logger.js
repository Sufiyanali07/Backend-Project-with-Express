/**
 * Logger utility for consistent logging across the application
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

const logger = {
    info: (message, meta = '') => {
        const timestamp = new Date().toISOString();
        console.log(`${colors.blue}[${timestamp}] ${colors.green}INFO${colors.reset} ${message}`, meta);
    },
    
    success: (message, meta = '') => {
        const timestamp = new Date().toISOString();
        console.log(`${colors.blue}[${timestamp}] ${colors.green}SUCCESS${colors.reset} ${message}`, meta);
    },
    
    warn: (message, meta = '') => {
        const timestamp = new Date().toISOString();
        console.warn(`${colors.blue}[${timestamp}] ${colors.yellow}WARN${colors.reset} ${message}`, meta);
    },
    
    error: (message, meta = '') => {
        const timestamp = new Date().toISOString();
        console.error(`${colors.blue}[${timestamp}] ${colors.red}ERROR${colors.reset} ${message}`, meta);
    },
    
    route: (method, path, status = 200) => {
        const timestamp = new Date().toISOString();
        const statusColor = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
        console.log(
            `${colors.blue}[${timestamp}]`,
            `${colors.magenta}ROUTE${colors.reset}`,
            `${method.padEnd(7)} ${path}`,
            `${statusColor}${status}${colors.reset}`
        );
    }
};

export default logger;
