import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PushNotificationService } from '../../services/push-notification.service';
import { ApiResponseMessage, ParsedMessageDetails } from '../../models/message.model';

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

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const tab = params['tab'];
    const msgId = params['msgId'];

    if (tab === 'update' && msgId) {
      this.activeTab.set('update');
      this.selectedMessageId.set(+msgId);
    }
  }

  selectedMessage = computed(() => {
    const id = this.selectedMessageId();
    if (id === null) return null;
    return this.messages().find(m => m.messageID === id) || null;
  });

  updateStatus = signal<'success' | 'error' | null>(null);

  messages = signal<ApiResponseMessage[]>(this.initializeData([
    {
      messageID: 18,
      messageNo: 1,
      messageDetails: '{"msgTitle":"bdjobs-amcat Certification Test ","msg":"যেকোনো স্থান থেকেই সার্টিফিকেশন টেস্ট দিন একদম বিনামূল্যে! ওয়েবক্যাম সহ ল্যাপটপ অথবা ডেস্কটপের মাধ্যমে ঘরে বসেই সার্টিফিকেশন টেস্টটি দিন এবং সহজেই নিজের দক্ষতা যাচাই করুন।","imgSrc":"https://bdjobs.com/NotificationMessageimages/bdjobs-amcat-Certification-Test-banner.png/","link":"https://mybdjobs.bdjobs.com/bn/mybdjobs/assessment/smnt_certification_helpbn.asp/","activityNode":"/","LogoSrc":"/"}',
      messageType: "pm",
      systemName: "Assessment",
      valid: 0
    },
    {
      messageID: 55,
      messageNo: 2,
      messageDetails: '{"msgTitle":"bdjobs-amcat Certification Test Report is Ready!","msg":"Your bdjobs-amcat Certificate test result with details report is ready. Click to see details","imgSrc":"","link":"https://mybdjobs.bdjobs.com/mybdjobs/assessment/smnt_certification_complete_examlist.asp/"}',
      messageType: "pm",
      systemName: "assessment",
      valid: 1
    },
    {
      messageID:20,
      messageNo: 3,
      messageDetails: '{"msgTitle":"bdjobs-amcat Certification Test Report is Ready!","msg":"Your bdjobs-amcat Certificate test result with details report is ready. Click to see details","imgSrc":"","link":"https://mybdjobs.bdjobs.com/mybdjobs/assessment/smnt_certification_complete_examlist.asp/"}',
      messageType: "message",
      systemName: "assessment",
      valid: 1
    },
    {
      messageID: 17,
      messageNo: 4,
      messageDetails: '{"msgTitle":"bdjobs-amcat Certification Test ","msg":"যেকোনো স্থান থেকেই সার্টিফিকেশন টেস্ট দিন একদম বিনামূল্যে! ওয়েবক্যাম সহ ল্যাপটপ অথবা ডেস্কটপের মাধ্যমে ঘরে বসেই সার্টিফিকেশন টেস্টটি দিন এবং সহজেই নিজের দক্ষতা যাচাই করুন।","imgSrc":"https://bdjobs.com/NotificationMessageimages/bdjobs-amcat-Certification-Test-banner.png/","link":"https://mybdjobs.bdjobs.com/bn/mybdjobs/assessment/smnt_certification_helpbn.asp/","activityNode":"/","LogoSrc":"/"}',
      messageType: "pm",
      systemName: "Assessment",
      valid: 0
    },

  ]));

  filteredMessages = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.messages();
    
    return this.messages().filter(m => {
      const idMatch = m.messageID.toString().includes(query);
      const titleMatch = m.parsedDetails?.msgTitle?.toLowerCase().includes(query) || false;
      return idMatch || titleMatch;
    });
  });

  private initializeData(data: ApiResponseMessage[]): ApiResponseMessage[] {
    return data.map(item => {
      try {
        item.parsedDetails = JSON.parse(item.messageDetails);
      } catch (e) {
        item.parsedDetails = { msg: item.messageDetails };
      }
      return item;
    });
  }

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
