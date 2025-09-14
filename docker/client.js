const net = require("net");

function sendHL7Message() {
  const client = new net.Socket();

  client.on("error", (error) => {
    console.error("Connection error:", error);
  });

  client.connect(3000, "127.0.0.1", () => {
    console.log("Connected to server");

    // Create properly framed HL7 message
    const VT = String.fromCharCode(11); // Vertical Tab (0x0B)
    const FS = String.fromCharCode(28); // File Separator (0x1C)
    const CR = String.fromCharCode(13); // Carriage Return (0x0D)

    const hl7Message =
      "MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20230101120000||ADT^A01|MSG00001|P|2.5";
    const framedMessage = VT + hl7Message + FS + CR;

    console.log("Sending message:", hl7Message);
    console.log(
      "Framed message (hex):",
      Buffer.from(framedMessage).toString("hex")
    );

    client.write(framedMessage);
    console.log("Message sent, waiting for response...");
  });

  // Handle incoming data
  client.on("data", (data) => {
    console.log("Response received:");
    console.log("Raw response:", data.toString());
    console.log("Hex representation:", Buffer.from(data).toString("hex"));

    // Parse MLLP-framed response
    if (
      data.length > 3 &&
      data[0] === 11 &&
      data[data.length - 2] === 28 &&
      data[data.length - 1] === 13
    ) {
      const hl7Response = data.slice(1, data.length - 2).toString();
      console.log("Parsed HL7 response:", hl7Response);

      // Check if it's an ACK
      if (hl7Response.includes("MSA|AA")) {
        console.log("Successfully received AA acknowledgment");
      } else {
        console.log("Received non-AA acknowledgment");
      }
    } else {
      console.log("Response is not properly MLLP-framed");
    }

    client.destroy();
  });

  client.on("close", () => {
    console.log("Connection closed");
  });

  // Set a timeout to close the connection if no response is received
  setTimeout(() => {
    if (!client.destroyed) {
      console.log("No response received within timeout period");
      client.destroy();
    }
  }, 5000);
}

sendHL7Message();
