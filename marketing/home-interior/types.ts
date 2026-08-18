
export interface ImageFile {
  name: string;
  type: string;
  base64: string;
}

export interface DesignInputs {
  roomType: string;
  style: string[];
  ceiling: string[];
  floor: string[];
  wall: string[];
  lighting: string[];
  furniture: string[];
  versions: number;
  aspectRatio: string;
}

export interface DesignSpec {
  roomType: string;
  style: string;
  ceiling: string;
  floor: string;
  wall: string;
  lighting: string;
  furniture: string;
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