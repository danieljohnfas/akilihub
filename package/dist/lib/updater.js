import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UpdateError } from './errors.js';
export class Updater {
    /** Package name on npm registry */
    static PACKAGE_NAME = '@z_ai/zai-cli';
    /** NPM registry URL */
    static REGISTRY_URL = 'https://registry.npmjs.org';
    /**
     * Check if an update is available from npm registry
     */
    static async checkForUpdates(channel = 'latest') {
        const currentVersion = this.getCurrentVersion();
        const latestVersion = await this.fetchLatestVersion(channel);
        const updateAvailable = this.compareVersions(currentVersion, latestVersion) < 0;
        return {
            currentVersion,
            latestVersion,
            updateAvailable,
            channel
        };
    }
    /**
     * Detect the package manager used to install the CLI
     */
    static detectPackageManager() {
        // Check which package manager has the CLI in its global packages
        try {
            const npmList = execSync('npm list -g @z_ai/zai-cli --depth=0', { stdio: 'pipe', encoding: 'utf-8' });
            if (npmList.includes('@z_ai/zai-cli')) {
                return 'npm';
            }
        }
        catch {
            // npm list failed, try pnpm
        }
        try {
            const pnpmList = execSync('pnpm list -g @z_ai/zai-cli --depth=0', { stdio: 'pipe', encoding: 'utf-8' });
            if (pnpmList.includes('@z_ai/zai-cli')) {
                return 'pnpm';
            }
        }
        catch {
            // pnpm list failed
        }
        // Fallback: check which command can execute
        try {
            execSync('npm --version', { stdio: 'ignore' });
            return 'npm';
        }
        catch {
            try {
                execSync('pnpm --version', { stdio: 'ignore' });
                return 'pnpm';
            }
            catch {
                return 'unknown';
            }
        }
    }
    /**
     * Perform the update using the detected package manager
     */
    static async performUpdate(channel = 'latest', force = false) {
        const packageManager = this.detectPackageManager();
        const checkResult = await this.checkForUpdates(channel);
        if (!checkResult.updateAvailable && !force) {
            return {
                ...checkResult,
                packageManager,
                updatePerformed: false,
                message: `Already on latest version ${checkResult.currentVersion}`
            };
        }
        try {
            await this.executeUpdate(packageManager, channel);
            return {
                ...checkResult,
                packageManager,
                updatePerformed: true,
                message: `Successfully updated from ${checkResult.currentVersion} to ${checkResult.latestVersion}`
            };
        }
        catch (error) {
            throw new UpdateError(`Failed to update: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
    }
    /**
     * Get the current installed version
     */
    static getCurrentVersion() {
        try {
            const packageJsonPath = join(fileURLToPath(new URL('../..', import.meta.url)), 'package.json');
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            return packageJson.version || '0.0.0';
        }
        catch {
            return '0.0.0';
        }
    }
    /**
     * Fetch latest version from npm registry
     */
    static async fetchLatestVersion(channel) {
        const url = `${this.REGISTRY_URL}/${this.PACKAGE_NAME}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new UpdateError(`Failed to fetch package info from npm registry: ${response.statusText}`);
            }
            const data = await response.json();
            if (channel === 'beta') {
                // Find the latest version including prereleases
                const versions = Object.keys(data.versions || {});
                if (versions.length === 0) {
                    throw new UpdateError('No versions found in npm registry');
                }
                // Sort versions using semver comparison to find the latest
                return versions.sort((a, b) => this.compareVersions(b, a))[0];
            }
            else {
                // Get the latest stable version
                const latest = data['dist-tags']?.latest;
                if (!latest) {
                    throw new UpdateError('No latest version tag found in npm registry');
                }
                return latest;
            }
        }
        catch (error) {
            if (error instanceof UpdateError) {
                throw error;
            }
            throw new UpdateError(`Network error while checking for updates: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
    }
    /**
     * Execute update command via npm or pnpm
     */
    static async executeUpdate(packageManager, channel) {
        const tag = channel === 'beta' ? '@beta' : '';
        const packageName = `${this.PACKAGE_NAME}${tag}`;
        if (packageManager === 'npm') {
            execSync(`npm install -g ${packageName}`, { stdio: 'inherit' });
        }
        else if (packageManager === 'pnpm') {
            execSync(`pnpm add -g ${packageName}`, { stdio: 'inherit' });
        }
        else {
            throw new UpdateError('Unable to detect package manager. Please update manually using npm or pnpm.');
        }
    }
    /**
     * Compare two version strings using semver-like comparison
     * Returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
     * Supports prerelease tags (e.g., 1.0.0-beta.1)
     */
    static compareVersions(v1, v2) {
        // Split version into main parts and prerelease tag
        const parseVersion = (version) => {
            const mainParts = version.split('-')[0].split('.').map(Number);
            const prerelease = version.includes('-') ? version.split('-')[1] : null;
            return { mainParts, prerelease };
        };
        const parsed1 = parseVersion(v1);
        const parsed2 = parseVersion(v2);
        // Compare main version parts (major.minor.patch)
        const maxLength = Math.max(parsed1.mainParts.length, parsed2.mainParts.length);
        for (let i = 0; i < maxLength; i++) {
            const num1 = parsed1.mainParts[i] ?? 0;
            const num2 = parsed2.mainParts[i] ?? 0;
            if (num1 < num2)
                return -1;
            if (num1 > num2)
                return 1;
        }
        // If main versions are equal, compare prerelease tags
        // Stable versions (no prerelease) are greater than prereleases
        if (!parsed1.prerelease && parsed2.prerelease)
            return 1;
        if (parsed1.prerelease && !parsed2.prerelease)
            return -1;
        if (!parsed1.prerelease && !parsed2.prerelease)
            return 0;
        // Both have prerelease tags, compare them lexicographically
        return parsed1.prerelease.localeCompare(parsed2.prerelease);
    }
}
//# sourceMappingURL=updater.js.map