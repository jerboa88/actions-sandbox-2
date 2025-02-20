import nunjucks from 'nunjucks';
import { panic, loadJsonEnvVar, runTask, saveFile } from './utils.js';

/**
 * A Nunjucks filter that throws an error if it is called.
 *
 * This can be used in a default block to ensure that the block is overridden in a child template.
 *
 * @param {any} value The value to assert is unreachable
 */
function assertUnreachableFilter() {
	throw new Error("Didn't expect to get here");
}

/**
 * Render a Nunjucks template with the given data and save it to the given path
 *
 * @param {string} templatePath The relative path to the template
 * @param {string} outputPath The relative path to save the rendered template to
 * @param {Object} data The data to pass to the template
 */
function renderTemplate(templatePath, outputPath, data) {
	const renderedTemplate = runTask(
		`Loading template from ${templatePath}`,
		() => nunjucks.render(templatePath, data),
	);

	saveFile(outputPath, renderedTemplate);
}

/**
 * Entry point for the script
 */
function main() {
	if (process.argv.length !== 5) {
		panic(`Expected 3 arguments, got ${process.argv.length - 2}`);
	}

	// Load data
	const templatePath = process.argv[2];
	const outputPath = process.argv[3];
	const data = loadJsonEnvVar(process.argv[4]);
	const env = new nunjucks.Environment();

	env.addFilter('assertUnreachable', assertUnreachableFilter);

	nunjucks.configure({ throwOnUndefined: true, trimBlocks: true });

	renderTemplate(templatePath, outputPath, data);
}

main();
