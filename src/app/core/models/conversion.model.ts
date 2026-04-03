export interface ConversionEntry {
  sourceEquipment: string;
  targetEquipment: string;
  technique: string;
  tempFactor: number;
  tempOffset: number;
  timeFactor: number;
  timeOffset: number;
  techniqueNotes: string;
  confidence: 'high' | 'medium' | 'low';
}
