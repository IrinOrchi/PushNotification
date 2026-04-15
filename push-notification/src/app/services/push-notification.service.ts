import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  readonly permission = signal<NotificationPermission>(this.getInitialPermission());

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    this.permission.set(permission);

    return permission;
  }

  showNotification(title: string, body: string): void {
    if (!this.isSupported() || this.permission() !== 'granted') {
      return;
    }

    new Notification(title, {
      body,
      icon: 'favicon.ico'
    });
  }

  private getInitialPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'default';
    }

    return Notification.permission;
  }
}
