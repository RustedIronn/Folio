// Approved wording remains intact; only explicitly edited numeric periods change.
export const WARRANTY_PERIODS = [
  {key:"handoverYears",label:"Guarantee after handover (years)",value:"1"},
  {key:"dispatchMonths",label:"Guarantee after dispatch (months)",value:"15"},
  {key:"serviceIntervalDays",label:"Free-service interval (days)",value:"45"},
  {key:"freeServiceMonths",label:"Free-service period (months)",value:"12"},
];
export function guaranteePeriods(text) {
  const match = String(text ?? "").match(/^(\d*)( months from the date of Commissioning or )(\d*)( Months from the Date of dispatch Whichever Occurs earlier\.)$/);
  return match ? {commissioningMonths:match[1],dispatchMonths:match[3]} : null;
}
export function setGuaranteePeriod(text,key,value) {
  const periods=guaranteePeriods(text);
  if(!periods) return text;
  periods[key]=value;
  return periods.commissioningMonths+" months from the date of Commissioning or "+periods.dispatchMonths+" Months from the Date of dispatch Whichever Occurs earlier.";
}
export function resolveWarrantySections(template,periods={}) {
  const sections=template.warranty.sections.map((section)=>[...section]);
  if(periods.handoverYears !== undefined) sections[0][1]=sections[0][1].replace("One year",periods.handoverYears === "1" ? "One year" : periods.handoverYears+" years");
  if(periods.dispatchMonths !== undefined) sections[0][1]=sections[0][1].replace("15 months",periods.dispatchMonths+" months");
  if(periods.serviceIntervalDays !== undefined) sections[1][1]=sections[1][1].replace("45 days",periods.serviceIntervalDays+" days");
  if(periods.freeServiceMonths !== undefined) sections[1][1]=sections[1][1].replace("twelve months",periods.freeServiceMonths === "12" ? "twelve months" : periods.freeServiceMonths+" months");
  return sections;
}
export function resolveBankDetails(commercial,template) {
  const bank=commercial.bankDetails;
  if(bank?.mode === "custom") return {accountName:"",accountNumber:"",bankName:"",ifsc:"",...bank.custom};
  return template.bankAccounts.find((item)=>item.id === bank?.selectedId) ?? template.bankAccounts[0];
}
