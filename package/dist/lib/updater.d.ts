export type PackageManager = 'npm' | 'pnpm' | 'unknown';
export type ReleaseChannel = 'latest' | 'beta';
export interface UpdateCheckResult {
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    channel: ReleaseChannel;
}
export interface UpdateResult extends UpdateCheckResult {
    packageManager: PackageManager;
    updatePerformed: boolean;
    message: string;
}
export declare class Updater {
    /** Package name on npm registry */
    static readonly PACKAGE_NAME = "@z_ai/zai-cli";
    /** NPM registry URL */
    private static readonly REGISTRY_URL;
    /**
     * Check if an update is available from npm registry
     */
    static checkForUpdates(channel?: ReleaseChannel): Promise<UpdateCheckResult>;
    /**
     * Detect the package manager used to install the CLI
     */
    static detectPackageManager(): PackageManager;
    /**
     * Perform the update using the detected package manager
     */
    static performUpdate(channel?: ReleaseChannel, force?: boolean): Promise<UpdateResult>;
    /**
     * Get the current installed version
     */
    static getCurrentVersion(): string;
    /**
     * Fetch latest version from npm registry
     */
    private static fetchLatestVersion;
    /**
     * Execute update command via npm or pnpm
     */
    private static executeUpdate;
    /**
     * Compare two version strings using semver-like comparison
     * Returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
     * Supports prerelease tags (e.g., 1.0.0-beta.1)
     */
    private static compareVersions;
}
