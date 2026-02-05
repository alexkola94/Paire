/**
 * Travel Chatbot Component (React Native)
 * AI-powered travel assistant for trip-related questions.
 * Can be embedded in trip detail or used standalone.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Send,
  Plane,
  MapPin,
  Utensils,
  Landmark,
  Sun,
  StopCircle,
} from 'lucide-react-native';
import { travelChatbotService, aiGatewayService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';
import StructuredMessageContent from '../StructuredMessageContent';

// Travel-specific suggestions
const TRAVEL_SUGGESTIONS = [
  { icon: MapPin, text: 'Best places to visit' },
  { icon: Utensils, text: 'Local food recommendations' },
  { icon: Landmark, text: 'Must-see attractions' },
  { icon: Sun, text: 'Weather and packing tips' },
  { icon: Plane, text: 'Travel tips for this destination' },
];

// Message bubble component
function MessageBubble({ item, theme }) {
  const isUser = item.role === 'user';
  
  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
      {!isUser && (
        <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <Plane size={14} color={theme.colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? theme.colors.primary + '20' : theme.colors.surface,
            borderColor: theme.colors.glassBorder,
          },
          !isUser && shadows.sm,
        ]}
      >
        {isUser ? (
          <Text style={[styles.bubbleText, { color: theme.colors.text }]} selectable>
            {item.content}
          </Text>
        ) : (
          <StructuredMessageContent
            text={item.content}
            theme={theme}
            textStyle={[styles.bubbleText, { color: theme.colors.text }]}
          />
        )}
      </View>
    </View>
  );
}

export default function TravelChatbot({ tripId, destination, compact = false }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const listRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lang = i18n.language || 'en';

  // Stop current request
  const stopRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  // Send message to travel chatbot
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || loading) return;
      
      setInput('');
      const userMessage = { role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      abortControllerRef.current = new AbortController();

      try {
        let botContent = '';
        
        // Build context about the trip
        const tripContext = destination 
          ? `The user is planning a trip to ${destination}. ` 
          : '';
        
        const history = messages.map((m) => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          message: m.content,
        }));

        // Try travel chatbot service first, fallback to AI gateway
        try {
          if (travelChatbotService?.sendQuery) {
            const res = await travelChatbotService.sendQuery(trimmed, {
              tripId,
              destination,
              history,
              language: lang,
            });
            botContent = res?.response || res?.message || res?.answer || '';
          }
        } catch {
          // Fallback to AI gateway
        }

        // Fallback to AI gateway if no response
        if (!botContent) {
          try {
            const aiHistory = [
              ...history,
              { role: 'user', message: tripContext + trimmed },
            ];
            const res = await aiGatewayService.chat(aiHistory);
            botContent = res?.response || res?.content || res?.message || 
              t('travel.chatbot.thinking', 'Let me think about that...');
          } catch {
            botContent = t('travel.chatbot.errorMessage', 'Sorry, I couldn\'t process your request. Please try again.');
          }
        }

        const botMessage = { role: 'bot', content: botContent };
        setMessages((prev) => [...prev, botMessage]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        
      } catch (err) {
        if (err.name === 'AbortError') return;
        
        const errorMessage = { 
          role: 'bot', 
          content: err?.message || t('travel.chatbot.errorMessage', 'Something went wrong.'),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [input, loading, messages, tripId, destination, lang, t]
  );

  // Handle suggestion press
  const handleSuggestion = useCallback((suggestion) => {
    const contextText = destination 
      ? `${suggestion.text} in ${destination}`
      : suggestion.text;
    sendMessage(contextText);
  }, [destination, sendMessage]);

  return (
    <View style={[styles.container, compact && styles.containerCompact, { backgroundColor: theme.colors.background }]}>
      {/* Header (only in non-compact mode) */}
      {!compact && (
        <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
          <MessageCircle size={20} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {t('travel.chatbot.title', 'Travel Guide')}
          </Text>
          {destination && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {destination}
            </Text>
          )}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <MessageBubble item={item} theme={theme} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Plane size={32} color={theme.colors.textLight} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('travel.chatbot.welcomeMessage', 'Hi! I\'m your travel guide. Ask me anything about your trip!')}
            </Text>
            
            {/* Quick suggestions */}
            <View style={styles.suggestions}>
              {TRAVEL_SUGGESTIONS.slice(0, compact ? 3 : 5).map((suggestion, index) => {
                const IconComponent = suggestion.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionChip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}
                    onPress={() => handleSuggestion(suggestion)}
                    activeOpacity={0.7}
                  >
                    <IconComponent size={14} color={theme.colors.primary} />
                    <Text style={[styles.suggestionText, { color: theme.colors.primary }]} numberOfLines={1}>
                      {suggestion.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.glassBorder }]}>
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
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          editable={!loading}
          multiline
          maxLength={1000}
        />
        
        {loading ? (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.colors.error }]}
            onPress={stopRequest}
          >
            <StopCircle size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: input.trim() ? theme.colors.primary : theme.colors.surfaceSecondary,
              },
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
          >
            <Send size={18} color={input.trim() ? '#fff' : theme.colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerCompact: {
    maxHeight: 400,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  headerTitle: { ...typography.body, fontWeight: '600' },
  headerSubtitle: { ...typography.caption, marginLeft: 'auto' },

  // Messages
  list: { flex: 1 },
  listContent: { padding: spacing.sm, paddingBottom: spacing.md },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    marginTop: spacing.xs,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  bubbleText: { ...typography.bodySmall },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  suggestionText: { ...typography.caption },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    ...typography.bodySmall,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
