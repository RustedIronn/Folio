export const MAX_CUSTOM_MATERIALS = 6;

export function documentIdentity(type) {
  return type === "agreement" ? { type: "agreement", label: "Agreement", lower: "agreement", code: "AGE" } : { type: "quotation", label: "Quotation", lower: "quotation", code: "QUO" };
}

export function officeSelectorValue(reference) {
  return reference.officeCodeMode === "custom" || (reference.officeCode && reference.officeCode !== "VJA") ? "__custom__" : reference.officeCode;
}
export function selectOfficeCode(quotation, choice) {
  const reference = quotation.reference;
  const customOfficeCode = officeSelectorValue(reference) === "__custom__" ? reference.officeCode : reference.customOfficeCode ?? "";
  return { ...quotation, reference: { ...reference, officeCodeMode: choice === "__custom__" ? "custom" : "standard", customOfficeCode, officeCode: choice === "__custom__" ? customOfficeCode : choice } };
}
export function setCustomOfficeCode(quotation, value) {
  return { ...quotation, reference: { ...quotation.reference, officeCodeMode: "custom", officeCode: value, customOfficeCode: value } };
}

export function upsertCustomMaterial(quotation, material) {
  const rows = quotation.materials.customRows ?? [];
  if (!rows.some((row) => row.id === material.id) && rows.length >= MAX_CUSTOM_MATERIALS) throw new Error("The six-page material schedule supports up to six custom material rows.");
  const customRows = rows.some((row) => row.id === material.id) ? rows.map((row) => row.id === material.id ? { ...row, ...material } : row) : [...rows, material];
  return { ...quotation, materials: { ...quotation.materials, customRows } };
}
export function removeCustomMaterial(quotation, id) {
  return { ...quotation, materials: { ...quotation.materials, customRows: (quotation.materials.customRows ?? []).filter((row) => row.id !== id) } };
}

// Additive v4 defaults; old fields, snapshots and explicitly customized values stay exact.
export function extensionDefaults(quotation, template) {
  let lift=quotation.lift;
  const installation=lift?.installation;
  if(installation && !installation.cellarConvention) {
    const project={...lift.project};
    if(installation.floorMode === "standard" && /^\d+$/.test(String(installation.upperFloors))) {
      const upper=Number(installation.upperFloors);
      const oldDescription=upper === 0 ? "Ground floor – 1 Stop" : "Ground + "+upper+" Upper landings – "+(upper+1)+" Stops";
      const description="Cellar + Ground + "+upper+" Upper landings – "+(upper+2)+" Stops";
      for(const key of ["floors","landings"]) if(project[key] === oldDescription) project[key]=description;
      if(String(project.travelHeight) === String(upper+1)) project.travelHeight=String(upper);
    }
    lift={...lift,project,installation:{...installation,cellarConvention:true}};
  }
  return { ...quotation, lift,
    reference: { officeCodeMode: quotation.reference?.officeCode && quotation.reference.officeCode !== "VJA" ? "custom" : "standard", customOfficeCode: "", ...quotation.reference },
    materials: { customRows: [], ...quotation.materials },
    commercial: { warrantyPeriods: {}, ...(template?.bankAccounts ? {bankDetails:{mode:"standard",selectedId:template.bankAccounts[0].id,custom:{accountName:"",accountNumber:"",bankName:"",ifsc:""}}} : {}), additionalEntry: { label: "", value: "" }, ...quotation.commercial },
    document: { type: "quotation", ...quotation.document },
  };
}
