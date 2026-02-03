/**
 * DashboardLayoutContext
 * 
 * Manages dashboard widget configuration.
 * Persists layout to AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultWidgetLayout, WIDGET_REGISTRY } from '../components/widgets';

const STORAGE_KEY = 'paire_dashboard_layout';

const DashboardLayoutContext = createContext(null);

export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (!context) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider') // i18n-ignore: dev;
  }
  return context;
}

export function DashboardLayoutProvider({ children }) {
  const [layout, setLayout] = useState(getDefaultWidgetLayout());
  const [isLoading, setIsLoading] = useState(true);
  
  // Load layout from storage on mount
  useEffect(() => {
    loadLayout();
  }, []);
  
  // Load layout from AsyncStorage
  const loadLayout = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedLayout = JSON.parse(stored);
        
        // Merge with registry to handle new widgets added in updates
        const mergedLayout = WIDGET_REGISTRY.map((widget) => {
          const storedWidget = parsedLayout.find((w) => w.id === widget.id);
          if (storedWidget) {
            return storedWidget;
          }
          // New widget not in stored layout - use defaults
          return {
            id: widget.id,
            visible: widget.defaultVisible,
            order: widget.defaultOrder,
          };
        });
        
        // Sort by order
        mergedLayout.sort((a, b) => a.order - b.order);
        
        // Reindex orders to be sequential
        const reindexedLayout = mergedLayout.map((item, index) => ({
          ...item,
          order: index,
        }));
        
        setLayout(reindexedLayout);
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Save layout to AsyncStorage
  const saveLayout = useCallback(async (newLayout) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      setLayout(newLayout);
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
    }
  }, []);
  
  // Update a single widget's visibility
  const toggleWidgetVisibility = useCallback((widgetId) => {
    setLayout((prev) => {
      const newLayout = prev.map((item) =>
        item.id === widgetId ? { ...item, visible: !item.visible } : item
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      return newLayout;
    });
  }, []);
  
  // Reset to default layout
  const resetLayout = useCallback(async () => {
    const defaultLayout = getDefaultWidgetLayout();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLayout));
    setLayout(defaultLayout);
  }, []);
  
  // Get visible widgets sorted by order
  const getVisibleWidgets = useCallback(() => {
    return layout
      .filter((item) => item.visible)
      .sort((a, b) => a.order - b.order);
  }, [layout]);
  
  // Check if a widget is visible
  const isWidgetVisible = useCallback((widgetId) => {
    const widget = layout.find((w) => w.id === widgetId);
    return widget?.visible ?? true;
  }, [layout]);
  
  const value = {
    layout,
    isLoading,
    saveLayout,
    loadLayout,
    toggleWidgetVisibility,
    resetLayout,
    getVisibleWidgets,
    isWidgetVisible,
  };
  
  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export default DashboardLayoutContext;
