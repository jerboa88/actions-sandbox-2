import { readFileSync, appendFileSync } from 'node:fs';

function main() {
	const [projectDataPath, ...remainingDataStrings] = [
		'project-data-path',
		'repo-data',
		'repo-owner-data',
		'repo-latest-release-data',
		'repo-vul-rep-data',
	].map((name) => {
		const value = process.env[`INPUT_${name.toUpperCase()}`];

		if (!value) {
			throw new Error(`Missing required input '${name}'`);
		}

		return value;
	});
	const projectDataString = readFileSync(projectDataPath, 'utf8');
	const [
		projectData,
		repoData,
		repoOwnerData,
		repoLatestReleaseData,
		repoVulRepData,
	] = [projectDataString, ...remainingDataStrings].map((dataString) => {
		try {
			return JSON.parse(dataString);
		} catch (error) {
			console.error(`Error parsing JSON value '${dataString}'`);

			throw error;
		}
	});
	const resultData = JSON.stringify({
		project: projectData,
		repo: {
			...repoData,
			owner: {
				...repoData.owner,
				...repoOwnerData,
			},
			year_created_at: new Date(repoData.created_at * 1000).getFullYear(),
			year_updated_at: new Date(repoData.updated_at).getFullYear(),
			vul_rep_enabled: repoVulRepData.enabled,
			latest_release: repoLatestReleaseData,
		},
	});

	appendFileSync(process.env.GITHUB_OUTPUT, `data=${resultData}\n`);
}

main();
