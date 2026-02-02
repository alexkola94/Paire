/**
 * Travel Hub (React Native)
 * Trip list + Travel Chatbot + Travel Advisory.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, AlertTriangle, Search, Plus, MapPin, Home } from 'lucide-react-native';
import { travelChatbotService, travelAdvisoryService, travelService } from '../../../services/api';
import { getStaticTravelSuggestions } from '../../../utils/travelChatbotSuggestions';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import { Modal, useToast } from '../../../components';
import { MultiCityTripWizard } from '../../../components/travel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function TravelIndexScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('trips'); // 'trips' | 'chatbot' | 'advisory'
  const [refreshing, setRefreshing] = useState(false);

  // Trips
  const { data: trips = [], refetch: refetchTrips } = useQuery({
    queryKey: ['travel-trips'],
    queryFn: () => travelService.getTrips(),
  });
  const [addTripOpen, setAddTripOpen] = useState(false);
  const [showTripTypePicker, setShowTripTypePicker] = useState(false);
  const [showMultiCityWizard, setShowMultiCityWizard] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripBudget, setNewTripBudget] = useState('');
  const createMutation = useMutation({
    mutationFn: (payload) => travelService.createTrip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-trips'] });
      showToast(t('travel.common.createTrip', 'Trip created'), 'success');
      setAddTripOpen(false);
      setNewTripName('');
      setNewTripDestination('');
      setNewTripStart('');
      setNewTripEnd('');
      setNewTripBudget('');
    },
    onError: (err) => showToast(err?.message || t('common.error'), 'error'),
  });

  // Chatbot state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  // Note: chatListRef removed - using View instead of FlatList for chat messages

  // Advisory state
  const [advisoryCountry, setAdvisoryCountry] = useState('');
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState(null);
  const [advisoryError, setAdvisoryError] = useState(null);

  const lang = i18n.language || 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await travelChatbotService.getSuggestions(lang);
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setSuggestions(list.slice(0, 6));
        } else if (!cancelled) {
          setSuggestions(getStaticTravelSuggestions(lang).slice(0, 6));
        }
      } catch {
        if (!cancelled) setSuggestions(getStaticTravelSuggestions(lang).slice(0, 6));
      }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchTrips();
    setAdvisoryResult(null);
    setAdvisoryError(null);
    setRefreshing(false);
  }, [refetchTrips]);

  const sendChatMessage = useCallback(async (text) => {
    const trimmed = (text || chatInput).trim();
    if (!trimmed || chatLoading) return;
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setChatLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await travelChatbotService.sendQuery(trimmed, history, lang);
      const botContent = res?.response ?? res?.message ?? (typeof res === 'string' ? res : t('travel.chatbot.thinking'));
      setMessages((prev) => [...prev, { role: 'bot', content: botContent }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'bot', content: err?.message || t('common.error') }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, messages, lang, t]);

  const fetchAdvisory = useCallback(async () => {
    const code = advisoryCountry.trim().toUpperCase();
    if (!code || advisoryLoading) return;
    setAdvisoryLoading(true);
    setAdvisoryResult(null);
    setAdvisoryError(null);
    try {
      const res = await travelAdvisoryService.getAdvisory(code);
      if (res?.hasData === false && res?.message) setAdvisoryError(res.message);
      else if (res?.countryCode || res?.score != null) setAdvisoryResult(res);
      else setAdvisoryResult(res);
    } catch (err) {
      setAdvisoryError(err?.message || t('common.error'));
    } finally {
      setAdvisoryLoading(false);
    }
  }, [advisoryCountry, advisoryLoading, t]);

  const handleCreateTrip = () => {
    const name = newTripName.trim();
    const destination = newTripDestination.trim() || name;
    if (!name) {
      showToast(t('travel.common.createTrip', 'Trip name required'), 'error');
      return;
    }
    const payload = {
      name,
      destination,
      startDate: newTripStart || null,
      endDate: newTripEnd || null,
      budget: newTripBudget ? parseFloat(newTripBudget) : 0,
    };
    createMutation.mutate(payload);
  };

  const handleMultiCitySave = (createdTrip) => {
    queryClient.invalidateQueries({ queryKey: ['travel-trips'] });
    showToast(t('travel.common.createTrip', 'Trip created'), 'success');
    setShowMultiCityWizard(false);
    if (createdTrip?.id) {
      router.push({ pathname: '/travel/[id]', params: { id: createdTrip.id } });
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const s = typeof d === 'string' ? d : (d?.toISOString?.() ?? '');
      return s.split('T')[0] ? new Date(s.split('T')[0]).toLocaleDateString() : '—';
    } catch {
      return '—';
    }
  };

  const riskLevelKey = (score) => {
    if (score == null) return 'unknown';
    if (score <= 2) return 'low';
    if (score <= 4) return 'medium';
    if (score <= 6) return 'high';
    return 'critical';
  };

  const tripList = Array.isArray(trips) ? trips : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('travel.common.enterTravelMode', 'Travel Mode')}
        </Text>

        {/* Section toggles */}
        <View style={[styles.tabs, { backgroundColor: theme.colors.surface }, shadows.sm]}>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'trips' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveSection('trips')}
          >
            <MapPin size={18} color={activeSection === 'trips' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.tabLabel, { color: activeSection === 'trips' ? theme.colors.primary : theme.colors.textSecondary }]}>
              {t('travel.nav.home', 'Trips')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'chatbot' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveSection('chatbot')}
          >
            <MessageCircle size={18} color={activeSection === 'chatbot' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.tabLabel, { color: activeSection === 'chatbot' ? theme.colors.primary : theme.colors.textSecondary }]}>
              {t('travel.chatbot.title', 'Guide')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'advisory' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveSection('advisory')}
          >
            <AlertTriangle size={18} color={activeSection === 'advisory' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.tabLabel, { color: activeSection === 'advisory' ? theme.colors.primary : theme.colors.textSecondary }]}>
              {t('travel.advisory.riskLevel.unknown', 'Advisory')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeSection === 'trips' && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <View style={styles.tripHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('travel.common.viewAll', 'My Trips')}
              </Text>
              <TouchableOpacity
                style={[styles.addTripBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowTripTypePicker(true)}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.addTripBtnText}>{t('travel.common.createTrip', 'Create Trip')}</Text>
              </TouchableOpacity>
            </View>
            {tripList.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t('travel.common.noTrip', 'No trips yet. Create one to get started.')}
              </Text>
            ) : (
              tripList.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[styles.tripCard, { backgroundColor: theme.colors.background }, shadows.sm]}
                  onPress={() => router.push({ pathname: '/travel/[id]', params: { id: trip.id } })}
                >
                  <Text style={[styles.tripName, { color: theme.colors.text }]} numberOfLines={1}>
                    {trip.name || trip.destination || 'Trip'}
                  </Text>
                  <Text style={[styles.tripSub, { color: theme.colors.textSecondary }]}>
                    {trip.destination} • {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeSection === 'chatbot' && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            {/* Use View with mapped messages instead of FlatList to avoid nesting VirtualizedList in ScrollView */}
            <View style={styles.chatList}>
              <View style={styles.chatListContent}>
                {messages.length === 0 ? (
                  <Text style={[styles.emptyChat, { color: theme.colors.textSecondary }]}>
                    {t('travel.chatbot.placeholder', 'Ask about your trip...')}
                  </Text>
                ) : (
                  messages.map((item, i) => (
                    <View key={i} style={[styles.messageRow, item.role === 'user' ? styles.messageRowUser : styles.messageRowBot]}>
                      <View style={[styles.bubble, { backgroundColor: item.role === 'user' ? theme.colors.primary + '20' : theme.colors.background }, !(item.role === 'user') && shadows.sm]}>
                        <Text style={[styles.bubbleText, { color: theme.colors.text }]} selectable>{item.content}</Text>
                      </View>
                    </View>
                  ))
                )}
                {/* Suggestion chips */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestions}>
                    <Text style={[styles.suggestionsLabel, { color: theme.colors.textSecondary }]}>
                      {t('travel.chatbot.tryAsking', 'Try asking:')}
                    </Text>
                    <View style={styles.suggestionChips}>
                      {suggestions.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '40' }]}
                          onPress={() => sendChatMessage(s)}
                        >
                          <Text style={[styles.chipText, { color: theme.colors.primary }]} numberOfLines={1}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.inputRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.glassBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                placeholder={t('travel.chatbot.placeholder', 'Ask about your trip...')}
                placeholderTextColor={theme.colors.textLight}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => sendChatMessage(chatInput)}
                editable={!chatLoading}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => sendChatMessage(chatInput)}
                disabled={!chatInput.trim() || chatLoading}
              >
                {chatLoading ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeSection === 'advisory' && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }, shadows.sm]}>
            <Text style={[styles.advisoryHint, { color: theme.colors.textSecondary }]}>
              {t('travel.advisory.genericMessage', 'Check official guidance before you travel.')}
            </Text>
            <View style={[styles.inputRow, { borderColor: theme.colors.glassBorder }]}>
              <Search size={20} color={theme.colors.textLight} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder={t('travel.advisory.countryPlaceholder', 'e.g. US, GR, FRA')}
                placeholderTextColor={theme.colors.textLight}
                value={advisoryCountry}
                onChangeText={(v) => { setAdvisoryCountry(v); setAdvisoryError(null); setAdvisoryResult(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={3}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={fetchAdvisory}
              disabled={!advisoryCountry.trim() || advisoryLoading}
            >
              {advisoryLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t('travel.layout.sections.advisory', 'Travel Advisory')}</Text>}
            </TouchableOpacity>
            {advisoryError && (
              <View style={[styles.advisoryCard, { backgroundColor: theme.colors.error + '15', borderColor: theme.colors.error + '40' }]}>
                <Text style={[styles.advisoryCardText, { color: theme.colors.error }]}>{advisoryError}</Text>
              </View>
            )}
            {advisoryResult && !advisoryError && (
              <View style={[styles.advisoryCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.glassBorder }, shadows.sm]}>
                <Text style={[styles.advisoryCardTitle, { color: theme.colors.text }]}>{advisoryResult.countryCode || advisoryCountry}</Text>
                <Text style={[styles.advisoryCardText, { color: theme.colors.textSecondary }]}>
                  {t('travel.advisory.riskLevel.' + riskLevelKey(advisoryResult.score), 'Risk level unknown')}
                  {advisoryResult.score != null ? ` (${advisoryResult.score})` : ''}
                </Text>
                {(advisoryResult.advisoryText || advisoryResult.message) && (
                  <Text style={[styles.advisoryCardText, { color: theme.colors.text, marginTop: spacing.sm }]}>
                    {advisoryResult.advisoryText || advisoryResult.message}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Trip type picker: Single vs Multi-city */}
      <Modal
        isOpen={showTripTypePicker}
        onClose={() => setShowTripTypePicker(false)}
        title={t('travel.home.createTripTypeTitle', 'What kind of trip?')}
      >
        <View style={styles.typePicker}>
          <TouchableOpacity
            style={[styles.typeOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
            onPress={() => {
              setShowTripTypePicker(false);
              setAddTripOpen(true);
            }}
            activeOpacity={0.7}
          >
            <Home size={24} color={theme.colors.primary} />
            <View style={styles.typeOptionText}>
              <Text style={[styles.typeOptionTitle, { color: theme.colors.text }]}>
                {t('travel.home.singleTripLabel', 'Single destination')}
              </Text>
              <Text style={[styles.typeOptionSub, { color: theme.colors.textSecondary }]}>
                {t('travel.home.singleTripSubtitle', 'One main place with simple dates.')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}
            onPress={() => {
              setShowTripTypePicker(false);
              setShowMultiCityWizard(true);
            }}
            activeOpacity={0.7}
          >
            <MapPin size={24} color={theme.colors.primary} />
            <View style={styles.typeOptionText}>
              <Text style={[styles.typeOptionTitle, { color: theme.colors.text }]}>
                {t('travel.home.multiCityTripLabel', 'Multi-city route')}
              </Text>
              <Text style={[styles.typeOptionSub, { color: theme.colors.textSecondary }]}>
                {t('travel.home.multiCityTripSubtitle', 'Several cities with a mapped route.')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Multi-city trip wizard (full screen overlay) */}
      {showMultiCityWizard && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: theme.colors.background }]}>
          <MultiCityTripWizard
            trip={null}
            onClose={() => setShowMultiCityWizard(false)}
            onSave={handleMultiCitySave}
          />
        </View>
      )}

      {/* Add Trip Modal */}
      <Modal
        isOpen={addTripOpen}
        onClose={() => setAddTripOpen(false)}
        title={t('travel.common.createTrip', 'Create Trip')}
      >
        <View style={styles.form}>
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.name', 'Name')}</Text>
          <TextInput
            style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
            placeholder={t('travel.itinerary.eventNamePlaceholder', 'e.g. Paris 2025')}
            placeholderTextColor={theme.colors.textLight}
            value={newTripName}
            onChangeText={setNewTripName}
          />
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.destination', 'Destination')}</Text>
          <TextInput
            style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
            placeholder={t('travel.trip.destinationPlaceholder', 'e.g. Paris')}
            placeholderTextColor={theme.colors.textLight}
            value={newTripDestination}
            onChangeText={setNewTripDestination}
          />
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.trip.startDate', 'Start Date')} / {t('travel.trip.endDate', 'End Date')}</Text>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.formInputSmall, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
              placeholder={t('travel.trip.startDatePlaceholder', 'Start YYYY-MM-DD')}
              placeholderTextColor={theme.colors.textLight}
              value={newTripStart}
              onChangeText={setNewTripStart}
            />
            <TextInput
              style={[styles.formInputSmall, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
              placeholder={t('travel.trip.endDatePlaceholder', 'End YYYY-MM-DD')}
              placeholderTextColor={theme.colors.textLight}
              value={newTripEnd}
              onChangeText={setNewTripEnd}
            />
          </View>
          <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>{t('travel.budget.amount', 'Budget')} (optional)</Text>
          <TextInput
            style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.glassBorder }]}
            placeholder={t('travel.trip.budgetPlaceholder', '0')}
            placeholderTextColor={theme.colors.textLight}
            value={newTripBudget}
            onChangeText={setNewTripBudget}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCreateTrip}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t('travel.common.save', 'Save')}</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  title: { ...typography.h2, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', borderRadius: borderRadius.md, marginBottom: spacing.md, overflow: 'hidden' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  tabLabel: { ...typography.caption },
  section: { borderRadius: borderRadius.lg, padding: spacing.md, minHeight: 200 },
  sectionTitle: { ...typography.label, marginBottom: spacing.sm },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  addTripBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  addTripBtnText: { ...typography.caption, color: '#fff' },
  emptyText: { ...typography.bodySmall, textAlign: 'center', paddingVertical: spacing.lg },
  tripCard: { padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  tripName: { ...typography.body, fontWeight: '600' },
  tripSub: { ...typography.bodySmall, marginTop: 2 },
  chatList: { maxHeight: 280 },
  chatListContent: { paddingBottom: spacing.md },
  emptyChat: { ...typography.bodySmall, paddingVertical: spacing.lg, textAlign: 'center' },
  messageRow: { marginBottom: spacing.sm },
  messageRowUser: { alignItems: 'flex-end' },
  messageRowBot: { alignItems: 'flex-start' },
  bubble: { maxWidth: '85%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  bubbleText: { ...typography.bodySmall },
  suggestions: { marginTop: spacing.sm },
  suggestionsLabel: { ...typography.caption, marginBottom: spacing.xs },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1 },
  chipText: { ...typography.caption },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, marginTop: spacing.md, gap: spacing.sm },
  input: { flex: 1, ...typography.body, paddingVertical: spacing.sm, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md },
  primaryButtonText: { ...typography.label, color: '#fff' },
  advisoryHint: { ...typography.bodySmall, marginBottom: spacing.md },
  advisoryCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1 },
  advisoryCardTitle: { ...typography.h3, marginBottom: spacing.xs },
  advisoryCardText: { ...typography.bodySmall },
  form: { padding: spacing.md },
  formLabel: { ...typography.caption, marginBottom: spacing.xs },
  formInput: { ...typography.body, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  formInputSmall: { flex: 1, ...typography.bodySmall, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginBottom: spacing.md },
  formRow: { flexDirection: 'row', gap: spacing.sm },
  typePicker: { padding: spacing.md, gap: spacing.md },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  typeOptionText: { flex: 1 },
  typeOptionTitle: { ...typography.body, fontWeight: '600' },
  typeOptionSub: { ...typography.bodySmall, marginTop: 2 },
});
