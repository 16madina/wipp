import qrcode from "qrcode-generator";

export function qrGrid(value: string, _n = 29): boolean[][] {
  const qr = qrcode(0, "H");
  qr.addData(value, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}
