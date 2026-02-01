/**
 * Financial Chatbot Screen (React Native)
 * Full-screen chat for financial questions via chatbotService.
 * Pattern aligned with Travel Chatbot; entry from Dashboard or Profile.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, ChevronLeft } from 'lucide-react-native';
import { chatbotService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

// Default suggestions when API fails or is empty
const DEFAULT_SUGGESTIONS = [
  'What did I spend most on this month?',
  'Show my income vs expenses',
  'How is my budget doing?',
  'Summarize my recent transactions',
];

export default function ChatbotScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const listRef = useRef(null);
  const lang = i18n.language || 'en';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await chatbotService.getSuggestions();
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setSuggestions(list.slice(0, 6));
        } else if (!cancelled) {
          setSuggestions(DEFAULT_SUGGESTIONS.slice(0, 6));
        }
      } catch {
        if (!cancelled) setSuggestions(DEFAULT_SUGGESTIONS.slice(0, 6));
      }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || loading) return;
      setInput('');
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setLoading(true);
      try {
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const res = await chatbotService.sendQuery(trimmed, history);
        const botContent =
          res?.response ?? res?.message ?? (typeof res === 'string' ? res : t('chatbot.thinking', 'Thinking...'));
        setMessages((prev) => [...prev, { role: 'bot', content: botContent }]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: err?.message || t('chatbot.errorMessage', 'Something went wrong.') },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, lang, t]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.glassBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('common.close')}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <MessageCircle size={22} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('chatbot.title', 'Financial Assistant')}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.role === 'user' ? styles.messageRowUser : styles.messageRowBot]}>
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
                <Text style={[styles.bubbleText, { color: theme.colors.text }]} selectable>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('chatbot.welcomeMessage', "Hi! I'm your financial assistant. Ask me anything about your expenses, income, or insights!")}
            </Text>
          }
          ListFooterComponent={
            suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                <Text style={[styles.suggestionsLabel, { color: theme.colors.textSecondary }]}>
                  {t('chatbot.tryAsking', 'Try asking:')}
                </Text>
                <View style={styles.chips}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '40' }]}
                      onPress={() => sendMessage(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: theme.colors.primary }]} numberOfLines={2}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />
        <View style={[styles.inputRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.glassBorder }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}
            placeholder={t('chatbot.placeholder', 'Ask me anything...')}
            placeholderTextColor={theme.colors.textLight}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            editable={!loading}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h3 },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.lg },
  messageRow: { marginBottom: spacing.sm },
  messageRowUser: { alignItems: 'flex-end' },
  messageRowBot: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  bubbleText: { ...typography.body },
  emptyText: { ...typography.body, textAlign: 'center', paddingVertical: spacing.xl },
  suggestions: { marginTop: spacing.md },
  suggestionsLabel: { ...typography.label, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
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
    minHeight: 44,
    maxHeight: 120,
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
