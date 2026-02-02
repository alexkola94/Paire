/**
 * Travel Notification Settings Screen (React Native)
 * Configure travel-related notification preferences.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Bell,
  Plane,
  Calendar,
  AlertTriangle,
  DollarSign,
  Package,
  MapPin,
} from 'lucide-react-native';
import { travelService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../components';
import { spacing, borderRadius, typography, shadows } from '../../../constants/theme';

// Notification settings configuration
const NOTIFICATION_SETTINGS = [
  {
    id: 'flightReminders',
    labelKey: 'travel.notifications.flightReminders',
    descKey: 'travel.notifications.flightRemindersDesc',
    icon: Plane,
    defaultValue: true,
  },
  {
    id: 'eventReminders',
    labelKey: 'travel.notifications.eventReminders',
    descKey: 'travel.notifications.eventRemindersDesc',
    icon: Calendar,
    defaultValue: true,
  },
  {
    id: 'budgetAlerts',
    labelKey: 'travel.notifications.budgetAlerts',
    descKey: 'travel.notifications.budgetAlertsDesc',
    icon: DollarSign,
    defaultValue: true,
  },
  {
    id: 'packingReminders',
    labelKey: 'travel.notifications.packingReminders',
    descKey: 'travel.notifications.packingRemindersDesc',
    icon: Package,
    defaultValue: true,
  },
  {
    id: 'advisoryAlerts',
    labelKey: 'travel.notifications.advisoryAlerts',
    descKey: 'travel.notifications.advisoryAlertsDesc',
    icon: AlertTriangle,
    defaultValue: true,
  },
  {
    id: 'locationUpdates',
    labelKey: 'travel.notifications.locationUpdates',
    descKey: 'travel.notifications.locationUpdatesDesc',
    icon: MapPin,
    defaultValue: false,
  },
];

function NotificationSetting({ setting, value, onChange, theme, t }) {
  const IconComponent = setting.icon;
  
  return (
    <View style={[styles.settingCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
      <View style={[styles.settingIcon, { backgroundColor: theme.colors.primary + '15' }]}>
        <IconComponent size={20} color={theme.colors.primary} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
          {t(setting.labelKey, setting.id)}
        </Text>
        <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>
          {t(setting.descKey, '')}
        </Text>
      </View>
      
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.surfaceSecondary, true: theme.colors.primary + '50' }}
        thumbColor={value ? theme.colors.primary : theme.colors.textLight}
      />
    </View>
  );
}

export default function TravelNotificationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Default preferences state
  const [preferences, setPreferences] = useState(() => {
    const defaults = {};
    NOTIFICATION_SETTINGS.forEach((s) => {
      defaults[s.id] = s.defaultValue;
    });
    return defaults;
  });

  // Fetch preferences from API (if available)
  const { isLoading } = useQuery({
    queryKey: ['travel-notification-preferences'],
    queryFn: async () => {
      try {
        // Try to fetch from API if endpoint exists
        if (travelService.getNotificationPreferences) {
          const prefs = await travelService.getNotificationPreferences();
          if (prefs) {
            setPreferences((prev) => ({ ...prev, ...prefs }));
          }
          return prefs;
        }
        return null;
      } catch {
        return null;
      }
    },
  });

  // Save preferences mutation
  const saveMutation = useMutation({
    mutationFn: async (newPrefs) => {
      if (travelService.updateNotificationPreferences) {
        return travelService.updateNotificationPreferences(newPrefs);
      }
      // Simulate save if no API endpoint
      return newPrefs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-notification-preferences'] });
      showToast(t('travel.notifications.saved', 'Preferences saved'), 'success');
    },
    onError: (err) => {
      showToast(err?.message || t('common.error'), 'error');
    },
  });

  // Handle toggle
  const handleToggle = useCallback((settingId, value) => {
    const newPrefs = { ...preferences, [settingId]: value };
    setPreferences(newPrefs);
    saveMutation.mutate(newPrefs);
  }, [preferences, saveMutation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Bell size={22} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('travel.notifications.title', 'Travel Notifications')}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Info banner */}
          <View style={[styles.infoBanner, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
            <Bell size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {t('travel.notifications.info', 'Configure which notifications you receive for your trips.')}
            </Text>
          </View>

          {/* Settings list */}
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('travel.notifications.preferences', 'Notification Preferences')}
          </Text>
          
          {NOTIFICATION_SETTINGS.map((setting) => (
            <NotificationSetting
              key={setting.id}
              setting={setting}
              value={preferences[setting.id]}
              onChange={(value) => handleToggle(setting.id, value)}
              theme={theme}
              t={t}
            />
          ))}

          {/* Additional info */}
          <View style={styles.footerInfo}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              {t('travel.notifications.footerInfo', 'Notifications help you stay on track during your trips. You can always change these settings later.')}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { ...typography.h3 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Scroll
  scroll: { padding: spacing.md, paddingBottom: spacing.lg },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: { ...typography.bodySmall, flex: 1 },

  // Section title
  sectionTitle: { ...typography.label, marginBottom: spacing.md },

  // Setting card
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: { flex: 1 },
  settingLabel: { ...typography.body, fontWeight: '600' },
  settingDesc: { ...typography.caption, marginTop: 2 },

  // Footer
  footerInfo: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  footerText: { ...typography.caption, textAlign: 'center' },
});
