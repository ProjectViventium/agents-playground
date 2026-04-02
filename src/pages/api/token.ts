import { NextApiRequest, NextApiResponse } from "next";
import { generateRandomAlphanumeric } from "@/lib/util";

import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import type { AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import { TokenResult } from "../../lib/types";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

function getLiveKitHttpHost(): string {
  // Server SDK expects an HTTP(S) host. Our frontend uses a WS(S) URL.
  const wsUrl =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    process.env.LIVEKIT_URL ||
    "ws://localhost:7880";

  if (wsUrl.startsWith("wss://")) return wsUrl.replace(/^wss:\/\//, "https://");
  if (wsUrl.startsWith("ws://")) return wsUrl.replace(/^ws:\/\//, "http://");
  // If user already provided http(s), keep it.
  return wsUrl;
}

const createToken = (
  userInfo: AccessTokenOptions,
  grant: VideoGrant,
  agentName?: string,
) => {
  const at = new AccessToken(apiKey, apiSecret, userInfo);
  at.addGrant(grant);
  if (agentName) {
    at.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: agentName,
          metadata: ''
        }),
      ],
    });
  }
  return at.toJwt();
};

export default async function handleToken(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).end("Method Not Allowed");
      return;
    }
    if (!apiKey || !apiSecret) {
      res.statusMessage = "Environment variables aren't set up correctly";
      res.status(500).end();
      return;
    }

    const {
      roomName: roomNameFromBody,
      participantName: participantNameFromBody,
      participantId: participantIdFromBody,
      metadata: metadataFromBody,
      attributes: attributesFromBody,
      agentName: agentNameFromBody,
    } = req.body;

    // Get room name from query params or generate random one
    const roomName =
      (roomNameFromBody as string) ||
      `room-${generateRandomAlphanumeric(4)}-${generateRandomAlphanumeric(4)}`;

    // Get participant name from query params or generate random one
    const identity =
      (participantIdFromBody as string) ||
      `identity-${generateRandomAlphanumeric(4)}`;

    // Get agent name from query params or use none (automatic dispatch)
    const agentName = (agentNameFromBody as string) || undefined;

    // Get metadata and attributes from query params
    const metadata = metadataFromBody as string | undefined;
    const attributesStr = attributesFromBody as string | undefined;
    const attributes = attributesStr || {};

    const participantName = participantNameFromBody || identity;

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    };

    const token = await createToken(
      { identity, metadata, attributes, name: participantName },
      grant,
      agentName,
    );

    // IMPORTANT: Viventium runs in explicit dispatch mode (agent_name='viventium'),
    // and some LiveKit server versions do not honor RoomConfiguration.agents dispatch.
    // To make the Playground reliable, explicitly create a dispatch when agentName is provided.
    if (agentName) {
      const host = getLiveKitHttpHost();
      const dispatchClient = new AgentDispatchClient(host, apiKey, apiSecret);
      try {
        // Best-effort: clean up stale dispatches for this room before creating a new one.
        // This prevents "already exists" / duplicate-dispatch issues when reconnecting.
        const existing = await dispatchClient.listDispatch(roomName);
        for (const d of existing) {
          // Only delete dispatches for the same agentName to avoid impacting other agents.
          if ((d as any).agentName === agentName && (d as any).id) {
            await dispatchClient.deleteDispatch((d as any).id, roomName);
          }
        }
      } catch {
        // Ignore cleanup errors; we'll still attempt CreateDispatch.
      }
      try {
        await dispatchClient.createDispatch(roomName, agentName, {
          metadata: metadata ?? "",
        });
      } catch {
        // If dispatch already exists or server doesn't support dispatch, we still return the token.
        // The UI will surface the lack of agent connection.
      }
    }

    const result: TokenResult = {
      identity,
      accessToken: token,
    };

    res.status(200).json(result);
  } catch (e) {
    res.statusMessage = (e as Error).message;
    res.status(500).end();
  }
}
