// O provedor é a fonte dos rótulos; sem metadados, preserva o identificador original.
export function formatToolLabel(toolName: string, labels: Record<string, string> = {}): string {
  return Object.hasOwn(labels, toolName) ? labels[toolName] : toolName;
}
