const { Server } = require("node-hl7-server");

// Create a single server instance
const server = new Server({ bindAddress: "0.0.0.0" });

// Track processed ADT messages to coordinate with RDS messages
const processedADTMessages = new Map(); // Map to store processed message IDs

// First port for ADT data (port 3000)
const adtInbound = server.createInbound({ port: 3000 }, async (req, res) => {
  try {
    const message = req.getMessage();
    const messageType = message.get("MSH.9.1").toString(); // Get message type
    const messageEvent = message.get("MSH.9.2").toString(); // Get message event
    const messageControlId = message.get("MSH.10").toString(); // Get message control ID

    console.log(
      `Received ${messageType}^${messageEvent} message with control ID: ${messageControlId}`
    );

    // Verify this is an ADT message
    if (messageType === "ADT") {
      console.log("Processing ADT message");

      // Extract patient info (PID segment)
      try {
        const patientId = message.get("PID.3.1").toString();
        const patientName = `${message.get("PID.5.2").toString()}, ${message.get("PID.5.1").toString()}`;
        console.log(`Patient: ${patientId} - ${patientName}`);
      } catch (error) {
        console.log("Could not extract complete patient information");
      }

      // Store message ID as processed
      processedADTMessages.set(messageControlId, {
        timestamp: new Date(),
        processed: true,
      });

      console.log("Sending positive acknowledgment");
      await res.sendResponse("AA");
      console.log(`ADT message ${messageControlId} acknowledged successfully`);
    } else {
      // Not an ADT message
      console.log(`Received non-ADT message type: ${messageType}`);
      await res.sendResponse("AR"); // Application Reject
    }
  } catch (error) {
    console.error("Error processing ADT message:", error);
    try {
      await res.sendResponse("AE"); // Application Error
    } catch (ackError) {
      console.error("Error sending negative acknowledgment:", ackError);
    }
  }
});

// Second port for RDS/ORM order data (port 3001)
const orderInbound = server.createInbound({ port: 3001 }, async (req, res) => {
  try {
    const message = req.getMessage();
    const messageType = message.get("MSH.9.1").toString(); // Get message type
    const messageEvent = message.get("MSH.9.2").toString(); // Get message event
    const messageControlId = message.get("MSH.10").toString(); // Get message control ID

    console.log(
      `Received ${messageType}^${messageEvent} message with control ID: ${messageControlId}`
    );

    // Check for referenced ADT message if needed
    const referencedMessageId = message.get("MSH.10").toString(); // This could be a different field in your implementation

    // Check if a related ADT message was processed
    // In a real implementation, you might use more sophisticated matching logic
    if (processedADTMessages.size > 0) {
      console.log(
        "Processing order message - ADT messages have been processed"
      );

      // Extract order info
      if (messageType === "ORM" || messageType === "RDS") {
        try {
          // For ORM (Order Message)
          if (messageType === "ORM") {
            const orderControl = message.get("ORC.1").toString();
            const orderNumber = message.get("ORC.2.1").toString();
            console.log(
              `Order Control: ${orderControl}, Order Number: ${orderNumber}`
            );

            // Try to get order details if present
            try {
              const orderDescription = message.get("OBR.4.2").toString();
              console.log(`Order Description: ${orderDescription}`);
            } catch (e) {
              console.log("No detailed order description found");
            }
          }
          // For RDS (Pharmacy/Treatment Dispense)
          else if (messageType === "RDS") {
            console.log("Processing RDS (Pharmacy/Treatment Dispense) message");
            // Extract relevant RDS fields
            try {
              const rxDispenseNumber = message.get("RXD.1.1").toString();
              console.log(`Dispense Number: ${rxDispenseNumber}`);
            } catch (e) {
              console.log("Could not extract complete RDS information");
            }
          }
        } catch (error) {
          console.log("Could not extract complete order information");
        }
      }

      // Send positive acknowledgment
      await res.sendResponse("AA");
      console.log(
        `Order message ${messageControlId} acknowledged successfully`
      );
    } else {
      console.log("No ADT messages processed yet - rejecting order");
      await res.sendResponse("AR"); // Application Reject
    }
  } catch (error) {
    console.error("Error processing order message:", error);
    try {
      await res.sendResponse("AE"); // Application Error
    } catch (ackError) {
      console.error("Error sending negative acknowledgment:", ackError);
    }
  }
});

// Set up event listeners for ADT port
adtInbound.on("client.connect", () => {
  console.log("ADT Client Connected to port 3000");
});

adtInbound.on("client.close", () => {
  console.log("ADT Client Disconnected from port 3000");
});

adtInbound.on("data.raw", (data) => {
  console.log("Raw ADT Data:", data);
});

adtInbound.on("listen", () => {
  console.log("Ready to Listen for ADT Messages on port 3000");
});

adtInbound.on("error", (error) => {
  console.error("ADT Server Error:", error);
});

// Set up event listeners for Order port
orderInbound.on("client.connect", () => {
  console.log("Order Client Connected to port 3001");
});

orderInbound.on("client.close", () => {
  console.log("Order Client Disconnected from port 3001");
});

orderInbound.on("data.raw", (data) => {
  console.log("Raw Order Data:", data);
});

orderInbound.on("listen", () => {
  console.log("Ready to Listen for Order Messages on port 3001");
});

orderInbound.on("error", (error) => {
  console.error("Order Server Error:", error);
});

// Cleanup for ADT messages older than 1 hour
setInterval(
  () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [messageId, details] of processedADTMessages.entries()) {
      if (details.timestamp < oneHourAgo) {
        processedADTMessages.delete(messageId);
        console.log(`Removed expired ADT message ${messageId} from tracking`);
      }
    }
  },
  10 * 60 * 1000
); // Run every 10 minutes

// Add process error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
