import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PushNotificationService } from '../../services/push-notification.service';
import { ApiResponseMessage, ParsedMessageDetails } from '../../models/message.model';

export interface UpdatePanelDraft {
  msgTitle: string;
  msg: string;
  messageType: string;
  systemName: string;
  imgSrc: string;
  link: string;
  logoSrc: string;
  activityNode: string;
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

  activeTab = signal<'update' | 'panel' | 'create'>('panel');
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
  
  isSendingBulk = signal(false);
  bulkSentCumulative = signal(0);

  updateDraft = signal<UpdatePanelDraft | null>(null);
  createDraft = signal<UpdatePanelDraft>({
    msgTitle: '',
    msg: '',
    messageType: '',
    systemName: '',
    imgSrc: '',
    link: '',
    logoSrc: '',
    activityNode: '',
    valid: true
  });

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

  protected setActiveTab(tab: 'update' | 'panel' | 'create'): void {
    this.activeTab.set(tab);
    if (tab === 'panel') {
      this.selectedMessageId.set(null);
      this.clearUpdateFeedback();
      this.router.navigate([], { queryParams: {} });
      this.loadMessageList();
    } else if (tab === 'create') {
      this.selectedMessageId.set(null);
      this.clearUpdateFeedback();
      this.router.navigate([], { queryParams: { tab: 'create' } });
      this.resetCreateDraft();
    }
  }

  private resetCreateDraft(): void {
    this.createDraft.set({
      msgTitle: '',
      msg: '',
      messageType: '',
      systemName: '',
      imgSrc: '',
      link: '',
      logoSrc: '',
      activityNode: '',
      valid: true
    });
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
      this.notificationService.deleteUserMessage(id).subscribe({
        next: (successMsg) => {
          this.updateSuccessMessage.set(successMsg);
          this.updateStatus.set('success');
          this.messages.update((msgs) => msgs.filter((m) => m.messageID !== id));
          if (this.selectedMessageId() === id) {
            this.selectedMessageId.set(null);
            this.activeTab.set('panel');
          }
          this.messageToDelete.set(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          // setTimeout(() => {
          //   if (this.updateStatus() === 'success') {
          //     this.clearUpdateFeedback();
          //   }
          // }, 3000);
        },
        error: (err) => {
          const errMsg = this.notificationService.extractErrorMessage(err);
          this.updateSuccessMessage.set(errMsg);
          this.updateStatus.set('error');
          this.messageToDelete.set(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  protected saveUpdate(): void {
    const draft = this.updateDraft();
    const msg = this.selectedMessage();
    if (!draft || !msg || this.isSavingUpdate()) {
      return;
    }

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
        error: (err: any) => {
          const errMsg = this.notificationService.extractErrorMessage(err);
          this.updateSuccessMessage.set(errMsg);
          this.updateStatus.set('error');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
  }

  protected saveCreate(): void {
    const draft = this.createDraft();
    if (this.isSavingUpdate()) return;

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
      .createUserMessage({
        messageDetails,
        messageType: draft.messageType,
        systemName: draft.systemName,
        valid: draft.valid ? 1 : 0
      })
      .pipe(finalize(() => this.isSavingUpdate.set(false)))
      .subscribe({
        next: (successText) => {
          this.updateSuccessMessage.set(successText);
          this.updateStatus.set('success');
          this.loadMessageList(); 
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            if (this.updateStatus() === 'success') {
              this.clearUpdateFeedback();
              this.setActiveTab('panel');
            }
          }, 3000);
        },
        error: (err: any) => {
          const errMsg = this.notificationService.extractErrorMessage(err);
          this.updateSuccessMessage.set(errMsg);
          this.updateStatus.set('error');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
  }

  protected startBulkSend(messageID: number): void {
    if (this.isSendingBulk()) return;
    this.isSendingBulk.set(true);
    this.bulkSentCumulative.set(0);
    this.clearUpdateFeedback();
    this.processBatch(messageID, 0);
  }

  private processBatch(messageID: number, currentSum: number): void {
    this.notificationService
      .sendNotificationBatch({
        messageID,
        pageNo: 1,
        batchSize: 1
      })
      .subscribe({
        next: (res) => {
          const batchSent = res.totalSent;
          const newSum = currentSum + batchSent;
          this.bulkSentCumulative.set(newSum);

          if (batchSent < 1) {
            this.isSendingBulk.set(false);
            this.updateStatus.set('success');
            this.updateSuccessMessage.set(`Notification sent successfully. Total sent: ${newSum}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            this.processBatch(messageID, newSum);
          }
        },
        error: (err) => {
          this.isSendingBulk.set(false);
          const errMsg = this.notificationService.extractErrorMessage(err);
          this.updateSuccessMessage.set(errMsg);
          this.updateStatus.set('error');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
  }
}
