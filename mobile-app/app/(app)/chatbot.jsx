/**
 * Financial Chatbot Screen (React Native)
 * Full-featured chat for financial questions with AI mode support.
 * 
 * Features:
 * - Rule-based mode (chatbotService) - Default
 * - AI mode (aiGatewayService.chat) - LLM-powered
 * - Thinking mode (aiGatewayService.ragQuery) - RAG-enhanced
 * - Typewriter effect for bot responses
 * - Stop button for AI requests
 * - Message copy/share functionality
 * - Report generation
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
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Send,
  ChevronLeft,
  Bot,
  Sparkles,
  Brain,
  Copy,
  Share2,
  StopCircle,
  RefreshCw,
  FileText,
  AlertCircle,
  Lightbulb,
  Info,
} from 'lucide-react-native';
import { chatbotService, aiGatewayService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useBackGesture } from '../../context/BackGestureContext';
import { useToast, ScreenHeader, StructuredMessageContent } from '../../components';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

// Default suggestion translation keys when API fails or is empty
const DEFAULT_SUGGESTION_KEYS = [
  'chatbot.suggestions.suggestion1',
  'chatbot.suggestions.suggestion2',
  'chatbot.suggestions.suggestion3',
  'chatbot.suggestions.suggestion4',
  'chatbot.suggestions.suggestion5',
  'chatbot.suggestions.suggestion6',
];

// Message type icons
const MESSAGE_TYPE_ICONS = {
  insight: { icon: Lightbulb, color: '#F59E0B' },
  warning: { icon: AlertCircle, color: '#EF4444' },
  info: { icon: Info, color: '#3B82F6' },
  default: { icon: Bot, color: null },
};

// Typewriter hook for animated text display
function useTypewriter(text, speed = 20, enabled = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayedText(text || '');
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return { displayedText, isComplete };
}

// Message bubble component with typewriter effect
function MessageBubble({ item, theme, isLatest, onCopy, onShare }) {
  const isUser = item.role === 'user';
  const { displayedText, isComplete } = useTypewriter(
    item.content,
    15,
    !isUser && isLatest && !item.isComplete
  );

  // Mark message as complete when typewriter finishes
  useEffect(() => {
    if (isComplete && !item.isComplete) {
      item.isComplete = true;
    }
  }, [isComplete, item]);

  const content = isUser ? item.content : (isLatest && !item.isComplete ? displayedText : item.content);
  const messageType = item.type || 'default';
  const TypeIcon = MESSAGE_TYPE_ICONS[messageType]?.icon || Bot;
  const typeColor = MESSAGE_TYPE_ICONS[messageType]?.color || theme.colors.primary;

  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
      {!isUser && (
        <View style={[styles.avatarContainer, { backgroundColor: typeColor + '20' }]}>
          <TypeIcon size={16} color={typeColor} />
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
            {content}
          </Text>
        ) : (
          <StructuredMessageContent
            text={content}
            theme={theme}
            textStyle={[styles.bubbleText, { color: theme.colors.text }]}
          />
        )}

        {/* Action buttons for bot messages */}
        {!isUser && isComplete && (
          <View style={styles.messageActions}>
            <TouchableOpacity
              style={[styles.messageActionBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
              onPress={() => onCopy(item.content)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Copy size={12} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.messageActionBtn, { backgroundColor: theme.colors.surfaceSecondary }]}
              onPress={() => onShare(item.content)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Share2 size={12} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ChatbotScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();
  useBackGesture();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  // AI mode state
  const [isAiMode, setIsAiMode] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  
  // Request cancellation
  const abortControllerRef = useRef(null);
  
  const listRef = useRef(null);
  const lang = i18n.language || 'en';

  // Check AI availability on mount
  useEffect(() => {
    (async () => {
      try {
        const available = await aiGatewayService.isAvailable();
        setAiAvailable(available);
      } catch {
        setAiAvailable(false);
      }
    })();
  }, []);

  // Load suggestions (fallback uses translated default suggestions)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await chatbotService.getSuggestions();
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setSuggestions(list.slice(0, 6));
        } else if (!cancelled) {
          setSuggestions(DEFAULT_SUGGESTION_KEYS.map((key) => t(key)));
        }
      } catch {
        if (!cancelled) setSuggestions(DEFAULT_SUGGESTION_KEYS.map((key) => t(key)));
      }
    })();
    return () => { cancelled = true; };
  }, [lang, t]);

  // Stop current request
  const stopRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  // Copy message to clipboard
  const handleCopy = useCallback((text) => {
    Clipboard.setString(text);
    showToast(t('common.copied', 'Copied to clipboard'), 'success');
  }, [showToast, t]);

  // Share message
  const handleShare = useCallback(async (text) => {
    try {
      await Share.share({ message: text });
    } catch (err) {
      // User cancelled or error
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || loading) return;
      
      setInput('');
      const userMessage = { role: 'user', content: trimmed, isComplete: true };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        let botContent = '';
        let messageType = 'default';
        
        if (isAiMode && aiAvailable) {
          // AI Mode - Use aiGatewayService
          const history = messages.map((m) => ({
            role: m.role,
            message: m.content,
          }));

          if (isThinkingMode) {
            // RAG-enhanced query (Thinking mode)
            const res = await aiGatewayService.ragQuery(trimmed, { history });
            botContent = res?.response || res?.answer || res?.message || 
              t('chatbot.thinking', 'Let me think about that...');
            messageType = 'insight';
          } else {
            // Standard AI chat
            const formattedHistory = [...history, { role: 'user', message: trimmed }];
            const res = await aiGatewayService.chat(formattedHistory);
            botContent = res?.response || res?.content || res?.message ||
              t('chatbot.aiResponse', 'Here\'s what I found...');
          }
        } else {
          // Rule-based mode - Use chatbotService
          const history = messages.map((m) => ({ role: m.role, content: m.content }));
          const res = await chatbotService.sendQuery(trimmed, history);
          botContent = res?.response ?? res?.message ?? 
            (typeof res === 'string' ? res : t('chatbot.thinking', 'Thinking...'));
        }

        const botMessage = { 
          role: 'bot', 
          content: botContent, 
          type: messageType,
          isComplete: false,
        };
        setMessages((prev) => [...prev, botMessage]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        
      } catch (err) {
        if (err.name === 'AbortError') {
          // Request was cancelled
          return;
        }
        const errorMessage = { 
          role: 'bot', 
          content: err?.message || t('chatbot.errorMessage', 'Something went wrong.'),
          type: 'warning',
          isComplete: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [input, loading, messages, isAiMode, isThinkingMode, aiAvailable, t]
  );

  // Clear chat history
  const clearHistory = useCallback(() => {
    Alert.alert(
      t('chatbot.clearHistoryTitle', 'Clear Chat'),
      t('chatbot.clearHistoryMessage', 'Are you sure you want to clear all messages?'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.clear', 'Clear'), 
          style: 'destructive',
          onPress: () => setMessages([]),
        },
      ]
    );
  }, [t]);

  // Toggle AI mode
  const toggleAiMode = useCallback((value) => {
    if (value && !aiAvailable) {
      showToast(t('chatbot.aiNotAvailable', 'AI mode is not available'), 'warning');
      return;
    }
    setIsAiMode(value);
    if (!value) {
      setIsThinkingMode(false);
    }
  }, [aiAvailable, showToast, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader title={t('chatbot.title', 'Financial Assistant')} onBack={() => router.back()} />
      {/* Chat area: same UI/UX as Travel Mode chat – clear button, stacked AI/Deep Think toggles, welcome icon, suggestion chips, large input */}
      <View style={[styles.chatbotSection, { backgroundColor: theme.colors.surface }, shadows.sm]}>
        <View style={styles.chatbotSectionHeader}>
          <View style={styles.chatbotSectionHeaderSpacer} />
          <TouchableOpacity
            onPress={clearHistory}
            style={styles.clearChatBtn}
            accessibilityLabel={t('chatbot.clearHistory', 'Clear history')}
          >
            <RefreshCw size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {/* AI Mode and Deep Think toggles – stacked like Travel Guide (no overlap) */}
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
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <MessageBubble
                item={item}
                theme={theme}
                isLatest={index === messages.length - 1}
                onCopy={handleCopy}
                onShare={handleShare}
              />
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageCircle size={48} color={theme.colors.textLight} />
                <Text style={[styles.emptyChat, { color: theme.colors.textSecondary }]}>
                  {t('chatbot.welcomeMessage', "Hi! I'm your financial assistant. Ask me anything about your expenses, income, or insights!")}
                </Text>
                {isAiMode && (
                  <View style={[styles.aiModeBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Sparkles size={14} color={theme.colors.primary} />
                    <Text style={[styles.aiModeText, { color: theme.colors.primary }]}>
                      {isThinkingMode
                        ? t('chatbot.thinkingModeActive', 'Deep thinking mode active')
                        : t('chatbot.aiModeActive', 'AI-powered mode active')}
                    </Text>
                  </View>
                )}
              </View>
            }
            ListFooterComponent={
              <>
                {loading && (
                  <View style={[styles.messageRow, styles.messageRowBot]}>
                    <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Bot size={16} color={theme.colors.primary} />
                    </View>
                    <View style={[styles.bubble, styles.thinkingBubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }, shadows.sm]}>
                      <ActivityIndicator size="small" color={theme.colors.primary} style={styles.thinkingSpinner} />
                      <Text style={[styles.bubbleText, { color: theme.colors.textSecondary }]}>
                        {t('chatbot.thinking', 'Thinking...')}
                      </Text>
                    </View>
                  </View>
                )}
                {messages.length === 0 && suggestions.length > 0 && (
                  <View style={styles.suggestions}>
                    <Text style={[styles.suggestionsLabel, { color: theme.colors.textSecondary }]}>
                      {t('chatbot.tryAsking', 'Try asking:')}
                    </Text>
                    <View style={styles.suggestionChips}>
                      {suggestions.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '40' }]}
                          onPress={() => sendMessage(s)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, { color: theme.colors.text }]} numberOfLines={2}>
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            }
          />

          {/* Input area – same as Travel Guide */}
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
              placeholder={t('chatbot.placeholder', 'Ask me anything...')}
              placeholderTextColor={theme.colors.textLight}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              editable={!loading}
              multiline
              maxLength={2000}
            />
            {loading ? (
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.colors.error }]}
                onPress={stopRequest}
                accessibilityLabel={t('chatbot.stop', 'Stop')}
              >
                <StopCircle size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: input.trim() ? theme.colors.primary : theme.colors.surfaceSecondary },
                ]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim()}
                accessibilityLabel={t('chatbot.send', 'Send')}
              >
                <Send size={20} color={input.trim() ? '#fff' : theme.colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Same as Travel Guide: section container, header with clear, then mode bar
  chatbotSection: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
  },
  chatbotSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  chatbotSectionHeaderSpacer: { flex: 1 },
  clearChatBtn: { padding: spacing.xs },

  // Mode bar – stacked like Travel Guide (no overlap)
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
  chatbotKeyboardWrap: { flex: 1 },

  // Messages
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.tabBarBottomClearance },
  messageRow: { 
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  bubbleText: { ...typography.body },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  messageActionBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  // Empty state – same as Travel Guide (centered icon + welcome text)
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyChat: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinkingSpinner: { marginRight: 0 },
  aiModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  aiModeText: { ...typography.caption, fontWeight: '500' },

  // Suggestions – same pill/chip layout as Travel Guide
  suggestions: { marginTop: spacing.md },
  suggestionsLabel: { ...typography.label, marginBottom: spacing.sm },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: { ...typography.bodySmall },

  // Input – same as Travel Guide (larger touch target)
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
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
