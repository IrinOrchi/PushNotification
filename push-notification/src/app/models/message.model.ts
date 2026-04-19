export interface ParsedMessageDetails {
  msgTitle?: string;
  msg?: string;
  imgSrc?: string;
  link?: string;
  activityNode?: string;
  LogoSrc?: string;
}

export interface ApiResponseMessage {
  messageID: number;
  messageNo: number;
  messageDetails: string;
  parsedDetails?: ParsedMessageDetails;
  messageType: string;
  systemName: string;
  valid: number;
}

export interface CreateUserMessageRequest {
  messageDetails: string;
  messageType: string;
  systemName: string;
  valid: number;
}

/** Body for `UpdateUserMessage` — `messageDetails` is a JSON string of `ParsedMessageDetails`. */
export interface UpdateUserMessageRequest {
  messageID: number;
  messageDetails: string;
  messageType: string;
  systemName: string;
  valid: number;
}

/** One entry from `UpdateUserMessage` success payload (event list). */
export interface UpdateUserMessageEventData {
  key: string;
  value: string;
}

export interface UpdateUserMessageEvent {
  eventType: number;
  eventData: UpdateUserMessageEventData[];
  eventId: number;
}
