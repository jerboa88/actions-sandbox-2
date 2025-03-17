import type { Octokit } from "@octokit/rest";
import { get as _get, set as _set } from "lodash-es";
import { msg } from "./constants";
import type { NestedObject, Nullable, Optional } from "./types";

export function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined && value !== null;
}

export function isBlank(value: string) {
	return value.length === 0;
}

export async function trim(
	strPromise: Promise<string> | string,
): Promise<string> {
	return (await strPromise).trim();
}

export function buildMissingPropMsg(propertyName: string, additionalMsg = "") {
	return `Required property "${propertyName}" is missing. ${additionalMsg}`;
}

export function reshapeObject(
	object: Nullable<NestedObject>,
	inputKey?: string,
	outputKey?: string,
): Nullable<NestedObject> {
	let extractedValue: unknown;

	if (inputKey) {
		extractedValue = _get(object, inputKey);

		if (extractedValue === undefined) {
			throw new Error(msg.missing.base(inputKey));
		}
	} else {
		extractedValue = object;
	}

	if (!outputKey) {
		return extractedValue;
	}

	return _set({}, outputKey, extractedValue);
}

export async function getLatestRelease(
	api: InstanceType<typeof Octokit>["rest"],
	params: {
		owner: string;
		repo: string;
	},
) {
	const response = await api.repos.listReleases({
		...params,
		per_page: 1,
	});
	const data = response.data.length === 0 ? null : response.data[0];

	return {
		...response,
		data,
	};
}
