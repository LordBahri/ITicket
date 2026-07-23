export interface ManualStep {
  text: string;
  image?: string;
  imageAlt?: string;
}

export interface ManualSection {
  id: string;
  title: string;
  intro?: string;
  steps: ManualStep[];
}

export interface ManualDef {
  role: "user" | "agent" | "admin";
  title: string;
  description: string;
  sections: ManualSection[];
}
