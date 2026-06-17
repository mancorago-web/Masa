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

export function printTicket(data: TicketData) {
  const now = new Date().toLocaleString('es-PE', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  let body = '';
  body += '================================\n';
  body += '         MASA PIZZERÍA\n';
  body += '================================\n';
  body += '\n';
  body += `Mesa: ${data.tableName}\n`;
  if (data.round && data.round > 1) body += `Pedido: #${data.round}\n`;
  body += '\n';
  body += '--------------------------------\n';
  for (const item of data.items) {
    body += `${item.quantity}x ${item.name}\n`;
  }
  body += '--------------------------------\n';
  body += '\n';
  body += `${now}\n`;
  body += '================================\n';
  body += '  ¡Gracias por su preferencia!\n';
  body += '================================\n';
  body += '\n\n\n';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket - MASA</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      width: 72mm;
      margin: 0 auto;
      padding: 8px 4px;
      white-space: pre-wrap;
      line-height: 1.4;
    }
    @media print {
      body { width: 72mm; }
    }
  </style>
</head>
<body>${body}</body>
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
