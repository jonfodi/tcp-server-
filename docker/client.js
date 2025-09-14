const net = require("net");

// Function to create and send an HL7 message
function sendHL7Message(port, messageType, messageContent) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();

    client.on("error", (error) => {
      console.error(`Connection error on port ${port}:`, error);
      reject(error);
    });

    client.connect(port, "127.0.0.1", () => {
      console.log(`Connected to server on port ${port}`);

      // Create properly framed HL7 message
      const VT = String.fromCharCode(11); // Vertical Tab (0x0B)
      const FS = String.fromCharCode(28); // File Separator (0x1C)
      const CR = String.fromCharCode(13); // Carriage Return (0x0D)

      const framedMessage = VT + messageContent + FS + CR;

      console.log(`Sending ${messageType} message to port ${port}`);
      console.log("Message content:", messageContent);

      client.write(framedMessage);
      console.log("Message sent, waiting for response...");
    });

    // Handle incoming data
    client.on("data", (data) => {
      console.log(`Response received from port ${port}:`);
      console.log("Raw response:", data.toString());

      // Parse MLLP-framed response
      if (
        data.length > 3 &&
        data[0] === 11 &&
        data[data.length - 2] === 28 &&
        data[data.length - 1] === 13
      ) {
        const hl7Response = data.slice(1, data.length - 2).toString();
        console.log("Parsed HL7 response:", hl7Response);

        // Check if it's an AA acknowledgment
        if (hl7Response.includes("MSA|AA")) {
          console.log(
            `Successfully received AA acknowledgment for ${messageType}`
          );
          client.destroy();
          resolve(true); // Successful acknowledgment
        } else {
          console.log(`Received non-AA acknowledgment for ${messageType}`);
          client.destroy();
          resolve(false); // Non-successful acknowledgment
        }
      } else {
        console.log("Response is not properly MLLP-framed");
        client.destroy();
        resolve(false);
      }
    });

    client.on("close", () => {
      console.log(`Connection to port ${port} closed`);
    });

    // Set a timeout to close the connection if no response is received
    setTimeout(() => {
      if (!client.destroyed) {
        console.log(
          `No response received from port ${port} within timeout period`
        );
        client.destroy();
        reject(new Error("Timeout waiting for response"));
      }
    }, 5000);
  });
}

// Sample ADT message (A01 - Patient Admission)
const adtMessage = `MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230101120000||ADT^A01|MSG00001|P|2.5
EVN|A01|20230101120000
PID|1|12345|12345^^^MRN^MR||DOE^JOHN^||19800101|M|||123 MAIN ST^^ANYTOWN^CA^12345||555-555-5555||S||12345|123-45-6789
PV1|1|I|2000^2012^01||||0123^DOCTOR^JOHN^J^^^MD|0123^DOCTOR^JOHN^J^^^MD|||||||ADM|A0|`;

// Sample RDS message (pharmacy dispense)
const rdsMessage = `MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230101120500||RDS^O13|MSG00002|P|2.5
MSA|AA|MSG00001
PID|1|12345|12345^^^MRN^MR||DOE^JOHN^||19800101|M
ORC|RE|ORDER12345||FILLED|||^^^^^R
RXD|1^once daily^UNCLEAR|20230101^STAT|MEDICATION123^Ibuprofen^NDC|400^mg|CAPSULE|30`;

// Alternative: Sample ORM message (order)
const ormMessage = `MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230101120500||ORM^O01|MSG00002|P|2.5
MSA|AA|MSG00001
PID|1|12345|12345^^^MRN^MR||DOE^JOHN^||19800101|M
ORC|NW|ORDER12345||||||20230101120500|^DOCTOR^JOHN^^^^MD
OBR|1|ORDER12345||76770^ULTRASOUND EXAM, RETROPERITONEAL^CPT`;

// Execute the sequence
async function runSequence() {
  try {
    console.log("Starting the message sequence...");

    // Step 1: Send ADT message
    console.log("STEP 1: Sending ADT message");
    const adtSuccess = await sendHL7Message(3000, "ADT", adtMessage);

    // Step 2: If ADT was successful, send order message
    if (adtSuccess) {
      console.log(
        "STEP 2: ADT message acknowledged successfully, sending order message"
      );
      // You can choose to send either RDS or ORM message
      // await sendHL7Message(3001, "RDS", rdsMessage);
      await sendHL7Message(3001, "ORM", ormMessage);
    } else {
      console.log(
        "ADT message was not acknowledged successfully. Stopping sequence."
      );
    }

    console.log("Message sequence completed.");
  } catch (error) {
    console.error("Error in message sequence:", error);
  }
}

// Run the sequence
runSequence();
