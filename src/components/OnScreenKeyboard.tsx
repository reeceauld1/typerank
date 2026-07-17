import { useSettings } from '../hooks/useSettings.js';
import KeyboardDisplay from './KeyboardDisplay.js';

export default function OnScreenKeyboard() {
  const { keyboardLayout, keyboardKeyColors, keyboardPressStyle, punctuation, numbers } = useSettings();
  // Either toggle reveals the full extended keyboard (digit row + all
  // punctuation keys, backspace included) - not just the half tied to
  // whichever one is on - since practice text drawing from one option can
  // still land on a key that's normally only shown for the other.
  const showExtras = punctuation || numbers;
  return (
    <KeyboardDisplay
      keyboardLayout={keyboardLayout}
      keyColors={keyboardKeyColors}
      pressStyle={keyboardPressStyle}
      showPunctuationKeys={showExtras}
      showNumberRow={showExtras}
      showBackspace={showExtras}
    />
  );
}
