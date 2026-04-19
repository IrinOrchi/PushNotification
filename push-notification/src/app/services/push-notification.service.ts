import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponseMessage, ParsedMessageDetails } from '../models/message.model';

const USER_MESSAGE_LIST_URL =
  'https://api.bdjobs.com/bdjobs-promotional-push/api/PromotionalPushNotification/GetUserMessageList';

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
