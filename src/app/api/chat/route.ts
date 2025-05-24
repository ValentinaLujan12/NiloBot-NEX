import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

const TABLES = [
  "employees(id, full_name, email, employee_position_id, status)",
  "employee_contracts(id, employee_id, type, salary, start_date, end_date, status)",
  "contract_salary_history(employee_contract_id, salary, start_date, end_date)",
  "payrolls(id, start_date, end_date, total_payment)",
  "payroll_details(id, payroll_id, employee_id, worked_days, incomes_total, deductions_total, total, overtime_surcharge_hours)",
  "payroll_consolidated(employee_id, worked_days, incomes_total, deductions_total, total, start_date, end_date)",
  "payments(id, contact_id, total, document_date)",
  "documents(id, contact_id, total, document_date, pending, document_type_id, document_status_id)",
  "contacts(id, full_name, client, provider)",
  "items(id, name, total)",
];

export async function POST(req: NextRequest) {
  try {
    const { prompt, mode } = await req.json();
    if (!prompt || prompt.trim() === "") {
      return NextResponse.json({ result: "⚠️ Debes escribir una pregunta." });
    }

    const finalMode = mode === "SQL" ? "SQL" : "CHAT";
    console.log("🟢 Prompt recibido:", prompt);
    console.log("📌 Modo:", finalMode);

    if (finalMode === "CHAT") return await fallbackChat(prompt);

    const sql = await generateSQL(prompt);
    if (!sql) {
      console.log("❌ SQL no generada");
      return await fallbackChat(prompt);
    }

    console.log("✅ Consulta generada:", sql);
    const [rows] = await db.query(sql);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ result: "🔍 No se encontraron resultados.", query: sql });
    }

    const resumen = formatResultForHumans(rows.slice(0, 3));
    const message = await explainResults(prompt, resumen);

    return NextResponse.json({ result: message, query: sql });

  } catch (error: any) {
    console.error("❌ Error general:", error);
    return NextResponse.json({ result: `❌ Error interno: ${error.message}` });
  }
}

// 🧠 Convierte un array de objetos en texto natural
function formatResultForHumans(rows: any[]): string {
  if (!rows || rows.length === 0) return "No se encontraron resultados.";
  return rows
    .map((row, index) => {
      const entries = Object.entries(row)
        .map(([key, value]) => {
          const label = key.replace(/_/g, " ");
          const val = typeof value === "number"
            ? new Intl.NumberFormat("es-CO").format(value)
            : value;
          return `${label}: ${val}`;
        })
        .join(", ");
      return `Resultado ${index + 1}: ${entries}`;
    })
    .join("\n");
}

// 🔧 Generador de SQL
async function generateSQL(prompt: string): Promise<string | null> {
  const sqlPrompt = `
Eres un generador de SQL. Responde siempre con UNA sola línea de SQL válida y ejecutable, que comience con SELECT y termine en punto y coma (;).

Puedes usar exclusivamente estas tablas y columnas:
${TABLES.join(", ")}

✅ Tu respuesta debe ser solo una consulta SQL.
❌ No agregues explicaciones, contexto ni encabezados.
❌ No inventes nombres de columnas o tablas.
❌ No uses comentarios ni saltos de línea.

Pregunta: "${prompt}"
`.trim();

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: sqlPrompt }],
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const match = content.match(/select[\s\S]*?;/i);
    return match ? match[0] : null;

  } catch (error) {
    console.error("❌ Error al generar SQL:", error);
    return null;
  }
}

// 💬 Fallback si no se puede generar SQL
async function fallbackChat(prompt: string) {
  console.log("🔄 Fallback a modo conversacional");

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          {
            role: "system",
            content: "Eres NILO, un asistente cálido y amigable. Responde en español con claridad y cercanía. Si la pregunta requiere acceso a datos, informa que no puedes obtenerlos sin una base de datos válida.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({ result: "¡Hola! ¿En qué puedo ayudarte?" });
    }

    return NextResponse.json({ result: content });

  } catch (error) {
    console.error("❌ Error en fallbackChat:", error);
    return NextResponse.json({ result: "❌ No fue posible responder. Intenta más tarde." });
  }
}

// 🧾 Explicación natural
async function explainResults(prompt: string, resumen: string): Promise<string> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openchat/openchat-3.5:free",
        messages: [
          {
            role: "system",
            content: `
Eres NILO, un asistente cálido y profesional que ayuda a los usuarios a entender resultados de bases de datos.

Tu tarea es:
- Leer el resultado de una consulta SQL.
- Explicarlo en español claro, con lenguaje cercano, sin tecnicismos.
- Usar el contexto de la pregunta del usuario para personalizar la respuesta.

No repitas los datos como JSON. Solo explica lo que significan.
          `.trim(),
          },
          {
            role: "user",
            content: `
Pregunta del usuario: ${prompt}

Resultado obtenido desde la base de datos:
${resumen}

¿Puedes explicarlo de forma comprensible para el usuario?
          `.trim(),
          },
        ],
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || resumen;

  } catch (error) {
    console.error("❌ Error al explicar resultados:", error);
    return resumen;
  }
}
