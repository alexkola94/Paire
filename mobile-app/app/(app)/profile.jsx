import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  User, LogOut, Users, Bell, Trophy, Shield, Moon, Globe,
  ChevronRight, CreditCard, PiggyBank, Receipt, ShoppingCart, MapPin,
  FileText, Pencil, Lock, ShieldCheck, MessageCircle, Camera,
} from 'lucide-react-native';
import { profileService } from '../../services/api';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { Modal, Button, FormField, useToast } from '../../components';

// Supported locales for language picker with flags
const LOCALES = [
  { code: 'en', labelKey: 'settings.languages.en', flag: '🇬🇧', nativeName: 'English' },
  { code: 'el', labelKey: 'settings.languages.el', flag: '🇬🇷', nativeName: 'Ελληνικά' },
  { code: 'es', labelKey: 'settings.languages.es', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', labelKey: 'settings.languages.fr', flag: '🇫🇷', nativeName: 'Français' },
];

function MenuItem({ icon: Icon, label, onPress, theme, destructive }) {
  return (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.colors.surface }]} onPress={onPress} activeOpacity={0.7}>
      <Icon size={20} color={destructive ? '#dc2626' : theme.colors.primary} />
      <Text style={[styles.menuLabel, { color: destructive ? '#dc2626' : theme.colors.text }]}>{label}</Text>
      <ChevronRight size={18} color={theme.colors.textLight} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const user = authService.getCurrentUser();
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileService.getMyProfile(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => profileService.updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      showToast(t('profile.profileUpdated'), 'success');
      setEditProfileModalOpen(false);
      setEditDisplayName('');
    },
    onError: (err) => showToast(err?.message || t('profile.profileUpdateFailed'), 'error'),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file) => profileService.uploadAvatar(file),
    onSuccess: (avatarUrl) => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      showToast(t('profile.avatarUpdated', 'Photo updated'), 'success');
    },
    onError: (err) => showToast(err?.message || t('profile.avatarError', 'Failed to update photo'), 'error'),
  });

  const handleChangePhoto = () => {
    Alert.alert(
      t('profile.changePhoto', 'Change photo'),
      null,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.takePhoto', 'Take photo'),
          onPress: () => pickImage(true),
        },
        {
          text: t('profile.chooseFromGallery', 'Choose from gallery'),
          onPress: () => pickImage(false),
        },
      ]
    );
  };

  const pickImage = async (useCamera) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast(t('profile.avatarError', 'Permission to access camera or photos is required.'), 'error');
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName || `avatar_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      };
      await uploadAvatarMutation.mutateAsync(file);
    } catch (err) {
      showToast(err?.message || t('profile.avatarError', 'Failed to update photo'), 'error');
    }
  };

  const openEditProfile = () => {
    setEditDisplayName(profile?.displayName ?? profile?.display_name ?? '');
    setEditProfileModalOpen(true);
  };

  const handleSaveProfile = () => {
    const trimmed = (editDisplayName || '').trim();
    updateProfileMutation.mutate({ display_name: trimmed });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showToast(t('profile.passwordTooShort'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('profile.passwordsNoMatch'), 'error');
      return;
    }
    try {
      await authService.updatePassword(currentPassword, newPassword);
      showToast(t('profile.passwordUpdated'), 'success');
      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err?.message || t('profile.passwordUpdateFailed'), 'error');
    }
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          await authService.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Info (Paire: soft card, glass border; avatar with change-photo) */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.md]}>
          <TouchableOpacity
            style={[styles.avatarWrapper]}
            onPress={handleChangePhoto}
            activeOpacity={0.8}
            disabled={uploadAvatarMutation.isPending}
            accessibilityLabel={t('profile.changePhoto', 'Change photo')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                <User size={32} color={theme.colors.primary} />
              </View>
            )}
            {uploadAvatarMutation.isPending && (
              <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleChangePhoto}
            style={styles.changePhotoTouch}
            disabled={uploadAvatarMutation.isPending}
          >
            <Camera size={14} color={theme.colors.primary} />
            <Text style={[styles.changePhotoText, { color: theme.colors.primary }]}>
              {t('profile.changePhoto', 'Change photo')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {profile?.displayName || user?.displayName || user?.email?.split('@')[0]}
          </Text>
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
        </View>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{t('profile.settings')}</Text>
        <View style={[styles.menuGroup, shadows.sm]}>
          <MenuItem icon={Pencil} label={t('profile.displayName', 'Display name')} onPress={openEditProfile} theme={theme} />
          <MenuItem icon={Moon} label={isDark ? t('theme.lightMode') : t('theme.darkMode')} onPress={() => toggleTheme()} theme={theme} />
          <MenuItem icon={Globe} label={t('settings.language')} onPress={() => setLanguageModalOpen(true)} theme={theme} />
          <MenuItem icon={Lock} label={t('profile.changePassword')} onPress={() => setPasswordModalOpen(true)} theme={theme} />
          <MenuItem icon={CreditCard} label={t('profile.openBanking.title', 'Linked accounts')} onPress={() => router.push('/(app)/linked-accounts')} theme={theme} />
          <MenuItem icon={Bell} label={t('pushNotifications.title', 'Push Notifications')} onPress={() => router.push('/(app)/notification-settings')} theme={theme} />
          <MenuItem icon={Shield} label={t('auth.twoFactorSetup')} onPress={() => router.push('/(auth)/setup-2fa')} theme={theme} />
        </View>

        {/* Navigation */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{t('profile.manage')}</Text>
        <View style={[styles.menuGroup, shadows.sm]}>
          {(user?.roles?.includes('Admin') || user?.Roles?.includes?.('Admin')) && (
            <MenuItem icon={ShieldCheck} label={t('admin.title', 'Admin')} onPress={() => router.push('/(app)/admin/dashboard')} theme={theme} />
          )}
          <MenuItem icon={MessageCircle} label={t('chatbot.title', 'Financial Assistant')} onPress={() => router.push('/(app)/chatbot')} theme={theme} />
          <MenuItem icon={MapPin} label={t('travel.common.enterTravelMode', 'Travel Mode')} onPress={() => router.push('/(app)/travel')} theme={theme} />
          <MenuItem icon={Users} label={t('navigation.partnership')} onPress={() => router.push('/(app)/partnership')} theme={theme} />
          <MenuItem icon={PiggyBank} label={t('navigation.savingsGoals')} onPress={() => router.push('/(app)/savings-goals')} theme={theme} />
          <MenuItem icon={CreditCard} label={t('navigation.loans')} onPress={() => router.push('/(app)/loans')} theme={theme} />
          <MenuItem icon={Receipt} label={t('navigation.recurringBills')} onPress={() => router.push('/(app)/recurring-bills')} theme={theme} />
          <MenuItem icon={ShoppingCart} label={t('navigation.shoppingLists')} onPress={() => router.push('/(app)/shopping-lists')} theme={theme} />
          <MenuItem icon={Bell} label={t('navigation.reminders')} onPress={() => router.push('/(app)/reminders')} theme={theme} />
          <MenuItem icon={Trophy} label={t('navigation.achievements')} onPress={() => router.push('/(app)/achievements')} theme={theme} />
        </View>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{t('profile.legal', 'Legal')}</Text>
        <View style={[styles.menuGroup, shadows.sm]}>
          <MenuItem icon={FileText} label={t('legal.privacyPolicy')} onPress={() => router.push('/(auth)/privacy-policy')} theme={theme} />
          <MenuItem icon={FileText} label={t('legal.termsOfService')} onPress={() => router.push('/(auth)/terms-of-service')} theme={theme} />
        </View>

        {/* Logout */}
        <View style={[styles.menuGroup, shadows.sm, { marginTop: spacing.lg }]}>
          <MenuItem icon={LogOut} label={t('auth.logout')} onPress={handleLogout} theme={theme} destructive />
        </View>
      </ScrollView>

      {/* Language picker modal - Enhanced with flags */}
      <Modal
        isOpen={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
        title={t('settings.language')}
      >
        <View style={styles.languageList}>
          {LOCALES.map(({ code, labelKey, flag, nativeName }) => {
            const isSelected = i18n.language === code;
            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageItem,
                  { 
                    backgroundColor: isSelected 
                      ? theme.colors.primary + '15' 
                      : theme.colors.surfaceSecondary,
                    borderColor: isSelected ? theme.colors.primary : 'transparent',
                    borderWidth: isSelected ? 2 : 0,
                  },
                ]}
                onPress={() => {
                  i18n.changeLanguage(code);
                  showToast(t('settings.languageUpdated'), 'success');
                  setLanguageModalOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.languageFlag}>{flag}</Text>
                <View style={styles.languageTextContainer}>
                  <Text style={[styles.languageLabel, { color: theme.colors.text }]}>
                    {nativeName}
                  </Text>
                  <Text style={[styles.languageCode, { color: theme.colors.textSecondary }]}>
                    {code.toUpperCase()}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.languageCheckBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.languageCheckIcon}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* Edit profile (display name) modal */}
      <Modal
        isOpen={editProfileModalOpen}
        onClose={() => { setEditProfileModalOpen(false); setEditDisplayName(''); }}
        title={t('profile.displayName', 'Display name')}
      >
        <View style={styles.formModal}>
          <FormField
            label={t('profile.displayName')}
            value={editDisplayName}
            onChangeText={setEditDisplayName}
            placeholder={t('profile.displayNamePlaceholder')}
            required
          />
          <Button
            title={t('common.save')}
            onPress={handleSaveProfile}
            loading={updateProfileMutation.isPending}
          />
        </View>
      </Modal>

      {/* Change password modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
        title={t('profile.changePassword')}
      >
        <View style={styles.formModal}>
          <FormField
            label={t('auth.password')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t('auth.currentPasswordPlaceholder')}
            secureTextEntry
            required
          />
          <FormField
            label={t('auth.newPasswordPlaceholder')}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('auth.newPasswordPlaceholder')}
            secureTextEntry
            required
            minLength={6}
          />
          <FormField
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            secureTextEntry
            required
          />
          <Button title={t('common.save')} onPress={handleChangePassword} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  profileCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  avatarWrapper: {
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  changePhotoTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  changePhotoText: { ...typography.caption, fontWeight: '500' },
  name: { ...typography.h2 },
  email: { ...typography.bodySmall, marginTop: spacing.xs },
  sectionTitle: { ...typography.label, marginBottom: spacing.sm, marginLeft: spacing.xs },
  menuGroup: { borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  menuLabel: { flex: 1, ...typography.body },
  languageList: { gap: spacing.sm },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  languageFlag: { fontSize: 28 },
  languageTextContainer: { flex: 1 },
  languageLabel: { ...typography.body, fontWeight: '600' },
  languageCode: { ...typography.caption, marginTop: 2 },
  languageCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageCheckIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  formModal: { gap: spacing.lg },
});
