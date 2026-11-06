import assert from "node:assert/strict";
import test from "node:test";
import {sampleQuotation,renderQuotation,catalogue} from "../scripts/pdf-test-support.mjs";
import {ALTIS_QUOTATION_TEMPLATE as template} from "../src/templates/altisQuotationTemplate.js";
import {applyConfiguration,resolveQuotationDocument,setUpperFloors,setIncludeCellar,setFloorMode,serializeDraft,restoreDraft} from "../src/models/quotation/quotation.js";
import {displayTravelHeight} from "../src/pdf/documentPresentation.js";
const resolve=(q,c=catalogue)=>resolveQuotationDocument(q,c,template);
const collect=(node)=>(node.type === "TEXT_INSTANCE" ? node.value : "")+(node.children ?? []).map(collect).join("");
const hydraulic=catalogue.records.find((record)=>/hydraulic/i.test(record.quantityType));
test("Cellar can be removed and restored without changing upper floors, price or overrides",()=>{
 const original=setUpperFloors(sampleQuotation(),"2");const next=setIncludeCellar(original,false);
 assert.equal(next.lift.project.floors,"Ground + 2 Upper landings – 3 Stops");assert.equal(next.lift.project.landings,next.lift.project.floors);
 assert.equal(next.lift.project.travelHeight,"2");assert.equal(resolve(next).pages.installation.includeCellar,false);
 assert.equal(displayTravelHeight(next.lift.project.travelHeight,false),"G + 2");
 assert.equal(original.lift.installation.includeCellar,true);assert.equal(next.commercial.priceAmount,original.commercial.priceAmount);
 assert.deepEqual(next.lift.technicalOverrides,original.lift.technicalOverrides);
 assert.deepEqual(setIncludeCellar(next,true),original);
 assert.equal(setUpperFloors(next,"0").lift.project.floors,"Ground floor – 1 Stop");
 assert.equal(displayTravelHeight("Site-specific wording",false),"Site-specific wording");
});
test("Cellar choice survives v4 restoration; current drafts default to Cellar and custom arrangements remain intact",()=>{
 const q=setIncludeCellar(setUpperFloors(sampleQuotation(),"2"),false);
 const restored=restoreDraft(serializeDraft(q),template);
 assert.deepEqual(restored.lift,q.lift);assert.deepEqual(restored.commercial,q.commercial);
 const old=sampleQuotation();delete old.lift.installation.includeCellar;
 assert.equal(restoreDraft(serializeDraft(old),template).lift.installation.includeCellar,true);
 const custom=setFloorMode(q,"custom");custom.lift.installation.customFloors="Site floors";custom.lift.installation.customLandings="Site landings";
 const next=setIncludeCellar(custom,true);assert.equal(next.lift.project.floors,"Site floors");assert.equal(next.lift.project.landings,"Site landings");
});
test("Hydraulic model names retain only the first customer bullet and closing paragraph; company obligations stay unchanged",()=>{
 const q=applyConfiguration(sampleQuotation(),hydraulic);const source=structuredClone(template.obligations);
 const doc=resolve(q);
 assert.deepEqual(doc.pages.obligations.customer,[source.customer[0],source.customer.at(-1)]);
 assert.deepEqual(doc.pages.obligations.ours,source.ours);assert.deepEqual(template.obligations,source);
 const nonHydraulic=sampleQuotation();const record=structuredClone(catalogue.records.find((row)=>row.sourceRecordId === nonHydraulic.lift.catalogueId));record.quantityType="Synthetic traction model";record.technical.liftType="Hydraulic Lift";
 assert.deepEqual(resolve(nonHydraulic,{records:[record]}).pages.obligations.customer,source.customer,"A category alone must not trigger the model-name rule");
 record.quantityType="Synthetic HYDRAULIC model";assert.equal(resolve(nonHydraulic,{records:[record]}).pages.obligations.customer.length,2);
});
for(const variant of ["branded","printable"]) for(const includeCellar of [true,false]) test(variant+" PDF: optional Cellar and hydraulic customer clauses remain six pages",async()=>{
 const q=setIncludeCellar(setUpperFloors(applyConfiguration(sampleQuotation(),hydraulic),"2"),includeCellar);
 const result=await renderQuotation(q,{variant});assert.equal(result.layout.children.length,6);
 const installation=collect(result.layout.children[1]);assert.ok(installation.includes(includeCellar ? "C + G + 2" : "G + 2"));
 assert.ok(installation.includes(includeCellar ? "Cellar + Ground + 2 Upper landings – 4 Stops" : "Ground + 2 Upper landings – 3 Stops"));
 if(!includeCellar) assert.ok(!installation.includes("C + G + 2"));
 const last=collect(result.layout.children[5]);assert.ok(last.includes(template.obligations.customer[0]));assert.ok(last.includes(template.obligations.customer.at(-1)));
 for(const omitted of template.obligations.customer.slice(1,-1))assert.ok(!last.includes(omitted));
 for(const company of template.obligations.ours)assert.ok(last.includes(company));
 assert.ok(last.includes(template.signatures.customer));
});
