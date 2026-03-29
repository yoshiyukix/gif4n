import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface Props {
  uri: string;
}

export function GifPreview({ uri }: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
        // React Native の Image は GIF アニメーションをネイティブで自動再生する
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 1, backgroundColor: '#000' },
  image: { flex: 1 },
});
