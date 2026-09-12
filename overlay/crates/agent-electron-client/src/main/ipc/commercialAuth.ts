import { app, net } from "electron";
import { readSetting, writeSetting, getDb } from "../db";
import {
  DEFAULT_SERVER_HOST,
  LOCAL_HOST_URL,
  DEFAULT_GUI_MCP_PORT,
} from "@shared/constants";
import { getConfiguredPorts } from "../services/startupPorts";
import { getDeviceId } from "../services/system/deviceId";
import {
  AuthLifecycle,
  setCommercialLifecycle,
  type ServiceResult,
} from "../services/auth/lifecycle";

export function currentBusinessOrigin(): string {
  const raw =
    (readSetting("step1_config") as { serverHost?: string } | null)
      ?.serverHost || DEFAULT_SERVER_HOST;
  return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
}
export function currentAccessToken(): string | null {
  const value = readSetting(`nuwax.accessToken.${currentBusinessOrigin()}`);
  return typeof value === "string" && value ? value : null;
}
export function clearRegistration(): void {
  for (const key of [
    "auth.config_key",
    "auth.saved_key",
    "auth.token",
    "auth.online_status",
    "lanproxy.server_host",
    "lanproxy.server_port",
  ])
    writeSetting(key, null);
  getDb()
    ?.prepare(
      "DELETE FROM settings WHERE key LIKE 'auth.saved_keys.%' OR key LIKE 'auth.tokens.%'",
    )
    .run();
  const lp = (readSetting("lanproxy_config") || {}) as Record<string, unknown>;
  const { serverIp, serverPort, clientKey, ...preferences } = lp;
  writeSetting("lanproxy_config", preferences);
}
export function initializeCommercialAuth(
  start: (signal: AbortSignal) => Promise<ServiceResult>,
  stop: () => Promise<ServiceResult>,
  changed: (phase: string, error?: string) => void,
  expired?: () => void,
) {
  // 新安装使用随包前端，离线也能打开登录/企业域名配置；已有模式偏好保留。
  if (app?.isPackaged && !readSetting("step1_config")) {
    writeSetting("step1_config", {
      serverHost: DEFAULT_SERVER_HOST,
      nuwaxLoadMode: "gateway",
    });
  }
  const deviceId = getDeviceId();
  if (readSetting("nuwax.registrationDeviceId") !== deviceId) {
    // 设备身份盐变更（1.0.4 起 nuwax:device:v1）/换设备时清注册派生凭据，
    // 但保留 savedKey：现行后端注册必须携带 savedKey（首登 Bearer-only 返回
    // 4000），且实测接受「旧 savedKey + 新 deviceId」重注册——若一并清掉，
    // 1.0.3 存量用户升级后将永远无法重新注册（savedKey 无处再获取）。
    const legacySavedKey = readSetting("auth.saved_key");
    clearRegistration();
    if (legacySavedKey != null) writeSetting("auth.saved_key", legacySavedKey);
    writeSetting("nuwax.registrationDeviceId", deviceId);
  }
  const flow = new AuthLifecycle({
    authenticated: () => !!currentAccessToken(),
    register: async (signal: AbortSignal) => {
      const origin = currentBusinessOrigin();
      const token = currentAccessToken();
      const ports = getConfiguredPorts();
      let username = "";
      try {
        username =
          JSON.parse(Buffer.from(token!.split(".")[1], "base64url").toString())
            .sub || "";
      } catch {
        /* opaque tokens are valid too */
      }
      const savedKey = readSetting("auth.saved_key");
      const response = await net.fetch(`${origin}/api/sandbox/config/reg`, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-client-type": "nuwax",
        },
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
        body: JSON.stringify({
          username,
          password: "",
          ...(savedKey ? { savedKey } : {}),
          deviceId,
          sandboxConfigValue: {
            hostWithScheme: LOCAL_HOST_URL,
            agentPort: ports.agent,
            vncPort: 0,
            fileServerPort: ports.fileServer,
            guiMcpPort: DEFAULT_GUI_MCP_PORT,
            adminServerPort: ports.agent,
            ttydPort: ports.ttyd,
            apiKey: "",
            maxUsers: 1,
          },
        }),
      });
      if (response.status === 401) expired?.();
      if (!response.ok) throw new Error(`Registration HTTP ${response.status}`);
      const payload = await response.json();
      if (["4010", "4011"].includes(payload.code)) expired?.();
      if (payload.code !== "0000")
        throw new Error(payload.message || `Registration ${payload.code}`);
      const value = payload.data;
      if (
        !value?.configKey ||
        !value?.serverHost ||
        !Number.isInteger(value?.serverPort) ||
        value.serverPort <= 0 ||
        value.serverPort > 65535
      )
        throw new Error("Incomplete registration response");
      return { ...value, origin, username };
    },
    commit: (value) => {
      writeSetting("auth.config_key", value.configKey);
      writeSetting("auth.saved_key", value.configKey);
      writeSetting("auth.username", value.username);
      writeSetting("auth.online_status", value.online);
      writeSetting("auth.user_info", {
        id: value.id,
        username: value.username,
        displayName: value.name,
        currentDomain: value.origin,
      });
      writeSetting("lanproxy.server_host", value.serverHost);
      writeSetting("lanproxy.server_port", value.serverPort);
      writeSetting("lanproxy_config", {
        ...((readSetting("lanproxy_config") as object) || {}),
        serverIp: value.serverHost.replace(/^https?:\/\//, ""),
        serverPort: value.serverPort,
        enabled: true,
      });
      // 注册返回的 ticket 不覆盖 ACCESS_TOKEN；商业版仅由网页登录建立登录态。
    },
    start,
    stop,
    changed,
  });
  setCommercialLifecycle(flow);
  return flow;
}
