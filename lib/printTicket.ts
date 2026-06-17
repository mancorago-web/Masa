import { isConnected, printTicketSerial } from "./thermalSerial";

export interface TicketItem {
  name: string;
  quantity: number;
}

export interface TicketData {
  tableName: string;
  round?: number;
  items: TicketItem[];
  date: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ReceiptData {
  tableName: string;
  items: ReceiptItem[];
}

function getReceiptHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket - MASA</title>
  <style>
    @page { margin: 0; size: 80mm 297mm; }
    * { margin: 0; padding: 0; }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.15;
      width: 72mm;
      margin: 0 auto;
      padding: 4px 2px;
      white-space: pre;
    }
    @media print {
      pre { width: 72mm; }
      @page { margin: 0; size: 80mm 297mm; }
    }
  </style>
</head>
<body><pre>${body}</pre></body>
</html>`;
}

function buildIframePrint(body: string): void {
  const html = getReceiptHtml(body);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 500);
}

export async function printTicket(data: TicketData) {
  if (isConnected()) {
    try {
      await printTicketSerial(data.tableName, data.round, data.items);
      return;
    } catch {}
  }

  const now = new Date().toLocaleString('es-PE', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  let body = '';
  body += '='.repeat(32) + '\n';
  body += '         MASA PIZZERÍA\n';
  body += '='.repeat(32) + '\n';
  body += '\n';
  body += `Mesa: ${data.tableName}\n`;
  if (data.round && data.round > 1) body += `Pedido: #${data.round}\n`;
  body += '\n';
  body += '-'.repeat(32) + '\n';
  for (const item of data.items) {
    body += `${item.quantity}x ${item.name}\n`;
  }
  body += '-'.repeat(32) + '\n';
  body += '\n';
  body += `${now}\n`;
  body += '='.repeat(32) + '\n';
  body += '  ¡Gracias por su preferencia!\n';
  body += '='.repeat(32) + '\n';
  body += '\n\n\n';

  buildIframePrint(body);
}

export function printReceipt(data: ReceiptData) {
  const lines = buildReceiptLines(data);
  buildIframePrint(lines.join('\n'));
}

export function showReceiptPopup(data: ReceiptData) {
  const lines = buildReceiptLines(data);
  const body = lines.join('\n');
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante - MASA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; padding: 16px; max-width: 400px; margin: 0 auto; }
    pre { font-size: 12px; line-height: 1.3; white-space: pre; }
    .btn { display: block; width: 100%; padding: 14px; margin: 12px 0; font-size: 18px; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; text-align: center; }
    .btn-print { background: #2563eb; color: white; }
    .btn-close { background: #6b7280; color: white; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <pre>${body}</pre>
  <button class="btn btn-print no-print" onclick="window.print()">Imprimir</button>
  <button class="btn btn-close no-print" onclick="window.close()">Cerrar</button>
</body>
</html>`;
  const w = window.open('', '_blank', 'width=400,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
}

export async function shareReceipt(data: ReceiptData) {
  const lines = buildReceiptLines(data);
  const text = lines.join('\n');
  if (navigator.share) {
    await navigator.share({ title: 'Comprobante - MASA', text });
  } else {
    showReceiptPopup(data);
  }
}

export function buildReceiptLines(data: ReceiptData): string[] {
  const now = new Date().toLocaleString('es-PE', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const col1 = 24;
  const col2 = 8;
  const lines: string[] = [];

  lines.push('='.repeat(32));
  lines.push('        MASA PIZZERIA');
  lines.push('      Comprobante de Venta');
  lines.push('='.repeat(32));
  lines.push('');
  lines.push('Mesa: ' + data.tableName);
  lines.push('Fecha: ' + now);
  lines.push('');
  lines.push('-'.repeat(32));
  lines.push('Cant  Producto            Importe');
  lines.push('-'.repeat(32));
  for (const item of data.items) {
    const line = item.quantity + 'x ' + item.name;
    const priceStr = 'S/ ' + (item.quantity * item.unitPrice).toFixed(2);
    const padded = line.padEnd(col1, ' ').slice(0, col1);
    lines.push(padded + priceStr.padStart(col2));
  }
  lines.push('-'.repeat(32));
  lines.push('SUBTOTAL'.padEnd(col1) + ('S/ ' + subtotal.toFixed(2)).padStart(col2));
  lines.push('='.repeat(32));
  lines.push('');
  lines.push('Total:'.padEnd(col1) + ('S/ ' + subtotal.toFixed(2)).padStart(col2));
  lines.push('');
  lines.push('='.repeat(32));
  lines.push('  Gracias por su preferencia!');
  lines.push('='.repeat(32));
  lines.push('');
  lines.push('');
  lines.push('');

  return lines;
}
