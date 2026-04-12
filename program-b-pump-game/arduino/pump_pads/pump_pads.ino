/*
 * spinat Pump Game — 5-Pad USB HID Keyboard Controller
 *
 * Hardware: Arduino Leonardo / Pro Micro (ATmega32u4)
 * Each pad is a normally-open momentary switch wired between
 * a digital pin and GND (using INPUT_PULLUP).
 *
 * Pad layout (player facing game monitor):
 *   [Pad 1]  [Pad 2]  [Pad 3]  [Pad 4]  [Pad 5]
 *     'a'      's'      'd'      'f'      'g'
 *     D2       D3       D4       D5       D6
 */

#include <Keyboard.h>

const int NUM_PADS = 5;
const int PAD_PINS[NUM_PADS]  = { 2, 3, 4, 5, 6 };
const char PAD_KEYS[NUM_PADS] = { 'a', 's', 'd', 'f', 'g' };

const unsigned long DEBOUNCE_MS = 20;

bool padState[NUM_PADS];           // current debounced state (true = pressed)
bool lastReading[NUM_PADS];        // previous raw reading
unsigned long lastChange[NUM_PADS]; // timestamp of last state change

void setup() {
  for (int i = 0; i < NUM_PADS; i++) {
    pinMode(PAD_PINS[i], INPUT_PULLUP);
    padState[i] = false;
    lastReading[i] = HIGH;
    lastChange[i] = 0;
  }
  Keyboard.begin();
}

void loop() {
  unsigned long now = millis();

  for (int i = 0; i < NUM_PADS; i++) {
    bool reading = digitalRead(PAD_PINS[i]) == LOW; // LOW = pressed (pullup)

    if (reading != lastReading[i]) {
      lastChange[i] = now;
    }
    lastReading[i] = reading;

    if ((now - lastChange[i]) >= DEBOUNCE_MS && reading != padState[i]) {
      padState[i] = reading;
      if (padState[i]) {
        Keyboard.press(PAD_KEYS[i]);
      } else {
        Keyboard.release(PAD_KEYS[i]);
      }
    }
  }
}
