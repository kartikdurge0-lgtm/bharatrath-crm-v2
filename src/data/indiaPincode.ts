export type IndiaPincodeRecord = {
  state: string;
  district: string;
  pincode: string;
  postOffices: string[];
};

let cachedRecords: IndiaPincodeRecord[] | null = null;

export async function getIndiaPincodeData(): Promise<IndiaPincodeRecord[]> {
  if (cachedRecords) {
    return cachedRecords;
  }

  const module = await import("./indiaPincodeData.json");

  cachedRecords = module.default as IndiaPincodeRecord[];

  return cachedRecords;
}
