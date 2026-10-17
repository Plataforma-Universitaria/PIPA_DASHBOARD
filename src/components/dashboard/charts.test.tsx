import { render, screen, within } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChannelChart, DailyTrendChart, StatusChart, ToolUsageChart } from "./charts";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    // JSDOM não mede dimensões; mantém os gráficos reais com um tamanho explícito.
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width: number; height: number }> }) => cloneElement(children, { width: 1000, height: 600 }),
  };
});

describe("estados vazios dos gráficos", () => {
  it("não fabrica séries quando a API devolve listas vazias", () => {
    render(<><ToolUsageChart data={[]} /><DailyTrendChart data={[]} /><StatusChart data={[]} successRate={null} /><ChannelChart data={[]} /></>);
    expect(screen.getAllByText("Não há dados para os filtros selecionados.")).toHaveLength(4);
  });

  it("usa rótulos do provedor na tabela sem alterar os dados recebidos", () => {
    const data = [{ toolName: "receber_a_declaracao_de_vinculo_por_email", requests: 12 },
      { toolName: "obter_as_notas_de_uma_disciplina", requests: 5 }];
    render(<ToolUsageChart data={data} toolLabels={{ receber_a_declaracao_de_vinculo_por_email: "Receber a declaração de vínculo por email", obter_as_notas_de_uma_disciplina: "Obter as notas de uma disciplina" }} />);
    const table = screen.getByRole("table", { name: "Top 10 ferramentas por número de requisições" });
    expect(within(table).getByText("Receber a declaração de vínculo por email").closest("tr")).toHaveTextContent("12");
    expect(within(table).getByText("Obter as notas de uma disciplina").closest("tr")).toHaveTextContent("5");
    expect(data[0].toolName).toBe("receber_a_declaracao_de_vinculo_por_email");
  });
});
