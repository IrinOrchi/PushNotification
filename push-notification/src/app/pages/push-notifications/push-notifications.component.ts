import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PushNotificationService } from '../../services/push-notification.service';
import { ApiResponseMessage } from '../../models/message.model';

@Component({
  selector: 'app-push-notifications',
  imports: [CommonModule],
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

  messages = signal<ApiResponseMessage[]>([]);

  filteredMessages = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.messages();
    
    return this.messages().filter(m => {
      const idMatch = m.messageID.toString().includes(query);
      const titleMatch = m.parsedDetails?.msgTitle?.toLowerCase().includes(query) || false;
      return idMatch || titleMatch;
    });
  });

  protected setActiveTab(tab: 'update' | 'panel'): void {
    this.activeTab.set(tab);
    if (tab === 'panel') {
      this.selectedMessageId.set(null); 
      this.updateStatus.set(null);
      this.router.navigate([], { queryParams: {} });
    }
  }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected editMessage(id: number): void {
    this.selectedMessageId.set(id);
    this.updateStatus.set(null);
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

  protected saveUpdate(event: Event): void {
    event.preventDefault();
    this.updateStatus.set('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (this.updateStatus() === 'success') {
        this.updateStatus.set(null);
      }
    }, 4000);
  }
}
