// rf95_reliable_datagram_server.pde
// -*- mode: C++ -*-
// Example sketch showing how to create a simple addressed, reliable messaging server
// with the RHReliableDatagram class, using the RH_RF95 driver to control a RF95 radio.
// It is designed to work with the other example rf95_reliable_datagram_client
// Tested with Anarduino MiniWirelessLoRa, Rocket Scream Mini Ultra Pro with the RFM95W 

#include <RHReliableDatagram.h>
#include <RH_RF95.h>
#include <SPI.h>

#define CLIENT_ADDRESS 5
#define SERVER_ADDRESS 3

// Singleton instance of the radio driver
RH_RF95 driver;
//RH_RF95 driver(5, 2); // Rocket Scream Mini Ultra Pro with the RFM95W

// Class to manage message delivery and receipt, using the driver declared above
RHReliableDatagram manager(driver, SERVER_ADDRESS);

// Need this on Arduino Zero with SerialUSB port (eg RocketScream Mini Ultra Pro)
//#define Serial SerialUSB

String inputString = "";         // a String to hold incoming data
bool stringComplete = false;  // whether the string is complete

void setup() 
{
  // Rocket Scream Mini Ultra Pro with the RFM95W only:
  // Ensure serial flash is not interfering with radio communication on SPI bus
//  pinMode(4, OUTPUT);
//  digitalWrite(4, HIGH);

  Serial.begin(9600);
  
  // reserve 200 bytes for the inputString:
  inputString.reserve(200);
  
  while (!Serial) ; // Wait for serial port to be available
  if (!manager.init())
    Serial.println(F("#TYPE:INFO;DATA:LORA_init_failed"));
  // Defaults after init are 434.0MHz, 13dBm, Bw = 125 kHz, Cr = 4/5, Sf = 128chips/symbol, CRC on

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
  Serial.println(F("#TYPE:INFO;DATA:LORA_SERVER_started"));
}

uint8_t data[] = "Data received!";
// Dont put this on the stack:
uint8_t buf[RH_RF95_MAX_MESSAGE_LEN];

uint8_t ctrl_requireAuth[] = "REQUIRE_AUTH";
uint8_t ctrl_requireNoAuth[] = "REQUIRE_NO_AUTH";

uint8_t ctrl_SetCounterStart[] = "SET_COUNTER";
uint8_t ctrl_SetMin1[] = "SET_COUNTER_MIN:1";

uint8_t ctrl_SetMax3[] = "SET_COUNTER_MAX:03"; //-253
uint8_t ctrl_SetMax4[] = "SET_COUNTER_MAX:04";
uint8_t ctrl_SetMax5[] = "SET_COUNTER_MAX:05";
uint8_t ctrl_SetMax7[] = "SET_COUNTER_MAX:07";
uint8_t ctrl_SetMax10[] = "SET_COUNTER_MAX:10";
uint8_t ctrl_SetMax12[] = "SET_COUNTER_MAX:12"; //-244

void loop()
{
  if (manager.available())
  {
    // Wait for a message addressed to us from the client
    uint8_t len = sizeof(buf);
    uint8_t from;
    if (manager.recvfromAck(buf, &len, &from))
    {
      Serial.print(F("#TYPE:INCOMING;FROM:0x"));
      Serial.print(from, HEX);
      Serial.print(";");
      Serial.println((char*)buf);

      // Send a reply back to the originator client
      if (!manager.sendtoWait(data, sizeof(data), from))
        Serial.println(F("#TYPE:ERROR;DATA:sendtoWait failed"));
    }
  }

  // print the string when a newline arrives:
  if (stringComplete) {
    Serial.print("Serial incoming: ");
    Serial.println(inputString);
    
    if(inputString.startsWith("REQUIRE_AUTH")){
      if (!manager.sendtoWait(ctrl_requireAuth, sizeof(ctrl_requireAuth), CLIENT_ADDRESS))
        Serial.println(F("#TYPE:ERROR;DATA:sendtoWait REQUIRE_AUTH failed"));
      else
        Serial.println(F("#TYPE:OK;DATA:REQUIRE_AUTH sent"));
    }
    else if(inputString.startsWith("REQUIRE_NO_AUTH")){
      if (!manager.sendtoWait(ctrl_requireNoAuth, sizeof(ctrl_requireNoAuth), CLIENT_ADDRESS))
        Serial.println(F("#TYPE:ERROR;DATA:sendtoWait REQUIRE_NO_AUTH failed"));
      else
        Serial.println(F("#TYPE:OK;DATA:REQUIRE_NO_AUTH sent"));
    }
    else if(inputString.startsWith("SET_COUNTER_MAX:")){
//      String count = inputString.substring(16);
//      Serial.print(F("new max count: "));
//      Serial.println(count);

      uint8_t ctrl_SetMax[] = "SET_COUNTER_MAX:12";
      if(inputString.startsWith("SET_COUNTER_MAX:03")){
        memcpy( ctrl_SetMax, ctrl_SetMax3, sizeof(ctrl_SetMax3) );
      }
      else if(inputString.startsWith("SET_COUNTER_MAX:04")){
        memcpy( ctrl_SetMax, ctrl_SetMax4, sizeof(ctrl_SetMax4) );
      }
      else if(inputString.startsWith("SET_COUNTER_MAX:05")){
        memcpy( ctrl_SetMax, ctrl_SetMax5, sizeof(ctrl_SetMax5) );
      }
      else if(inputString.startsWith("SET_COUNTER_MAX:07")){
        memcpy( ctrl_SetMax, ctrl_SetMax7, sizeof(ctrl_SetMax7) );
      }
      else if(inputString.startsWith("SET_COUNTER_MAX:10")){
        memcpy( ctrl_SetMax, ctrl_SetMax10, sizeof(ctrl_SetMax10) );
      }
      else if(inputString.startsWith("SET_COUNTER_MAX:12")){
        memcpy( ctrl_SetMax, ctrl_SetMax12, sizeof(ctrl_SetMax12) );
      }
      if (!manager.sendtoWait(ctrl_SetMax, sizeof(ctrl_SetMax), CLIENT_ADDRESS))
        Serial.println("#TYPE:ERROR;DATA:sendtoWait SET_COUNTER_MAX failed");
      else{
        Serial.println("#TYPE:OK;DATA:SET_COUNTER_MAX sent");
//        Serial.println(ctrl_SetMax);
      }
    }
    else if(inputString.startsWith("SET_COUNTER_MIN:")){
      String count = inputString.substring(16);
      Serial.print("new min count: ");
      Serial.println(count);
      if (!manager.sendtoWait(ctrl_requireNoAuth, sizeof(ctrl_requireNoAuth), CLIENT_ADDRESS))
        Serial.println(F("#TYPE:ERROR;DATA:sendtoWait SET_COUNTER_MIN failed"));
      else
        Serial.println(F("#TYPE:OK;DATA:SET_COUNTER_MIN sent"));
    }
    
    // clear the string:
    inputString = "";
    stringComplete = false;
  }
}

/*
  SerialEvent occurs whenever a new data comes in the hardware serial RX. This
  routine is run between each time loop() runs, so using delay inside loop can
  delay response. Multiple bytes of data may be available.
*/
void serialEvent() {
  while (Serial.available()) {
    // get the new byte:
    char inChar = (char)Serial.read();
    // add it to the inputString:
    inputString += inChar;
    // if the incoming character is a newline, set a flag so the main loop can
    // do something about it:
    if (inChar == '\n') {
      stringComplete = true;
    }
  }
}
