import { useSettings } from '../hooks/useSettings.js';
import KeyboardDisplay from './KeyboardDisplay.js';

export default function OnScreenKeyboard() {
  const { keyboardLayout, keyboardKeyColors, keyboardPressStyle } = useSettings();
  return <KeyboardDisplay keyboardLayout={keyboardLayout} keyColors={keyboardKeyColors} pressStyle={keyboardPressStyle} />;
}
