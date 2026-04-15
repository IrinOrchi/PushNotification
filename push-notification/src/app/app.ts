import { Component, computed, inject, signal } from '@angular/core';
import { PushNotificationService } from './services/push-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
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

  protected async enableNotifications(): Promise<void> {
    await this.notificationService.requestPermission();
  }

  protected sendTestNotification(): void {
    this.notificationService.showNotification(
      'Push Notification',
      'Your Angular 20 + Tailwind setup is ready.'
    );
  }
}
