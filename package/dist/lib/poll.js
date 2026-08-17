import { ApiError } from './errors.js';
export async function pollTask(client, taskId, options = {}) {
    const intervalMs = options.intervalMs ?? 5_000;
    const maxWaitMs = options.maxWaitMs ?? 10 * 60_000;
    const started = Date.now();
    while (true) {
        const response = await client.get(`/async-result/${encodeURIComponent(taskId)}`);
        const task = { ...response.data, task_id: response.data.task_id ?? response.data.id ?? taskId };
        const status = task.task_status;
        if (status === 'SUCCESS') {
            return task;
        }
        if (status === 'FAIL') {
            throw new ApiError(`Task ${taskId} failed`, {
                code: 'task_failed',
                requestId: task.request_id,
                responseBody: task
            });
        }
        if (Date.now() - started >= maxWaitMs) {
            throw new ApiError(`Timed out waiting for task ${taskId}`, {
                code: 'task_timeout',
                requestId: task.request_id,
                responseBody: task
            });
        }
        await delay(intervalMs);
    }
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=poll.js.map