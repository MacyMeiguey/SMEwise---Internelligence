import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from "@aws-sdk/client-bedrock-runtime";
import 'dotenv/config';
import process from "process";
import * as fs from "fs";

// 1. Initialize the client
const client = new BedrockRuntimeClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

async function generateImage() {
  const prompt = "A futuristic city at sunset, photorealistic";

  // 2. Prepare the NEW request body format for Stable Image Ultra/Core
  const body = JSON.stringify({
    prompt: prompt,
    mode: "text-to-image",
    aspect_ratio: "1:1",
    output_format: "png"
  });

  // 3. Prepare the command with the new model ID
  const command = new InvokeModelCommand({
    modelId: "amazon.titan-image-generator-v2:0",  // Or use "stability.stable-image-core-v1:0"
    contentType: "application/json",
    accept: "application/json",
    body: body,
  });

  try {
    const response = await client.send(command);

    // 4. Decode the response body
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // 5. Extract and save the base64 image
    // The new response structure places the base64 string directly in an 'images' array
    const base64Image = responseBody.images[0];
    const imageBuffer = Buffer.from(base64Image, "base64");

    fs.writeFileSync("output.png", imageBuffer);
    console.log("Image saved to output.png");
  } catch (err) {
    console.error("Error invoking model:", err);
  }
}

generateImage();