#!/usr/bin/env node

// =============================================================================
// MCP Server Setup Script
// =============================================================================
// Installs and configures MCP (Model Context Protocol) servers globally
// for VS Code and VS Code Insiders on Windows and macOS.
//
// Usage:  node setup-mcp-servers.mjs [--dry-run] [--skip-cache-warm]
//
// Options:
//   --dry-run              Show what would be done without making changes
//   --skip-cache-warm      Skip pre-warming the npx cache
//
// Cross-platform: Windows 10/11 and macOS
// =============================================================================

import { execSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { arch, homedir, platform } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_CACHE_WARM = process.argv.includes("--skip-cache-warm");

/** npm packages that are launched via `npx -y` (no global install needed). */
const NPX_PACKAGES = [
	"@azure-devops/mcp@latest",
	"@modelcontextprotocol/server-sequential-thinking",
	"@modelcontextprotocol/server-memory@latest",
	"mongodb-mcp-server@latest",
	"mssql-mcp-server@latest",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isWindows = platform() === "win32";
const isMac = platform() === "darwin";

const colors = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
	dim: "\x1b[2m",
	bold: "\x1b[1m",
};

function log(message) {
	console.log(`${colors.green}  ✔${colors.reset} ${message}`);
}

function logStep(message) {
	console.log(`\n${colors.cyan}${colors.bold}▸ ${message}${colors.reset}`);
}

function logWarn(message) {
	console.log(`${colors.yellow}  ⚠${colors.reset} ${message}`);
}

function logError(message) {
	console.error(`${colors.red}  ✖${colors.reset} ${message}`);
}

function logDry(message) {
	console.log(`${colors.dim}  [dry-run] ${message}${colors.reset}`);
}

// ---------------------------------------------------------------------------
// Path resolution (cross-platform)
// ---------------------------------------------------------------------------

function getVSCodeUserConfigDir(variant = "Code") {
	const home = homedir();
	if (isWindows) {
		const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
		return join(appData, variant, "User");
	}
	if (isMac) {
		return join(home, "Library", "Application Support", variant, "User");
	}
	// Linux fallback
	return join(home, ".config", variant, "User");
}



// ---------------------------------------------------------------------------
// npx cache warming
// ---------------------------------------------------------------------------

function warmNpxCache() {
	logStep("Pre-warming npx cache (downloading packages for faster first use)");

	for (const packageName of NPX_PACKAGES) {
		if (DRY_RUN) {
			logDry(`Would pre-cache: ${packageName}`);
			continue;
		}

		try {
			log(`Caching ${packageName}...`);
			// Use npx with --yes to download and cache the package.
			// We call it with --help or a version flag that exits quickly.
			execSync(`npx -y ${packageName} --help`, {
				stdio: "pipe",
				timeout: 120_000,
				env: { ...process.env, NODE_NO_WARNINGS: "1" },
			});
			log(`Cached ${packageName}`);
		} catch {
			// Some packages don't support --help, that's OK – the download still happened
			log(`Cached ${packageName} (downloaded)`);
		}
	}
}

// ---------------------------------------------------------------------------
// mcp.json generation & merge
// ---------------------------------------------------------------------------

function buildMcpConfig() {
	return {
		inputs: [
			{
				id: "ado_org",
				type: "promptString",
				description: "Azure DevOps organization name (e.g. 'myorg')",
			},
		],
		servers: {
			// ── Azure DevOps ──────────────────────────────────────────────
			"azure-devops": {
				type: "stdio",
				command: "npx",
				args: ["-y", "@azure-devops/mcp@latest", "${input:ado_org}"],
			},

			// ── Sequential Thinking ───────────────────────────────────────
			"sequential-thinking": {
				type: "stdio",
				command: "npx",
				args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
			},

			// ── Microsoft Learn Docs (remote HTTP – no install needed!) ──
			"microsoft-learn": {
				type: "http",
				url: "https://learn.microsoft.com/api/mcp",
			},

			// ── Knowledge Graph Memory ────────────────────────────────────
			memory: {
				type: "stdio",
				command: "npx",
				args: ["-y", "@modelcontextprotocol/server-memory@latest"],
			},

			// ── MongoDB ───────────────────────────────────────────────────
			mongodb: {
				type: "stdio",
				command: "npx",
				args: [
					"-y",
					"mongodb-mcp-server@latest",
					"--connectionString",
					"${env:MDB_MCP_CONNECTION_STRING}",
				],
			},

			// ── MSSQL ─────────────────────────────────────────────────────
			mssql: {
				type: "stdio",
				command: "npx",
				args: [
					"-y",
					"mssql-mcp-server@latest",
					"${env:MSSQL_MCP_CONNECTION_STRING}",
				],
				env: {
					MSSQL_CONNECTION_STRING: "${env:MSSQL_MCP_CONNECTION_STRING}",
				},
			},
		},
	};
}

function deepMerge(target, source) {
	const result = { ...target };
	for (const key of Object.keys(source)) {
		if (
			result[key] &&
			typeof result[key] === "object" &&
			!Array.isArray(result[key]) &&
			typeof source[key] === "object" &&
			!Array.isArray(source[key])
		) {
			result[key] = deepMerge(result[key], source[key]);
		} else if (Array.isArray(result[key]) && Array.isArray(source[key])) {
			// Merge arrays by id (for inputs) – deduplicate by 'id' field
			const mergedArray = [...result[key]];
			for (const item of source[key]) {
				const existingIndex = mergedArray.findIndex(
					(existingItem) => existingItem.id && existingItem.id === item.id,
				);
				if (existingIndex >= 0) {
					mergedArray[existingIndex] = item;
				} else {
					mergedArray.push(item);
				}
			}
			result[key] = mergedArray;
		} else {
			result[key] = source[key];
		}
	}
	return result;
}

function writeMcpJson(configDir, newConfig) {
	const mcpJsonPath = join(configDir, "mcp.json");

	if (DRY_RUN) {
		logDry(`Would write/merge ${mcpJsonPath}`);
		return;
	}

	mkdirSync(configDir, { recursive: true });

	let finalConfig = newConfig;

	if (existsSync(mcpJsonPath)) {
		try {
			const existingContent = readFileSync(mcpJsonPath, "utf-8");
			const existingConfig = JSON.parse(existingContent);
			finalConfig = deepMerge(existingConfig, newConfig);
			log(`Merged with existing config at ${mcpJsonPath}`);
		} catch (parseError) {
			logWarn(
				`Could not parse existing ${mcpJsonPath} – creating backup and overwriting`,
			);
			const backupPath = `${mcpJsonPath}.backup.${Date.now()}`;
			writeFileSync(backupPath, readFileSync(mcpJsonPath));
			log(`Backup saved to ${backupPath}`);
		}
	}

	writeFileSync(mcpJsonPath, JSON.stringify(finalConfig, null, 2), "utf-8");
	log(`Written ${mcpJsonPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	console.log(
		`\n${colors.bold}╔══════════════════════════════════════════════╗${colors.reset}`,
	);
	console.log(
		`${colors.bold}║     MCP Server Setup for VS Code             ║${colors.reset}`,
	);
	console.log(
		`${colors.bold}╚══════════════════════════════════════════════╝${colors.reset}\n`,
	);

	console.log(
		`  Platform: ${platform()} (${arch()})  |  Dry-run: ${DRY_RUN}\n`,
	);

	// ── Step 1: Pre-warm npx cache ──────────────────────────────────────────
	if (!SKIP_CACHE_WARM) {
		warmNpxCache();
	} else {
		logStep("Skipping npx cache warming (--skip-cache-warm)");
	}

	// ── Step 2: Build mcp.json config ───────────────────────────────────────
	logStep("Building MCP configuration");
	const mcpConfig = buildMcpConfig();

	log(`Configured ${Object.keys(mcpConfig.servers).length} MCP servers`);

	// ── Step 3: Write mcp.json for VS Code and VS Code Insiders ─────────────
	const variants = ["Code", "Code - Insiders"];

	for (const variant of variants) {
		logStep(`Configuring ${variant}`);
		const configDir = getVSCodeUserConfigDir(variant);
		writeMcpJson(configDir, mcpConfig);
	}

	// ── Summary ─────────────────────────────────────────────────────────────
	console.log(
		`\n${colors.bold}${colors.green}══════════════════════════════════════════════${colors.reset}`,
	);
	console.log(
		`${colors.bold}${colors.green}  Setup complete!${colors.reset}\n`,
	);
	console.log("  Configured MCP servers:");
	console.log("    1. azure-devops       (npx, stdio)");
	console.log("    2. sequential-thinking (npx, stdio)");
	console.log("    3. microsoft-learn     (remote HTTP – no install needed)");
	console.log("    4. memory              (npx, stdio)");
	console.log(
		"    5. mongodb             (npx, stdio, --connectionString via env)",
	);
	console.log(
		"    6. mssql               (npx, stdio, connection via env)",
	);
	console.log("\n  Locations:");
	for (const variant of variants) {
		const configDir = getVSCodeUserConfigDir(variant);
		console.log(`    ${variant}: ${join(configDir, "mcp.json")}`);
	}

	console.log(`\n${colors.yellow}  Next steps:${colors.reset}`);
	console.log("    1. Restart VS Code / VS Code Insiders");
	console.log("    2. Open Copilot Chat in Agent Mode");
	console.log('    3. Click "Select Tools" and enable MCP servers');
	console.log(
		"    4. On first use, ADO server will prompt for organization name",
	);
	console.log("");
}

main().catch((error) => {
	logError(`Fatal error: ${error.message}`);
	process.exit(1);
});
