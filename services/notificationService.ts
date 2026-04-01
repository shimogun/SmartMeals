import * as Notifications from 'expo-notifications';

const REMINDER_IDENTIFIER = 'daily-record-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  async requestPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async scheduleReminder(hour: number, minute: number): Promise<boolean> {
    const granted = await this.requestPermission();
    if (!granted) return false;

    await this.cancelReminder();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SmartMeals',
        body: '今日の血糖値・体重を記録しましょう',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
      identifier: REMINDER_IDENTIFIER,
    });

    return true;
  }

  async cancelReminder(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  }

  parseTime(timeStr: string): { hour: number; minute: number } {
    const [h, m] = timeStr.split(':').map(Number);
    return { hour: h || 20, minute: m || 0 };
  }

  formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}

const notificationService = new NotificationService();
export default notificationService;
