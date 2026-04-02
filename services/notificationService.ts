import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 日〜土

export interface SlotConfig {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface ReminderSettings {
  enabled: boolean;
  slots: SlotConfig[]; // 最大3つ
  days: Record<DayOfWeek, boolean>;
}

export const MAX_SLOTS = 3;

export const defaultReminderSettings: ReminderSettings = {
  enabled: true,
  slots: [
    { enabled: true, hour: 20, minute: 0 },
  ],
  days: {
    0: true, // 日
    1: true, // 月
    2: true, // 火
    3: true, // 水
    4: true, // 木
    5: true, // 金
    6: true, // 土
  },
};

class NotificationService {
  async requestPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * 全リマインダーをキャンセルし、設定に基づいて再スケジュール
   */
  async scheduleReminders(reminderSettings: ReminderSettings): Promise<boolean> {
    const granted = await this.requestPermission();
    if (!granted) return false;

    await this.cancelAllReminders();

    if (!reminderSettings.enabled) return true;

    const enabledDays = (Object.entries(reminderSettings.days) as [string, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => Number(k) as DayOfWeek);

    if (enabledDays.length === 0) return true;

    for (let i = 0; i < reminderSettings.slots.length; i++) {
      const config = reminderSettings.slots[i];
      if (!config.enabled) continue;

      for (const weekday of enabledDays) {
        const identifier = `reminder-${i}-${weekday}`;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'SmartMeals',
            body: '血糖値を記録しましょう',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: weekday === 0 ? 1 : weekday + 1, // expo: 1=日, 2=月, ... 7=土
            hour: config.hour,
            minute: config.minute,
          },
          identifier,
        });
      }
    }

    return true;
  }

  async cancelAllReminders(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('reminder-')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
    // 旧形式もクリア
    try {
      await Notifications.cancelScheduledNotificationAsync('daily-record-reminder');
    } catch {}
  }

  // 旧API互換（マイグレーション用）
  async scheduleReminder(hour: number, minute: number): Promise<boolean> {
    const settings: ReminderSettings = {
      ...defaultReminderSettings,
      slots: [{ enabled: true, hour, minute }],
    };
    return this.scheduleReminders(settings);
  }

  async cancelReminder(): Promise<void> {
    await this.cancelAllReminders();
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
