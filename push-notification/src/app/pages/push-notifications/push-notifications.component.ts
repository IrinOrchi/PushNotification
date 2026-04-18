import { Component, computed, inject, signal } from '@angular/core';
import { PushNotificationService } from '../../services/push-notification.service';

export interface UserMessage {
  id: string;
  message: string;
  type: string;
  system: string;
  validity: boolean;
}

@Component({
  selector: 'app-push-notifications',
  imports: [],
  templateUrl: './push-notifications.component.html',
  styleUrl: './push-notifications.component.scss'
})
export class PushNotificationsComponent {
  protected readonly title = signal('Push Notification Demo');
  protected readonly notificationService = inject(PushNotificationService);
  protected readonly permission = this.notificationService.permission;
  protected readonly isSupported = this.notificationService.isSupported();
  protected readonly statusMessage = computed(() => {
    if (!this.isSupported) {
      return 'Notifications are not supported in this browser.';
    }

    return `Current permission: ${this.permission()}`;
  });

  activeTab = signal<'push' | 'panel'>('panel'); 

  messages = signal<UserMessage[]>([
    { id: '1', message: 'Welcome to our premium platform! Enjoy 50% off.', type: 'Promotional', system: 'Web', validity: true },
    { id: '2', message: 'Your system will undergo maintenance at 12:00 AM.', type: 'Alert', system: 'Backend', validity: false },
    { id: '3', message: 'A new version v2.0 has been deployed successfully.', type: 'Update', system: 'CI/CD', validity: true },
    { id: '4', message: 'Please update your billing information.', type: 'Billing', system: 'Payment Portal', validity: true },
  ]);

  protected async enableNotifications(): Promise<void> {
    await this.notificationService.requestPermission();
  }

  protected sendTestNotification(): void {
    this.notificationService.showNotification(
      'Push Notification',
      'Notification content test By Irin Hoque Orchi.'
    );
  }

  protected setActiveTab(tab: 'push' | 'panel'): void {
    this.activeTab.set(tab);
  }

  protected deleteMessage(id: string): void {
    if (confirm("Are you sure that you want to Delete the row?")) {
      this.messages.update(msgs => msgs.filter(m => m.id !== id));
    }
  }
}
