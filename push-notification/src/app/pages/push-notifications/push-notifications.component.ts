import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PushNotificationService } from '../../services/push-notification.service';

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
  messageDetails: string;
  parsedDetails?: ParsedMessageDetails;
  messageType: string;
  systemName: string;
  valid: number;
}

@Component({
  selector: 'app-push-notifications',
  imports: [CommonModule],
  templateUrl: './push-notifications.component.html',
  styleUrl: './push-notifications.component.scss'
})
export class PushNotificationsComponent {
  // Maintaining standard notification services just in case needed globally
  protected readonly notificationService = inject(PushNotificationService);

  activeTab = signal<'update' | 'panel'>('panel'); 
  selectedMessageId = signal<number | null>(null);

  selectedMessage = computed(() => {
    const id = this.selectedMessageId();
    if (id === null) return null;
    return this.messages().find(m => m.messageID === id) || null;
  });

  updateStatus = signal<'success' | 'error' | null>(null);

  messages = signal<ApiResponseMessage[]>(this.initializeData([
    {
      messageID: 18,
      messageDetails: '{"msgTitle":"bdjobs-amcat Certification Test ","msg":"যেকোনো স্থান থেকেই সার্টিফিকেশন টেস্ট দিন একদম বিনামূল্যে! ওয়েবক্যাম সহ ল্যাপটপ অথবা ডেস্কটপের মাধ্যমে ঘরে বসেই সার্টিফিকেশন টেস্টটি দিন এবং সহজেই নিজের দক্ষতা যাচাই করুন।","imgSrc":"https://bdjobs.com/NotificationMessageimages/bdjobs-amcat-Certification-Test-banner.png/","link":"https://mybdjobs.bdjobs.com/bn/mybdjobs/assessment/smnt_certification_helpbn.asp/","activityNode":"/","LogoSrc":"/"}',
      messageType: "pm",
      systemName: "Assessment",
      valid: 0
    },
    {
      messageID: 55,
      messageDetails: '{"msgTitle":"bdjobs-amcat Certification Test Report is Ready!","msg":"Your bdjobs-amcat Certificate test result with details report is ready. Click to see details","imgSrc":"","link":"https://mybdjobs.bdjobs.com/mybdjobs/assessment/smnt_certification_complete_examlist.asp/"}',
      messageType: "pm",
      systemName: "assessment",
      valid: 1
    },
    {
      messageID:20,
      messageDetails: '{"msgTitle":"bdjobs-amcat Certification Test Report is Ready!","msg":"Your bdjobs-amcat Certificate test result with details report is ready. Click to see details","imgSrc":"","link":"https://mybdjobs.bdjobs.com/mybdjobs/assessment/smnt_certification_complete_examlist.asp/"}',
      messageType: "pm",
      systemName: "assessment",
      valid: 1
    }
  ]));

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
      this.selectedMessageId.set(null); // Clear selection when leaving Update screen
      this.updateStatus.set(null); // Clear status messages
    }
  }

  protected editMessage(id: number): void {
    this.selectedMessageId.set(id);
    this.updateStatus.set(null);
    this.activeTab.set('update');
  }

  protected deleteMessage(id: number): void {
    if (confirm("Are you sure that you want to Delete the row?")) {
      this.messages.update(msgs => msgs.filter(m => m.messageID !== id));
    }
  }

  protected saveUpdate(event: Event): void {
    event.preventDefault();
    // Setting dummy success status response mapped to ASP.NET equivalent Alert
    this.updateStatus.set('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (this.updateStatus() === 'success') {
        this.updateStatus.set(null);
      }
    }, 4000);
  }
}
