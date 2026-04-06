import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

export interface ParkingLocation {
  facilityId: string;
  facilityName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  totalSpaces: number;
  availableSpaces: number;
  pricePerHour: number;
}

export interface ScoredParkingLocation extends ParkingLocation {
  score: number;
  recommendationReason: string;
}

export async function rankParkingFacilities(
  userLat: number,
  userLong: number,
  facilities: ParkingLocation[]
): Promise<ScoredParkingLocation[]> {
  if (facilities.length === 0) return [];

  const ai = getAiClient();

  const prompt = `
    You are an AI parking recommendation engine for ParkWise.
    Your task is to rank the following parking facilities based on:
    1. Distance from the user (user is at ${userLat}, ${userLong}).
    2. Price per hour (lower is better).
    3. Availability (more spaces is better).
    4. Traffic congestion (assume a random level for now, or use the facility status).

    Facilities:
    ${facilities.map(f => `
      - ID: ${f.facilityId}
        Name: ${f.facilityName}
        Location: ${f.latitude}, ${f.longitude}
        Price: ${f.pricePerHour} ETB/hr
        Available: ${f.availableSpaces}/${f.totalSpaces}
        Status: ${f.status}
    `).join('\n')}

    Return a JSON array of objects, each containing:
    - facilityId: string
    - score: number (0 to 100, where 100 is the best)
    - recommendationReason: string (a short, catchy reason why this is a good choice)

    Sort the array by score in descending order.
  `;

  try {
    if (!ai) {
      throw new Error("Missing VITE_GEMINI_API_KEY");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const results = JSON.parse(response.text || "[]");
    
    return facilities.map(f => {
      const result = results.find((r: any) => r.facilityId === f.facilityId);
      return {
        ...f,
        score: result?.score || 0,
        recommendationReason: result?.recommendationReason || "Good option nearby."
      };
    }).sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error("AI Ranking failed:", error);
    // Fallback: simple distance-based ranking
    return facilities.map(f => {
      const dist = Math.sqrt(Math.pow(f.latitude - userLat, 2) + Math.pow(f.longitude - userLong, 2));
      return {
        ...f,
        score: 100 - (dist * 1000), // Very crude distance score
        recommendationReason: "Recommended based on distance."
      };
    }).sort((a, b) => b.score - a.score);
  }
}
