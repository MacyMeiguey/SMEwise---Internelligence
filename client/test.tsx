import { 
  BedrockAgentRuntimeClient, 
  InvokeAgentCommand 
} from "@aws-sdk/client-bedrock-agent-runtime";
import 'dotenv/config';
import process from "process";

// 1. Initialize the client (it will automatically pick up your environment variables)
const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION ?? "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

async function askAgent() {
  const company_name = "Pixel Perfect";

  // 2. Multi-line string (Template Literal)
  const input_text = `Company: ${company_name}
    Industry: Camera
    Stage: Idea Stage
    Location: Kuala Lumpur, Malaysia
    Target Customer: Those who are interested in photography and videography
    Goal: Become profitability within 2 years
    Business Type: Sdn Bhd
    Fund Allocation: RM 10000 for marketing, RM 20000 for product development, RM 15000 for operations, RM 5000 for contingency`;

  // 3. Prepare the command
  const command = new InvokeAgentCommand({
    agentId: "HOG3CDST5J",         // Your Agent ID
    agentAliasId: "ZPRJAI1HFX",    // Your Agent Alias ID
    sessionId: "unique-session-id", 
    inputText: input_text,
  });

  try {
    const response = await client.send(command);

    // The response is a stream — iterate over it
  for await (const chunk of response.completion ?? []) {
    if (chunk.chunk?.bytes) {
      const text = new TextDecoder().decode(chunk.chunk.bytes);
      console.log(text);
    }
    }
  } catch (err) {
    console.error("Error invoking agent:", err);
  }
}

askAgent();