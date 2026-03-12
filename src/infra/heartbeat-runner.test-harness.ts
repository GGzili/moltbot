import { beforeEach } from "vitest";
import type { ChannelPlugin } from "../channels/plugins/types.plugin.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createPluginRuntime } from "../plugins/runtime/index.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";

export function installHeartbeatRunnerTestRuntime(params?: { includeSlack?: boolean }): void {
  beforeEach(() => {
    const _runtime = createPluginRuntime();
    setActivePluginRegistry(createTestRegistry([]));
  });
}
