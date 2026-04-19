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
