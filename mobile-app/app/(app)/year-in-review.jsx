/**
 * Year in Review – Spotify Wrapped-style swipeable slide deck
 * Fetches aggregated financial data for a given year and presents
 * it across full-screen slides with animated counters and progress dots.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Share,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../components/navigation';
import { yearReviewService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const SLIDE_GRADIENTS = [
  ['#8B5CF6', '#6D28D9'],
  ['#10B981', '#059669'],
  ['#3B82F6', '#2563EB'],
  ['#EF4444', '#DC2626'],
  ['#F59E0B', '#D97706'],
  ['#EC4899', '#DB2777'],
  ['#6366F1', '#4F46E5'],
  ['#14B8A6', '#0D9488'],
  ['#8B5CF6', '#7C3AED'],
];

// ─── Animated counter ────────────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '', style, duration = 1200, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (value == null || value === 0) {
      setDisplay(0);
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(setDisplay)(value);
    });

    let frame;
    let start;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Number((eased * value).toFixed(decimals)));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => frame && cancelAnimationFrame(frame);
  }, [value, duration, decimals]);

  const formatted =
    typeof display === 'number'
      ? display.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : display;

  return (
    <Text style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}

// ─── Fade-in wrapper ─────────────────────────────────────────────
function FadeSlide({ children, delay = 0, style }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

// ─── Slide components ────────────────────────────────────────────

function IntroSlide({ year, totalTransactions, theme, colors }) {
  const scale = useSharedValue(0.5);
  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.1, { duration: 500, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 300 }),
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={200} style={styles.slideCenter}>
        <Text style={styles.introSubtitle}>Your Year in Review</Text>
        <Animated.View style={animStyle}>
          <Text style={styles.introYear}>{year}</Text>
        </Animated.View>
        <Text style={styles.introDetail}>
          {totalTransactions} transactions tracked
        </Text>
      </FadeSlide>
    </View>
  );
}

function TotalsSlide({ data, theme, colors }) {
  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideCenter}>
        <Text style={styles.slideTitle}>The Big Numbers</Text>
        <View style={styles.totalsGrid}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Income</Text>
            <AnimatedCounter
              value={data.totalIncome}
              prefix="$"
              style={[styles.totalValue, { color: '#34D399' }]}
              decimals={0}
            />
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Expenses</Text>
            <AnimatedCounter
              value={data.totalExpenses}
              prefix="$"
              style={[styles.totalValue, { color: '#FCA5A5' }]}
              decimals={0}
            />
          </View>
          <View style={[styles.totalCard, styles.totalCardWide]}>
            <Text style={styles.totalLabel}>Net Savings</Text>
            <AnimatedCounter
              value={data.netSavings}
              prefix="$"
              style={[styles.totalValue, { color: '#FFF' }]}
              decimals={0}
            />
          </View>
        </View>
      </FadeSlide>
    </View>
  );
}

function CategoriesSlide({ categories = [], totalExpenses, theme, colors }) {
  const maxAmount = categories.length > 0 ? categories[0].amount : 1;
  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideContent}>
        <Text style={styles.slideTitle}>Where Your Money Went</Text>
        {categories.map((cat, i) => {
          const pct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
          return (
            <FadeSlide key={cat.category} delay={200 + i * 120} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{cat.category}</Text>
                <Text style={styles.categoryAmount}>${cat.amount?.toLocaleString()}</Text>
              </View>
              <View style={styles.categoryBarTrack}>
                <View style={[styles.categoryBarFill, { width: `${pct}%` }]} />
              </View>
            </FadeSlide>
          );
        })}
      </FadeSlide>
    </View>
  );
}

function BiggestExpenseSlide({ expense, theme, colors }) {
  if (!expense) return null;
  const scale = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withDelay(
      400,
      withSequence(
        withTiming(1.15, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 200 }),
      ),
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideCenter}>
        <Text style={styles.slideTitle}>Biggest Single Expense</Text>
        <Animated.View style={[styles.bigExpenseCard, animStyle]}>
          <Text style={styles.bigExpenseAmount}>${expense.amount?.toLocaleString()}</Text>
          <Text style={styles.bigExpenseDesc} numberOfLines={2}>
            {expense.description || expense.category || 'N/A'}
          </Text>
          <Text style={styles.bigExpenseDate}>{expense.date}</Text>
        </Animated.View>
      </FadeSlide>
    </View>
  );
}

function MonthsSlide({ best, worst, theme, colors }) {
  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideCenter}>
        <Text style={styles.slideTitle}>Best & Worst Months</Text>
        <View style={styles.monthsRow}>
          <FadeSlide delay={300} style={styles.monthCard}>
            <Text style={styles.monthEmoji}>🏆</Text>
            <Text style={styles.monthLabel}>Best Savings</Text>
            <Text style={styles.monthName}>
              {best?.month ? MONTH_NAMES[best.month - 1] : '—'}
            </Text>
            <Text style={[styles.monthValue, { color: '#34D399' }]}>
              ${best?.savings?.toLocaleString() ?? 0}
            </Text>
          </FadeSlide>
          <FadeSlide delay={500} style={styles.monthCard}>
            <Text style={styles.monthEmoji}>📊</Text>
            <Text style={styles.monthLabel}>Most Spent</Text>
            <Text style={styles.monthName}>
              {worst?.month ? MONTH_NAMES[worst.month - 1] : '—'}
            </Text>
            <Text style={[styles.monthValue, { color: '#FCA5A5' }]}>
              ${worst?.total?.toLocaleString() ?? 0}
            </Text>
          </FadeSlide>
        </View>
      </FadeSlide>
    </View>
  );
}

function StreaksSlide({ data, theme, colors }) {
  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideCenter}>
        <Text style={styles.slideTitle}>Streaks & Achievements</Text>
        <View style={styles.achievementGrid}>
          <FadeSlide delay={200} style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>🔥</Text>
            <AnimatedCounter value={data.longestStreak} style={styles.achievementNumber} />
            <Text style={styles.achievementLabel}>Day Best Streak</Text>
          </FadeSlide>
          <FadeSlide delay={350} style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>🏅</Text>
            <AnimatedCounter value={data.achievementsUnlocked} style={styles.achievementNumber} />
            <Text style={styles.achievementLabel}>Achievements</Text>
          </FadeSlide>
          <FadeSlide delay={500} style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>⚡</Text>
            <AnimatedCounter value={data.challengeStats?.completed ?? 0} style={styles.achievementNumber} />
            <Text style={styles.achievementLabel}>Challenges Done</Text>
          </FadeSlide>
          <FadeSlide delay={650} style={styles.achievementCard}>
            <Text style={styles.achievementEmoji}>⭐</Text>
            <AnimatedCounter value={data.challengeStats?.totalPoints ?? 0} style={styles.achievementNumber} />
            <Text style={styles.achievementLabel}>Points Earned</Text>
          </FadeSlide>
        </View>
      </FadeSlide>
    </View>
  );
}

function ScoreTrendSlide({ scores = [], theme, colors }) {
  const maxScore = Math.max(...scores.filter(Boolean), 1);
  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideContent}>
        <Text style={styles.slideTitle}>Monthly Paire Score</Text>
        <View style={styles.scoreChart}>
          {scores.map((score, i) => {
            const height = score > 0 ? (score / 100) * 120 : 4;
            return (
              <FadeSlide key={i} delay={150 + i * 80} style={styles.scoreBarCol}>
                <Text style={styles.scoreBarValue}>{score || '–'}</Text>
                <View style={styles.scoreBarTrack}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      {
                        height,
                        backgroundColor: score >= 70 ? '#34D399' : score >= 40 ? '#FCD34D' : '#FCA5A5',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.scoreBarLabel}>{MONTH_NAMES[i]?.charAt(0)}</Text>
              </FadeSlide>
            );
          })}
        </View>
      </FadeSlide>
    </View>
  );
}

function PartnerSlide({ comparison, theme, colors }) {
  if (!comparison) return null;
  const total = (comparison.youSpent || 0) + (comparison.partnerSpent || 0);
  const youPct = total > 0 ? ((comparison.youSpent / total) * 100).toFixed(0) : 50;
  const partnerPct = total > 0 ? ((comparison.partnerSpent / total) * 100).toFixed(0) : 50;

  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideCenter}>
        <Text style={styles.slideTitle}>You vs. Partner</Text>
        <View style={styles.partnerRow}>
          <FadeSlide delay={300} style={styles.partnerCard}>
            <Text style={styles.partnerLabel}>You Spent</Text>
            <AnimatedCounter value={comparison.youSpent} prefix="$" style={styles.partnerValue} />
          </FadeSlide>
          <FadeSlide delay={500} style={styles.partnerCard}>
            <Text style={styles.partnerLabel}>Partner Spent</Text>
            <AnimatedCounter value={comparison.partnerSpent} prefix="$" style={styles.partnerValue} />
          </FadeSlide>
        </View>
        <FadeSlide delay={600} style={styles.splitBar}>
          <View style={[styles.splitYou, { flex: Number(youPct) }]} />
          <View style={[styles.splitPartner, { flex: Number(partnerPct) }]} />
        </FadeSlide>
        <View style={styles.partnerRow}>
          <FadeSlide delay={700} style={styles.partnerCard}>
            <Text style={styles.partnerLabel}>You Saved</Text>
            <AnimatedCounter value={comparison.youSaved} prefix="$" style={[styles.partnerValue, { color: '#34D399' }]} />
          </FadeSlide>
          <FadeSlide delay={850} style={styles.partnerCard}>
            <Text style={styles.partnerLabel}>Partner Saved</Text>
            <AnimatedCounter value={comparison.partnerSaved} prefix="$" style={[styles.partnerValue, { color: '#34D399' }]} />
          </FadeSlide>
        </View>
      </FadeSlide>
    </View>
  );
}

function SummarySlide({ data, theme, colors }) {
  return (
    <View style={[styles.slide, { backgroundColor: colors[0] }]}>
      <FadeSlide delay={100} style={styles.slideCenter}>
        <Text style={styles.slideTitle}>Your {data.year} Summary</Text>
        <View style={styles.summaryCircle}>
          <AnimatedCounter
            value={data.savingsRate}
            suffix="%"
            style={styles.summaryRate}
            decimals={1}
            duration={1500}
          />
          <Text style={styles.summaryRateLabel}>Savings Rate</Text>
        </View>
        <FadeSlide delay={500}>
          <Text style={styles.summaryTagline}>
            {data.savingsRate >= 20
              ? 'Outstanding! You\'re building real wealth.'
              : data.savingsRate >= 10
                ? 'Great job! You\'re on the right track.'
                : data.savingsRate > 0
                  ? 'A good start. Let\'s aim higher next year!'
                  : 'Let\'s make next year the comeback year.'}
          </Text>
        </FadeSlide>
        {data.homeLevel > 0 && (
          <FadeSlide delay={700}>
            <Text style={styles.summaryHome}>
              Paire Home Level: {data.homeLevel}
            </Text>
          </FadeSlide>
        )}
      </FadeSlide>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────

export default function YearInReviewScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const fetchData = useCallback(async (yr) => {
    setLoading(true);
    setError(null);
    setActiveSlide(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    try {
      const result = await yearReviewService.getYearReview(yr);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year);
  }, [year, fetchData]);

  const buildSlides = () => {
    if (!data) return [];
    const slides = [];
    slides.push({ key: 'intro', component: IntroSlide, props: { year: data.year ?? year, totalTransactions: data.totalTransactions ?? 0 }, colors: SLIDE_GRADIENTS[0] });
    slides.push({ key: 'totals', component: TotalsSlide, props: { data }, colors: SLIDE_GRADIENTS[1] });
    if (data.topCategories?.length > 0) {
      slides.push({ key: 'categories', component: CategoriesSlide, props: { categories: data.topCategories, totalExpenses: data.totalExpenses }, colors: SLIDE_GRADIENTS[2] });
    }
    if (data.biggestExpense) {
      slides.push({ key: 'biggest', component: BiggestExpenseSlide, props: { expense: data.biggestExpense }, colors: SLIDE_GRADIENTS[3] });
    }
    slides.push({ key: 'months', component: MonthsSlide, props: { best: data.bestSavingsMonth, worst: data.highestSpendingMonth }, colors: SLIDE_GRADIENTS[4] });
    slides.push({ key: 'streaks', component: StreaksSlide, props: { data }, colors: SLIDE_GRADIENTS[5] });
    if (data.monthlyScores?.some((s) => s > 0)) {
      slides.push({ key: 'scores', component: ScoreTrendSlide, props: { scores: data.monthlyScores }, colors: SLIDE_GRADIENTS[6] });
    }
    if (data.partnerComparison) {
      slides.push({ key: 'partner', component: PartnerSlide, props: { comparison: data.partnerComparison }, colors: SLIDE_GRADIENTS[7] });
    }
    slides.push({ key: 'summary', component: SummarySlide, props: { data }, colors: SLIDE_GRADIENTS[8] });
    return slides;
  };

  const slides = buildSlides();

  const handleScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== activeSlide) setActiveSlide(idx);
  };

  const handleShare = async () => {
    if (!data) return;
    const msg = [
      `My ${data.year ?? year} Year in Review on Paire`,
      `Income: $${data.totalIncome?.toLocaleString()}`,
      `Expenses: $${data.totalExpenses?.toLocaleString()}`,
      `Savings Rate: ${data.savingsRate}%`,
      `Transactions: ${data.totalTransactions}`,
      `Longest Streak: ${data.longestStreak} days`,
    ].join('\n');
    try {
      await Share.share({ message: msg });
    } catch (_) { /* user cancelled */ }
  };

  const canGoBack = year > 2020;
  const canGoForward = year < new Date().getFullYear();

  // ─── Loading state ───
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <ScreenHeader title="Year in Review" showMenuButton onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Generating your {year} review...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ───
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <ScreenHeader title="Year in Review" showMenuButton onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>😔</Text>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => fetchData(year)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScreenHeader title="Year in Review" showMenuButton onBack={() => router.back()} />

      {/* Year picker */}
      <View style={[styles.yearPicker, { backgroundColor: theme.colors.glassBg, borderColor: theme.colors.glassBorder }]}>
        <TouchableOpacity
          onPress={() => canGoBack && setYear((y) => y - 1)}
          style={[styles.yearArrow, !canGoBack && styles.yearArrowDisabled]}
          disabled={!canGoBack}
          activeOpacity={0.7}
        >
          <Text style={[styles.yearArrowText, { color: canGoBack ? theme.colors.primary : theme.colors.textLight }]}>
            ‹
          </Text>
        </TouchableOpacity>
        <Text style={[styles.yearPickerText, { color: theme.colors.text }]}>{year}</Text>
        <TouchableOpacity
          onPress={() => canGoForward && setYear((y) => y + 1)}
          style={[styles.yearArrow, !canGoForward && styles.yearArrowDisabled]}
          disabled={!canGoForward}
          activeOpacity={0.7}
        >
          <Text style={[styles.yearArrowText, { color: canGoForward ? theme.colors.primary : theme.colors.textLight }]}>
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
        decelerationRate="fast"
        bounces={false}
      >
        {slides.map((s) => {
          const SlideComponent = s.component;
          return (
            <SlideComponent
              key={s.key}
              {...s.props}
              theme={theme}
              colors={s.colors}
            />
          );
        })}
      </ScrollView>

      {/* Footer: dots + share */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.dotsRow}>
          {slides.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                i === activeSlide
                  ? { backgroundColor: theme.colors.primary, width: 24 }
                  : { backgroundColor: theme.colors.textLight, width: 8 },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={handleShare}
          style={[styles.shareButton, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const SLIDE_PADDING = spacing.lg;

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '500',
  },
  errorEmoji: { fontSize: 48, marginBottom: spacing.md },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Year picker
  yearPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  yearArrow: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  yearArrowDisabled: { opacity: 0.3 },
  yearArrowText: { fontSize: 28, fontWeight: '300' },
  yearPickerText: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },

  // Scroll
  scrollView: { flex: 1 },

  // Slide base
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    padding: SLIDE_PADDING,
  },
  slideCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: -0.5,
  },

  // Intro
  introSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  introYear: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -4,
  },
  introDetail: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.md,
    fontWeight: '500',
  },

  // Totals
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  totalCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: (SCREEN_WIDTH - SLIDE_PADDING * 2 - spacing.md) / 2,
  },
  totalCardWide: {
    width: SCREEN_WIDTH - SLIDE_PADDING * 2,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },

  // Categories
  categoryRow: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
  categoryBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  // Biggest expense
  bigExpenseCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  bigExpenseAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -2,
  },
  bigExpenseDesc: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  bigExpenseDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.xs,
  },

  // Months
  monthsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  monthCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  monthEmoji: { fontSize: 36, marginBottom: spacing.sm },
  monthLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  monthName: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    marginBottom: 4,
  },
  monthValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Achievements
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  achievementCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: (SCREEN_WIDTH - SLIDE_PADDING * 2 - spacing.md) / 2,
  },
  achievementEmoji: { fontSize: 32, marginBottom: spacing.sm },
  achievementNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
  },
  achievementLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  // Score trend
  scoreChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: spacing.md,
  },
  scoreBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  scoreBarValue: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreBarTrack: {
    width: 14,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  scoreBarFill: {
    width: '100%',
    borderRadius: 7,
  },
  scoreBarLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginTop: 4,
  },

  // Partner
  partnerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  partnerCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  partnerLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 6,
  },
  partnerValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  splitBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  splitYou: {
    backgroundColor: '#8B5CF6',
    height: '100%',
  },
  splitPartner: {
    backgroundColor: '#34D399',
    height: '100%',
  },

  // Summary
  summaryCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  summaryRate: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFF',
  },
  summaryRateLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryTagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.lg,
  },
  summaryHome: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginTop: spacing.lg,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  shareButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
