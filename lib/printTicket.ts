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

function buildIframePrint(body: string): void {
  const html = `<!DOCTYPE html>
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

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
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
    }, 1000);
  }, 300);
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
  printReceiptImage(lines);
}

function buildReceiptLines(data: ReceiptData): string[] {
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

function printReceiptImage(lines: string[]) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) { buildIframePrint(lines.join('\n')); return; }

  const fontSize = 12;
  const fontFamily = 'Courier New, Courier, monospace';
  ctx.font = fontSize + 'px ' + fontFamily;
  ctx.textBaseline = 'top';

  const charWidth = ctx.measureText('A').width;
  const lineHeight = fontSize * 1.3;
  const cols = 32;
  const width = charWidth * cols + 16;
  const height = lines.length * lineHeight + 12;

  canvas.width = Math.ceil(width * 2);
  canvas.height = Math.ceil(height * 2);
  canvas.style.width = Math.ceil(width) + 'px';
  canvas.style.height = Math.ceil(height) + 'px';

  ctx.scale(2, 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.font = fontSize + 'px ' + fontFamily;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 4, 4 + i * lineHeight);
  }

  const dataUrl = canvas.toDataURL('image/png');

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket - MASA</title><style>@page{margin:0;size:80mm 297mm;}*{margin:0;padding:0;}body{text-align:center;}img{width:72mm;height:auto;}</style></head><body><img src="' + dataUrl + '" /></body></html>';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
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
    }, 1000);
  }, 300);
}
