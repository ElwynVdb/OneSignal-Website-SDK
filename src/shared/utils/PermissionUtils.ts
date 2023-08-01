import Database from "../services/Database";
import OneSignalEvent from '../services/OneSignalEvent';

export class PermissionUtils {

  // This flag prevents firing the NOTIFICATION_PERMISSION_CHANGED_AS_STRING event twice
  // We use multiple APIs:
  //    1. Notification.requestPermission callback
  //    2. navigator.permissions.query({ name: 'notifications' }`).onchange
  // Some browsers support both, while others only support Notification.requestPermission
  private static executing = false;

  public static async triggerNotificationPermissionChanged(updateIfIdentical = false) {
    if (PermissionUtils.executing) {
      return;
    }

    PermissionUtils.executing = true;
    try {
      await PermissionUtils.privateTriggerNotificationPermissionChanged(updateIfIdentical);
    }
    finally {
      PermissionUtils.executing = false;
    }
  }

  private static async privateTriggerNotificationPermissionChanged(updateIfIdentical: boolean) {
    const newPermission: NotificationPermission = await OneSignal.context.permissionManager.getPermissionStatus();
    const previousPermission: NotificationPermission = await Database.get('Options', 'notificationPermission');

    const shouldBeUpdated = newPermission !== previousPermission || updateIfIdentical;
    if (!shouldBeUpdated) {
      return;
    }

    await Database.put('Options', { key: 'notificationPermission', value: newPermission });
    OneSignalEvent.trigger(OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING, newPermission);
    
    const newPermissionBoolean = newPermission === 'granted';
    const previousPermissionBoolean = previousPermission === 'granted';

    const shouldBeUpdatedBoolean = newPermissionBoolean !== previousPermissionBoolean || updateIfIdentical;
    if (!shouldBeUpdatedBoolean) {
      return;
    }
    OneSignalEvent.trigger(OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_BOOLEAN, newPermissionBoolean);
  }
}
