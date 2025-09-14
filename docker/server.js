const { Server } = require("node-hl7-server");

// Enable debug mode if available
const server = new Server({
  bindAddress: "0.0.0.0",
  debug: true, // Add debug mode if available
});

const inbound = server.createInbound({ port: 3000 }, async (req, res) => {
  console.log("***CALLBACK TRIGGERED***");
  console.log("Request message:", req.getMessage());
  console.log("Sending response: AA");
  try {
    await res.sendResponse("AA");
    console.log("Response sent successfully");
  } catch (error) {
    console.error("Error sending response:", error);
  }
});

// Add all possible event listeners for debugging
inbound.on("client.connect", () => {
  console.log("Client Connected");
});

inbound.on("client.close", () => {
  console.log("Client Disconnected");
});

inbound.on("data.raw", (data) => {
  console.log("Raw Data:", data);
  // Log hex representation to see control characters
  console.log("Raw Data (hex):", Buffer.from(data).toString("hex"));
});

inbound.on("data.outgoing", (data) => {
  console.log("Outgoing Data:", data);
  // Log hex representation to see control characters
  console.log("Outgoing Data (hex):", Buffer.from(data).toString("hex"));
});

inbound.on("error", (error) => {
  console.error("Server Error:", error);
});

inbound.on("listen", () => {
  console.log("Ready to Listen for Messages on port 3000");
});

// Add process error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
