// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Get the API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;

// Check if the API key is available
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(apiKey);

// Configuration for the generation model
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // Using a more recent model
});

// Safety settings to block harmful content
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Destructure message and history from the request body
    const { message, history } = body;

    console.log('API Route Hit. Request Body:', body); // Log incoming request

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Start a chat session with the provided history
    const chat = model.startChat({
        history: history || [],
        safetySettings,
    });

    // Send the user's message and get the result
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();
    
    console.log('Gemini Response:', text); // Log successful response

    return NextResponse.json({ response: text });

  } catch (error) {
    // Log the full error for better debugging on the server
    console.error('--- ERROR IN CHAT API ---');
    console.error(error);
    console.error('-------------------------');
    
    // Provide a more informative error message to the client
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
}
