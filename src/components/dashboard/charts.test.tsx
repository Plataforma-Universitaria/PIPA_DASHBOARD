import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChannelChart, DailyTrendChart, StatusChart, ToolUsageChart } from "./charts";

describe("estados vazios dos gráficos", () => {
  it("não fabrica séries quando a API devolve listas vazias", () => {
    render(<><ToolUsageChart data={[]} /><DailyTrendChart data={[]} /><StatusChart data={[]} successRate={null} /><ChannelChart data={[]} /></>);
    expect(screen.getAllByText("Não há dados para os filtros selecionados.")).toHaveLength(4);
  });
});
