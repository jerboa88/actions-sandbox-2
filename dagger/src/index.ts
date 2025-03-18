import {
	argument,
	dag,
	func,
	object,
	type Container,
	type Directory,
	type File,
	type Secret,
} from "@dagger.io/dagger";
import { merge as _merge } from "lodash-es";
import { join } from "node:path";
import nunjucks, {
	type Callback,
	type ILoaderAsync,
	type LoaderSource,
} from "nunjucks";
import { Octokit } from "@octokit/rest";
import { base, dir, msg } from "./constants";
import type {
	GithubContextMatrix,
	GithubDataPromiseMatrix,
	InputPathsMatrix,
	NestedObject,
	Nullable,
	OutputPromiseMatrix,
	PartialGithubContext,
} from "./types";
import {
	getLatestRelease,
	isDefined,
	isBlank,
	reshapeObject,
	trim,
} from "./utils";

let nunjucksEnv: nunjucks.Environment;
let nunjucksContext: NestedObject = {};
let nunjucksConfig: nunjucks.ConfigureOptions = {};

@object()
export class ActionsSandbox3 {
	private sourceDir?: Directory;
	private defaultTemplatesDir?: Directory;
	private token?: Secret;
	private nunjucksContextMetadataKey = base.nunjucksContextMetadataKey.metadata;

	constructor(
		sourceDir: Directory,
		@argument({ ignore: [".git", ".github"] })
		defaultTemplatesDir?: Directory,
		token?: Secret,
		nunjucksConfigJson?: string,
		nunjucksContextMetadataKey?: string,
	) {
		this.sourceDir = sourceDir;

		if (isDefined(nunjucksContextMetadataKey)) {
			if (isBlank(nunjucksContextMetadataKey)) {
				throw new Error(msg.invalid.nunjucksContextMetadataKey);
			}

			this.nunjucksContextMetadataKey = nunjucksContextMetadataKey;
		}

		if (defaultTemplatesDir) {
			this.defaultTemplatesDir = defaultTemplatesDir;
		}

		if (token) {
			this.token = token;
		}

		if (nunjucksConfigJson) {
			nunjucksConfig = JSON.parse(nunjucksConfigJson);
		}
	}

	private addToNunjucksContext(
		obj: Nullable<NestedObject>,
		outputKey?: string,
		inputKey?: string,
	) {
		const mergedObj = _merge(
			nunjucksContext,
			reshapeObject(obj, inputKey, outputKey),
		);

		nunjucksContext = mergedObj;

		console.info(msg.valid.nunjucksContext(mergedObj));
	}

	private setNunjucksEnv(container: Container) {
		const daggerLoader: ILoaderAsync = {
			async: true,
			getSource: async (
				templatePath: string,
				callback: Callback<Error, LoaderSource>,
			) => {
				try {
					const file = container.file(templatePath);

					callback(null, {
						src: await file.contents(),
						path: templatePath,
						noCache: false,
					});
				} catch (error) {
					callback(error as Error, null);
				}
			},
		};

		nunjucksEnv = new nunjucks.Environment(daggerLoader, nunjucksConfig);
	}

	private async getRemoteUrl(): Promise<string> {
		return trim(
			this.getBaseContainerWithGit()
				.withExec(["git", "remote", "get-url", "origin"])
				.stdout(),
		);
	}

	private async renderTemplate(templatePath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.addToNunjucksContext({
				[this.nunjucksContextMetadataKey]: {
					sourceDir: dir.source,
					defaultTemplatesDir: dir.defaultTemplates,
				},
			});

			nunjucksEnv.render(templatePath, nunjucksContext, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result ?? "");
				}
			});
		});
	}

	@func()
	public async withNunjucksContext(
		inputKey?: string,
		outputKey?: string,
		dataUrl?: string,
		dataFile?: File,
		dataSecret?: Secret,
		dataJson?: string,
	): Promise<ActionsSandbox3> {
		if (dataUrl || dataFile || dataJson) {
			const mergedObject: NestedObject = {
				...(dataFile && JSON.parse(await dataFile.contents())),
				...(dataUrl &&
					JSON.parse(await fetch(dataUrl).then((response) => response.text()))),
				...(dataSecret && JSON.parse(await dataSecret.plaintext())),
				...(dataJson && JSON.parse(dataJson)),
			};

			this.addToNunjucksContext(mergedObject, outputKey, inputKey);
		} else {
			console.warn(msg.missing.nunjucksContext);

			nunjucksContext = {};
		}

		return this;
	}

	@func()
	public async withNunjucksContextFromGithub(
		repoOwner?: string,
		repoName?: string,
		apiBaseUrl?: string,
		githubContextJson?: string,
		envContextJson?: string,
		varsContextJson?: string,
		jobContextJson?: string,
		jobsContextJson?: string,
		stepsContextJson?: string,
		runnerContextJson?: string,
		secretsContextJson?: string,
		strategyContextJson?: string,
		matrixContextJson?: string,
		needsContextJson?: string,
		inputsContextJson?: string,
		githubContextSecret?: Secret,
		envContextSecret?: Secret,
		varsContextSecret?: Secret,
		jobContextSecret?: Secret,
		jobsContextSecret?: Secret,
		stepsContextSecret?: Secret,
		runnerContextSecret?: Secret,
		secretsContextSecret?: Secret,
		strategyContextSecret?: Secret,
		matrixContextSecret?: Secret,
		needsContextSecret?: Secret,
		inputsContextSecret?: Secret,
	): Promise<ActionsSandbox3> {
		const nonBlankArgNames = ["repoOwner", "repoName", "apiBaseUrl"] as const;

		for (const argName of nonBlankArgNames) {
			if (argName && isBlank(argName)) {
				throw new Error(msg.invalid[argName]);
			}
		}

		const computedGithubContextJson =
			githubContextJson ?? (await githubContextSecret?.plaintext());
		const githubContext = computedGithubContextJson
			? (JSON.parse(computedGithubContextJson) as PartialGithubContext)
			: undefined;
		const computedApiBaseUrl = apiBaseUrl ?? githubContext?.api_url;

		let computedRepoOwner = repoOwner ?? githubContext?.repository_owner;
		let computedRepoName =
			repoName ?? githubContext?.repository.split("/")?.[1];

		if (!computedRepoOwner || !computedRepoName) {
			console.info(msg.missing.repoOwnerOrName);

			const remoteUrl = await this.getRemoteUrl();
			const remoteUrlSegments = remoteUrl.split("/");

			computedRepoOwner = computedRepoOwner ?? remoteUrlSegments[3];
			computedRepoName =
				computedRepoName ?? remoteUrlSegments[4].replace(".git", "");
		}

		const repoRequestProps = {
			owner: computedRepoOwner,
			repo: computedRepoName,
		};

		const api = new Octokit({
			userAgent: base.userAgent,
			...(computedApiBaseUrl && { baseUrl: computedApiBaseUrl }),
			...(this.token && { auth: await this.token.plaintext() }),
		}).rest;
		const ghKey = base.nunjucksContextMetadataKey.github.base;
		const ghRepoKey = `${ghKey}.${base.nunjucksContextMetadataKey.github.repository}`;

		// Fetch additional repo/owner data from the GitHub API and add it to the Nunjucks context
		const ghDataMatrix: GithubDataPromiseMatrix = [
			[api.repos.get(repoRequestProps), ghRepoKey],
			[getLatestRelease(api, repoRequestProps), `${ghRepoKey}.latestRelease`],
			[
				api.repos.checkPrivateVulnerabilityReporting(repoRequestProps),
				`${ghRepoKey}.vulRepEnabled`,
				"enabled",
			],
			[
				api.users.getByUsername({
					username: computedRepoOwner,
				}),
				`${ghRepoKey}.owner`,
			],
		];

		await Promise.all(
			ghDataMatrix.map(async ([responsePromise, outputKey, inputKey]) => {
				const response = await responsePromise;

				this.addToNunjucksContext(response.data, outputKey, inputKey);
			}),
		);

		const ghContextKey = `${ghKey}.${base.nunjucksContextMetadataKey.github.context}`;

		// Add contextual information from GitHub Actions to the Nunjucks context
		const contextMatrix: GithubContextMatrix = [
			[
				`${ghContextKey}.github`,
				githubContextJson ?? (await githubContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.env`,
				envContextJson ?? (await envContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.vars`,
				varsContextJson ?? (await varsContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.job`,
				jobContextJson ?? (await jobContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.jobs`,
				jobsContextJson ?? (await jobsContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.steps`,
				stepsContextJson ?? (await stepsContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.runner`,
				runnerContextJson ?? (await runnerContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.secrets`,
				secretsContextJson ?? (await secretsContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.strategy`,
				strategyContextJson ?? (await strategyContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.matrix`,
				matrixContextJson ?? (await matrixContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.needs`,
				needsContextJson ?? (await needsContextSecret?.plaintext()),
			],
			[
				`${ghContextKey}.inputs`,
				inputsContextJson ?? (await inputsContextSecret?.plaintext()),
			],
		];

		for (const [outputKey, contextJson] of contextMatrix) {
			if (contextJson) {
				this.addToNunjucksContext(JSON.parse(contextJson), outputKey);
			}
		}

		return this;
	}

	@func()
	public async buildDocs(...withPaths: string[]): Promise<Directory> {
		// Parse path inputs
		const pathMaps = withPaths;
		const pathsMatrix: InputPathsMatrix = pathMaps.map((pathMapString) => {
			const [templatePath, outputPath] = pathMapString.split(":", 2);

			if (!templatePath || !outputPath) {
				throw new Error(msg.invalid.pathMap(pathMapString));
			}

			console.info(msg.valid.pathMap(templatePath, outputPath));

			return [templatePath, outputPath];
		});

		if (pathsMatrix.length === 0) {
			throw new Error(msg.missing.base("pathMap", msg.missing.pathMap));
		}

		let container = this.getBaseContainer();

		// Mount default templates directory if provided
		if (this.defaultTemplatesDir) {
			container = container.withDirectory(
				dir.defaultTemplates,
				this.defaultTemplatesDir,
			);
		} else {
			console.warn(msg.missing.defaultTemplates);
		}

		this.setNunjucksEnv(container);

		// Render templates
		const outputPromiseMatrix: OutputPromiseMatrix = pathsMatrix.map(
			async ([templatePath, outputPath]) =>
				[
					outputPath,
					await this.renderTemplate(join(dir.source, templatePath)),
				] as const,
		);
		const outputMatrix = await Promise.all(outputPromiseMatrix);

		// Save rendered templates to output directory
		for (const [outputPath, outputContent] of outputMatrix) {
			container = container.withNewFile(
				join(dir.build, outputPath),
				outputContent,
			);
		}

		return container.directory(dir.build);
	}

	@func()
	public getBaseContainerWithGit(): Container {
		return this.getBaseContainer()
			.withWorkdir(dir.source)
			.withExec(["apk", "add", "git"]);
	}

	@func()
	public getBaseContainer(): Container {
		if (!isDefined(this.sourceDir)) {
			throw new Error(msg.missing.sourceDir);
		}

		return dag
			.container()
			.from(base.image)
			.withWorkdir(dir.working)
			.withDirectory(dir.source, this.sourceDir);
	}
}
