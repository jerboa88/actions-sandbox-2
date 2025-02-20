import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	LOG_LEVEL,
	loadJsonEnvVar,
	loadJsonFile,
	setLogLevel,
} from './utils.js';

function loadData(
	projectDataPath,
	repoDataName,
	repoOwnerDataName,
	repoReleaseDataName,
	repoVulRepDataName,
) {
	const projectData = loadJsonFile(projectDataPath);
	const repoData = loadJsonEnvVar(repoDataName);
	const ownerData = loadJsonEnvVar(repoOwnerDataName);
	const repoReleaseData = loadJsonEnvVar(repoReleaseDataName);
	const vulRepData = loadJsonEnvVar(repoVulRepDataName);

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
	setLogLevel(LOG_LEVEL.ERROR);

	const dirName = dirname(fileURLToPath(import.meta.url));
	const jsonData = JSON.stringify(
		loadData(
			join(dirName, 'data', 'project.json'),
			'REPO_DATA',
			'REPO_OWNER_DATA',
			'REPO_LATEST_RELEASE_DATA',
			'REPO_VUL_REP_DATA',
		),
	);

	process.stdout.write(jsonData);

	return jsonData;
}

main();
