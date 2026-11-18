import { NextResponse } from "next/server";
import { sessionToken } from "@/auth/session";
import { backendFile, ApiError } from "@/services/backend";

// Muestra la foto con cédula o el certificado de una solicitud de identidad.
// El backend comprueba que la sesión sea de un administrador activo.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  const { id, kind } = await context.params;
  if (!/^[a-zA-Z0-9-]+$/.test(id) || !["foto", "certificado"].includes(kind))
    return NextResponse.json(
      { message: "Documento no disponible." },
      { status: 404 },
    );
  const token = await sessionToken();
  if (!token)
    return NextResponse.json({ message: "Inicia sesión." }, { status: 401 });
  try {
    const file = await backendFile(
      `/admin/identities/${id}/documents/${kind}`,
      token,
    );
    return new Response(file.body, {
      headers: {
        "Content-Type": file.type,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof ApiError
            ? error.message
            : "No se pudo abrir el documento.",
      },
      { status: error instanceof ApiError ? error.status : 400 },
    );
  }
}
