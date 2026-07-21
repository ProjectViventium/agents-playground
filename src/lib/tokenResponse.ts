import type { TokenResult } from "@/lib/types";

export const LIVEKIT_SETUP_REQUIRED_STATUS = 503;

export function createLiveKitSetupRequiredPayload() {
  return {
    error: {
      code: "LIVEKIT_SETUP_REQUIRED",
      message:
        "Voice setup is incomplete. Open Viventium settings and configure LiveKit, then try again.",
    },
  } as const;
}

function errorMessageFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return undefined;
  }

  const error = payload.error;
  if (!error || typeof error !== "object" || !("message" in error)) {
    return undefined;
  }

  return typeof error.message === "string" && error.message.trim()
    ? error.message
    : undefined;
}

function isTokenResult(payload: unknown): payload is TokenResult {
  return (
    !!payload &&
    typeof payload === "object" &&
    "identity" in payload &&
    typeof payload.identity === "string" &&
    "accessToken" in payload &&
    typeof payload.accessToken === "string" &&
    payload.accessToken.length > 0
  );
}

export async function parseTokenApiResponse(
  response: Response,
): Promise<TokenResult> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    throw new Error(
      errorMessageFromPayload(payload) ||
        "Unable to connect to voice right now. Check setup and try again.",
    );
  }

  if (!isTokenResult(payload)) {
    throw new Error(
      "Voice returned an invalid connection response. Check setup and try again.",
    );
  }

  return payload;
}
