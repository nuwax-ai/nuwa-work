import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  settings: new Map<string, unknown>(),
  fetch: vi.fn(),
}));
vi.mock("electron", () => ({
  app: { isPackaged: true },
  net: { fetch: mocks.fetch },
}));
vi.mock("../db", () => ({
  readSetting: (k: string) => mocks.settings.get(k) ?? null,
  writeSetting: (k: string, v: unknown) => mocks.settings.set(k, v),
  getDb: () => ({
    prepare: () => ({
      run: () => {
        for (const k of mocks.settings.keys())
          if (k.startsWith("auth.saved_keys.") || k.startsWith("auth.tokens."))
            mocks.settings.delete(k);
      },
    }),
  }),
}));
vi.mock("../services/startupPorts", () => ({
  getConfiguredPorts: () => ({ agent: 61006, fileServer: 61005, ttyd: 61009 }),
}));
vi.mock("../services/system/deviceId", () => ({
  getDeviceId: () => "commercial-device",
}));
import { initializeCommercialAuth } from "./commercialAuth";
const origin = "https://enterprise.example.com";
function fixture() {
  const start = vi.fn(async () => ({ success: true }));
  const stop = vi.fn(async () => ({ success: true }));
  return { flow: initializeCommercialAuth(start, stop, vi.fn()), start, stop };
}
beforeEach(() => {
  mocks.settings.clear();
  mocks.fetch.mockReset();
});
describe("commercial registration protocol", () => {
  it("fresh installation selects bundled UI without importing legacy credentials", () => {
    fixture();
    expect(mocks.settings.get("step1_config")).toMatchObject({
      nuwaxLoadMode: "gateway",
    });
    expect(mocks.settings.get("auth.saved_key")).toBeNull();
  });
  it("device identity upgrade clears registration but preserves web login", () => {
    mocks.settings.set("step1_config", { serverHost: origin });
    mocks.settings.set(`nuwax.accessToken.${origin}`, "web-token");
    mocks.settings.set("auth.saved_key", "old-device-key");
    mocks.settings.set("lanproxy_config", {
      serverIp: "old",
      serverPort: 123,
      ssl: true,
    });
    fixture();
    expect(mocks.settings.get(`nuwax.accessToken.${origin}`)).toBe("web-token");
    expect(mocks.settings.get("auth.saved_key")).toBeNull();
    expect(mocks.settings.get("lanproxy_config")).toEqual({ ssl: true });
  });
  it("registers with token and product device, commits before starting", async () => {
    mocks.settings.set("step1_config", { serverHost: origin });
    mocks.settings.set(`nuwax.accessToken.${origin}`, "opaque-token");
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "0000",
          data: {
            configKey: "new",
            serverHost: "tunnel.example.com",
            serverPort: 443,
          },
        }),
      ),
    );
    const { flow, start } = fixture();
    expect((await flow.start()).success).toBe(true);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url).toBe(origin + "/api/sandbox/config/reg");
    expect(options.headers.Authorization).toBe("Bearer opaque-token");
    const body = JSON.parse(options.body);
    expect(body.deviceId).toBe("commercial-device");
    expect(body.savedKey).toBeUndefined();
    expect(body.sandboxConfigValue.fileServerPort).toBe(61005);
    expect(mocks.settings.get("auth.config_key")).toBe("new");
    expect(start).toHaveBeenCalledTimes(1);
  });
  it("late HTTP result after logout never commits or starts", async () => {
    mocks.settings.set("step1_config", { serverHost: origin });
    mocks.settings.set(`nuwax.accessToken.${origin}`, "token");
    let resolve!: (r: Response) => void;
    mocks.fetch.mockReturnValue(new Promise((r) => (resolve = r)));
    const { flow, start } = fixture();
    const pending = flow.start();
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalled());
    const stopped = flow.stop();
    resolve(
      new Response(
        JSON.stringify({
          code: "0000",
          data: { configKey: "late", serverHost: "old", serverPort: 443 },
        }),
      ),
    );
    await pending;
    await stopped;
    expect(mocks.settings.get("auth.config_key")).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });
  it("does not start on incomplete or rejected registration", async () => {
    mocks.settings.set("step1_config", { serverHost: origin });
    mocks.settings.set(`nuwax.accessToken.${origin}`, "token");
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({ code: "4000", message: "Password required" }),
      ),
    );
    const { flow, start } = fixture();
    expect((await flow.start()).success).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });
});
