/**
 * OnboardingContext
 *
 * Manages onboarding state and provides functions to check/complete onboarding.
 * Uses AsyncStorage to persist the hasOnboarded flag.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@paire_has_onboarded';
const ONBOARDING_DATA_KEY = '@paire_onboarding_data';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [hasOnboarded, setHasOnboarded] = useState(null); // null = loading, false = not done, true = done
  const [onboardingData, setOnboardingData] = useState({
    currency: 'EUR',
    skippedPartner: false,
    createdBudget: false,
    createdTransaction: false,
  });

  // Load onboarding status on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [value, data] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(ONBOARDING_DATA_KEY),
        ]);
        setHasOnboarded(value === 'true');
        if (data) {
          setOnboardingData(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading onboarding status:', error);
        setHasOnboarded(false);
      }
    };
    loadStatus();
  }, []);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setHasOnboarded(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  }, []);

  // Reset onboarding (for testing or when user logs out)
  const resetOnboarding = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_KEY),
        AsyncStorage.removeItem(ONBOARDING_DATA_KEY),
      ]);
      setHasOnboarded(false);
      setOnboardingData({
        currency: 'EUR',
        skippedPartner: false,
        createdBudget: false,
        createdTransaction: false,
      });
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }, []);

  // Update onboarding data (partial updates)
  const updateOnboardingData = useCallback(async (updates) => {
    try {
      const newData = { ...onboardingData, ...updates };
      await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(newData));
      setOnboardingData(newData);
    } catch (error) {
      console.error('Error updating onboarding data:', error);
    }
  }, [onboardingData]);

  // Skip onboarding entirely (for users with existing data)
  const skipOnboarding = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  const value = {
    hasOnboarded,
    onboardingData,
    completeOnboarding,
    resetOnboarding,
    updateOnboardingData,
    skipOnboarding,
    isLoading: hasOnboarded === null,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider') // i18n-ignore: dev;
  }
  return context;
}
