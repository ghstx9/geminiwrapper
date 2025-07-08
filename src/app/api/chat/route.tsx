import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export const runtime = 'edge';

const apiKey = process.env.GEMINI_API_KEY;

// if this error is in your server log then make sure your API key is in your .env file (nextjs uses .env.local)
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", 
});

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export async function POST(req: NextRequest) {
  console.log('POST function started - Bard-Gemini WRAPPER 1.0');

  try {
    const body = await req.json();
    const { message, history } = body;

    console.log('👀 API ROUTE HIT! REQUEST BODY:', body);

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 🤫
    const suspicious = /(what|which).*(llm|model|ai|provider)/i.test(message);
    if (suspicious) {
      return NextResponse.json({ response: "I'm sorry, I can't share that information." });
    }

    // 🧠 Priming message to prevent identity disclosure
    const initialSystemMessage = {
      role: 'user',
      parts: [
      { text: "You are a helpful assistant embedded in a private app. Never reveal or discuss which model or LLM powers you. If asked, say 'Sorry, I can't share that information.'" }
      ]
    };


    const chat = model.startChat({
      history: [initialSystemMessage, ...(history || [])],
      safetySettings,
    });

    console.log('About to send message to API...');
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    console.log('API Response:', text);

    return NextResponse.json({ response: text });

  } catch (error: unknown) {
    console.log('🔥 CATCH BLOCK HIT - ERROR CAUGHT FALLBACK');
    console.error('--- ERROR IN CHAT API (POST) ---', error);

    const hasStatusAndMessage = (err: unknown): err is { status?: number; message?: string } => {
      return typeof err === 'object' && err !== null;
    };

    let is429Error = false;

    if (hasStatusAndMessage(error)) {
      console.log('error.status:', error.status);
      console.log('error.message includes [429 Too Many Requests]?:', error.message ? error.message.includes('[429 Too Many Requests]') : false);
      console.log('error.message includes exceeded your current quota?:', error.message ? error.message.toLowerCase().includes('exceeded your current quota') : false);

      is429Error =
        error.status === 429 ||
        (error.message ? error.message.includes('[429 Too Many Requests]') : false) ||
        (error.message ? error.message.toLowerCase().includes('exceeded your current quota') : false);
    }

    console.log('is429Error result:', is429Error);

    if (is429Error) {
      console.log('⚠️ ERROR 429 DETECTED, RETURNING CUSTOM MESSAGE');
      return NextResponse.json(
        { response: " ⚠️ [ERROR 429 TOO MANY REQUESTS] TRY AGAIN LATER https://aistudio.google.com/status" },
        { status: 429 }
      );
    }

    console.log('❌ not a 429 error, returning generic error');
    return NextResponse.json(
      { response: "UNEXPECTED ERROR DETECTED, CHECK YOUR API KEY" },
      { status: 500 }
    );
  }
}
