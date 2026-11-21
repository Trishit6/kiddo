import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { ComponentProps, PropsWithChildren } from 'react';
import { fontFamily, radius, space, type as typography } from '@reel/tokens';
import { useTheme } from '@/theme/theme-provider';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type TextVariant = keyof typeof typography;
type TextTone = 'default' | 'muted' | 'brand' | 'danger' | 'success' | 'onVideo';

const toneKeys = {
  default: 'foreground',
  muted: 'mutedForeground',
  brand: 'brand',
  danger: 'destructive',
  success: 'mint',
  onVideo: 'onVideo',
} as const;

export function AppText({
  children,
  variant = 'body',
  tone = 'default',
  weight,
  style,
  numberOfLines,
  accessibilityRole,
  testID,
}: PropsWithChildren<{
  variant?: TextVariant;
  tone?: TextTone;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: TextPropsRole;
  testID?: string;
}>) {
  const { colors } = useTheme();
  const display = variant === 'display' || variant === 'title';
  const font =
    weight === 'bold' || (display && !weight)
      ? display
        ? 'BricolageGrotesque_700Bold'
        : 'Inter_700Bold'
      : weight === 'semibold'
        ? display
          ? 'BricolageGrotesque_600SemiBold'
          : 'Inter_600SemiBold'
        : weight === 'medium'
          ? 'Inter_500Medium'
          : display
            ? 'BricolageGrotesque_600SemiBold'
            : 'Inter_400Regular';

  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      testID={testID}
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[typography[variant], { color: colors[toneKeys[tone]], fontFamily: font }, style]}
    >
      {children}
    </Text>
  );
}

type TextPropsRole = ComponentProps<typeof Text>['accessibilityRole'];

export function Button({
  label,
  onPress,
  variant = 'brand',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: 'brand' | 'secondary' | 'ghost' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: IoniconName;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const background =
    variant === 'brand'
      ? colors.brand
      : variant === 'destructive'
        ? colors.destructive
        : variant === 'secondary'
          ? colors.secondary
          : 'transparent';
  const foreground =
    variant === 'brand'
      ? colors.brandForeground
      : variant === 'destructive'
        ? colors.brandForeground
        : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.5 : pressed ? 0.86 : 1 },
        fullWidth ? styles.fullWidth : null,
        variant === 'ghost' ? { borderColor: colors.border, borderWidth: 1 } : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <Text style={[styles.buttonLabel, { color: foreground, fontFamily: fontFamily.sans }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  size = 24,
  color,
  badge,
  testID,
  active = false,
  disabled = false,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
  badge?: string;
  testID?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const tint = color ?? colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={size} color={tint} />
      {badge ? (
        <Text style={[styles.badge, { color: colors.onVideo, fontFamily: fontFamily.sans }]}>
          {badge}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Avatar({
  uri,
  name,
  size = 40,
  accessibilityLabel,
}: {
  uri: string | null;
  name: string;
  size?: number;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityIgnoresInvertColors
        accessibilityLabel={accessibilityLabel ?? `${name} avatar`}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.muted }}
      />
    );
  }
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? `${name} avatar`}
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.secondary,
        },
      ]}
    >
      <Text style={{ color: colors.foreground, fontFamily: 'BricolageGrotesque_700Bold' }}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function Skeleton({
  width = '100%',
  height = 16,
  style,
  rounded = radius.sm,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.muted }, style]}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  testID,
}: {
  icon: IoniconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.state} testID={testID}>
      <View style={[styles.stateIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={26} color={colors.brand} />
      </View>
      <AppText variant="heading" weight="bold" style={styles.centerText}>
        {title}
      </AppText>
      {body ? (
        <AppText tone="muted" style={styles.centerText}>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="We lost the connection"
      body={message}
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}

export function Chip({
  label,
  onPress,
  selected = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.secondary,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.brandForeground : colors.secondaryForeground,
          fontFamily: 'Inter_600SemiBold',
          fontSize: 13,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  testID?: string;
  editable?: boolean;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  error,
  testID,
  editable = true,
}: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        testID={testID}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.input,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
      />
      {error ? (
        <Text style={{ color: colors.destructive, fontFamily: fontFamily.sans, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Message({ value, tone }: { value: string; tone: 'error' | 'success' }) {
  const { colors } = useTheme();
  if (value.length === 0) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{
        color: tone === 'error' ? colors.destructive : colors.mint,
        fontFamily: fontFamily.sans,
        fontSize: 13,
      }}
    >
      {value}
    </Text>
  );
}

export function Screen({
  title,
  subtitle,
  children,
  testID,
}: PropsWithChildren<{ title: string; subtitle?: string; testID?: string }>) {
  const { colors } = useTheme();
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={testID}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
      >
        <View style={styles.card}>
          <AppText variant="display" weight="bold">
            {title}
          </AppText>
          {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.state} accessibilityLabel={label}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl, paddingVertical: space.xxxl },
  card: { gap: space.lg },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  fullWidth: { alignSelf: 'stretch' },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  state: { alignItems: 'center', gap: space.md, padding: space.xxl },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { textAlign: 'center' },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { gap: space.xs },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 48,
    fontSize: 16,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
