/**
 * Prepared waste samples for CampusPulse (last resort in ladder or forced in sample mode).
 *
 * Covers all 7 categories:
 * - wet_biodegradable (green bin)
 * - paper_cardboard (blue bin)
 * - plastic (blue bin)
 * - metal_glass (blue bin)
 * - e_waste (red bin)
 * - hazardous (red bin)
 * - other_residual (black bin)
 */
import {
  type Classification,
  ClassificationSchema,
  type WasteCategory,
} from "../contract";

export interface PreparedSampleItem {
  id: string;
  name: string;
  category: WasteCategory;
  classification: Classification;
  thumb: string;
}

// 160x160 SVG thumbnail data URLs for crisp, lightweight, zero-dependency rendering
const makeSvgThumb = (color: string, label: string, iconText: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="16" fill="#18181B"/>
      <circle cx="80" cy="70" r="44" fill="${color}" fill-opacity="0.2"/>
      <circle cx="80" cy="70" r="36" fill="${color}" fill-opacity="0.35"/>
      <text x="80" y="78" font-size="28" text-anchor="middle" fill="#FFFFFF">${iconText}</text>
      <rect x="16" y="124" width="128" height="22" rx="6" fill="#27272A"/>
      <text x="80" y="139" font-family="system-ui, sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#E4E4E7">${label}</text>
    </svg>`,
  )}`;

export const SAMPLE_ITEMS: PreparedSampleItem[] = [
  {
    id: "sample-apple-core",
    name: "Apple Core",
    category: "wet_biodegradable",
    thumb: makeSvgThumb("#2E9E5B", "Wet: Apple Core", "🍏"),
    classification: {
      is_waste_item: true,
      item_name: "Apple core",
      category: "wet_biodegradable",
      confidence: 0.95,
      disposal_tip: "Compost or discard in green wet waste bin.",
      reason: "Organic fruit residue that decomposes naturally into compost.",
    },
  },
  {
    id: "sample-cardboard-box",
    name: "Cardboard Packaging",
    category: "paper_cardboard",
    thumb: makeSvgThumb("#2F6FEB", "Paper: Cardboard", "📦"),
    classification: {
      is_waste_item: true,
      item_name: "Cardboard packaging box",
      category: "paper_cardboard",
      confidence: 0.93,
      disposal_tip: "Flatten and discard in blue dry recyclables bin.",
      reason: "Clean dry corrugated paper fibre suitable for pulp recycling.",
    },
  },
  {
    id: "sample-plastic-bottle",
    name: "Crushed PET Bottle",
    category: "plastic",
    thumb: makeSvgThumb("#2F6FEB", "Plastic: Bottle", "🍶"),
    classification: {
      is_waste_item: true,
      item_name: "Plastic water bottle",
      category: "plastic",
      confidence: 0.96,
      disposal_tip: "Empty remaining liquid and place in blue bin.",
      reason: "Recyclable clear polyethylene terephthalate (PET) plastic.",
    },
  },
  {
    id: "sample-metal-can",
    name: "Aluminium Drink Can",
    category: "metal_glass",
    thumb: makeSvgThumb("#2F6FEB", "Metal: Beverage Can", "🥫"),
    classification: {
      is_waste_item: true,
      item_name: "Aluminium beverage can",
      category: "metal_glass",
      confidence: 0.94,
      disposal_tip: "Rinse lightly and discard in blue dry recyclables bin.",
      reason: "Infinitely recyclable aluminium metal container.",
    },
  },
  {
    id: "sample-aa-battery",
    name: "Alkaline AA Battery",
    category: "e_waste",
    thumb: makeSvgThumb("#D64545", "E-Waste: Battery", "🔋"),
    classification: {
      is_waste_item: true,
      item_name: "AA battery cell",
      category: "e_waste",
      confidence: 0.91,
      disposal_tip: "Deposit in red bin or specialized e-waste collection kiosk.",
      reason: "Contains heavy metals and electrolytes requiring safe electronic recycling.",
    },
  },
  {
    id: "sample-tube-light",
    name: "Fluorescent Tube",
    category: "hazardous",
    thumb: makeSvgThumb("#D64545", "Hazardous: Fluorescent", "💡"),
    classification: {
      is_waste_item: true,
      item_name: "Fluorescent lamp tube",
      category: "hazardous",
      confidence: 0.92,
      disposal_tip: "Handle with extreme care and place in red hazardous waste bin.",
      reason: "Contains hazardous mercury powder requiring controlled handling.",
    },
  },
  {
    id: "sample-thermocol-tray",
    name: "Thermocol Plate",
    category: "other_residual",
    thumb: makeSvgThumb("#52525B", "Residual: Thermocol", "🍽️"),
    classification: {
      is_waste_item: true,
      item_name: "Used thermocol meal tray",
      category: "other_residual",
      confidence: 0.89,
      disposal_tip: "Place in black bin for landfill disposal.",
      reason: "Contaminated expanded polystyrene is non-recyclable residual waste.",
    },
  },
];

/**
 * Returns a prepared sample matching sampleId or derived deterministically from the image buffer.
 */
export function classifyWithSample(
  buffer?: Buffer,
  _mimeType?: string,
  sampleId?: string,
): {
  classification: Classification;
  sample: PreparedSampleItem;
} {
  let matched: PreparedSampleItem | undefined;

  if (sampleId) {
    matched = SAMPLE_ITEMS.find((s) => s.id === sampleId);
  }

  if (!matched && buffer && buffer.length > 0) {
    // Deterministic selection based on buffer byte sum
    let sum = 0;
    const stride = Math.max(1, Math.floor(buffer.length / 50));
    for (let i = 0; i < buffer.length; i += stride) {
      sum = (sum + buffer[i]) % SAMPLE_ITEMS.length;
    }
    matched = SAMPLE_ITEMS[sum];
  }

  if (!matched) {
    matched = SAMPLE_ITEMS[0];
  }

  // Ensure output passes Zod validation
  const validated = ClassificationSchema.parse(matched.classification);

  return {
    classification: validated,
    sample: matched,
  };
}
