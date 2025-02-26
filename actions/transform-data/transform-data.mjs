import { readFileSync, appendFileSync } from "node:fs";

function main() {
	const [projectDataPath, ...remainingDataStrings] = [
		"project-data-path",
		"repo-data",
		"repo-owner-data",
		"repo-latest-release-data",
		"repo-vul-rep-data",
	].map((name) => process.env[`INPUT_${name.toUpperCase()}`]);
	const projectDataString = readFileSync(projectDataPath, "utf8");
	const [
		projectData,
		repoData,
		repoOwnerData,
		repoLatestReleaseData,
		repoVulRepData,
	] = [projectDataString, ...remainingDataStrings].map((dataString) =>
		JSON.parse(dataString),
	);
	const resultData = JSON.stringify({
		project: projectData,
		repo: {
			...repoData,
			owner: {
				...repoData.owner,
				...repoOwnerData,
			},
			year_created_at: new Date(repoData.created_at).getFullYear(),
			year_updated_at: new Date(repoData.updated_at).getFullYear(),
			vul_rep_enabled: repoVulRepData.enabled,
			latest_release: repoLatestReleaseData,
		},
	});

	appendFileSync(process.env.GITHUB_OUTPUT, `data=${resultData}\n`);
}

main();
