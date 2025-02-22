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
	const ownerData = loadJsonEnvVar(repoOwnerDataEnvName);
	const repoReleaseData = loadJsonEnvVar(repoReleaseDataEnvName);
	const vulRepData = loadJsonEnvVar(repoVulRepDataEnvName);

	return {
		project: projectData,
		repo: {
			...repoData,
			year_created_at: new Date(repoData.created_at).getFullYear(),
			year_updated_at: new Date(repoData.updated_at).getFullYear(),
			vulnerability_reporting_enabled: vulRepData.enabled,
			latest_release: repoReleaseData,
		},
		owner: ownerData,
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

	process.stdout.write(jsonData);

	return jsonData;
}

main();
