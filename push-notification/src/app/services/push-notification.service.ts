import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResponseMessage,
  CreateUserMessageRequest,
  ParsedMessageDetails,
  UpdateUserMessageEvent,
  UpdateUserMessageRequest
} from '../models/message.model';

const USER_MESSAGE_LIST_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/GetUserMessageList';

const UPDATE_USER_MESSAGE_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/UpdateUserMessage';

const CREATE_USER_MESSAGE_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/CreateUserMessage';

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

  /**
   * Serializes inner fields to one JSON string for `messageDetails`.
   * Call exactly once per request; HttpClient will JSON-encode the outer body only.
   */
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

  /** Parses `[{ eventId: 1001, eventData: [{ key: 'message', value: '...' }] }]`-style success bodies. */
  extractUpdateSuccessMessage(response: unknown): string {
    const fallback = 'Message updated successfully.';
    if (!Array.isArray(response) || response.length === 0) {
      return fallback;
    }
    const events = response as UpdateUserMessageEvent[];
    const pickMessage = (ev: UpdateUserMessageEvent): string | null => {
      if (!Array.isArray(ev?.eventData)) {
        return null;
      }
      const row = ev.eventData.find((d) => d?.key === 'message' && typeof d?.value === 'string');
      return row?.value?.trim() ? row.value : null;
    };
    const primary = events.find((e) => e?.eventId === 1001 && e?.eventType === 1);
    if (primary) {
      const msg = pickMessage(primary);
      if (msg) {
        return msg;
      }
    }
    for (const ev of events) {
      const msg = pickMessage(ev);
      if (msg) {
        return msg;
      }
    }
    return fallback;
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
