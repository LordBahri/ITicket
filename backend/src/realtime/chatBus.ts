import { EventEmitter } from "events";

interface ChatMessageEvent {
  threadId: string;
  threadOwnerId: string;
  message: unknown;
}

interface ChatThreadEvent {
  thread: unknown;
}

export const chatBus = new EventEmitter();

export function emitNewChatMessage(payload: ChatMessageEvent) {
  chatBus.emit("message", payload);
}

export function emitChatThreadCreated(payload: ChatThreadEvent) {
  chatBus.emit("thread-created", payload);
}
