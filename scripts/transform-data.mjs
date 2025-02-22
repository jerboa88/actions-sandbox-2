import {
	LOG_LEVEL,
	panic,
	loadJsonEnvVar,
	loadJsonFile,
	setLogLevel,
} from './utils.mjs';

function loadData(
	projectDataPath,
	repoDataEnvName,
	repoOwnerDataEnvName,
	repoReleaseDataEnvName,
	repoVulRepDataEnvName,
) {
	const projectData = loadJsonFile(projectDataPath);
	const repoData = loadJsonEnvVar(repoDataEnvName);
	const repoOwnerData = loadJsonEnvVar(repoOwnerDataEnvName);
	const repoLatestReleaseData = loadJsonEnvVar(repoReleaseDataEnvName);
	const repoVulRepData = loadJsonEnvVar(repoVulRepDataEnvName);

	return {
		project: projectData,
		repo: {
			...repoData,
			owner: {
				...repoData.owner,
				...repoOwnerData,
			},
			year_created_at: new Date(repoData.created_at).getFullYear(),
			year_updated_at: new Date(repoData.updated_at).getFullYear(),
			vulnerability_reporting_enabled: repoVulRepData.enabled,
			latest_release: repoLatestReleaseData,
		},
	};
}

function main() {
	setLogLevel(LOG_LEVEL.error);

	const expectedNumOfArgs = 5;
	const args = process.argv.slice(2);

	if (args.length !== expectedNumOfArgs) {
		panic(`Expected ${expectedNumOfArgs} arguments, got ${args.length}`);
	}

	const jsonData = JSON.stringify(loadData(...args));

	console.info(jsonData);

	return jsonData;
}

main();
