import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PushNotificationService } from '../../services/push-notification.service';
import { ApiResponseMessage, ParsedMessageDetails } from '../../models/message.model';

/** Editable fields for the update panel (bound with ngModel). */
export interface UpdatePanelDraft {
  msgTitle: string;
  msg: string;
  messageType: string;
  systemName: string;
  imgSrc: string;
  link: string;
  logoSrc: string;
  activityNode: string;
  messageNo: number;
  valid: boolean;
}

@Component({
  selector: 'app-push-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './push-notifications.component.html',
  styleUrl: './push-notifications.component.scss'
})
export class PushNotificationsComponent implements OnInit {
  protected readonly notificationService = inject(PushNotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  activeTab = signal<'update' | 'panel'>('panel');
  searchQuery = signal<string>('');
  selectedMessageId = signal<number | null>(null);
  isLoadingList = signal(false);
  listLoadError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadMessageList();
  }

  protected loadMessageList(): void {
    this.isLoadingList.set(true);
    this.listLoadError.set(null);
    this.notificationService
      .getUserMessageList()
      .pipe(finalize(() => this.isLoadingList.set(false)))
      .subscribe({
        next: (messages) => {
          this.messages.set(messages);
          this.applyDeepLinkFromRoute(messages);
        },
        error: () => {
          this.listLoadError.set('Could not load messages. Check your connection or try again later.');
        }
      });
  }

  private applyDeepLinkFromRoute(messages: ApiResponseMessage[]): void {
    const params = this.route.snapshot.queryParams;
    const tab = params['tab'];
    const msgId = params['msgId'];
    if (tab === 'update' && msgId) {
      const id = +msgId;
      if (messages.some((m) => m.messageID === id)) {
        this.activeTab.set('update');
        this.selectedMessageId.set(id);
      }
    }
  }

  selectedMessage = computed(() => {
    const id = this.selectedMessageId();
    if (id === null) return null;
    return this.messages().find(m => m.messageID === id) || null;
  });

  updateStatus = signal<'success' | 'error' | null>(null);
  updateSuccessMessage = signal<string | null>(null);
  isSavingUpdate = signal(false);

  updateDraft = signal<UpdatePanelDraft | null>(null);

  messages = signal<ApiResponseMessage[]>([]);

  constructor() {
    effect(() => {
      const msg = this.selectedMessage();
      if (!msg) {
        this.updateDraft.set(null);
        return;
      }
      this.updateDraft.set({
        msgTitle: msg.parsedDetails?.msgTitle ?? '',
        msg: msg.parsedDetails?.msg ?? '',
        messageType: msg.messageType ?? '',
        systemName: msg.systemName ?? '',
        imgSrc: msg.parsedDetails?.imgSrc ?? '',
        link: msg.parsedDetails?.link ?? '',
        logoSrc: msg.parsedDetails?.LogoSrc ?? '',
        activityNode: msg.parsedDetails?.activityNode ?? '',
        messageNo: msg.messageNo,
        valid: msg.valid === 1
      });
    });
  }

  filteredMessages = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.messages();
    
    return this.messages().filter(m => {
      const idMatch = m.messageID.toString().includes(query);
      const titleMatch = m.parsedDetails?.msgTitle?.toLowerCase().includes(query) || false;
      return idMatch || titleMatch;
    });
  });

  protected clearUpdateFeedback(): void {
    this.updateStatus.set(null);
    this.updateSuccessMessage.set(null);
  }

  protected setActiveTab(tab: 'update' | 'panel'): void {
    this.activeTab.set(tab);
    if (tab === 'panel') {
      this.selectedMessageId.set(null);
      this.clearUpdateFeedback();
      this.router.navigate([], { queryParams: {} });
    }
  }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected editMessage(id: number): void {
    this.selectedMessageId.set(id);
    this.clearUpdateFeedback();
    this.activeTab.set('update');
    this.router.navigate([], { queryParams: { tab:'update', msgId: id }, queryParamsHandling: 'merge' });
  }

  messageToDelete = signal<number | null>(null);

  protected confirmDeletePrompt(id: number): void {
    this.messageToDelete.set(id);
  }

  protected cancelDelete(): void {
    this.messageToDelete.set(null);
  }

  protected confirmDelete(): void {
    const id = this.messageToDelete();
    if (id !== null) {
      this.messages.update(msgs => msgs.filter(m => m.messageID !== id));
      this.messageToDelete.set(null);
    }
  }

  protected saveUpdate(): void {
    const draft = this.updateDraft();
    const msg = this.selectedMessage();
    if (!draft || !msg || this.isSavingUpdate()) {
      return;
    }

    const messageNo = Number(draft.messageNo);

    const inner: ParsedMessageDetails = {
      msgTitle: draft.msgTitle.trim(),
      msg: draft.msg,
      imgSrc: draft.imgSrc,
      link: draft.link,
      activityNode: draft.activityNode,
      LogoSrc: draft.logoSrc
    };
    const messageDetails = this.notificationService.serializeMessageDetails(inner);

    this.isSavingUpdate.set(true);
    this.clearUpdateFeedback();

    this.notificationService
      .updateUserMessage({
        messageID: msg.messageID,
        messageDetails,
        messageType: draft.messageType,
        systemName: draft.systemName,
        valid: draft.valid ? 1 : 0
      })
      .pipe(finalize(() => this.isSavingUpdate.set(false)))
      .subscribe({
        next: (successText) => {
          this.updateSuccessMessage.set(successText);
          this.messages.update((items) =>
            items.map((m) =>
              m.messageID === msg.messageID
                ? {
                    ...m,
                    messageNo: Number.isFinite(messageNo) ? messageNo : m.messageNo,
                    messageType: draft.messageType,
                    systemName: draft.systemName,
                    valid: draft.valid ? 1 : 0,
                    messageDetails,
                    parsedDetails: { ...inner }
                  }
                : m
            )
          );
          this.updateStatus.set('success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            if (this.updateStatus() === 'success') {
              this.clearUpdateFeedback();
            }
          }, 4000);
        },
        error: () => {
          this.updateSuccessMessage.set(null);
          this.updateStatus.set('error');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
  }
}
