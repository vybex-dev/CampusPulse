import type { Bin, WasteCategory } from "./contract";

export interface WasteCategoryMetadata {
  category: WasteCategory;
  name: string;
  bin: Bin;
  binName: string;
  weight_kg: number;
  ef_kg_per_kg: number;
  points: number;
}

/**
 * Authoritative category table mapping 7 categories to bin colour, weight, CO2e, and points.
 * Pure definitions safe for both client and server components.
 */
export const CATEGORY_TABLE: Record<WasteCategory, WasteCategoryMetadata> = {
  wet_biodegradable: {
    category: "wet_biodegradable",
    name: "Wet / Biodegradable Waste",
    bin: "green",
    binName: "Green (wet)",
    weight_kg: 0.15,
    ef_kg_per_kg: 0.5,
    points: 10,
  },
  paper_cardboard: {
    category: "paper_cardboard",
    name: "Paper & Cardboard",
    bin: "blue",
    binName: "Blue (dry recyclable)",
    weight_kg: 0.05,
    ef_kg_per_kg: 1.0,
    points: 10,
  },
  plastic: {
    category: "plastic",
    name: "Plastic Containers & Wrappers",
    bin: "blue",
    binName: "Blue (dry recyclable)",
    weight_kg: 0.03,
    ef_kg_per_kg: 1.5,
    points: 10,
  },
  metal_glass: {
    category: "metal_glass",
    name: "Metal Cans & Glass Bottles",
    bin: "blue",
    binName: "Blue (dry recyclable)",
    weight_kg: 0.15,
    ef_kg_per_kg: 1.0,
    points: 10,
  },
  e_waste: {
    category: "e_waste",
    name: "Electronic Waste & Cables",
    bin: "red",
    binName: "Red (special collection)",
    weight_kg: 0.1,
    ef_kg_per_kg: 2.0,
    points: 20,
  },
  hazardous: {
    category: "hazardous",
    name: "Hazardous & Medical Waste",
    bin: "red",
    binName: "Red (special collection)",
    weight_kg: 0.05,
    ef_kg_per_kg: 0.0,
    points: 20,
  },
  other_residual: {
    category: "other_residual",
    name: "Residual / Landfill Waste",
    bin: "black",
    binName: "Black (residual)",
    weight_kg: 0.02,
    ef_kg_per_kg: 0.0,
    points: 5,
  },
};
