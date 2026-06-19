import { NextResponse } from "next/server";

const VERIFY_TOKEN = "bms_whatsapp_secure_verify_token_2026";

// Handle GET requests for WhatsApp Webhook Verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Check if a request is for verification
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Bad Request", { status: 400 });
}

// Handle POST requests for incoming WhatsApp messages
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's a WhatsApp status update or message
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; // Extract the phone number from the webhook payload
        const msgBody = body.entry[0].changes[0].value.messages[0].text.body; // Extract the message text from the webhook payload
        
        console.log(`Received message from ${from}: ${msgBody}`);
        
        // TODO: Handle incoming message logic (e.g., reply to customer)
      }
      
      // Return a '200 OK' response to all requests
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    } else {
      // Return a '404 Not Found' if event is not from a WhatsApp API
      return new NextResponse("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
