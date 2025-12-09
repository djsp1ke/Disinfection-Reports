
import { GoogleGenAI, Type } from "@google/genai";
import { ReportData } from "../types";

export const generateReportAnalysis = async (data: ReportData) => {
  // Use the specific variable user configured in Netlify (GEMINI_API_KEY)
  // Fallback to API_KEY if available.
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    console.error("API Key is missing. Please set GEMINI_API_KEY in your Netlify environment variables.");
    // We proceed to attempt initialization, which might fail inside the SDK if key is empty,
    // but this allows the UI to handle the error state naturally via the try/catch block below.
  }

  // Initialize the client inside the function to ensure we use the current API key
  const ai = new GoogleGenAI({ apiKey: apiKey || '' });

  const tankInfo = data.tanks && data.tanks.length > 0 
    ? data.tanks.map(t => `${t.description} (${t.capacity}) in ${t.location}`).join(', ')
    : "Cold Water Storage Tank";

  const prompt = `
    You are a professional Water Compliance Administrator writing a formal "Scope of Works" for a Disinfection Report.
    
    Current Job Type: ${data.jobType} Disinfection.

    Using the data below, write a professional narrative description of the works carried out. 
    
    If Job Type is "Pipework":
    Match the tone of this example: 
    "Water Compliance Services were commissioned by [Client Name] to complete a disinfection of the newly installed hot and cold copper pipework within [Site Name], situated at [Address]. The works were carried out to HSG 274 Part 2, BS8558 and PD855468:2015 specifications. [Disinfectant] was used as the disinfectant agent at a concentration of [Concentration] for a retention period of [Time]. The solution was introduced at the designated injection point located [Injection Point]. The disinfection agent was pumped through to all associated hot and cold water outlets. The disinfection solution was left in the system for a period of [Time] with level checks performed at the initial, 30 minutes and completion of the works. Upon completion of the retention period, the disinfectant, along with observed contaminants, was thoroughly flushed from the hot and cold-water pipework."

    If Job Type is "Tank":
    Adjust the narrative to reflect the cleaning and disinfection of the following tanks: ${tankInfo}.
    Mention the tanks were isolated, drained, physically cleaned, and then disinfected using [Disinfectant] at [Concentration] for [Time]. Mention that the system was flushed and refilled upon completion.

    JOB DATA:
    Client Commissioned By: ${data.commissionedBy}
    Client Company: ${data.clientName}
    Site Name: ${data.siteName}
    Site Address: ${data.siteAddress}
    
    Disinfectant: ${data.disinfectant}
    Concentration: ${data.concentrationTarget}
    Contact Time: ${data.contactTime}
    Amount Added: ${data.amountAdded}
    System Volume: ${data.systemVolume}
    Injection Point: ${data.injectionPoint}
    Pre-Flush: ${data.preFlushDuration}
    Neutralisation: ${data.neutralisingAgent}

    Also provide a short "Comments and Recommendations" section. Example: "The small CAT5 tank in the large storage area had no power... All works completed, thank you." If no specific issues are noted in the data provided below, just say "All works completed successfully. Post disinfection samples were taken."

    Output structured JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scopeOfWorks: { type: Type.STRING, description: "The narrative paragraph for section 2 Scope of Works." },
            comments: { type: Type.STRING, description: "Short comments for section 8." }
          },
          required: ["scopeOfWorks", "comments"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
