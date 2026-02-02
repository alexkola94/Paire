/**
 * WeatherCard – 7-day forecast from Open-Meteo API.
 * Theme-aware; expandable forecast; weather code to icon/description mapping.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudRain, Sun, Snowflake, ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../constants/theme';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

// WMO weather codes to simple type (sunny, cloudy, rainy, snowy)
const WEATHER_CODES = {
  0: 'sunny',
  1: 'sunny',
  2: 'cloudy',
  3: 'cloudy',
  45: 'cloudy',
  48: 'cloudy',
  51: 'rainy',
  53: 'rainy',
  55: 'rainy',
  61: 'rainy',
  63: 'rainy',
  65: 'rainy',
  71: 'snowy',
  73: 'snowy',
  75: 'snowy',
  80: 'rainy',
  81: 'rainy',
  82: 'rainy',
  95: 'rainy',
  96: 'rainy',
  99: 'rainy',
};

/**
 * @param {{ latitude: number, longitude: number, locationName?: string }} props
 */
export default function WeatherCard({ latitude, longitude, locationName }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (latitude == null || longitude == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const url = `${OPEN_METEO}?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Weather API failed'))))
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || t('travel.explore.weatherError', 'Unable to load weather'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [latitude, longitude, t]);

  const getWeatherType = (code) => WEATHER_CODES[code] ?? 'cloudy';
  const getIcon = (type) => {
    switch (type) {
      case 'sunny': return Sun;
      case 'rainy': return CloudRain;
      case 'snowy': return Snowflake;
      default: return Cloud;
    }
  };
  const getLabel = (type) => {
    const key = `travel.explore.weather.${type}`;
    return t(key, type);
  };

  if (loading && !weather) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t('travel.explore.loadingWeather', 'Loading weather...')}
        </Text>
      </View>
    );
  }

  if (error || !weather?.daily) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
        <Cloud size={24} color={theme.colors.textLight} />
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          {error || t('travel.explore.weatherError', 'Unable to load weather')}
        </Text>
      </View>
    );
  }

  const daily = weather.daily;
  const todayCode = daily.weathercode?.[0] ?? 0;
  const todayType = getWeatherType(todayCode);
  const TodayIcon = getIcon(todayType);
  const tempMax = Math.round(daily.temperature_2m_max?.[0] ?? 0);
  const tempMin = Math.round(daily.temperature_2m_min?.[0] ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, shadows.sm]}>
      <View style={styles.todayRow}>
        <TodayIcon size={40} color={theme.colors.primary} />
        <View style={styles.todayText}>
          <Text style={[styles.todayLabel, { color: theme.colors.textSecondary }]}>
            {t('travel.explore.today', 'Today')}
          </Text>
          <Text style={[styles.temp, { color: theme.colors.text }]}>
            {tempMax}° / {tempMin}°
          </Text>
          <Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
            {getLabel(todayType)}
          </Text>
          {locationName ? (
            <View style={styles.locationRow}>
              <MapPin size={12} color={theme.colors.textLight} />
              <Text style={[styles.location, { color: theme.colors.textLight }]} numberOfLines={1}>
                {locationName}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.expandBtn, { borderTopColor: theme.colors.glassBorder }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.expandText, { color: theme.colors.primary }]}>
          {expanded
            ? t('travel.explore.hideForecast', 'Hide forecast')
            : t('travel.explore.showForecast', 'See 7-day forecast')}
        </Text>
        {expanded ? (
          <ChevronUp size={18} color={theme.colors.primary} />
        ) : (
          <ChevronDown size={18} color={theme.colors.primary} />
        )}
      </TouchableOpacity>

      {expanded && daily.time?.length > 0 && (
        <View style={[styles.forecastList, { borderTopColor: theme.colors.glassBorder }]}>
          {daily.time.slice(0, 7).map((date, index) => {
            const code = daily.weathercode?.[index] ?? 0;
            const type = getWeatherType(code);
            const Icon = getIcon(type);
            const max = Math.round(daily.temperature_2m_max?.[index] ?? 0);
            const min = Math.round(daily.temperature_2m_min?.[index] ?? 0);
            const dayLabel =
              index === 0
                ? t('travel.explore.today', 'Today')
                : index === 1
                  ? t('travel.explore.tomorrow', 'Tomorrow')
                  : new Date(date).toLocaleDateString(undefined, { weekday: 'short' });
            return (
              <View
                key={date}
                style={[styles.forecastRow, { borderBottomColor: theme.colors.glassBorder }]}
              >
                <Text style={[styles.forecastDay, { color: theme.colors.text }]}>{dayLabel}</Text>
                <Icon size={20} color={theme.colors.primary} />
                <Text style={[styles.forecastTemp, { color: theme.colors.textSecondary }]}>
                  {max}° / {min}°
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  loadingText: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  todayText: { flex: 1 },
  todayLabel: { ...typography.caption, marginBottom: 2 },
  temp: { ...typography.h3 },
  desc: { ...typography.bodySmall, marginTop: 2 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  location: { ...typography.caption },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  expandText: { ...typography.label },
  forecastList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  forecastDay: { ...typography.bodySmall, flex: 1 },
  forecastTemp: { ...typography.bodySmall },
});
