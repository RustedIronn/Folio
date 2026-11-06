import assert from "node:assert/strict";
import test from "node:test";
import {sampleQuotation,renderQuotation,catalogue} from "../scripts/pdf-test-support.mjs";
import {ALTIS_QUOTATION_TEMPLATE as template} from "../src/templates/altisQuotationTemplate.js";
import {createQuotation,resolveQuotationDocument,setUpperFloors,setFloorMode,serializeDraft,restoreDraft,setTechnicalOverride,setMaterialOverride} from "../src/models/quotation/quotation.js";
import {guaranteePeriods,setGuaranteePeriod,resolveWarrantySections} from "../src/models/quotation/contractTerms.js";
import {displayTravelHeight} from "../src/pdf/documentPresentation.js";
import {entryOptionRecord} from "../src/models/catalogue/sharedEntryOptions.js";
const resolve=(q)=>resolveQuotationDocument(q,catalogue,template);
const collect=(node)=>(node.type === "TEXT_INSTANCE" ? node.value : "")+(node.children ?? []).map(collect).join("");
test("Cellar is standard: two upper floors, four stops, C + G + 2; custom wording remains exact",()=>{
 let q=setUpperFloors(sampleQuotation(),"2");
 assert.equal(q.lift.project.travelHeight,"2");assert.equal(displayTravelHeight(q.lift.project.travelHeight),"C + G + 2");
 assert.equal(q.lift.project.floors,"Cellar + Ground + 2 Upper landings – 4 Stops");assert.equal(q.lift.project.landings,q.lift.project.floors);
 q=setUpperFloors(q,"0");assert.equal(q.lift.project.travelHeight,"0");assert.match(q.lift.project.floors,/2 Stops$/);
 q=setFloorMode(q,"custom");q.lift.project.travelHeight="Site-specific wording";
 assert.equal(setUpperFloors(q,"3").lift.project.travelHeight,"Site-specific wording");
});
test("legacy v4 standard floors migrate once without changing custom travel or other quotation values",()=>{
 const q=sampleQuotation();delete q.lift.installation.cellarConvention;
 Object.assign(q.lift.project,{travelHeight:"5",floors:"Ground + 4 Upper landings – 5 Stops",landings:"Ground + 4 Upper landings – 5 Stops"});
 delete q.commercial.bankDetails;delete q.commercial.warrantyPeriods;
 const next=restoreDraft(serializeDraft(q),template);
 assert.equal(next.schemaVersion,4);assert.equal(next.lift.project.travelHeight,"4");assert.match(next.lift.project.floors,/Cellar.*6 Stops/);
 assert.equal(q.lift.project.travelHeight,"5");assert.equal(next.commercial.priceAmount,q.commercial.priceAmount);
 assert.deepEqual(restoreDraft(serializeDraft(next),template),next);
 q.lift.project.travelHeight="Special travel";assert.equal(restoreDraft(serializeDraft(q),template).lift.project.travelHeight,"Special travel");
});
test("guarantee number controls preserve approved wording and existing custom text",()=>{
 const base=template.commercial.guarantee;
 assert.deepEqual(guaranteePeriods(base),{commissioningMonths:"12",dispatchMonths:"15"});
 const changed=setGuaranteePeriod(base,"commissioningMonths","24");
 assert.equal(changed,base.replace("12 months","24 months"));assert.equal(guaranteePeriods("Custom contractual guarantee"),null);
 assert.equal(setGuaranteePeriod("Custom contractual guarantee","commissioningMonths","24"),"Custom contractual guarantee");
 const q=sampleQuotation();q.commercial.guarantee=setGuaranteePeriod(base,"dispatchMonths","");
 assert.ok(resolve(q).missing.some((issue)=>issue.path === "commercial.guarantee"));
});
test("only highlighted warranty periods change; cancellation, termination, title and source remain intact",()=>{
 const before=structuredClone(template.warranty.sections);
 const q=sampleQuotation();q.commercial.warrantyPeriods={handoverYears:"2",dispatchMonths:"24",serviceIntervalDays:"30",freeServiceMonths:"18"};
 const sections=resolve(q).pages.warranty.sections;
 assert.match(sections[0][1],/2 years.*24 months/);assert.match(sections[1][1],/30 days.*18 months/);
 assert.deepEqual(sections.slice(2),before.slice(2));assert.deepEqual(template.warranty.sections,before);
 assert.deepEqual(resolveWarrantySections(template),before);
 const restored=restoreDraft(serializeDraft(q),template);assert.deepEqual(resolve(restored).pages.warranty.sections,sections);
 for(const value of ["","0","-1","1.5","10000"]) {q.commercial.warrantyPeriods.serviceIntervalDays=value;assert.ok(resolve(q).missing.some((issue)=>issue.path === "commercial.warrantyPeriods.serviceIntervalDays"));}
});
test("bank choices preserve custom account numbers and validate incomplete custom details",()=>{
 const q=sampleQuotation();assert.equal(resolve(q).pages.priceSchedule.bankDetails.id,"icici-vijayawada");
 q.commercial.bankDetails={mode:"custom",selectedId:"icici-vijayawada",custom:{accountName:"Synthetic business",accountNumber:"00123456789",bankName:"Synthetic bank, test branch",ifsc:"TEST0000123"}};
 const next=restoreDraft(serializeDraft(q),template);assert.equal(resolve(next).pages.priceSchedule.bankDetails.accountNumber,"00123456789");assert.equal(resolve(next).missing.length,0);
 next.commercial.bankDetails.mode="standard";assert.equal(resolve(next).pages.priceSchedule.bankDetails.id,"icici-vijayawada");
 next.commercial.bankDetails.mode="custom";assert.equal(resolve(next).pages.priceSchedule.bankDetails.accountNumber,"00123456789");
 next.commercial.bankDetails.custom.ifsc="";assert.ok(resolve(next).missing.some((issue)=>issue.path === "commercial.bankDetails.ifsc"));
});
test("Buzzer and optional RCR resolve through the canonical overrides without invented catalogue data",()=>{
 let q=sampleQuotation();q=setTechnicalOverride(q,"buzzer","Synthetic buzzer specification",catalogue,template);q=setMaterialOverride(q,"rcr","hydraulic type",template);
 const doc=resolve(restoreDraft(serializeDraft(q),template));assert.equal(doc.pages.installation.technical.buzzer,"Synthetic buzzer specification");
 assert.equal(doc.pages.materials.rows.find((row)=>row.key === "rcr").value,"hydraulic type");
 const blank=resolve(sampleQuotation()).pages.materials.rows.find((row)=>row.key === "rcr");assert.equal(blank.value,"");assert.ok(blank.optional);
 assert.ok(!doc.pages.materials.rows.some((row)=>row.key === "landingProtection"));
 assert.ok(doc.pages.obligations.customer[0].includes("electrical work and earth pit"));
 assert.equal(entryOptionRecord({id:"20000000-0000-4000-8000-000000000001",kind:"material",materialKey:"rcr",specification:"Synthetic RCR"}).materialKey,"rcr");
});
for(const variant of ["branded","printable"]) test(variant+" revised PDF keeps six pages with Buzzer, bank, numeric terms, Cellar and optional RCR",async()=>{
 let q=setUpperFloors(sampleQuotation(),"2");q=setTechnicalOverride(q,"buzzer","Synthetic buzzer specification",catalogue,template);q=setMaterialOverride(q,"rcr","hydraulic type",template);
 q.commercial.additionalEntry={label:"Site note",value:"Synthetic informational line"};
 q.commercial.warrantyPeriods={handoverYears:"2",dispatchMonths:"24",serviceIntervalDays:"30",freeServiceMonths:"18"};
 const {layout}=await renderQuotation(q,{variant});assert.equal(layout.children.length,6);
 const texts=layout.children.map(collect);
 for(const expected of ["C + G + 2","Cellar + Ground + 2 Upper landings","Synthetic buzzer specification"])assert.ok(texts[1].includes(expected),expected);
 for(const expected of ["Our Bank Details:",template.bankAccounts[0].accountNumber,"Site note:","Accepted by"])assert.ok(texts[2].includes(expected),expected);
 assert.ok(texts[3].includes("2 years"));assert.ok(texts[3].includes("30 days"));assert.ok(texts[4].includes("hydraulic type"));assert.ok(!texts[4].includes("Landing protection"));
});
