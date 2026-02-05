/**
 * StructuredMessageContent – Renders chatbot response text with basic markdown-style formatting.
 * Parses **bold**, paragraphs (\n\n), bullet lines (•, -, *), and single newlines for readability.
 * Used by Financial Assistant and Travel Guide chat bubbles.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing } from '../constants/theme';

const BULLET_CHARS = ['•', '-', '*'];

/**
 * Splits a string by ** and returns segments with bold flag (odd-indexed parts are bold).
 * Handles unclosed ** by treating remainder as normal text.
 */
function parseBoldSegments(str) {
  if (!str || typeof str !== 'string') return [{ bold: false, value: str || '' }];
  const parts = str.split(/\*\*/);
  const segments = [];
  for (let i = 0; i < parts.length; i++) {
    segments.push({ bold: i % 2 === 1, value: parts[i] });
  }
  return segments;
}

/**
 * Returns true if line looks like a bullet (starts with •, -, or * optionally followed by space).
 */
function isBulletLine(line) {
  const t = (line || '').trimStart();
  if (!t) return false;
  return BULLET_CHARS.some((c) => t.startsWith(c) || t.startsWith(c + ' '));
}

/**
 * Trims bullet character and optional space from the start of the line.
 */
function stripBulletPrefix(line) {
  const t = (line || '').trimStart();
  for (const c of BULLET_CHARS) {
    if (t.startsWith(c + ' ')) return t.slice(c.length + 1).trimStart();
    if (t.startsWith(c)) return t.slice(c.length).trimStart();
  }
  return line || '';
}

export default function StructuredMessageContent({ text, theme, textStyle }) {
  const blocks = useMemo(() => {
    const raw = text ?? '';
    const paragraphs = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    return paragraphs.map((para) => {
      const lines = para.split(/\n/).map((l) => l.trimEnd());
      const items = lines.map((line) => {
        const isBullet = isBulletLine(line);
        const content = isBullet ? stripBulletPrefix(line) : line;
        const segments = parseBoldSegments(content);
        return { isBullet, segments };
      });
      return { items };
    });
  }, [text]);

  const baseTextStyle = [
    styles.baseText,
    { color: theme?.colors?.text ?? '#1e293b' },
    typography.body,
    textStyle,
  ];
  const boldTextStyle = [styles.boldText, baseTextStyle, { fontWeight: '600' }];

  if (!text || blocks.length === 0) {
    return <Text style={baseTextStyle} selectable>{text || ''}</Text>;
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, blockIndex) => (
        <View key={blockIndex} style={blockIndex > 0 ? styles.paragraphSpacer : undefined}>
          {block.items.map((item, itemIndex) => (
            <View
              key={itemIndex}
              style={item.isBullet ? styles.bulletRow : undefined}
            >
              {item.isBullet && (
                <Text style={[baseTextStyle, styles.bulletChar]} selectable>
                  {'\u2022 '}
                </Text>
              )}
              <Text style={[baseTextStyle, item.isBullet && styles.bulletContent]} selectable>
                {item.segments.map((seg, segIndex) => (
                  <Text
                    key={segIndex}
                    style={seg.bold ? boldTextStyle : baseTextStyle}
                    selectable
                  >
                    {seg.value}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  paragraphSpacer: {
    marginTop: spacing.sm,
  },
  baseText: {
    ...typography.body,
  },
  boldText: {
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bulletChar: {
    marginRight: spacing.xs,
  },
  bulletContent: {
    flex: 1,
  },
});
