import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("La variable de entorno API_KEY no está configurada");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const buildPrompt = (
    studentName: string,
    instructions: string,
    rubric: string,
    submission: string
): string => {
  return `
    **Rol:** Eres un evaluador académico experto. Tu tarea es proporcionar retroalimentación constructiva, profesional y equilibrada sobre la tarea de un estudiante.

    **Pautas de Tono:**
    - Profesional y diplomático.
    - Asertivo pero no severo.
    - Enfócate en guiar el aprendizaje del estudiante sin causar desmotivación.
    - Evita elogios vacíos o innecesarios. Sé específico en tu retroalimentación.
    - Todo el resultado DEBE estar en formato markdown y en español.

    **Datos de Entrada:**
    - **Nombre del Alumno:** ${studentName}
    - **Consigna de la Tarea:**
      \`\`\`
      ${instructions}
      \`\`\`
    - **Rúbrica de Evaluación:**
      \`\`\`
      ${rubric}
      \`\`\`
    - **Entrega del Alumno:**
      \`\`\`
      ${submission}
      \`\`\`

    **Tarea:**
    Basado en toda la información proporcionada, genera un informe de evaluación detallado para el estudiante. El informe debe seguir estrictamente esta estructura y estar formateado en markdown:

    ---

    ### Informe de Evaluación para ${studentName}

    #### 1. Criterios Cumplidos
    *Enumera los puntos específicos de la rúbrica y la consigna que el estudiante cumplió con éxito. Proporciona breves ejemplos o justificaciones de la entrega.*
    - Punto 1
    - Punto 2
    ...

    #### 2. Áreas de Mejora
    *Detalla los aspectos que no se cumplieron, se cumplieron parcialmente o podrían mejorarse significativamente. Para cada punto, explica por qué es un problema y proporciona sugerencias específicas y accionables. Refiérete directamente a la entrega del estudiante cuando sea posible.*
    - Punto 1
    - Punto 2
    ...

    #### 3. Calificación Final
    *Proporciona una calificación, puntaje o nivel de desempeño claro (p. ej., "Excelente", "Necesita Mejorar") basado estrictamente en la rúbrica proporcionada. Justifica brevemente la calificación final resumiendo las fortalezas y debilidades clave.*

    #### 4. Comentarios Generales y Recomendaciones
    *Proporciona un resumen conciso del trabajo y ofrece consejos a futuro. Sugiere en qué debería centrarse el estudiante para futuras tareas.*
  `;
};

export const generateReport = async (
  studentName: string,
  instructions: string,
  rubric: string,
  submission: string
): Promise<string> => {
  if (!studentName || !instructions || !rubric || !submission) {
    throw new Error("Todos los campos (nombre del alumno, consigna, rúbrica y entrega) son obligatorios.");
  }

  const model = 'gemini-2.5-pro';
  const prompt = buildPrompt(studentName, instructions, rubric, submission);

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Error al generar el informe desde la API de Gemini:", error);
    throw new Error("El servicio de IA no pudo generar un informe. Por favor, revisa tu conexión y tu clave de API.");
  }
};