import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Heart, Send } from 'lucide-react-native';
import { partnershipService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { ScreenHeader } from '../../components';

export default function PartnershipScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const { data, refetch } = useQuery({ queryKey: ['partnerships'], queryFn: () => partnershipService.getMyPartnerships() });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const handleInvite = async () => {
    if (!email) return;
    setSending(true); setMessage('');
    try {
      await partnershipService.sendInvitation(email);
      setMessage(t('partnership.invitationSent'));
      setEmail('');
    } catch (err) { setMessage(err.message); }
    finally { setSending(false); }
  };

  const partnerships = Array.isArray(data) ? data : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={t('partnership.title')} />
      <ScrollView contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        {partnerships.length > 0 ? partnerships.map((p) => (
          <View key={p.id} style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <Heart size={24} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{p.partnerEmail || p.partnerName}</Text>
              <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
                {p.status ? t(`partnership.status.${String(p.status).toLowerCase()}`, p.status) : p.status}
              </Text>
            </View>
          </View>
        )) : (
          <View style={styles.emptySection}>
            <Heart size={48} color={theme.colors.textLight} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('partnership.noPartner')}</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('partnership.invitePartner')}</Text>
        <View style={[styles.inviteRow, { backgroundColor: theme.colors.surface }]}>
          <TextInput style={[styles.input, { color: theme.colors.text }]} placeholder={t('auth.email')}
            placeholderTextColor={theme.colors.textLight} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity style={styles.sendBtn} onPress={handleInvite} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
        {message ? <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  card: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { ...typography.body, fontWeight: '600' },
  cardSub: { ...typography.bodySmall, marginTop: 2 },
  emptySection: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { ...typography.body, marginTop: spacing.md },
  sectionTitle: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.md },
  inviteRow: { flexDirection: 'row', borderRadius: borderRadius.sm, overflow: 'hidden' },
  input: { flex: 1, padding: spacing.md, fontSize: 16 },
  sendBtn: { backgroundColor: '#8e44ad', padding: spacing.md, justifyContent: 'center' },
  message: { ...typography.bodySmall, marginTop: spacing.sm },
});
