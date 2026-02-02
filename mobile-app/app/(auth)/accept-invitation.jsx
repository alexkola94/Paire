import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart, XCircle } from 'lucide-react-native';
import { partnershipService } from '../../services/api';
import { authService } from '../../services/auth';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const details = await partnershipService.getInvitationDetails(token);
        setInvitation(details);
      } catch (err) {
        setError(err.message || 'Invalid invitation');
      } finally { setLoading(false); }
    };
    if (token) load();
    else { setError('Missing invitation token'); setLoading(false); }
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await partnershipService.acceptInvitation(token);
      if (authService.isAuthenticated()) {
        router.replace('/(app)/partnership');
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invitation');
    } finally { setAccepting(false); }
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.center}>
          <XCircle size={64} color={colors.error} />
          <Text style={styles.title}>{error}</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Heart size={64} color={colors.primary} />
          <Text style={styles.title}>{t('partnership.invitationTitle')}</Text>
          <Text style={styles.subtitle}>{invitation?.inviterEmail} {t('partnership.invitedYou')}</Text>
          <TouchableOpacity style={[styles.btn, accepting && { opacity: 0.6 }]} onPress={handleAccept} disabled={accepting}>
            {accepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('partnership.accept')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary, padding: spacing.lg },
  center: { alignItems: 'center' },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.sm, padding: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
