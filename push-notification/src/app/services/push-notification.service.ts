import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResponseMessage,
  CreateUserMessageRequest,
  ParsedMessageDetails,
  SendNotificationRequest,
  SendNotificationResult,
  UpdateUserMessageEvent,
  UpdateUserMessageRequest
} from '../models/message.model';

const USER_MESSAGE_LIST_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/GetUserMessageList';

const UPDATE_USER_MESSAGE_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/UpdateUserMessage';

const CREATE_USER_MESSAGE_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/CreateUserMessage';

const DELETE_USER_MESSAGE_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/DeleteUserMessage';

const SEND_NOTIFICATION_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/SendNotification';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly http = inject(HttpClient);

  getUserMessageList(): Observable<ApiResponseMessage[]> {
    return this.http
      .get<unknown>(USER_MESSAGE_LIST_URL)
      .pipe(map((body) => this.parseResponse(body)));
  }

  
  serializeMessageDetails(details: ParsedMessageDetails): string {
    const normalizeText = (s: string): string =>
      s
        .replace(/\u201C/g, '"')
        .replace(/\u201D/g, '"')
        .replace(/\u2018/g, "'")
        .replace(/\u2019/g, "'");
    const payload: ParsedMessageDetails = {
      msgTitle: normalizeText(details.msgTitle ?? '').trim(),
      msg: normalizeText(details.msg ?? ''),
      imgSrc: details.imgSrc ?? '',
      link: details.link ?? '',
      activityNode: details.activityNode ?? '',
      LogoSrc: details.LogoSrc ?? ''
    };
    return JSON.stringify(payload);
  }

  updateUserMessage(body: UpdateUserMessageRequest): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json'
    });
    return this.http
      .put<unknown>(UPDATE_USER_MESSAGE_URL, body, { headers })
      .pipe(map((response) => this.extractUpdateSuccessMessage(response)));
  }

  createUserMessage(body: CreateUserMessageRequest): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json'
    });
    return this.http
      .post<unknown>(CREATE_USER_MESSAGE_URL, body, { headers })
      .pipe(map((response) => this.extractUpdateSuccessMessage(response)));
  }

  deleteUserMessage(id: number): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json'
    });
    return this.http
      .delete<unknown>(DELETE_USER_MESSAGE_URL, {
        headers,
        body: { messageId: id }
      })
      .pipe(map((response) => this.extractUpdateSuccessMessage(response)));
  }

  sendNotificationBatch(args: SendNotificationRequest): Observable<SendNotificationResult> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json'
    });
    return this.http
      .post<unknown>(SEND_NOTIFICATION_URL, args, { headers })
      .pipe(map((response) => this.extractSendNotificationResult(response)));
  }

  private extractSendNotificationResult(response: unknown): SendNotificationResult {
    const events = this.unwrapToEvents(response);
    const successEvent = events.find((e) => (Number(e.eventId) === 1001) && Number(e.eventType) === 1);
    
    if (successEvent) {
      const data = successEvent.eventData.find(d => d.key === 'message');
      if (data && typeof data.value === 'object') {
        return data.value as SendNotificationResult;
      }
    }

    const failureEvent = events.find((e) => Number(e.eventType) === 2);
    if (failureEvent) {
      const msg = this.pickMessage(failureEvent);
      throw new Error(msg || 'Failed to send notification batch.');
    }

    throw new Error('Could not parse send notification result.');
  }

  extractUpdateSuccessMessage(response: unknown): string {
    const fallback = 'Operation completed successfully.';
    const events = this.unwrapToEvents(response);

    if (events.length === 0) {
      return fallback;
    }

    // Check for success (1000: Create, 1001: Update, 1002: Delete)
    const successEvent = events.find((e) => (Number(e.eventId) === 1000 || Number(e.eventId) === 1001 || Number(e.eventId) === 1002) && Number(e.eventType) === 1);
    if (successEvent) {
      const msg = this.pickMessage(successEvent);
      if (msg) return msg;
    }

    const failureEvent = events.find((e) => Number(e.eventType) === 2);
    if (failureEvent) {
      const msg = this.pickMessage(failureEvent);
      throw new Error(msg || 'Failed to complete the operation.');
    }

    for (const ev of events) {
      const msg = this.pickMessage(ev);
      if (msg) return msg;
    }

    return fallback;
  }

  extractErrorMessage(err: any): string {
    const defaultFail = 'An error occurred. Please try again.';
    if (!err) return defaultFail;

    if (err instanceof Error && err.message) {
      return err.message;
    }

    const body = err.error;
    if (body) {
      try {
        return this.extractUpdateSuccessMessage(body);
      } catch (logicalErr: any) {
        if (logicalErr instanceof Error) return logicalErr.message;
      }
    }

    return err.message || defaultFail;
  }

  private unwrapToEvents(body: unknown): UpdateUserMessageEvent[] {
    if (Array.isArray(body)) {
      return body as UpdateUserMessageEvent[];
    }
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      for (const key of ['data', 'result', 'items', 'messageList', 'events']) {
        const v = record[key];
        if (Array.isArray(v)) {
          return v as UpdateUserMessageEvent[];
        }
      }
    }
    return [];
  }

  private pickMessage(ev: UpdateUserMessageEvent): string | null {
    if (!Array.isArray(ev?.eventData)) {
      return null;
    }
    const row = ev.eventData.find((d) => d?.key === 'message' && typeof d?.value === 'string');
    return row?.value?.trim() ? row.value : null;
  }

  private parseResponse(body: unknown): ApiResponseMessage[] {
    const raw = this.unwrapToArray(body);
    return raw.map((item) => this.parseMessageRow(item));
  }

  private unwrapToArray(body: unknown): ApiResponseMessage[] {
    if (Array.isArray(body)) {
      return body as ApiResponseMessage[];
    }
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      for (const key of ['data', 'result', 'items', 'messageList']) {
        const v = record[key];
        if (Array.isArray(v)) {
          return v as ApiResponseMessage[];
        }
      }
    }
    return [];
  }

  private parseMessageRow(item: ApiResponseMessage): ApiResponseMessage {
    const parsed = this.parseMessageDetails(item.messageDetails);
    return { ...item, parsedDetails: parsed };
  }

  private parseMessageDetails(messageDetails: string): ParsedMessageDetails {
    try {
      const parsed = JSON.parse(messageDetails) as ParsedMessageDetails;
      if (parsed.msgTitle) {
        parsed.msgTitle = parsed.msgTitle.trim();
      }
      return parsed;
    } catch {
      return { msg: messageDetails };
    }
  }
}
