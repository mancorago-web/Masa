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
  const now = new Date().toLocaleString('es-PE', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const col1 = 24;
  const col2 = 8;

  let body = '';
  body += '='.repeat(32) + '\n';
  body += '        MASA PIZZERIA\n';
  body += '      Comprobante de Venta\n';
  body += '='.repeat(32) + '\n';
  body += '\n';
  body += 'Mesa: ' + data.tableName + '\n';
  body += 'Fecha: ' + now + '\n';
  body += '\n';
  body += '-'.repeat(32) + '\n';
  body += 'Cant  Producto            Importe\n';
  body += '-'.repeat(32) + '\n';
  for (const item of data.items) {
    const line = item.quantity + 'x ' + item.name;
    const priceStr = 'S/ ' + (item.quantity * item.unitPrice).toFixed(2);
    const padded = line.padEnd(col1, ' ').slice(0, col1);
    body += padded + priceStr.padStart(col2) + '\n';
  }
  body += '-'.repeat(32) + '\n';
  body += 'SUBTOTAL'.padEnd(col1) + ('S/ ' + subtotal.toFixed(2)).padStart(col2) + '\n';
  body += '='.repeat(32) + '\n';
  body += '\n';
  body += 'Total:'.padEnd(col1) + ('S/ ' + subtotal.toFixed(2)).padStart(col2) + '\n';
  body += '\n';
  body += '='.repeat(32) + '\n';
  body += '  Gracias por su preferencia!\n';
  body += '='.repeat(32) + '\n';
  body += '\n\n\n';

  buildIframePrint(body);
}

export function printReceiptText(data: ReceiptData) {
  const now = new Date().toLocaleString('es-PE', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const col1 = 24;
  const col2 = 8;

  let text = '';
  text += '='.repeat(32) + '\n';
  text += '        MASA PIZZERIA\n';
  text += '      Comprobante de Venta\n';
  text += '='.repeat(32) + '\n';
  text += '\n';
  text += 'Mesa: ' + data.tableName + '\n';
  text += 'Fecha: ' + now + '\n';
  text += '\n';
  text += '-'.repeat(32) + '\n';
  text += 'Cant  Producto            Importe\n';
  text += '-'.repeat(32) + '\n';
  for (const item of data.items) {
    const line = item.quantity + 'x ' + item.name;
    const priceStr = 'S/ ' + (item.quantity * item.unitPrice).toFixed(2);
    const padded = line.padEnd(col1, ' ').slice(0, col1);
    text += padded + priceStr.padStart(col2) + '\n';
  }
  text += '-'.repeat(32) + '\n';
  text += 'SUBTOTAL'.padEnd(col1) + ('S/ ' + subtotal.toFixed(2)).padStart(col2) + '\n';
  text += '='.repeat(32) + '\n';
  text += '\n';
  text += 'Total:'.padEnd(col1) + ('S/ ' + subtotal.toFixed(2)).padStart(col2) + '\n';
  text += '\n';
  text += '='.repeat(32) + '\n';
  text += '  Gracias por su preferencia!\n';
  text += '='.repeat(32) + '\n';
  text += '\n\n\n';

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    // Fallback: try navigator share
    if (navigator.share) {
      navigator.share({ title: 'Ticket MASA', text }).catch(() => {});
    }
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
