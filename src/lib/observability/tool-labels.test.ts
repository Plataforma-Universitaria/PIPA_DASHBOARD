import { describe, expect, it } from "vitest";
import { formatToolLabel } from "./tool-labels";

describe("rótulos do provedor", () => {
  it("usa o texto recebido da API, inclusive quando o provedor o altera", () => {
    const name = "obter_as_notas_de_uma_disciplina";
    expect(formatToolLabel(name, { [name]: "Obter as notas de uma disciplina" })).toBe("Obter as notas de uma disciplina");
    expect(formatToolLabel(name, { [name]: "Novo rótulo definido pelo provedor" })).toBe("Novo rótulo definido pelo provedor");
  });
  it("preserva o identificador quando não há rótulo fornecido", () => {
    expect(formatToolLabel("nova_ferramenta")).toBe("nova_ferramenta");
  });
});
