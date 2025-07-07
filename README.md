# Gemini Wrapper  

Basically similar like everybody's ChatGPT wrapper but instead of using OpenAI API, this project used Google's Generative AI instead.  

---

## Installation  

1. Clone the repo:
   ```bash
   git clone https://github.com/ghstx9/geminiwrapper.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Now just start the dev server:
   ```bash
   npm run dev
   ```

---

## API Configuration

1. Set up your environment variables:

   Create a `.env.local` file in the root of your project and add your Google Gemini API key:

   ```env
   GEMINI_API_KEY=your-google-gemini-api-key-here
   ```

   Replace `your-google-gemini-api-key-here` with your actual API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

2. The app will automatically use this key to call requests to the Gemini API.

---

## Changing the Model

By default, this project is already configured to use the `gemini-2.5-flash` model.  
To change the model, edit the following line in [`src/app/api/chat/route.tsx`](src/app/api/chat/route.tsx):

```ts
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Change this to the model you want
});
```

For example, to use `gemini-1.5-flash`, update it to:

```ts
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
```

Refer to the [Google Generative AI documentation](https://ai.google.dev/gemini-api/docs) for available model names.

---

