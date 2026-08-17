import { ZaiClient } from './client.js';
import type { VideoTaskResponse } from '../types/api.js';
export interface PollOptions {
    intervalMs?: number;
    maxWaitMs?: number;
}
export declare function pollTask(client: ZaiClient, taskId: string, options?: PollOptions): Promise<VideoTaskResponse>;
