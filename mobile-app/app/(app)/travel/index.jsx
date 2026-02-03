/**
 * Travel Hub (React Native)
 * Trip list + Travel Chatbot + Travel Advisory.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Clipboard,
  Share,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, AlertTriangle, Search, Plus, MapPin, Home, Copy, Share2, StopCircle, RefreshCw, Sparkles, Brain } from 'lucide-react-native';
import { travelChatbotService, travelAdvisoryService, travelService, tripCityService, aiGatewayService } from '../../../services/api';
import { getStaticTravelSuggestions } from '../../../utils/travelChatbotSuggestions';
import { useTheme } from '../../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import { Modal, useToast, ScreenHeader } from '../../../components';
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
  const tripList = Array.isArray(trips) ? trips : [];
  // Context trip for Guide: most recent by start date (so answers are for current/upcoming trip)
  const contextTrip = useMemo(() => {
    if (tripList.length === 0) return null;
    const sorted = [...tripList].sort((a, b) => {
      const aDate = a.startDate || a.start_date || '';
      const bDate = b.startDate || b.start_date || '';
      return bDate.localeCompare(aDate);
    });
    return sorted[0] ?? null;
  }, [tripList]);
  // Cities for context trip (multi-city)
  const { data: contextTripCities = [] } = useQuery({
    queryKey: ['travel-trip-cities', contextTrip?.id],
    queryFn: () => tripCityService.getByTrip(contextTrip.id),
    enabled: !!contextTrip?.id,
  });
  const contextCityNames = useMemo(
    () => (Array.isArray(contextTripCities) ? contextTripCities.map((c) => c.name || c.Name).filter(Boolean) : []),
    [contextTripCities]
  );
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
  const [isAiMode, setIsAiMode] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const chatScrollRef = useRef(null);
  const chatRequestCancelledRef = useRef(false);

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

  // Check if AI gateway is available for Guide AI / Deep Think modes
  useEffect(() => {
    let cancelled = false;
    aiGatewayService.isAvailable().then((ok) => {
      if (!cancelled) setAiAvailable(ok);
    });
    return () => { cancelled = true; };
  }, []);

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
    chatRequestCancelledRef.current = false;
    try {
      let botContent = '';
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      if (isAiMode && aiAvailable) {
        // AI Mode: inject trip context so answers are for current trip locations
        const queryWithContext = travelContextString ? travelContextString + trimmed : trimmed;
        const aiHistory = history.map((m) => ({ role: m.role, message: m.content }));
        if (isThinkingMode) {
          const res = await aiGatewayService.ragQuery(queryWithContext, { history: aiHistory });
          if (chatRequestCancelledRef.current) return;
          botContent = res?.response || res?.answer || res?.message || t('travel.chatbot.thinking', 'Let me think about that...');
        } else {
          const formattedHistory = [...aiHistory, { role: 'user', message: queryWithContext }];
          const res = await aiGatewayService.chat(formattedHistory);
          if (chatRequestCancelledRef.current) return;
          botContent = res?.response || res?.content || res?.message || t('chatbot.aiResponse', "Here's what I found...");
        }
      } else {
        // Rule-based: travel chatbot service with trip context for personalization
        const res = await travelChatbotService.sendQuery(trimmed, history, lang, tripContext ?? undefined);
        if (chatRequestCancelledRef.current) return;
        botContent = res?.response ?? res?.message ?? (typeof res === 'string' ? res : t('travel.chatbot.thinking'));
      }

      setMessages((prev) => [...prev, { role: 'bot', content: botContent }]);
    } catch (err) {
      if (chatRequestCancelledRef.current) return;
      setMessages((prev) => [...prev, { role: 'bot', content: err?.message || t('common.error') }]);
    } finally {
      if (!chatRequestCancelledRef.current) setChatLoading(false);
    }
  }, [chatInput, chatLoading, messages, lang, isAiMode, isThinkingMode, aiAvailable, travelContextString, tripContext, t]);

  const stopChatRequest = useCallback(() => {
    chatRequestCancelledRef.current = true;
    setChatLoading(false);
  }, []);

  const handleCopyMessage = useCallback((text) => {
    Clipboard.setString(text);
    showToast(t('common.copied', 'Copied to clipboard'), 'success');
  }, [showToast, t]);

  const handleShareMessage = useCallback(async (text) => {
    try {
      await Share.share({ message: text });
    } catch (_) {}
  }, []);

  const clearGuideChat = useCallback(() => {
    Alert.alert(
      t('chatbot.clearHistoryTitle', 'Clear Chat'),
      t('chatbot.clearHistoryMessage', 'Are you sure you want to clear all messages?'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.clear', 'Clear'), style: 'destructive', onPress: () => setMessages([]) },
      ]
    );
  }, [t]);

  const toggleAiMode = useCallback((value) => {
    if (value && !aiAvailable) {
      showToast(t('chatbot.aiNotAvailable', 'AI mode is not available'), 'warning');
      return;
    }
    setIsAiMode(value);
    if (!value) setIsThinkingMode(false);
  }, [aiAvailable, showToast, t]);

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

  // Trip context for Guide: rule-based backend and AI prompt injection
  const tripContext = useMemo(() => {
    if (!contextTrip) return null;
    const dest = contextTrip.destination || contextTrip.Destination || contextTrip.name || contextTrip.Name || '';
    const startStr = contextTrip.startDate || contextTrip.StartDate;
    const endStr = contextTrip.endDate || contextTrip.EndDate;
    const dateRange = [startStr, endStr].filter(Boolean).map((d) => (typeof d === 'string' && d.includes('T') ? d.split('T')[0] : d)).join('–');
    return {
      name: contextTrip.name || contextTrip.Name || undefined,
      destination: dest || undefined,
      country: contextTrip.country || contextTrip.Country || undefined,
      startDate: startStr || undefined,
      endDate: endStr || undefined,
      budget: contextTrip.budget ?? contextTrip.Budget ?? undefined,
      cityNames: contextCityNames.length > 0 ? contextCityNames : undefined,
    };
  }, [contextTrip, contextCityNames]);

  // Context string to prepend to user message for AI/Deep Think (so answers are trip-location aware)
  const travelContextString = useMemo(() => {
    if (!tripContext?.destination) return '';
    const parts = ["Context: You are the Travel Guide. The user's current trip:", tripContext.destination];
    if (tripContext.country) parts.push(`, ${tripContext.country}`);
    if (tripContext.cityNames?.length) parts.push(`. Cities: ${tripContext.cityNames.join(', ')}`);
    const startStr = tripContext.startDate;
    const endStr = tripContext.endDate;
    if (startStr || endStr) {
      const start = typeof startStr === 'string' && startStr.includes('T') ? startStr.split('T')[0] : startStr;
      const end = typeof endStr === 'string' && endStr.includes('T') ? endStr.split('T')[0] : endStr;
      parts.push(`. Dates: ${[start, end].filter(Boolean).join('–')}`);
    }
    parts.push(". Answer only about travel and this trip's locations.\n\nUser question: ");
    return parts.join('');
  }, [tripContext]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={t('travel.common.enterTravelMode', 'Travel Mode')} />
      {/* Section toggles – fixed at top */}
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

      {/* Full-height Guide chat (input sticks to bottom) or scrollable Trips/Advisory */}
      {activeSection === 'chatbot' ? (
        <View style={[styles.chatbotSection, styles.chatbotSectionFullHeight, { backgroundColor: theme.colors.surface }, shadows.sm]}>
          <View style={styles.chatbotSectionHeader}>
            <View style={styles.chatbotSectionHeaderSpacer} />
            <TouchableOpacity
              onPress={clearGuideChat}
              style={styles.clearChatBtn}
              accessibilityLabel={t('chatbot.clearHistory', 'Clear history')}
            >
              <RefreshCw size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {/* AI Mode and Deep Think toggles – stacked so they don't overlap on small screens */}
          <View style={[styles.modeBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.glassBorder }]}>
            <View style={styles.modeToggleRow}>
              <View style={styles.modeToggleLabel}>
                <Sparkles size={16} color={isAiMode ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.modeToggleText, { color: theme.colors.text }]} numberOfLines={1}>
                  {t('chatbot.aiMode', 'AI Mode')}
                </Text>
              </View>
              <Switch
                value={isAiMode}
                onValueChange={toggleAiMode}
                trackColor={{ false: theme.colors.surfaceSecondary, true: theme.colors.primary + '50' }}
                thumbColor={isAiMode ? theme.colors.primary : theme.colors.textLight}
              />
            </View>
            {isAiMode && (
              <View style={styles.modeToggleRow}>
                <View style={styles.modeToggleLabel}>
                  <Brain size={16} color={isThinkingMode ? theme.colors.success : theme.colors.textSecondary} />
                  <Text style={[styles.modeToggleText, { color: theme.colors.text }]} numberOfLines={1}>
                    {t('chatbot.thinkingMode', 'Deep Think')}
                  </Text>
                </View>
                <Switch
                  value={isThinkingMode}
                  onValueChange={setIsThinkingMode}
                  trackColor={{ false: theme.colors.surfaceSecondary, true: theme.colors.success + '50' }}
                  thumbColor={isThinkingMode ? theme.colors.success : theme.colors.textLight}
                />
              </View>
            )}
          </View>
          <KeyboardAvoidingView
            style={styles.chatbotKeyboardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatList}
              contentContainerStyle={styles.chatListContent}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MessageCircle size={48} color={theme.colors.textLight} />
                  <Text style={[styles.emptyChat, { color: theme.colors.textSecondary }]}>
                    {t('travel.chatbot.welcomeMessage', "Hi! I'm your travel guide. Ask me anything about your trip!")}
                  </Text>
                </View>
              ) : (
                <>
                  {messages.map((item, i) => (
                    <View key={i} style={[styles.messageRow, item.role === 'user' ? styles.messageRowUser : styles.messageRowBot]}>
                      {item.role === 'bot' && (
                        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                          <MessageCircle size={16} color={theme.colors.primary} />
                        </View>
                      )}
                      <View
                        style={[
                          styles.bubble,
                          {
                            backgroundColor: item.role === 'user' ? theme.colors.primary + '20' : theme.colors.surface,
                            borderColor: theme.colors.glassBorder,
                          },
                          item.role === 'bot' && shadows.sm,
                        ]}
                      >
                        <Text style={[styles.bubbleText, { color: theme.colors.text }]} selectable>{item.content}</Text>
                        {item.role === 'bot' && (
                          <View style={styles.messageActions}>
                            <TouchableOpacity
                              style={[styles.messageActionBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                              onPress={() => handleCopyMessage(item.content)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Copy size={12} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.messageActionBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
                              onPress={() => handleShareMessage(item.content)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Share2 size={12} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                  {/* Loading indicator: show that the agent is working */}
                  {chatLoading && (
                    <View style={[styles.messageRow, styles.messageRowBot]}>
                      <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                        <MessageCircle size={16} color={theme.colors.primary} />
                      </View>
                      <View
                        style={[
                          styles.bubble,
                          styles.thinkingBubble,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder },
                          shadows.sm,
                        ]}
                      >
                        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.thinkingSpinner} />
                        <Text style={[styles.bubbleText, { color: theme.colors.textSecondary }]}>
                          {t('travel.chatbot.thinking', t('chatbot.thinking', 'Thinking...'))}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}
              {messages.length === 0 && suggestions.length > 0 && (
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
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, { color: theme.colors.primary }]} numberOfLines={2}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
            <View style={[styles.inputRow, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.glassBorder }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.glassBorder,
                  },
                ]}
                placeholder={t('travel.chatbot.placeholder', 'Ask about your trip...')}
                placeholderTextColor={theme.colors.textLight}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => sendChatMessage(chatInput)}
                editable={!chatLoading}
                multiline
                maxLength={2000}
              />
              {chatLoading ? (
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: theme.colors.error }]}
                  onPress={stopChatRequest}
                  accessibilityLabel={t('chatbot.stop', 'Stop')}
                >
                  <StopCircle size={20} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: chatInput.trim() ? theme.colors.primary : theme.colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() => sendChatMessage(chatInput)}
                  disabled={!chatInput.trim()}
                  accessibilityLabel={t('chatbot.send', 'Send')}
                >
                  <Send size={20} color={chatInput.trim() ? '#fff' : theme.colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollViewFlex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
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
      )}

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
  scrollViewFlex: { flex: 1 },
  chatbotSection: { borderRadius: borderRadius.lg, padding: spacing.md, overflow: 'hidden' },
  chatbotSectionFullHeight: { flex: 1 },
  chatbotSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: spacing.xs },
  chatbotSectionHeaderSpacer: { flex: 1 },
  clearChatBtn: { padding: spacing.xs },
  modeBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 36,
  },
  modeToggleLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, minWidth: 0 },
  modeToggleText: { ...typography.bodySmall, fontWeight: '500', flex: 1 },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinkingSpinner: { marginRight: 0 },
  chatbotKeyboardWrap: { flex: 1 },
  chatList: { flex: 1 },
  chatListContent: { paddingBottom: spacing.md },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyChat: { ...typography.body, textAlign: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  messageRow: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-start' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  bubble: {
    maxWidth: '80%',
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  bubbleText: { ...typography.body },
  messageActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs, marginTop: spacing.xs },
  messageActionBtn: { padding: spacing.xs, borderRadius: borderRadius.sm },
  suggestions: { marginTop: spacing.md },
  suggestionsLabel: { ...typography.label, marginBottom: spacing.sm },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1 },
  chipText: { ...typography.bodySmall },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 140,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    ...typography.body,
  },
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
