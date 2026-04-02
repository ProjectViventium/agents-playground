import { ChatMessageType, ChatTile } from "@/components/chat/ChatTile";
import {
  TrackReferenceOrPlaceholder,
  useChat,
  useLocalParticipant,
  useTrackTranscription,
} from "@livekit/components-react";
import {
  LocalParticipant,
  Participant,
  Track,
  TranscriptionSegment,
} from "livekit-client";
import { useEffect, useState } from "react";

export function TranscriptionTile({
  agentAudioTrack,
  accentColor,
}: {
  agentAudioTrack?: TrackReferenceOrPlaceholder;
  accentColor: string;
}) {
  const agentMessages = useTrackTranscription(agentAudioTrack || undefined);
  const localParticipant = useLocalParticipant();
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  });

  const [transcripts, setTranscripts] = useState<Map<string, ChatMessageType>>(
    new Map(),
  );
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const { chatMessages, send: sendChat } = useChat();

  // store transcripts
  // FIX: Properly update Map state to trigger React re-renders for proactive insights
  // Previous code mutated the Map in place without calling setTranscripts,
  // which could cause React to miss updates for late-arriving transcription segments
  useEffect(() => {
    // Build new Map with all current segments (creates new reference for React)
    const newTranscripts = new Map(transcripts);
    let hasChanges = false;
    
    if (agentAudioTrack) {
      agentMessages.segments.forEach((s) => {
        const existing = newTranscripts.get(s.id);
        const newMsg = segmentToChatMessage(s, existing, agentAudioTrack.participant);
        // Only mark as changed if message content differs
        if (!existing || existing.message !== newMsg.message) {
          hasChanges = true;
        }
        newTranscripts.set(s.id, newMsg);
      });
    }

    localMessages.segments.forEach((s) => {
      const existing = newTranscripts.get(s.id);
      const newMsg = segmentToChatMessage(s, existing, localParticipant.localParticipant);
      if (!existing || existing.message !== newMsg.message) {
        hasChanges = true;
      }
      newTranscripts.set(s.id, newMsg);
    });

    // Update transcripts state if there are changes (new reference triggers re-render)
    if (hasChanges) {
      setTranscripts(newTranscripts);
    }

    const allMessages = Array.from(newTranscripts.values());
    for (const msg of chatMessages) {
      const isAgent = agentAudioTrack
        ? msg.from?.identity === agentAudioTrack.participant?.identity
        : msg.from?.identity !== localParticipant.localParticipant.identity;
      const isSelf =
        msg.from?.identity === localParticipant.localParticipant.identity;
      let name = msg.from?.name;
      if (!name) {
        if (isAgent) {
          name = "Agent";
        } else if (isSelf) {
          name = "You";
        } else {
          name = "Unknown";
        }
      }
      allMessages.push({
        name,
        message: msg.message,
        timestamp: msg.timestamp,
        isSelf: isSelf,
      });
    }
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    setMessages(allMessages);
  }, [
    transcripts,
    chatMessages,
    localParticipant.localParticipant,
    agentAudioTrack?.participant,
    agentMessages.segments,
    localMessages.segments,
    agentAudioTrack,
  ]);

  return (
    <ChatTile messages={messages} accentColor={accentColor} onSend={sendChat} />
  );
}

function segmentToChatMessage(
  s: TranscriptionSegment,
  existingMessage: ChatMessageType | undefined,
  participant: Participant,
): ChatMessageType {
  const msg: ChatMessageType = {
    message: s.final ? s.text : `${s.text} ...`,
    name: participant instanceof LocalParticipant ? "You" : "Agent",
    isSelf: participant instanceof LocalParticipant,
    timestamp: existingMessage?.timestamp ?? Date.now(),
  };
  return msg;
}
