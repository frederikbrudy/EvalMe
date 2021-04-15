// HARDWARE CONNECTIONS
// connect a rotary encoder to your Arduino using these pins:

// Rotary encoder pin A to digital pin 3*
// Rotary encoder pin B to analog pin 3
// Rotary encoder pin C to ground

// This sketch implements software debounce, but you can further
// improve performance by placing 0.1uF capacitors between
// A and ground, and B and ground.

// If you wish to use the RGB LED and button functions of
// SparkFun part number COM-10982, use the following connections:

// Rotary encoder pin 1 (red cathode) to digital pin 10
// Rotary encoder pin 2 (green cathode) to analog pin 1
// Rotary encoder pin 3 (button) to digital pin 4
// Rotary encoder pin 4 (blue cathode) to digital pin 5
// Rotary encoder pin 5 (common anode) to VCC (3.3V or 5V)

// Note that because this is a common anode device,
// the pushbutton requires an external 1K-10K pullDOWN resistor
// to operate.

// * Pins marked with an asterisk should not change because
// they use interrupts on that pin. All other pins can change,
// see the constants below.

// SERIAL MONITOR

// Run this sketch with the serial monitor window set to 9600 baud.

// HOW IT WORKS

// The I/O pins used by the rotary encoder hardware are set up to
// automatically call interrupt functions (rotaryIRQ and buttonIRQ)
// each time the rotary encoder changes states.

// The rotaryIRQ function transparently maintains a counter that
// increments or decrements by one for each detent ("click") of
// the rotary encoder knob. This function also sets a flag
// (rotary_change) to true whenever the counter changes. You can
// check this flag in your main loop() code and perform an action
// when the knob is turned.

// There is also code in the main loop() that keeps track
// of whether the button is currently being held down and for
// how long. This is useful for "hold button down for five seconds
// to power off"-type situations, which cannot be handled by
// interrupts alone because no interrupts will be called until
// the button is actually released.

// Uses the PinChangeInt library by Lex Talionis,
// download from http://code.google.com/p/arduino-pinchangeint/


#define HALT_ON_ERROR false

#include <EEPROM.h> 

////////////////////////////////////////////////
//Rotary encoder with RGB pushbutton
////////////////////////////////////////////////

// Load the PinChangeInt (pin change interrupt) library
#include <PinChangeInt.h>


///////////// confirm button

#define BUTTON_PIN 42

/////////////rotary encoder 1
#define ROT_B 22        // rotary B 
#define ROT_A 18          // rotary A IRQ

#define ROT_LEDR 15      // red LED
#define ROT_LEDG A14     // green LED
#define ROT_SW 14         // rotary puhbutton
#define ROT_LEDB 16       // blue LED

/////////////rotary encoder 2
#define ROT2_B 23        // rotary B 
#define ROT2_A 19          // rotary A IRQ

#define ROT2_LEDR 29      // red LED
#define ROT2_LEDG 28     // green LED
#define ROT2_SW 31         // rotary puhbutton
#define ROT2_LEDB 30       // blue LED

///////////rotary encoder 3

#define ROT3_B 24        // rotary B 
#define ROT3_A 3          // rotary A IRQ

#define ROT3_LEDR 32      // red LED
#define ROT3_LEDG 33     // green LED
#define ROT3_SW 34         // rotary puhbutton
#define ROT3_LEDB 35       // blue LED

// RGB LED colors (for common anode LED, 0 is on, 1 is off)
#define OFF B111
#define RED B110
#define GREEN B101
#define YELLOW B100
#define BLUE B011
#define PURPLE B010
#define CYAN B001
#define WHITE B000


// low battery indicator
#define LBO_PIN 52 // PowerBoost 1000C low battery indicator
#define LOW_BATTERY_LED 53


/////////// confirm button
volatile boolean confirm_button_pressed = false; // will turn true if the button has been pushed
volatile boolean confirm_button_released = false; // will turn true if the button has been released (sets button_downtime)
volatile unsigned long confirm_button_downtime = 0L; // ms the button was pushed before release
static boolean confirm_button_down = false;
static unsigned long int confirm_button_down_start, confirm_button_down_time;

/////////// rotary encoder 1
// Global variables that can be changed in interrupt routines
volatile int rotary_counter = 0; // current "position" of rotary encoder (increments CW)
volatile boolean rotary_change = false; // will turn true if rotary_counter has changed
//volatile boolean button_pressed = false; // will turn true if the button has been pushed
//volatile boolean button_released = false; // will turn true if the button has been released (sets button_downtime)
//volatile unsigned long button_downtime = 0L; // ms the button was pushed before release

// "Static" variables are initalized once the first time
// that loop runs, but they keep their values through
// successive loops.

static unsigned char ledColor = BLUE; //LED color
//static boolean button_down = false;
//static unsigned long int button_down_start, button_down_time;


////////// rotary encoder 2
int counter2_ledsOn = 0;
// Global variables that can be changed in interrupt routines
volatile int rotary2_counter = 0; // current "position" of rotary encoder (increments CW)
volatile boolean rotary2_change = false; // will turn true if rotary_counter has changed
//volatile boolean button2_pressed = false; // will turn true if the button has been pushed
//volatile boolean button2_released = false; // will turn true if the button has been released (sets button_downtime)
//volatile unsigned long button2_downtime = 0L; // ms the button was pushed before release

static unsigned char ledColor2 = BLUE; //LED color
//static boolean button2_down = false;
//static unsigned long int button2_down_start, button2_down_time;



////////// rotary encoder 3
int counter3_ledsOn = 0;
// Global variables that can be changed in interrupt routines
volatile int rotary3_counter = 0; // current "position" of rotary encoder (increments CW)
volatile boolean rotary3_change = false; // will turn true if rotary_counter has changed
//volatile boolean button3_pressed = false; // will turn true if the button has been pushed
//volatile boolean button3_released = false; // will turn true if the button has been released (sets button_downtime)
//volatile unsigned long button3_downtime = 0L; // ms the button was pushed before release

static unsigned char ledColor3 = BLUE; //LED color
//static boolean button3_down = false;
//static unsigned long int button3_down_start, button3_down_time;







////////////////////////////////////////////////
//Neopixel stuff. 
////////////////////////////////////////////////
#include <Adafruit_NeoPixel.h>
int COUNTER_MIN = 0;
int COUNTER_MAX = 12;
/////////// ring 1
#define RING1_NEOPIXEL_PIN 40
#define RING_PIXEL_COUNT 12
#define RING_COUNT 3
int ring1_counter_ledsOn = 0;

/////////// ring 2
//#define RING2_NEOPIXEL_PIN 41
//#define RING2_PIXEL_COUNT 12
int ring2_counter_ledsOn = 0;

/////////// ring 3
//#define RING3_NEOPIXEL_PIN 42
//#define RING3_PIXEL_COUNT 12
int ring3_counter_ledsOn = 0;

Adafruit_NeoPixel rings = Adafruit_NeoPixel(RING_PIXEL_COUNT*RING_COUNT, RING1_NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);
//Adafruit_NeoPixel ring2 = Adafruit_NeoPixel(RING2_PIXEL_COUNT, RING2_NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);
//Adafruit_NeoPixel ring3 = Adafruit_NeoPixel(RING3_PIXEL_COUNT, RING3_NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);



// IMPORTANT: To reduce NeoPixel burnout risk, add 1000 uF capacitor across
// pixel power leads, add 300 - 500 Ohm resistor on first pixel's data input
// and minimize distance between Arduino and first pixel.  Avoid connecting
// on a live circuit...if you must, connect GND first.

uint32_t red = rings.Color(255, 0, 0);
uint32_t green = rings.Color(0, 255, 0);
uint32_t blue = rings.Color(0, 0, 255);
uint32_t purple = rings.Color(128, 0, 128);
uint32_t yellow = rings.Color(255, 100, 0);
uint32_t off = rings.Color(0, 0, 0);
uint32_t white = rings.Color(255, 255, 255);
uint32_t cyan = rings.Color(0, 255, 255);

void setRingPixelColor(uint8_t ringNumber, uint32_t pixelNumber, uint32_t color){
  rings.setPixelColor(pixelNumber+(ringNumber*RING_PIXEL_COUNT), color);
}

void setRingPixelColorAll(uint32_t pixelNumber, uint32_t color){
  for (int ring = 0; ring < RING_COUNT; ring++){
    rings.setPixelColor(pixelNumber+(ring*RING_PIXEL_COUNT), color);
  }
}

void clearRing(uint8_t ringNumber){
  for (int pixelNumber = 0; pixelNumber < RING_PIXEL_COUNT; pixelNumber++){
    rings.setPixelColor(pixelNumber+(ringNumber*RING_PIXEL_COUNT), off);
  }
  rings.show();
}

uint32_t ledColorToNeopixelColor(uint32_t color){
  switch(color){
    case OFF:
      return off;
      break;
    case RED:
      return red;
      break;
    case GREEN:
      return green;
      break;
    case YELLOW:
      return yellow;
      break;
    case BLUE:
      return blue;
      break;
    case PURPLE:
      return purple;
      break;
    case CYAN:
      return cyan;
      break;
    case WHITE:
      return white;
      break;
    default: 
      return red;
      break;
  }
}

////////////////////////////////////////////////
//Buffer stuff. Used when data cannot be sent for later sending. Stores the last ten submissions
////////////////////////////////////////////////
#include "CircularBuffer.h"

// the type of the record is unsigned long: we intend to store milliseconds
// the buffer can contain up to 10 records
// the buffer will use a byte for its index to reduce memory footprint
CircularBuffer<unsigned long, 10> fifo;
CircularBuffer<String, 10> fifoStr;


////////////////////////////////////////////////
//LoRa communication stuff
////////////////////////////////////////////////
// Based on example: rf95_reliable_datagram_client.ino
// Don't forget to set the frequency of the board when using the RadioHead library
//The RadioHead Library simplifies communication between the Arduino Board and the LoRa Shield.
//We can find it here: http://www.airspayce.com/mikem/arduino/RadioHead/ To use it in your project 
//you just have to copy it in your Arduino project folder (next to your main Arduino project file .ino).
//Compile Notice:
//Check if you have set the right frequency:After putting the library in the right place, 
//you have to also modify the frequency to the frequency you want to use, the position of this is
//setFrequency() in the file: arduino-xxx\libraries\RadioHead\RH_RF95.cpp;
//we're using this LoRa Shield: https://wiki.dragino.com/index.php?title=Lora_Shield

#include <RHReliableDatagram.h>
#include <RH_RF95.h>
#include <SPI.h>

#define CLIENT_ADDRESS 5
#define SERVER_ADDRESS 3

// Singleton instance of the radio driver
RH_RF95 driver;
//RH_RF95 driver(5, 2); // Rocket Scream Mini Ultra Pro with the RFM95W

// Class to manage message delivery and receipt, using the driver declared above
RHReliableDatagram manager(driver, CLIENT_ADDRESS);

//uint8_t data[] = "Hello World!";
uint8_t data[64] = "";
// Dont put this on the stack:
uint8_t buf[RH_RF95_MAX_MESSAGE_LEN];

int counter = 0;
#include <string.h>

////////////////////////////////////////////////
// RFID stuff for for the adafrui NFC shield iwth I2C connection
////////////////////////////////////////////////
#include <Wire.h>
#include <Adafruit_PN532.h>
// If using the breakout or shield with I2C, define just the pins connected
// to the IRQ and reset lines.  Use the values below (2, 3) for the shield!
#define PN532_IRQ   46
#define PN532_RESET 47  // Not connected by default on the NFC Shield
// Or use this line for a breakout or shield with an I2C connection:
Adafruit_PN532 nfc(PN532_IRQ, PN532_RESET);

bool requiresAuthentication = false;
uint8_t ctrl_requireAuth[] = "REQUIRE_AUTH";
uint8_t ctrl_requireNoAuth[] = "REQUIRE_NO_AUTH";
int eeprom_address_AuthReq = 0;
unsigned long start_time;
unsigned long end_time;
unsigned long delta;

#define eeprom_address_CounterStart 10
int eeprom_address_CounterMin = eeprom_address_CounterStart;
int eeprom_address_CounterMax = 50;//eeprom_address_CounterStart + sizeof(int);;
uint8_t ctrl_SetCounterStart[] = "SET_COUNTER";

uint8_t ctrl_SetMin1[] = "SET_COUNTER_MIN:1";

uint8_t ctrl_SetMax3[] = "SET_COUNTER_MAX:03";
uint8_t ctrl_SetMax4[] = "SET_COUNTER_MAX:04";
uint8_t ctrl_SetMax5[] = "SET_COUNTER_MAX:05";
uint8_t ctrl_SetMax7[] = "SET_COUNTER_MAX:07";
uint8_t ctrl_SetMax10[] = "SET_COUNTER_MAX:10";
uint8_t ctrl_SetMax12[] = "SET_COUNTER_MAX:12";

#define RFID_LED 38
void setup()
{
  //start serial communication
  Serial.begin(9600); // Use serial for debugging
  Serial.println("Begin setup");

  EEPROM.get(eeprom_address_AuthReq, requiresAuthentication);
  Serial.print("READ from Eeprom requiresAuthentication: ");
  Serial.println(requiresAuthentication);

//  EEPROM.get(eeprom_address_CounterMin, COUNTER_MIN);
  EEPROM.get(eeprom_address_CounterMax, COUNTER_MAX);
  COUNTER_MAX = COUNTER_MAX*(-1);
  COUNTER_MAX = 256 - COUNTER_MAX;
  Serial.print("READ from Eeprom max: ");
//  Serial.print(COUNTER_MIN);
//  Serial.print("-");
  Serial.println(COUNTER_MAX);

  pinMode(RFID_LED, OUTPUT); 
  
  //confirm button
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  //low battery pin
  pinMode(LBO_PIN, INPUT);
  pinMode(LOW_BATTERY_LED, OUTPUT);

  //neopixel ring 1
  rings.begin();
  rings.setBrightness(25);
  rings.show(); // Initialize all pixels to 'off'
  
  //rotary encoder 1
  pinMode(ROT_B, INPUT);
  digitalWrite(ROT_B, HIGH); // turn on weak pullup
  pinMode(ROT_A, INPUT);
  digitalWrite(ROT_A, HIGH); // turn on weak pullup
  
  pinMode(ROT_SW, INPUT);
  // The rotary switch is common anode with external pulldown, do not turn on pullup
  pinMode(ROT_LEDB, OUTPUT);
  pinMode(ROT_LEDG, OUTPUT);
  pinMode(ROT_LEDR, OUTPUT);
//  setLED(1, ledColor);
  // We use the standard external interrupt pin for the rotary,
  // but we'll use the loop function for the button
  attachInterrupt(digitalPinToInterrupt(ROT_A), rotaryIRQ, CHANGE);

  //rotary encoder 2
  pinMode(ROT2_B, INPUT);
  digitalWrite(ROT2_B, HIGH); // turn on weak pullup
  pinMode(ROT2_A, INPUT);
  digitalWrite(ROT2_A, HIGH); // turn on weak pullup
  
  pinMode(ROT2_SW, INPUT);
  // The rotary switch is common anode with external pulldown, do not turn on pullup
  pinMode(ROT2_LEDB, OUTPUT);
  pinMode(ROT2_LEDG, OUTPUT);
  pinMode(ROT2_LEDR, OUTPUT);
//  setLED(2, ledColor2);
  attachInterrupt(digitalPinToInterrupt(ROT2_A), rotary2IRQ, CHANGE);

  //rotary encoder 3
  pinMode(ROT3_B, INPUT);
  digitalWrite(ROT3_B, HIGH); // turn on weak pullup
  pinMode(ROT3_A, INPUT);
  digitalWrite(ROT3_A, HIGH); // turn on weak pullup
  
  pinMode(ROT3_SW, INPUT);
  // The rotary switch is common anode with external pulldown, do not turn on pullup
  pinMode(ROT3_LEDB, OUTPUT);
  pinMode(ROT3_LEDG, OUTPUT);
  pinMode(ROT3_LEDR, OUTPUT);
//  setLED(3, ledColor3);
  attachInterrupt(digitalPinToInterrupt(ROT3_A), rotary3IRQ, CHANGE);

  invalidateLEDs();

  
  Serial.print("reserved size for single data packet: ");
  Serial.println(sizeof(data));
  
  //init LoRa
  if (!manager.init()){
    Serial.println("LoRa init failed");
    error(red, 2);
  }
  else{
    Serial.print("LoRa initialised. Max message length: ");
    Serial.println(RH_RF95_MAX_MESSAGE_LEN);
  }
  // Defaults after init are 868.0MHz (remember to change this to your module's frequency as described above), 13dBm, Bw = 125 kHz, Cr = 4/5, Sf = 128chips/symbol, CRC on

  // The default transmitter power is 13dBm, using PA_BOOST.
  // If you are using RFM95/96/97/98 modules which uses the PA_BOOST transmitter pin, then 
  // you can set transmitter powers from 5 to 23 dBm:
//  driver.setTxPower(23, false);
  // If you are using Modtronix inAir4 or inAir9,or any other module which uses the
  // transmitter RFO pins and not the PA_BOOST pins
  // then you can configure the power transmitter power for -1 to 14 dBm and with useRFO true. 
  // Failure to do that will result in extremely low transmit powers.
//  driver.setTxPower(14, true);
  // You can optionally require this module to wait until Channel Activity
  // Detection shows no activity on the channel before transmitting by setting
  // the CAD timeout to non-zero:
//  driver.setCADTimeout(10000);



  //RFID setup

  nfc.begin();
  Serial.println(F("NFC began"));

  nfc.setPassiveActivationRetries(0x1);//number of retries before the trying to detect a new nfc card times out https://forums.adafruit.com/viewtopic.php?f=31&t=30943
  
  uint32_t versiondata = nfc.getFirmwareVersion(); 
  if (! versiondata) {
    Serial.println(F("    ;error;NFC init failed. Didn't find PN53x board"));
    error(red, 4);
  }
  // Got ok data, print it out!
  Serial.print(F("    Found chip PN5")); Serial.println((versiondata>>24) & 0xFF, HEX); 
  Serial.print(F("    Firmware ver. ")); Serial.print((versiondata>>16) & 0xFF, DEC); 
  Serial.print('.'); Serial.println((versiondata>>8) & 0xFF, DEC); 
  // configure board to read RFID tags
  nfc.SAMConfig();
  Serial.println(F("READY"));

  start_time = micros();

}

void error(uint32_t error_color, uint16_t error_pixel_count_per_ring){
  bool flashOn = true;
  while(HALT_ON_ERROR){
    rings.clear();
    if(flashOn){
      for(uint16_t i=0; i<error_pixel_count_per_ring; i++) {
        setRingPixelColorAll(i, error_color);
      }
      setLED(1, RED);
      setLED(2, RED);
      setLED(3, RED);
    }
    else{
      setLED(1, OFF);
      setLED(2, OFF);
      setLED(3, OFF);
    }
    flashOn = !flashOn;
    rings.show();
    delay(350);
    Serial.print("flash: ");
    Serial.println(flashOn);
  }
}

void blink_leds(uint32_t color, uint16_t pixel_count_per_ring, uint32_t blink_count){
  bool flashOn = true;
  if(blink_count%2 != 0){
    blink_count++;
  }

  uint32_t ring_color = ledColorToNeopixelColor(color);
  
  while(blink_count > 0){
    blink_count--;
    rings.clear();
    if(flashOn){
      for(uint16_t i=0; i<pixel_count_per_ring; i++) {
        setRingPixelColorAll(i, ring_color);
      }
      setLED(1, color);
      setLED(2, color);
      setLED(3, color);
    }
    else{
      setLED(1, OFF);
      setLED(2, OFF);
      setLED(3, OFF);
    }
    flashOn = !flashOn;
    rings.show();
    delay(50);
  }

  invalidateLEDs();

}

void invalidateLEDs(){
  setLED(1, ledColor);
  setLED(2, ledColor2);
  setLED(3, ledColor3);

  rotary_change = true;
  rotary2_change = true;
  rotary3_change = true;
}


int buttonState = HIGH;             // the current reading from the input pin
int lastButtonState = HIGH;   // the previous reading from the input pin. HIGH initially, as we're using the internal pullup resistor
// the following variables are unsigned longs because the time, measured in
// milliseconds, will quickly become a bigger number than can be stored in an int.
unsigned long lastDebounceTime = 0;  // the last time the output pin was toggled
unsigned long debounceDelay = 50;    // the debounce time; increase if the output flickers

void checkButton(){
  // read the state of the switch into a local variable:
  int buttonVal = digitalRead(BUTTON_PIN);

  // check to see if you just pressed the button
  // (i.e. the input went from LOW to HIGH), and you've waited long enough
  // since the last press to ignore any noise:

  // If the switch changed, due to noise or pressing:
  if (buttonVal != lastButtonState) {
    // reset the debouncing timer
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // whatever the reading is at, it's been there for longer than the debounce
    // delay, so take it as the actual current state:

    // if the button state has changed:
    if (buttonVal != buttonState) {
      buttonState = buttonVal;

      // only toggle the LED if the new button state is HIGH
      if (buttonState == LOW) {
        //ledState = !ledState;
        confirm_button_pressed = true;
        //button_state = true;
      }
      else{
        //button_state = false;
        confirm_button_released = true;
        confirm_button_downtime = millis() - confirm_button_down_start;
      }
    }
  }

  // set the LED:
  //digitalWrite(ledPin, ledState);

  // save the reading. Next time through the loop, it'll be the lastButtonState:
  lastButtonState = buttonVal;
}

/*
void checkButton_encoder_outdated(){
  // read the state of the switch into a local variable:
  int buttonVal = digitalRead(ROT_SW);

  // check to see if you just pressed the button
  // (i.e. the input went from LOW to HIGH), and you've waited long enough
  // since the last press to ignore any noise:

  // If the switch changed, due to noise or pressing:
  if (buttonVal != lastButtonState) {
    // reset the debouncing timer
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // whatever the reading is at, it's been there for longer than the debounce
    // delay, so take it as the actual current state:

    // if the button state has changed:
    if (buttonVal != buttonState) {
      buttonState = buttonVal;

      // only toggle the LED if the new button state is HIGH
      if (buttonState == HIGH) {
        //ledState = !ledState;
        button_pressed = true;
        //button_state = true;
        
      }
      else{
        //button_state = false;
        button_released = true;
        button_downtime = millis() - button_down_start;
      }
    }
  }

  // set the LED:
  //digitalWrite(ledPin, ledState);

  // save the reading. Next time through the loop, it'll be the lastButtonState:
  lastButtonState = buttonVal;
}
*/

void rotaryIRQ()
{
  // Process input from the rotary encoder.
  // The rotary "position" is held in rotary_counter, increasing for CW rotation (changes by one per detent).
  // If the position changes, rotary_change will be set true. (You may manually set this to false after handling the change).

  // This function will automatically run when rotary encoder input A transitions in either direction (low to high or high to low)
  // By saving the state of the A and B pins through two interrupts, we'll determine the direction of rotation
  // int rotary_counter will be updated with the new value, and boolean rotary_change will be true if there was a value change
  // Based on concepts from Oleg at circuits@home (http://www.circuitsathome.com/mcu/rotary-encoder-interrupt-service-routine-for-avr-micros)
  // Unlike Oleg's original code, this code uses only one interrupt and has only two transition states;
  // it has less resolution but needs only one interrupt, is very smooth, and handles switchbounce well.

  static unsigned char rotary_state = 0; // current and previous encoder states

  rotary_state <<= 2;  // remember previous state
  rotary_state |= (digitalRead(ROT_A) | (digitalRead(ROT_B) << 1));  // mask in current state
  rotary_state &= 0x0F; // zero upper nybble

  //Serial.println(rotary_state,HEX);

  if (rotary_state == 0x09) // from 10 to 01, increment counter. Also try 0x06 if unreliable
  {
    rotary_counter++;
    rotary_change = true;
  }
  else if (rotary_state == 0x03) // from 00 to 11, decrement counter. Also try 0x0C if unreliable
  {
    rotary_counter--;
    rotary_change = true;
  }
}

void rotary2IRQ()
{
  static unsigned char rotary_state = 0; // current and previous encoder states

  rotary_state <<= 2;  // remember previous state
  rotary_state |= (digitalRead(ROT2_A) | (digitalRead(ROT2_B) << 1));  // mask in current state
  rotary_state &= 0x0F; // zero upper nybble

  if (rotary_state == 0x09) // from 10 to 01, increment counter. Also try 0x06 if unreliable
  {
    rotary2_counter++;
    rotary2_change = true;
  }
  else if (rotary_state == 0x03) // from 00 to 11, decrement counter. Also try 0x0C if unreliable
  {
    rotary2_counter--;
    rotary2_change = true;
  }
}

void rotary3IRQ()
{
  static unsigned char rotary_state = 0; // current and previous encoder states

  rotary_state <<= 2;  // remember previous state
  rotary_state |= (digitalRead(ROT3_A) | (digitalRead(ROT3_B) << 1));  // mask in current state
  rotary_state &= 0x0F; // zero upper nybble

  if (rotary_state == 0x09) // from 10 to 01, increment counter. Also try 0x06 if unreliable
  {
    rotary3_counter++;
    rotary3_change = true;
  }
  else if (rotary_state == 0x03) // from 00 to 11, decrement counter. Also try 0x0C if unreliable
  {
    rotary3_counter--;
    rotary3_change = true;
  }
}

byte readCard[7];   // Stores scanned ID read from RFID Module
bool cardPresent = false;
String cardid = "";
uint8_t current_uidLength;
void clearCard(){
  for(int c=0; c<sizeof(readCard); c++){
    readCard[c] = 0;
  }
  cardPresent = false;
}

long lastRfidFlash;
void processRfid(){
  uint8_t success;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)
    
  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
  // 'uid' will be populated with the UID, and uidLength will indicate
  // if the uid is 4 bytes (Mifare Classic) or 7 bytes (Mifare Ultralight)
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);
  
  if (success) {
    bool cardChanged = false;
    for(int i=0; i<sizeof(uid); i++){
      if(uid[i] != readCard[i]){
        cardChanged = true;
      }
    }
    
    if(cardChanged){
      clearCard();
      
      cardid = "CARDID:";
      current_uidLength = uidLength;
      
      for(int c = 0; c < uidLength; c++){
        readCard[c] = uid[c];
  
        if(readCard[c] < 0x10){
  //        Serial.print(F("0"));
          cardid += "0";
        }
  //      else{
  //        Serial.print(F(""));
  //      }
  //      Serial.print(readCard[c], HEX);
        cardid += String(readCard[c], HEX);
        if(c<(uidLength-1)){
  //        Serial.print("-");
          cardid += "-";
        }
      }

      Serial.print("#TYPE:RFID;");
      Serial.println(cardid);
  
      cardPresent = true;
    }

    if(millis() - lastRfidFlash > 2000){
      blink_leds(YELLOW, 12, 3);
      lastRfidFlash = millis();
    }
  }
}



//struct CtrlSettings {
//  int requireAuth;
////  byte field2;
////  char name[10];
//};
bool currentRequiresAuthentication;

void printDeltaAndRestart(String msg){
  end_time = micros();
  delta = end_time - start_time;
  Serial.print(msg);
  Serial.print(": ");
  Serial.println(delta);
  start_time = micros();
}
bool rfidLedState = HIGH;
int rfidLedCounter = 0;
void loop()
{
  int lboVal = digitalRead(LBO_PIN);
//  Serial.print("lbo val: ");
//  Serial.println(lboVal);
  if(lboVal){
    digitalWrite(LOW_BATTERY_LED, HIGH);
//    Serial.println("LOW_BATTERY_LED on");
  }
  else{
    digitalWrite(LOW_BATTERY_LED, LOW);
//    Serial.println("LOW_BATTERY_LED off");
  }
  
  if (manager.available())
  {
    // Wait for a message addressed to us from the client
    uint8_t len = sizeof(buf);
    uint8_t from;
    if (manager.recvfromAck(buf, &len, &from))
    {
      Serial.print("#TYPE:INCOMING;FROM:0x");
      Serial.print(from, HEX);
      Serial.print(";");
      Serial.println((char*)buf);

      if(strcmp(buf, ctrl_requireAuth) == 0 || strcmp(buf, ctrl_requireNoAuth) == 0){
        if(strcmp(buf, ctrl_requireAuth) == 0){
          Serial.println("REQUIRE_AUTH activated");
          requiresAuthentication = true;
        }
        else if(strcmp(buf, ctrl_requireNoAuth) == 0){
          Serial.println("REQUIRE_AUTH deactivated");
          requiresAuthentication = false;
        }
        //write to eeprom
        EEPROM.update(eeprom_address_AuthReq, requiresAuthentication);
        Serial.print("Written to eeprom requiresAuthentication: ");
        Serial.println(requiresAuthentication);
      }
      else if(strncmp(buf, ctrl_SetCounterStart, 11) == 0){
//        don't use substring, but use the array positions
//        String countStr = inputString.substring(16);
//        int count = countStr.toInt();


//        if(strcmp(buf, ctrl_SetMin) == 0){
//          Serial.print("SET_COUNTER_MIN: ");
//          Serial.println(count);
//          EEPROM.update(eeprom_address_CounterMin, count);
//          COUNTER_MIN = count;
//        }
        int countMax;
        bool maxChanged = false;
        if(strcmp(buf, ctrl_SetMax3) == 0){
          Serial.println("SET_COUNTER_MAX:03");
          countMax = 3;
          maxChanged = true;
        }
        else if(strcmp(buf, ctrl_SetMax4) == 0){
          Serial.println("SET_COUNTER_MAX:04");
          countMax = 4;
          maxChanged = true;
        }
        else if(strcmp(buf, ctrl_SetMax5) == 0){
          Serial.println("SET_COUNTER_MAX:05");
          countMax = 5;
          maxChanged = true;
        }
        else if(strcmp(buf, ctrl_SetMax7) == 0){
          Serial.println("SET_COUNTER_MAX:07");
          countMax = 7;
          maxChanged = true;
        }
        else if(strcmp(buf, ctrl_SetMax10) == 0){
          Serial.println("SET_COUNTER_MAX:10");
          countMax = 10;
          maxChanged = true;
        }
        else if(strcmp(buf, ctrl_SetMax12) == 0){
          Serial.println("SET_COUNTER_MAX:12");
          countMax = 12;
          maxChanged = true;
        }

        if(maxChanged){
          COUNTER_MAX = countMax;

          EEPROM.update(eeprom_address_CounterMax, COUNTER_MAX);

          Serial.print("maxChanged. new max: ");
          Serial.print(COUNTER_MAX);
          Serial.print(". EEPROM address: ");
          Serial.println(eeprom_address_CounterMax);
        }
      }



      // Send a reply back to the originator client
//      if (!manager.sendtoWait(data, sizeof(data), from))
//        Serial.println("#TYPE:ERROR;DATA:sendtoWait failed");
    }
  }

//  printDeltaAndRestart("managaer available");

  //if there is data in the queue try to send it
  for (int i=fifoStr.size(); i>0; i--) {
    // prints current buffer size
    Serial.println("UNSENT DATA");
    Serial.print("    ");
    Serial.print(i);
    Serial.print(": ");
    // retrieves the last added button click and removes the event
    // this outputs the events starting from the most recent
    // switching from pop() to shift() the events would be printed
    // in chronological order, starting from the least recent
    Serial.println(fifoStr.last());
//    uint8_t data[]
    //try to send

    String tryString = fifoStr.last();
    char data2[tryString.length()];
    tryString.toCharArray(data2, (tryString.length()+1));
    Serial.print("        ");
    Serial.print("RETRYING FOR: ");
    Serial.println(data2);

    if (manager.sendtoWait(data2, sizeof(data2), SERVER_ADDRESS))
    {
      // Now wait for a reply from the server
      uint8_t len = sizeof(buf);
      uint8_t from;   
      if (manager.recvfromAckTimeout(buf, &len, 2000, &from))
      {
        Serial.print("        ");
        Serial.print("got reply from : 0x");
        Serial.print(from, HEX);
        Serial.print(": ");
        Serial.println((char*)buf);
        fifoStr.pop();
        ledColor = BLUE;
        ledColor2 = BLUE;
        ledColor3 = BLUE;
        invalidateLEDs();
      }
      else
      {
        Serial.println("No reply, is rf95_reliable_datagram_server running?");
//        fifoStr.push(str);
      }
    }
    else{
      Serial.println("sendtoWait failed");
//      fifoStr.push(str);
    }
    
//    if(sendData(data2)){
//      //if successfully sent, then remove it from the 
////      fifoStr.pop();
//    }
  }
  //check if the queue is full. if it is go into error mode until the data can be dumped
  if(fifoStr.isFull()){
    //TODO don't go into error loop, but keep trying to send data
    error(red, 3);
    return;
  }

//  printDeltaAndRestart("fifo processed");

  start_time = micros();

  if(requiresAuthentication){
    processRfid();
  }

//  printDeltaAndRestart("RFID processed");
  bool authenticated = true;
  if(requiresAuthentication){
    //allow voting if ID required
    //TODO
    if(!cardPresent){
      ledColor = PURPLE;
      ledColor2 = PURPLE;
      ledColor3 = PURPLE;
      authenticated = false;
    }
    else{
      ledColor = BLUE;
      ledColor2 = BLUE;
      ledColor3 = BLUE;
    }
    
  }
  else{
    ledColor = BLUE;
    ledColor2 = BLUE;
    ledColor3 = BLUE;
  }

  if(requiresAuthentication != currentRequiresAuthentication){
    invalidateLEDs();
    currentRequiresAuthentication = requiresAuthentication;
  }

  if(!authenticated){
    //Flash RFID LED
    //all other LEDs off
    
    setLED(1, OFF);
    setLED(2, OFF);
    setLED(3, OFF);
    for (int ring = 0; ring < RING_COUNT; ring++){
      clearRing(ring);
    }
    if(rfidLedCounter++ % 7 == 0){
      rfidLedState = !rfidLedState;
    }
    digitalWrite(RFID_LED, rfidLedState);
    return;
  }
  else{
    digitalWrite(RFID_LED, LOW);
  }

  
  // The rotary IRQ sets the flag rotary_counter to true
  // if the knob position has changed. We can use this flag
  // to do something in the main loop() each time there's
  // a change. We'll clear this flag when we're done, so
  // that we'll only do this if() once for each change.

  if (rotary_change)
  {
    rotary_change = false; // Clear flag

    //blink for visual feedback
    setLED(1, OFF);
    delay(10); //try not to make this too long, otherwise the Arduino will miss ticks
    setLED(1, ledColor);

    if(rotary_counter < COUNTER_MIN){
      rotary_counter = COUNTER_MIN;
    }
    else if(rotary_counter > COUNTER_MAX){
      rotary_counter = COUNTER_MAX;
    }

    Serial.print("rotary1: ");
    Serial.println(rotary_counter, DEC);
    
    ring1_counter_ledsOn = map(rotary_counter, COUNTER_MIN, COUNTER_MAX, 1, RING_PIXEL_COUNT);

    clearRing(0);
    for(uint16_t i=0; i<RING_PIXEL_COUNT; i++) {
      if(i < ring1_counter_ledsOn){
        setRingPixelColor(0, i, red);
//        rings.setPixelColor(i, red);
      }
    }
    rings.show();
  }

  if (rotary2_change)
  {
    rotary2_change = false; // Clear flag

    //blink for visual feedback
    setLED(2, OFF);
    delay(10); //try not to make this too long, otherwise the Arduino will miss ticks
    setLED(2, ledColor);

    if(rotary2_counter < COUNTER_MIN){
      rotary2_counter = COUNTER_MIN;
    }
    else if(rotary2_counter > COUNTER_MAX){
      rotary2_counter = COUNTER_MAX;
    }
    Serial.print("rotary2: ");
    Serial.println(rotary2_counter, DEC);
    
    ring2_counter_ledsOn = map(rotary2_counter, COUNTER_MIN, COUNTER_MAX, 1, RING_PIXEL_COUNT);

    clearRing(1);
    for(uint16_t i=0; i<RING_PIXEL_COUNT; i++) {
      if(i < ring2_counter_ledsOn){
        setRingPixelColor(1, i, red);
      }
    }
    rings.show();
  }

  if (rotary3_change)
  {
    
    rotary3_change = false; // Clear flag

    //blink for visual feedback
    setLED(3, OFF);
    delay(10); //try not to make this too long, otherwise the Arduino will miss ticks
    setLED(3, ledColor);

    if(rotary3_counter < COUNTER_MIN){
      rotary3_counter = COUNTER_MIN;
    }
    else if(rotary3_counter > COUNTER_MAX){
      rotary3_counter = COUNTER_MAX;
    }

    Serial.print("rotary3: ");
    Serial.println(rotary3_counter, DEC);
    ring3_counter_ledsOn = map(rotary3_counter, COUNTER_MIN, COUNTER_MAX, 1, RING_PIXEL_COUNT);

    clearRing(2);
    for(uint16_t i=0; i<RING_PIXEL_COUNT; i++) {
      if(i < ring3_counter_ledsOn){
        setRingPixelColor(2, i, red);
      }
    }
    rings.show();
  }

  checkButton();

  if (confirm_button_pressed)
  {

    Serial.println("button pressed");
    ledColor = YELLOW;
    ledColor2 = YELLOW;
    ledColor3 = YELLOW;
    setLED(1, ledColor);
    setLED(2, ledColor2);
    setLED(3, ledColor3);
    //x++; setLED(x); // Change the color of the knob LED
    confirm_button_pressed = false; // Clear flag

    // We'll set another flag saying the button is now down
    // this is so we can keep track of how long the button
    // is being held down. (We can't do this in interrupts,
    // because the button state is not changing).

    confirm_button_down = true;
    confirm_button_down_start = millis();
  }

  if (confirm_button_released)
  {
    Serial.print("confirm_button release, downtime: ");
    Serial.println(confirm_button_downtime, DEC);
    confirm_button_released = false; // Clear flag

    // Clear our button-being-held-down flag
    confirm_button_down = false;

    if(requiresAuthentication && !cardPresent){
      Serial.println("AUTH required. Trying to send data without logging in first.");
      ledColor = BLUE;
      ledColor2 = BLUE;
      ledColor3 = BLUE;
      blink_leds(RED, 12, 15);
      return;
    }
//    ledColor++;

    ledColor = GREEN;
    ledColor2 = GREEN;
    ledColor3 = GREEN;
    setLED(1, ledColor); // Change the color of the knob LED
    setLED(2, ledColor2); // Change the color of the knob LED
    setLED(3, ledColor3); // Change the color of the knob LED
    
    Serial.print("SELECTION: ");
    Serial.print(rotary_counter);
    Serial.print("-");
    Serial.print(rotary2_counter);
    Serial.print("-");
    Serial.println(rotary3_counter);
    Serial.print("    RFID: ");
    Serial.println(cardid);

    Serial.println("Sending to server");
    memset(data, 0, sizeof(data));
    
    uint8_t data_start[] = "DATA:";
    strcat(data, data_start);
    char counter_str[2];
    itoa(rotary_counter, counter_str, 10); //http://www.cplusplus.com/reference/cstdlib/itoa/
    strcat(data, counter_str);
    strcat(data, "-");
    
    char counter2_str[2];
    itoa(rotary2_counter, counter2_str, 10); //http://www.cplusplus.com/reference/cstdlib/itoa/
    strcat(data, counter2_str);
    strcat(data, "-");

    char counter3_str[2];
    itoa(rotary3_counter, counter3_str, 10); //http://www.cplusplus.com/reference/cstdlib/itoa/
    strcat(data, counter3_str);
    
    if(cardPresent){
      strcat(data, ";CARDID:");

      for(int c = 0; c < current_uidLength; c++){
        if(readCard[c] < 0x10){
//          Serial.print(F("0"));
          strcat(data, "0");
        }
//        Serial.print(readCard[c], HEX);
        char cardPosStr[2];
        itoa(readCard[c], cardPosStr, 16); //http://www.cplusplus.com/reference/cstdlib/itoa/
        strcat(data, cardPosStr);
        
        if(c<(current_uidLength-1)){
//          Serial.print("-");
          strcat(data, "-");
        }
      }
    }

    rotary_counter = 0;
    rotary2_counter = 0;
    rotary3_counter = 0;
    ring1_counter_ledsOn = 0;
    ring2_counter_ledsOn = 0;
    ring3_counter_ledsOn = 0;

    Serial.print("    SENDING: ");
    for (int i = 0; i < sizeof(data); i++) {
      Serial.print((char)data[i]);
    }
    Serial.println();

    // Send a message to manager_server
    if (manager.sendtoWait(data, sizeof(data), SERVER_ADDRESS))
    {
      // Now wait for a reply from the server
      uint8_t len = sizeof(buf);
      uint8_t from;
      if (manager.recvfromAckTimeout(buf, &len, 2000, &from))
      {
        Serial.print("got reply from : 0x");
        Serial.print(from, HEX);
        Serial.print(": ");
        Serial.println((char*)buf);
        ledColor = BLUE;
        ledColor2 = BLUE;
        ledColor3 = BLUE;
      }
      else
      {
        Serial.println("No reply, is rf95_reliable_datagram_server running?");
        String str = data;
        Serial.print("Writing to queue: ");
        Serial.println(str);
        fifoStr.push(str);
        ledColor = RED;
        ledColor2 = RED;
        ledColor3 = RED;
      }
    }
    else{
      Serial.println("sendtoWait failed");
      String str = data;
      Serial.print("Writing to queue: ");
      Serial.println(str);
      fifoStr.push(str);
      ledColor = RED;
      ledColor2 = RED;
      ledColor3 = RED;
    }
    
    clearCard();

    blink_leds(GREEN, 12, 15);
    
    setLED(1, ledColor); // Change the color back to original color
    setLED(2, ledColor2); // Change the color back to original color
    setLED(3, ledColor3); // Change the color back to original color

  }

  // Now we can keep track of how long the button is being
  // held down, and perform actions based on that time.
  // This is useful for "hold down for five seconds to power off"
  // -type functions.

  if (confirm_button_down)
  {
    confirm_button_down_time = millis() - confirm_button_down_start;
    // Serial.println(button_down_time);
    if (confirm_button_down_time > 1000) {
      Serial.println("button held down for one second");
    }
    //if LED is pressed down, display red
//    digitalWrite(ROT_LEDR, HIGH);
//    digitalWrite(ROT_LEDG, LOW);
//    digitalWrite(ROT_LEDB, HIGH);
//    setLED(RED);

  }
}

//bool sendData(char *data){
//  Serial.print("SENDING: ");
//  Serial.println(String(data));
//  // Send a message to manager_server
//  if (manager.sendtoWait(data, sizeof(data), SERVER_ADDRESS))
//  {
//    // Now wait for a reply from the server
//    uint8_t len = sizeof(buf);
//    uint8_t from;   
//    if (manager.recvfromAckTimeout(buf, &len, 2000, &from))
//    {
//      Serial.print("got reply from : 0x");
//      Serial.print(from, HEX);
//      Serial.print(": ");
//      Serial.println((char*)buf);
//      return true;
//    }
//    else
//    {
//      Serial.println("No reply, is rf95_reliable_datagram_server running?");
//      return false;
//    }
//  }
//  else{
//    Serial.println("sendtoWait failed");
//    return false;
//  }
//}


void setLED(int buttonId, unsigned char color)
// Set RGB LED to one of eight colors (see #defines above)
{
  if(buttonId == 1){
    digitalWrite(ROT_LEDR, color & B001);
    digitalWrite(ROT_LEDG, color & B010);
    digitalWrite(ROT_LEDB, color & B100);
  }
  else if(buttonId == 2){
    digitalWrite(ROT2_LEDR, color & B001);
    digitalWrite(ROT2_LEDG, color & B010);
    digitalWrite(ROT2_LEDB, color & B100);
  }
  else if(buttonId == 3){
    digitalWrite(ROT3_LEDR, color & B001);
    digitalWrite(ROT3_LEDG, color & B010);
    digitalWrite(ROT3_LEDB, color & B100);
  }
}
