/**
 * Static Glossary Manifest
 * Maps locale codes to static .xlsx files located in the /public/terminologies directory.
 */

export interface TerminologyResource {
  name: string;
  path: string;
}

export const PRESET_GLOSSARIES: Record<'fr-FR' | 'de-DE', TerminologyResource[]> = {
  'fr-FR': [
    { 
      name: 'RC_Glossary_FR-FR_20240703.xlsx', 
      path: 'terminologies/fr-FR/RC_Glossary_FR-FR_20240703.xlsx' 
    },
    { 
      name: 'terms_en_fr-fr_2026-01-21T05-04-23.xlsx', 
      path: 'terminologies/fr-FR/terms_en_fr-fr_2026-01-21T05-04-23.xlsx' 
    }
  ],
  'de-DE': [
    { 
      name: 'RC_Glossary_DE-DE_20240426.xlsx', 
      path: 'terminologies/de-DE/RC_Glossary_DE-DE_20240426.xlsx' 
    },
    { 
      name: 'terms_en_de-de_2026-01-21T05-04-23.xlsx', 
      path: 'terminologies/de-DE/terms_en_de-de_2026-01-21T05-04-23.xlsx' 
    }
  ]
};