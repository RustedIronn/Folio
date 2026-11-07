import assert from "node:assert/strict";
import test from "node:test";
import {supportsDoorAccessories} from "../src/models/catalogue/configurationFeatures.js";
import {sampleQuotation,renderQuotation,catalogue} from "../scripts/pdf-test-support.mjs";
import {ALTIS_QUOTATION_TEMPLATE as template} from "../src/templates/altisQuotationTemplate.js";
import {applyConfiguration,resolveQuotationDocument,setTechnicalOverride,setMaterialOverride,restoreDraft,serializeDraft} from "../src/models/quotation/quotation.js";
const collect=(node)=>(node.type === "TEXT_INSTANCE" ? node.value : "")+(node.children ?? []).map(collect).join("");
const eligible=catalogue.records.find((r)=>/swing door/i.test(r.quantityType));
const ordinary=catalogue.records.find((r)=>!supportsDoorAccessories(r));
test("door accessory eligibility accepts Swing Door and Collapsible descriptions and verified door fields only",()=>{
 for(const quantityType of ["MS Swing Door Hydraulic","MS SWING-DOOR Lift","MS Collapsible Gate Lift","Collapsable gate"])assert.ok(supportsDoorAccessories({quantityType}));
 assert.ok(supportsDoorAccessories({quantityType:"Team model",technical:{carProtectionDoor:"MS Swing Door"}}));
 for(const record of [null,{quantityType:"Power-operated door lift"},{technical:{motor:"Swing door motor",controller:"Collapsible controller"}}])assert.equal(supportsDoorAccessories(record),false);
});
test("ineligible models hide Buzzer and RCR without deleting stored overrides or affecting readiness",()=>{
 let q=applyConfiguration(sampleQuotation(),eligible);q=setTechnicalOverride(q,"buzzer","Synthetic buzzer",catalogue,template);q=setMaterialOverride(q,"rcr","Synthetic RCR",template);
 const saved=serializeDraft(q);q=applyConfiguration(q,ordinary);const doc=resolveQuotationDocument(q,catalogue,template);
 assert.equal(doc.pages.installation.doorAccessoriesAvailable,false);assert.equal(doc.pages.installation.technical.buzzer,undefined);assert.ok(!doc.pages.materials.rows.some((r)=>r.key === "rcr"));
 assert.equal(q.lift.technicalOverrides.buzzer,"Synthetic buzzer");assert.equal(q.materials.overrides.rcr,"Synthetic RCR");
 q=restoreDraft(serializeDraft(q),template);q=applyConfiguration(q,eligible);const restored=resolveQuotationDocument(q,catalogue,template);
 assert.equal(restored.pages.installation.technical.buzzer,"Synthetic buzzer");assert.equal(restored.pages.materials.rows.find((r)=>r.key === "rcr").value,"Synthetic RCR");assert.ok(saved.includes("Synthetic RCR"));
});
for(const variant of ["branded","printable"])for(const show of [true,false])test(variant+" PDF includes accessory rows only for eligible configurations: "+show,async()=>{
 const q=applyConfiguration(sampleQuotation(),show?eligible:ordinary);const {layout}=await renderQuotation(q,{variant});assert.equal(layout.children.length,6);
 assert.equal(collect(layout.children[1]).includes("Buzzer"),show);assert.equal(collect(layout.children[4]).includes("RCR"),show);
});
