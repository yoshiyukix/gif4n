import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TOAST_HEIGHT = 56;
const DISPLAY_DURATION_MS = 2500;
const SLIDEOUT_DURATION_MS = 300;

type ToastType = 'success' | 'error';

interface SaveToastProps {
  visible: boolean;
  type: ToastType;
  message: string;
  insetTop?: number;
  onHide: () => void;
}

const COLORS: Record<ToastType, string> = {
  success: '#34C759',
  error: '#FF3B30',
};

const ICONS: Record<ToastType, React.ComponentProps<typeof Ionicons>['name']> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
};

export function SaveToast({ visible, type, message, insetTop = 0, onHide }: SaveToastProps) {
  const translateY = useRef(new Animated.Value(-(TOAST_HEIGHT + insetTop + 8))).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    // reset
    translateY.setValue(-(TOAST_HEIGHT + insetTop + 8));
    opacity.setValue(1);

    // slide in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start(() => {
      // wait, then slide out
      setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -(TOAST_HEIGHT + insetTop + 8),
          duration: SLIDEOUT_DURATION_MS,
          useNativeDriver: true,
        }).start(() => onHide());
      }, DISPLAY_DURATION_MS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insetTop + 8, transform: [{ translateY }], opacity },
        { backgroundColor: COLORS[type] },
      ]}
    >
      <View style={styles.inner}>
        <Ionicons name={ICONS[type]} size={20} color="#fff" style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
