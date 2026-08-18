export interface ImageFile {
  name: string;
  type: string;
  base64: string;
}

export interface DesignInputs {
  materials: string[];
  windows: string[];
  colors: string[];
  facade: string[];
  signage: string[];
  landscaping: string[];
  lighting: string[];
  versions: number;
  aspectRatio: string;
}

export interface DesignSpec {
  materials: string;
  colors: string;
  windows: string;
  signage: string;
  lighting: string;
  landscaping: string;
}

export interface TextualData {
  imagePrompt: string;
  constraints: string;
  designSpec: DesignSpec;
  versionDiffsEn: string[];
  versionDiffsKo: string[];
  disclaimer: string;
  versionDiffKo: string;
}

export interface SimulationResult {
  image: string; // base64 data URL
  textData: TextualData;
}