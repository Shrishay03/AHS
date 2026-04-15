import { useWindowDimensions, Platform } from 'react-native';

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 820;
}

export function useScreenWidth() {
  const { width } = useWindowDimensions();
  return width;
}
