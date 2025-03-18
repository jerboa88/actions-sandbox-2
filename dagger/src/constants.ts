import type { NestedObject } from './types';
import { buildMissingPropMsg } from './utils';

const moduleName = 'dojomentation';
const githubBotName = `${moduleName}[bot]`;
const githubBotEmail = `${moduleName}-bot.jerboa88@users.noreply.github.com`;

export const dir = {
	working: '/workspace',
	source: 'src',
	defaultTemplates: 'templates',
	build: 'output',
};

export const base = {
	git: {
		committerName: githubBotName,
		committerEmail: githubBotEmail,
		authorName: githubBotName,
		authorEmail: githubBotEmail,
		commitMessage: 'docs: build docs [skip ci]',
	},
	nunjucksContextMetadataKey: {
		metadata: 'dj',
		github: {
			base: 'gh',
			repository: 'repo',
			context: 'context',
		},
	},
	userAgent: moduleName,
	image: 'alpine:latest',
};

export const msg = {
	missing: {
		base: (propertyName: string, additionalMsg = '') =>
			`Required property "${propertyName}" is missing. ${additionalMsg}`,
		nunjucksContext:
			'No data provided to withNunjucksContext. Resetting context.',
		repoOwnerOrName:
			'No repoOwner, repoName, or githubContextJson provided. Attempting to infer repoOwner and repoName from git remote.',
		pathMap:
			"Please set at least one template to output path mapping with `--path-map='path/to/template.njk:path/to/output.md'`.",
		defaultTemplates: 'No default templates provided. Skipping mount.',
		sourceDir: buildMissingPropMsg('Please set it first in the constructor.'),
		token: buildMissingPropMsg('Please set it using `with-token`.'),
	},
	invalid: {
		pathMap: (pathMapString: string) =>
			`Invalid path mapping: '${pathMapString}'.`,
		sourceDir: 'Source directory is not a git repository.',
		currentBranch: 'Source directory is not checked out.',
		nunjucksContextMetadataKey:
			'The Nunjucks context metadata key cannot be blank.',
		repoOwner: 'Repo owner cannot be blank.',
		repoName: 'Repo name cannot be blank.',
		apiBaseUrl: 'API base URL cannot be blank.',
	},
	valid: {
		pathMap: (templatePath: string, outputPath: string) =>
			`Found path mapping: '${templatePath}' -> '${outputPath}'.`,
		nunjucksContext: (obj: NestedObject) =>
			`Nunjucks context updated with: ${JSON.stringify(obj, null, 2)}`,
	},
};
