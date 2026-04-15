import { Routes } from '@angular/router';
import { PushNotificationsComponent } from './pages/push-notifications/push-notifications.component';

export const routes: Routes = [
     {
    path: '',
    redirectTo: 'PushNotifications',
    pathMatch: 'full'
  },
  {
    path: 'PushNotifications',
    component: PushNotificationsComponent,
  },
];
