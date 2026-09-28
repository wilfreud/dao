import { QrCode } from "lucide-react";
import type { ToolManifest } from "../../contracts/tools";

export const qrGeneratorManifest: ToolManifest = Object.freeze({
  id: "qr-generator",
  route: "/tools/qr-generator",
  name: "QR Generator",
  description: "Generate and copy QR codes locally from text or URLs.",
  category: "developer",
  icon: QrCode,
  search: {
    aliases: [
      "qr",
      "qr code",
      "barcode",
      "link qr",
      "url qr",
      "text qr",
      "qrcode",
    ],
    intents: [
      "make qr",
      "make a qr code",
      "qr url",
      "turn link into qr",
      "turn this url into a qr",
      "generate qr from text",
      "create qr code",
    ],
    examples: [
      "make qr",
      "make a qr code",
      "turn this url into a qr",
      "generate qr from text",
      "qr url",
    ],
  },
});
