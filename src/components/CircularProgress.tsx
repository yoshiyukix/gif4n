import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface Props {
  /** 進捗 0.0 〜 1.0 */
  progress: number;
  size?: number;
  strokeWidth?: number;
}

export default function CircularProgress({ progress, size = 220, strokeWidth = 14 }: Props) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const percent = Math.round(clampedProgress * 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* トラック */}
        <G rotation="-90" origin={`${center},${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#D8DCF0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* プログレス */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#2855E7"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.label}>
        <Text style={styles.percent}>{percent}%</Text>
        <Text style={styles.processing}>PROCESSING</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    alignItems: 'center',
  },
  percent: {
    fontSize: 44,
    fontWeight: '700',
    color: '#1C1E2A',
    letterSpacing: -1,
  },
  processing: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737590',
    letterSpacing: 1.5,
  },
});
