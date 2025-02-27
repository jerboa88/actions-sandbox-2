import { readFileSync, appendFileSync } from 'node:fs';

function toYear(tsOrDateString) {
	const date = new Date(
		typeof tsOrDateString === 'number' ? tsOrDateString * 1000 : tsOrDateString,
	);

	return date.getFullYear();
}

function getEnvVar(name) {
	const value = process.env[`INPUT_${name.toUpperCase()}`];

	if (!value) {
		throw new Error(`Missing required input '${name}'`);
	}

	return value;
}

function parseJsonString(jsonString) {
	try {
		return JSON.parse(jsonString);
	} catch (error) {
		console.error(`Error parsing JSON value '${jsonString}'`);

		throw error;
	}
}

function main() {
	const [projectDataPath, ...remainingDataStrings] = [
		'project-data-path',
		'repo-data',
		'repo-owner-data',
		'repo-latest-release-data',
		'repo-vul-rep-data',
	].map(getEnvVar);
	const projectDataString = readFileSync(projectDataPath, 'utf8');
	const [
		projectData,
		repoData,
		repoOwnerData,
		repoLatestReleaseData,
		repoVulRepData,
	] = [projectDataString, ...remainingDataStrings].map(parseJsonString);
	const resultData = JSON.stringify({
		project: projectData,
		repo: {
			...repoData,
			owner: {
				...repoData.owner,
				...repoOwnerData,
			},
			year_created_at: toYear(repoData.created_at),
			year_updated_at: toYear(repoData.updated_at),
			vul_rep_enabled: repoVulRepData.enabled,
			latest_release: repoLatestReleaseData,
		},
	});

	appendFileSync(process.env.GITHUB_OUTPUT, `data=${resultData}\n`);
}

main();
