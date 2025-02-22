import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import console from 'node:console';

const COLOR = {
	blue: '\x1b[1;34m',
	green: '\x1b[1;32m',
	yellow: '\x1b[1;33m',
	red: '\x1b[1;31m',
	reset: '\x1b[0m',
};
export const LOG_LEVEL = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};
let logLevel = LOG_LEVEL.debug;

/**
 * Log a status message to the console in the form of `[INFO] <msg>...`
 *
 * @param {string} msg The message to log
 */
function logTaskStart(msg) {
	if (logLevel > LOG_LEVEL.info) {
		return;
	}

	process.stdout.write(`${COLOR.blue}[INFO]${COLOR.reset} ${msg}... `);
}

/**
 * Log a success or failure message to the console in the form of `Done` or `Failed`
 *
 * @param {boolean} isError Whether or not the task failed
 */
function logTaskEnd(isError = false) {
	if (logLevel > LOG_LEVEL.info) {
		return;
	}

	const msg = isError
		? `${COLOR.red}Failed${COLOR.reset}\n`
		: `${COLOR.green}Done${COLOR.reset}\n`;

	process.stdout.write(msg);
}

/**
 * Run a task and log the start and end messages to the console
 *
 * @param {string} msg The message to log
 * @param {function} fn The function to run
 * @returns The result of the function
 */
export function runTask(msg, fn) {
	logTaskStart(msg);

	try {
		const result = fn();

		logTaskEnd();

		return result;
	} catch (e) {
		logTaskEnd(true);
		panic(e);
	}
}

export function setLogLevel(level) {
	logLevel = level;
}

/**
 * Log a debug message to the console in the form of `[DEBUG] <msg>...`
 *
 * @param {string} msg The message to log
 */
export function debug(...args) {
	if (logLevel > LOG_LEVEL.debug) {
		return;
	}

	console.debug(`${COLOR.green}[DEBUG]${COLOR.reset}`, ...args);
}

// export function info(...args) {
// 	console.info(`${COLOR.blue}[INFO]${COLOR.reset}`, ...args);
// }

// export function warn(...args) {
// 	console.warn(`${COLOR.yellow}[WARN]${COLOR.reset}`, ...args);
// }

// export function error(...args) {
// 	console.error(`${COLOR.red}[ERROR]${COLOR.reset}`, ...args);
// }

/**
 * Log an error message to the console and throw an error
 *
 * @param {Error} e The error to log
 * @throws {Error} The error that was logged
 */
export function panic(e) {
	console.error(
		`${COLOR.red}[ERROR]${COLOR.reset}`,
		`${e.code ?? ''}: ${e.message ?? ''}`,
	);

	throw new Error(e);
}

/**
 * Load a JSON file from the given path
 *
 * @param {string} path The path to the JSON file
 * @returns {object} The parsed JSON object
 */
export function loadJsonFile(path) {
	return runTask(`Loading JSON from ${path}`, () =>
		JSON.parse(readFileSync(path, 'utf8')),
	);
}

/**
 * Load a JSON object from the given environment variable
 *
 * @param {string} name The name of the environment variable
 * @returns {object} The parsed JSON object
 */
export function loadJsonEnvVar(name) {
	return runTask(`Loading JSON from env.${name}`, () =>
		JSON.parse(process.env[name]),
	);
}

/**
 * Save a file to the given path with the given content
 *
 * @param {string} path The path to save the file to
 * @param {string} content The content to save to the file
 */
export function saveFile(path, content) {
	runTask(`Saving file to ${path}`, () => {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, content);
	});
}
