import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/firestore';
import type { ChatMessage, ChatSession } from '@/types';
import { GoogleGenerativeAI } from "@google/generative-ai";

type SupportedLanguage = 'en' | 'hi' | 'pa';

// Gemini AI Integration
async function getGeminiResponse(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<{ content: string; category: ChatMessage['category']; urgency: 'low' | 'medium' | 'high' | 'emergency' }> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const userLanguage = detectLanguage(userMessage);
  
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not found, falling back to keyword matching');
    return getFallbackResponse(userMessage, userLanguage);
  }

  try {
    const languageInstruction = userLanguage === 'hi'
      ? 'User language detected: Hindi. Respond entirely in Hindi without switching languages.'
      : userLanguage === 'pa'
      ? 'User language detected: Punjabi. Respond entirely in Punjabi without switching languages.'
      : 'User language detected: English. Respond entirely in English without switching languages.';

    const systemPrompt = `You are ArogyaMitra AI, a helpful healthcare assistant for a telemedicine platform in India. ${languageInstruction}

IMPORTANT GUIDELINES:
1. Provide helpful, accurate health information but always emphasize consulting healthcare professionals
2. For emergencies (chest pain, difficulty breathing, severe symptoms), immediately recommend calling emergency services
3. Be culturally sensitive to Indian healthcare context
4. Provide practical, actionable advice in the same language the user used (English, Hindi, or Punjabi)
5. Use simple, clear language that patients can understand
6. If the user writes in Hindi, respond only in Hindi. If the user writes in Punjabi, respond only in Punjabi. If the user writes in English, respond only in English.
7. Never mix multiple languages in a single response unless the user explicitly does so first.
8. Always end with booking appointment offer for serious concerns

RESPONSE FORMAT:
- Keep responses concise but informative
- Use numbered lists for actionable advice
- Add emergency warnings with ⚠️ emoji when needed
- Suggest consulting doctors for persistent or severe symptoms

URGENCY LEVELS:
- Emergency: Chest pain, difficulty breathing, severe bleeding, loss of consciousness
- High: Persistent fever, severe pain, signs of infection
- Medium: Common symptoms like headache, mild fever, cough
- Low: General wellness, diet, exercise questions

Current conversation context: ${conversationHistory.length > 0 ? 'Previous messages: ' + conversationHistory.slice(-3).map(m => `${m.type}: ${m.content}`).join('; ') : 'New conversation'}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nUser Question: ${userMessage}\n\nPlease provide a helpful healthcare response following the guidelines above.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500
      }
    });

    const parts = result?.response?.candidates?.flatMap((candidate: any) => candidate?.content?.parts ?? []) ?? [];
    const aiContent = parts
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();

    if (!aiContent) {
      console.warn('Gemini API returned no text content. Falling back to keyword response.');
      return getFallbackResponse(userMessage, userLanguage);
    }

    // Determine urgency and category from the content and user message
    const urgency = determineUrgency(userMessage, aiContent);
    const category = determineCategory(userMessage);

    return {
      content: aiContent,
      category,
      urgency
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    return getFallbackResponse(userMessage, userLanguage);
  }
}

// Fallback keyword matching for when Gemini API is unavailable
function getFallbackResponse(
  userMessage: string,
  language: SupportedLanguage = detectLanguage(userMessage)
): { content: string; category: ChatMessage['category']; urgency: 'low' | 'medium' | 'high' | 'emergency' } {
  const lowerMessage = userMessage.toLowerCase();
  
  // Emergency keywords
  if (lowerMessage.includes('chest pain') || lowerMessage.includes('heart attack') || 
      lowerMessage.includes('difficulty breathing') || lowerMessage.includes('severe pain') ||
      lowerMessage.includes('unconscious') || lowerMessage.includes('bleeding heavily')) {
    return { 
      content: selectLocalizedText({
        en: "⚠️ EMERGENCY: This sounds like a medical emergency. Please call emergency services immediately (108 in India) or visit the nearest hospital. Don't wait—seek immediate medical attention for severe chest pain, difficulty breathing, heavy bleeding, loss of consciousness, or any life-threatening symptoms.",
        hi: "⚠️ आपातकाल: यह एक चिकित्सीय आपात स्थिति जैसी लगती है। कृपया तुरंत आपातकालीन सेवाओं (भारत में 108) को कॉल करें या नजदीकी अस्पताल जाएँ। इंतज़ार न करें—गंभीर सीने में दर्द, सांस लेने में कठिनाई, ज़्यादा खून बहना, बेहोशी या किसी भी जानलेवा लक्षण के लिए तुरंत चिकित्सा सहायता लें।",
        pa: "⚠️ ਐਮਰਜੈਂਸੀ: ਇਹ ਮੈਡੀਕਲ ਐਮਰਜੈਂਸੀ ਵਾਂਗ ਲੱਗਦੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ (ਭਾਰਤ ਵਿੱਚ 108) ਨੂੰ ਕਾਲ ਕਰੋ ਜਾਂ ਸਭ ਤੋਂ ਨਜ਼ਦੀਕੀ ਹਸਪਤਾਲ ਜਾਓ। ਇੰਤਜ਼ਾਰ ਨਾ ਕਰੋ—ਗੰਭੀਰ ਛਾਤੀ ਦਰਦ, ਸਾਹ ਲੈਣ ਵਿੱਚ ਮੁਸ਼ਕਲ, ਵੱਧ ਖੂਨ ਵਗਣਾ, ਹੋਸ਼ ਖੋ ਬੈਠਣਾ ਜਾਂ ਕਿਸੇ ਵੀ ਜਾਨਲੇਵਾ ਲੱਛਣ ਲਈ ਤੁਰੰਤ ਡਾਕਟਰੀ ਸਹਾਇਤਾ ਲਵੋ।"
      }, language), 
      category: 'emergency', 
      urgency: 'emergency' 
    };
  }
  
  // High urgency symptoms
  if (lowerMessage.includes('high fever') || lowerMessage.includes('severe') || lowerMessage.includes('blood')) {
    return {
      content: selectLocalizedText({
        en: "These symptoms require prompt medical attention. Please consult a doctor as soon as possible or visit a healthcare facility. Monitor your symptoms closely and seek immediate care if they worsen.",
        hi: "इन लक्षणों के लिए तुरंत चिकित्सकीय सलाह आवश्यक है। कृपया जितनी जल्दी हो सके डॉक्टर से संपर्क करें या स्वास्थ्य केंद्र जाएँ। अपने लक्षणों पर करीबी नज़र रखें और यदि वे बढ़ें तो तुरंत चिकित्सा सहायता लें।",
        pa: "ਇਹ ਲੱਛਣ ਤੁਰੰਤ ਡਾਕਟਰੀ ਧਿਆਨ ਦੀ ਲੋੜ ਰੱਖਦੇ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਜਿੰਨੀ ਜਲਦੀ ਸੰਭਵ ਹੋ ਸਕੇ ਡਾਕਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ ਜਾਂ ਸਿਹਤ ਕੇਂਦਰ ਜਾਓ। ਆਪਣੇ ਲੱਛਣਾਂ 'ਤੇ ਨਜ਼ਦੀਕੀ ਨਿਗਰਾਨੀ ਰੱਖੋ ਅਤੇ ਜੇ ਇਹ ਵਧ ਜਾਣ ਤਾਂ ਤੁਰੰਤ ਡਾਕਟਰੀ ਸਹਾਇਤਾ ਲਵੋ।"
      }, language),
      category: 'symptom',
      urgency: 'high'
    };
  }

  // Common health topics
  if (lowerMessage.includes('headache')) {
    return {
      content: selectLocalizedText({
        en: "For headaches: 1) Rest in a quiet, dark room, 2) Stay hydrated, 3) Apply cold/warm compress, 4) Take OTC pain relievers as directed. Consult a doctor if headaches are severe, persistent, or accompanied by fever, vision changes, or neck stiffness.",
        hi: "सिरदर्द के लिए: 1) शांत और अंधेरे कमरे में आराम करें, 2) हाइड्रेट रहें, 3) ठंडा/गर्म सेक लगाएँ, 4) निर्देशानुसार ओटीसी दर्द निवारक लें। यदि सिरदर्द गंभीर हो, लगातार रहे, या बुखार, दृष्टि में बदलाव या गर्दन में जकड़न के साथ हो तो डॉक्टर से संपर्क करें।",
        pa: "ਸਿਰਦਰਦ ਲਈ: 1) ਸ਼ਾਂਤ ਤੇ ਹਨੇਰੇ ਕਮਰੇ ਵਿੱਚ ਆਰਾਮ ਕਰੋ, 2) ਪਾਣੀ ਵਧੀਆ ਪੀਓ, 3) ਠੰਡਾ ਜਾਂ ਗਰਮ ਸੇਕ ਲਗਾਓ, 4) ਹਦਾਇਤ ਅਨੁਸਾਰ ਓਟੀਸੀ ਦਰਦ ਨਿਵਾਰਕ ਲਵੋ। ਜੇ ਸਿਰਦਰਦ ਗੰਭੀਰ ਹੋਵੇ, ਲੰਬੇ ਸਮੇਂ ਰਹੇ ਜਾਂ ਬੁਖ਼ਾਰ, ਨਜ਼ਰ ਵਿੱਚ ਤਬਦੀਲੀ ਜਾਂ ਗਰਦਨ ਵਿੱਚ ਕਸਾਉ ਨਾਲ ਹੋਵੇ ਤਾਂ ਡਾਕਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।"
      }, language),
      category: 'symptom',
      urgency: 'medium'
    };
  }

  if (lowerMessage.includes('fever')) {
    return {
      content: selectLocalizedText({
        en: "For fever management: 1) Rest and stay hydrated, 2) Take paracetamol as directed, 3) Use cool compresses, 4) Monitor temperature regularly. Seek medical care if fever exceeds 103°F (39.4°C), persists over 3 days, or is accompanied by difficulty breathing, severe headache, or confusion.",
        hi: "बुखार प्रबंधन के लिए: 1) आराम करें और खूब पानी पिएँ, 2) निर्देश अनुसार पैरासिटामोल लें, 3) ठंडी पट्टियाँ करें, 4) तापमान नियमित रूप से जाँचें। यदि तापमान 103°F (39.4°C) से ऊपर हो, तीन दिन से अधिक रहे, या सांस लेने में कठिनाई, गंभीर सिरदर्द या भ्रम के साथ हो तो डॉक्टर से संपर्क करें।",
        pa: "ਬੁਖਾਰ ਸੰਭਾਲ ਲਈ: 1) ਆਰਾਮ ਕਰੋ ਅਤੇ ਵੱਧ ਪਾਣੀ ਪੀਓ, 2) ਹਦਾਇਤ ਅਨੁਸਾਰ ਪੈਰਾਸੀਟਾਮੋਲ ਲਵੋ, 3) ਠੰਡੀ ਪੱਟੀਆਂ ਲਗਾਓ, 4) ਤਾਪਮਾਨ ਨਿਯਮਿਤ ਤੌਰ 'ਤੇ ਚੈੱਕ ਕਰੋ। ਜੇ ਬੁਖਾਰ 103°F (39.4°C) ਤੋਂ ਵੱਧ ਹੋ ਜਾਵੇ, ਤਿੰਨ ਦਿਨਾਂ ਤੋਂ ਲੰਮਾ ਰਹੇ ਜਾਂ ਸਾਹ ਦੀ ਤਕਲੀਫ਼, ਤਿੱਖਾ ਸਿਰਦਰਦ ਜਾਂ ਉਲਝਣ ਨਾਲ ਹੋਵੇ ਤਾਂ ਡਾਕਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।"
      }, language),
      category: 'symptom',
      urgency: 'medium'
    };
  }

  if (lowerMessage.includes('diabetes')) {
    return {
      content: selectLocalizedText({
        en: "Common diabetes symptoms: frequent urination, excessive thirst, unexplained weight loss, fatigue, blurred vision, slow-healing wounds. If you experience multiple symptoms, please consult a healthcare professional for proper testing. Regular monitoring and lifestyle management are key for diabetes care.",
        hi: "मधुमेह के आम लक्षण: बार-बार पेशाब आना, अत्यधिक प्यास लगना, बिना कारण वजन कम होना, थकान, धुंधली दृष्टि, घावों का धीमा भरना। यदि आप कई लक्षण अनुभव कर रहे हैं, तो सही जांच के लिए स्वास्थ्य विशेषज्ञ से संपर्क करें। नियमित निगरानी और जीवनशैली प्रबंधन मधुमेह देखभाल की कुंजी है।",
        pa: "ਸ਼ੂਗਰ ਦੇ ਆਮ ਲੱਛਣ: ਵਾਰੀ-ਵਾਰੀ ਪੇਸ਼ਾਬ ਆਉਣਾ, ਬਹੁਤ ਜ਼ਿਆਦਾ ਪਿਆਸ ਲੱਗਣਾ, ਬਿਨਾਂ ਕਾਰਨ ਵਜ਼ਨ ਘਟਣਾ, ਥਕਾਵਟ, ਧੁੰਧਲੀ ਨਜ਼ਰ, ਜ਼ਖਮਾਂ ਦਾ ਹੌਲੇ ਹੌਲੇ ਭਰਨਾ। ਜੇ ਤੁਸੀਂ ਕਈ ਲੱਛਣ ਮਹਿਸੂਸ ਕਰਦੇ ਹੋ ਤਾਂ ਸਹੀ ਜਾਂਚ ਲਈ ਸਿਹਤ ਮਾਹਿਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ। ਨਿਯਮਿਤ ਨਿਗਰਾਨੀ ਅਤੇ ਜੀਵਨਸ਼ੈਲੀ ਪ੍ਰਬੰਧਨ ਸ਼ੂਗਰ ਦੀ ਦੇਖਭਾਲ ਲਈ ਬਹੁਤ ਜ਼ਰੂਰੀ ਹਨ।"
      }, language),
      category: 'symptom',
      urgency: 'medium'
    };
  }

  // Wellness topics
  if (lowerMessage.includes('diet') || lowerMessage.includes('nutrition')) {
    return {
      content: selectLocalizedText({
        en: "For healthy eating: 1) Include plenty of fruits and vegetables, 2) Choose whole grains, 3) Include lean proteins, 4) Limit processed foods and sugar, 5) Stay hydrated, 6) Practice portion control. Consider consulting a nutritionist for personalized dietary advice.",
        hi: "स्वस्थ खानपान के लिए: 1) अधिक फल और सब्जियाँ खाएँ, 2) साबुत अनाज चुनें, 3) हल्के प्रोटीन शामिल करें, 4) प्रसंस्कृत खाद्य और चीनी सीमित करें, 5) हाइड्रेट रहें, 6) भाग नियंत्रण अपनाएँ। व्यक्तिगत सलाह के लिए पोषण विशेषज्ञ से संपर्क करने पर विचार करें।",
        pa: "ਸਿਹਤਮੰਦ ਖੁਰਾਕ ਲਈ: 1) ਫਲ ਅਤੇ ਸਬਜ਼ੀਆਂ ਪ੍ਰਚੁਰ ਮਾਤਰਾ ਵਿੱਚ ਖਾਓ, 2) ਪੂਰੇ ਅਨਾਜ ਚੁਣੋ, 3) ਹਲਕੇ ਪ੍ਰੋਟੀਨ ਸ਼ਾਮਲ ਕਰੋ, 4) ਪ੍ਰੋਸੈਸ ਕੀਤੇ ਖਾਣੇ ਅਤੇ ਚੀਨੀ ਘੱਟ ਕਰੋ, 5) ਪਾਣੀ ਵਧੀਆ ਪੀਓ, 6) ਪੋਰਸ਼ਨ ਕੰਟਰੋਲ ਅਪਣਾਓ। ਨਿੱਜੀ ਸਲਾਹ ਲਈ ਕਿਸੇ ਪੋਸ਼ਣ ਵਿਸ਼ੇਸ਼ਗਿਆਰ ਨਾਲ ਮਿਲਣ ਬਾਰੇ ਸੋਚੋ।"
      }, language),
      category: 'wellness',
      urgency: 'low'
    };
  }

  if (lowerMessage.includes('exercise') || lowerMessage.includes('fitness')) {
    return {
      content: selectLocalizedText({
        en: "Regular exercise benefits: improves cardiovascular health, strengthens muscles and bones, enhances mental health, helps maintain healthy weight. Start slowly and gradually increase intensity. Consult a doctor before starting any new exercise program, especially if you have existing health conditions.",
        hi: "नियमित व्यायाम के फायदे: हृदय स्वास्थ्य में सुधार, मांसपेशियों और हड्डियों को मजबूत करना, मानसिक स्वास्थ्य बेहतर करना, वजन नियंत्रण में मदद करना। धीरे-धीरे शुरू करें और धीरे-धीरे तीव्रता बढ़ाएँ। यदि कोई स्वास्थ्य स्थिति है तो नया व्यायाम कार्यक्रम शुरू करने से पहले डॉक्टर से सलाह लें।",
        pa: "ਨਿਯਮਿਤ ਵਰਜ਼ਿਸ਼ ਦੇ ਫਾਇਦੇ: ਦਿਲ ਦੀ ਸਿਹਤ ਵਿੱਚ ਸੁਧਾਰ, ਮਾਸਪੇਸ਼ੀਆਂ ਅਤੇ ਹੱਡੀਆਂ ਨੂੰ ਮਜ਼ਬੂਤ ਕਰਨਾ, ਮਾਨਸਿਕ ਸਿਹਤ ਵਿੱਚ ਸੁਧਾਰ, ਸਿਹਤਮੰਦ ਵਜ਼ਨ ਬਣਾਈ ਰੱਖਣ ਵਿੱਚ ਮਦਦ। ਹੌਲੀ ਸ਼ੁਰੂ ਕਰੋ ਅਤੇ ਹੌਲੇ-ਹੌਲੇ ਤੀਬਰਤਾ ਵਧਾਓ। ਜੇ ਕੋਈ ਮੌਜੂਦਾ ਸਿਹਤ ਸਮੱਸਿਆ ਹੈ ਤਾਂ ਨਵਾਂ ਵਰਕਆਉਟ ਪ੍ਰੋਗਰਾਮ ਸ਼ੁਰੂ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲਵੋ।"
      }, language),
      category: 'wellness',
      urgency: 'low'
    };
  }
  
  // Default response
  return { 
    content: selectLocalizedText({
      en: "I understand your health concern. While I can provide general health information, it's important to consult with a qualified healthcare professional for personalized medical advice. Would you like me to help you book an appointment with one of our doctors through the platform?",
      hi: "मैं आपकी स्वास्थ्य चिंता समझता हूँ। मैं सामान्य जानकारी दे सकता हूँ, लेकिन व्यक्तिगत चिकित्सीय सलाह के लिए योग्य स्वास्थ्य विशेषज्ञ से मिलना ज़रूरी है। क्या आप चाहेंगे कि मैं हमारे प्लेटफॉर्म पर किसी डॉक्टर से अपॉइंटमेंट बुक करने में मदद करूँ?",
      pa: "ਮੈਂ ਤੁਹਾਡੀ ਸਿਹਤ ਚਿੰਤਾ ਨੂੰ ਸਮਝਦਾ ਹਾਂ। ਮੈਂ ਆਮ ਸਿਹਤ ਜਾਣਕਾਰੀ ਦੇ ਸਕਦਾ ਹਾਂ, ਪਰ ਨਿੱਜੀ ਡਾਕਟਰੀ ਸਲਾਹ ਲਈ ਯੋਗਤਾਪ੍ਰਾਪਤ ਸਿਹਤ ਮਾਹਿਰ ਨਾਲ ਮਿਲਣਾ ਮਹੱਤਵਪੂਰਨ ਹੈ। ਕੀ ਤੁਸੀਂ ਚਾਹੋਗੇ ਕਿ ਮੈਂ ਸਾਡੇ ਪਲੇਟਫਾਰਮ ਰਾਹੀਂ ਕਿਸੇ ਡਾਕਟਰ ਨਾਲ ਮਿਲਣ ਦਾ ਸਮਾਂ ਬੁੱਕ ਕਰਨ ਵਿੱਚ ਤੁਹਾਡੀ ਮਦਦ ਕਰਾਂ?"
    }, language), 
    category: 'general', 
    urgency: 'low' 
  };
}

function detectLanguage(text: string): SupportedLanguage {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const gurmukhiCount = (text.match(/[\u0A00-\u0A7F]/g) ?? []).length;
  const latinCount = (text.match(/[A-Za-z]/g) ?? []).length;

  const maxCount = Math.max(devanagariCount, gurmukhiCount, latinCount);

  if (maxCount === 0) {
    return 'en';
  }
  if (maxCount === devanagariCount) {
    return 'hi';
  }
  if (maxCount === gurmukhiCount) {
    return 'pa';
  }
  return 'en';
}

function selectLocalizedText(texts: { en: string; hi: string; pa: string }, language: SupportedLanguage): string {
  if (language === 'hi') return texts.hi;
  if (language === 'pa') return texts.pa;
  return texts.en;
}

function determineUrgency(userMessage: string, aiResponse: string): 'low' | 'medium' | 'high' | 'emergency' {
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();
  
  if (lowerMessage.includes('emergency') || lowerMessage.includes('chest pain') || 
      lowerMessage.includes('difficulty breathing') || lowerResponse.includes('emergency')) {
    return 'emergency';
  }
  
  if (lowerMessage.includes('severe') || lowerMessage.includes('high fever') || 
      lowerResponse.includes('seek immediate') || lowerResponse.includes('urgent')) {
    return 'high';
  }
  
  if (lowerMessage.includes('pain') || lowerMessage.includes('fever') || 
      lowerMessage.includes('headache') || lowerMessage.includes('cough')) {
    return 'medium';
  }
  
  return 'low';
}

function determineCategory(userMessage: string): ChatMessage['category'] {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('emergency') || lowerMessage.includes('chest pain') || 
      lowerMessage.includes('difficulty breathing')) {
    return 'emergency';
  }
  
  if (lowerMessage.includes('diet') || lowerMessage.includes('exercise') || 
      lowerMessage.includes('wellness') || lowerMessage.includes('fitness')) {
    return 'wellness';
  }
  
  if (lowerMessage.includes('pain') || lowerMessage.includes('fever') || 
      lowerMessage.includes('symptoms') || lowerMessage.includes('headache')) {
    return 'symptom';
  }
  
  return 'general';
}

// GET /api/chat - Get or create chat session
export async function GET(request: NextRequest) {
  try {
    // Hackathon-simple auth: decode UID from raw ID token stored in session cookie (no verification)
    const token = request.cookies.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parts = token.split('.');
    if (parts.length !== 3) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    const uid = payload.user_id || payload.uid || payload.sub;
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get or create active chat session
    let session = await chatService.getChatSession(uid);
    
    if (!session) {
      const sessionId = await chatService.createChatSession(uid);
      session = {
        id: sessionId,
        userId: uid,
        startedAt: new Date(),
        isActive: true,
        urgencyLevel: 'low'
      };
    }

    // Get messages for the session
    const messages = await chatService.getSessionMessages(session.id);

    return NextResponse.json({ 
      success: true, 
      data: { 
        session,
        messages 
      } 
    });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat session' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send message and get AI response
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parts = token.split('.');
    if (parts.length !== 3) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    const uid = payload.user_id || payload.uid || payload.sub;
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and session ID required' }, { status: 400 });
    }

    // Add user message
    const userMessage: Omit<ChatMessage, 'id'> = {
      userId: uid,
      type: 'user',
      content: message,
      timestamp: new Date(),
      category: 'general'
    };

    const userMessageId = await chatService.addMessage(sessionId, userMessage);

    // Generate AI response using Gemini or fallback
    const messages = await chatService.getSessionMessages(sessionId);
    const aiResponse = await getGeminiResponse(message, messages);
    
    const aiMessage: Omit<ChatMessage, 'id'> = {
      userId: uid,
      type: 'ai',
      content: aiResponse.content,
      timestamp: new Date(),
      category: aiResponse.category,
      confidence: 0.85, // Simulated confidence score
      suggestedActions: aiResponse.urgency === 'emergency' ? ['Call Emergency Services', 'Visit Hospital'] : 
                       aiResponse.urgency === 'high' ? ['Consult Doctor', 'Monitor Symptoms'] :
                       ['Rest', 'Stay Hydrated'],
      relatedSymptoms: aiResponse.category === 'symptom' ? ['fatigue', 'nausea', 'dizziness'] : []
    };

    const aiMessageId = await chatService.addMessage(sessionId, aiMessage);

    // Update session urgency level if needed
    if (aiResponse.urgency === 'emergency' || aiResponse.urgency === 'high') {
      // Update session urgency - we'd need to add this method to chatService
      // await chatService.updateSession(sessionId, { urgencyLevel: aiResponse.urgency });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        userMessage: { id: userMessageId, ...userMessage },
        aiMessage: { id: aiMessageId, ...aiMessage }
      }
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat - End chat session
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parts = token.split('.');
    if (parts.length !== 3) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as any;
    const uid = payload.user_id || payload.uid || payload.sub;
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await chatService.clearSession(sessionId, { userId: uid });

    const newSessionId = await chatService.createChatSession(uid);
    const nextSession = await chatService.getChatSession(uid);

    return NextResponse.json({
      success: true,
      data: {
        session: nextSession ?? {
          id: newSessionId,
          userId: uid,
          startedAt: new Date(),
          isActive: true,
          urgencyLevel: 'low'
        },
        messages: []
      }
    });
  } catch (error) {
    console.error('Error ending chat session:', error);
    return NextResponse.json(
      { error: 'Failed to end chat session' },
      { status: 500 }
    );
  }
}
