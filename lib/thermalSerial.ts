let port: SerialPort | null = null;
let writer: WritableStreamDefaultWriter | null = null;

function escpos(bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

function text(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

export function isSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export async function connectSerial(): Promise<boolean> {
  if (!isSerialSupported()) return false;
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    writer = port.writable?.getWriter() ?? null;
    return writer !== null;
  } catch {
    return false;
  }
}

export function isConnected(): boolean {
  return writer !== null;
}

export async function disconnectSerial(): Promise<void> {
  try {
    if (writer) { writer.releaseLock(); writer = null; }
    if (port) { await port.close(); port = null; }
  } catch {}
}

async function write(data: Uint8Array): Promise<void> {
  if (!writer) throw new Error('Printer not connected');
  await writer.write(data);
}

export async function printTicketSerial(
  tableName: string,
  round: number | undefined,
  items: { name: string; quantity: number }[]
): Promise<void> {
  const now = new Date().toLocaleString('es-PE', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const center = escpos([0x1B, 0x61, 0x01]);
  const left = escpos([0x1B, 0x61, 0x00]);
  const boldOn = escpos([0x1B, 0x45, 0x01]);
  const boldOff = escpos([0x1B, 0x45, 0x00]);
  const lf = escpos([0x0A]);
  const init = escpos([0x1B, 0x40]);
  const cut = escpos([0x1D, 0x56, 0x01]);
  const underline = escpos([0x1B, 0x2D, 0x01]);
  const underlineOff = escpos([0x1B, 0x2D, 0x00]);

  let data: Uint8Array[] = [init, center, boldOn, text('MASA PIZZERIA\n'), boldOff];

  data.push(text('='.repeat(24) + '\n'));
  data.push(escpos([0x0A]));
  data.push(left, boldOn, text(`Mesa: ${tableName}\n`), boldOff);
  if (round && round > 1) data.push(text(`Pedido: #${round}\n`));
  data.push(escpos([0x0A]));
  data.push(text('-'.repeat(24) + '\n'));

  for (const item of items) {
    data.push(text(`${item.quantity}x ${item.name}\n`));
  }

  data.push(text('-'.repeat(24) + '\n'));
  data.push(escpos([0x0A]));
  data.push(center, text(now + '\n'));
  data.push(text('='.repeat(24) + '\n'));
  data.push(boldOn, text('Gracias por su preferencia!\n'), boldOff);
  data.push(text('='.repeat(24) + '\n'));
  data.push(lf, lf, lf, cut);

  const combined = new Uint8Array(
    data.reduce((acc, arr) => acc + arr.length, 0)
  );
  let offset = 0;
  for (const arr of data) {
    combined.set(arr, offset);
    offset += arr.length;
  }

  await write(combined);
}
