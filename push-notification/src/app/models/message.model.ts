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

export interface SendNotificationRequest {
  messageID: number;
  pageNo: number;
  batchSize: number;
}

export interface SendNotificationResult {
  message: string;
  totalSent: number;
}

export interface UpdateUserMessageRequest {
  messageID: number;
  messageDetails: string;
  messageType: string;
  systemName: string;
  valid: number;
}

export interface UpdateUserMessageEventData {
  key: string;
  value: any;
}

export interface UpdateUserMessageEvent {
  eventType: number;
  eventData: UpdateUserMessageEventData[];
  eventId: number;
}
