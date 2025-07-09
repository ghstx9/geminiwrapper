import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export const runtime = 'edge';

const geminiApiKey = process.env.GEMINI_API_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!geminiApiKey) {
  console.warn("GEMINI_API_KEY is not defined in environment variables.");
}
if (!openRouterApiKey) {
  console.warn("OPENROUTER_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(geminiApiKey || '');

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const isGeminiModel = (modelId: string) => {
  return modelId.includes('gemini') || modelId.includes('gemma');
};

const callOpenRouterAPI = async (modelId: string, message: string, history: any[]) => {
  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key is not configured');
  }

  const messages = [
    ...(history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.parts?.[0]?.text || msg.content || ''
    })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': 'Your App Name'
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export async function POST(req: NextRequest) {
  console.log('POST function started - LM 1.0');

  try {
    const body = await req.json();
    const { message, history, modelId } = body; 
    
    const selectedModelId = modelId; 

    console.log('👀 API ROUTE HIT! REQUEST BODY:', body);

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!selectedModelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    let responseText: string;

    if (isGeminiModel(selectedModelId)) {
      if (!geminiApiKey) {
        return NextResponse.json(
          { error: 'Gemini API key is not configured' },
          { status: 500 }
        );
      }

      const dynamicModel = genAI.getGenerativeModel({
        model: selectedModelId,
      });

      const chat = dynamicModel.startChat({
        history: [...(history || [])],
        safetySettings,
      });

      console.log('About to send message to Gemini API...');
      const result = await chat.sendMessage(message);
      const response = result.response;
      responseText = response.text();
    } 

    else {
      console.log('About to send message to OpenRouter API...');
      responseText = await callOpenRouterAPI(selectedModelId, message, history);
    }

    console.log('API Response:', responseText);

    return NextResponse.json({ response: responseText });

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
      { response: `UNEXPECTED ERROR DETECTED: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
