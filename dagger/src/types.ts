import type { OctokitResponse } from '@octokit/types';

export type Nullable<T> = T | null;

type Optional<T> = T | undefined;

export type PartialGithubContext = {
	api_url: string;
	repository: `${string}/${string}`;
	repository_owner: string;
};

export type NestedObject = {
	[key: string]: string | number | boolean | object | undefined | null;
};

export type GithubDataPromiseMatrix = [
	responsePromise: Promise<OctokitResponse<Nullable<NestedObject>>>,
	outputKey: string,
	inputKey?: string,
][];

export type GithubContextMatrix = [
	contextKey: string,
	contextJson: Optional<string>,
][];

export type InputPathsMatrix = [templatePath: string, outputPath: string][];

export type OutputPromiseMatrix = Promise<
	readonly [outputPath: string, outputContentPromise: string]
>[];
