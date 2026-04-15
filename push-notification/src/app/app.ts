import { Component, computed, inject, signal } from '@angular/core';
import { PushNotificationService } from './services/push-notification.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
   standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
 
}
