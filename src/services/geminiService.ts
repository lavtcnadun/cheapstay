import { GoogleGenAI } from "@google/genai";
import { Stay } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getStayInsights(stay: Stay) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this accommodation and provide a short, punchy "AI Deal Insight" (max 2 sentences). 
      Focus on why it's a good value for the price.
      
      Stay Name: ${stay.name}
      Location: ${stay.location}
      Price: Rs. ${stay.price}/night
      Rating: ${stay.rating}/5
      Type: ${stay.type}
      Amenities: ${stay.amenities.join(', ')}
      Description: ${stay.description}`,
      config: {
        systemInstruction: "You are a savvy travel expert who finds the best value deals. Your tone is helpful, modern, and concise.",
      }
    });

    return response.text || "Great value for this location and rating!";
  } catch (error) {
    console.error("Error getting stay insights:", error);
    return "This stay offers excellent amenities for its price point.";
  }
}

export async function getTravelAdvice(query: string, currentStays: Stay[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is asking: "${query}"
      
      Here are some available stays:
      ${currentStays.map(s => `- ${s.name} in ${s.location} (Rs. ${s.price}/night, ${s.rating} stars)`).join('\n')}
      
      Provide a helpful, concise recommendation based on their query and these options.`,
      config: {
        systemInstruction: "You are CheapStay AI, a helpful travel assistant focused on Sri Lanka. Help users find the best budget accommodation from the provided list.",
      }
    });

    return response.text || "I recommend checking out the options above for the best deals!";
  } catch (error) {
    console.error("Error getting travel advice:", error);
    return "I'm having trouble connecting to my travel database, but Ella and Mirissa are usually great for budget stays in Sri Lanka!";
  }
}
