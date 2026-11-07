import assert from "node:assert/strict";
import test from "node:test";
import {sampleQuotation,renderQuotation,catalogue} from "../scripts/pdf-test-support.mjs";
import {ALTIS_QUOTATION_TEMPLATE as template} from "../src/templates/altisQuotationTemplate.js";
import {resolveQuotationDocument,restoreDraft,serializeDraft} from "../src/models/quotation/quotation.js";
import {extraCharge,priceWithExtra} from "../src/models/quotation/commercialEntry.js";
const resolve=(q)=>resolveQuotationDocument(q,catalogue,template);
const collect=(node)=>(node.type === "TEXT_INSTANCE" ? node.value : "")+(node.children ?? []).map(collect).join("");
test("Included adds an extra charge once; Excluded displays it separately with no price or tax change",()=>{
 const q=sampleQuotation();q.commercial.priceAmount="500000";q.lift.quantity="2";
 q.commercial.additionalEntry={label:"Optional equipment",value:"10000",treatment:"included"};const before=structuredClone(q);let doc=resolve(q);
 assert.equal(doc.pages.priceSchedule.price.amount,"510000");assert.equal(doc.pages.priceSchedule.price.formatted,"₹5,10,000 each");assert.equal(doc.pages.priceSchedule.price.words,"Rupees Five Lakh Ten Thousand Only each");
 assert.equal(doc.pages.priceSchedule.additionalEntry.displayValue,"₹10,000 (Included)");assert.deepEqual(q,before);assert.equal(doc.pages.priceSchedule.taxDescription,q.commercial.taxDescription);
 assert.equal(resolve(restoreDraft(serializeDraft(q),template)).pages.priceSchedule.price.amount,"510000");
 q.commercial.additionalEntry.treatment="excluded";doc=resolve(q);assert.equal(doc.pages.priceSchedule.price.amount,"500000");assert.equal(doc.pages.priceSchedule.additionalEntry.displayValue,"₹10,000 (Excluded)");assert.equal(doc.pages.priceSchedule.price.words,"Rupees Five Lakh Only each");
});
test("legacy informational entries remain text and do not change the price",()=>{
 const q=sampleQuotation();q.commercial.additionalEntry={label:"Site note",value:"Existing custom text"};
 const doc=resolve(restoreDraft(serializeDraft(q),template));assert.equal(doc.pages.priceSchedule.price.amount,q.commercial.priceAmount);assert.equal(doc.pages.priceSchedule.additionalEntry.displayValue,"Existing custom text");assert.equal(doc.pages.priceSchedule.additionalEntry.treatment,"informational");
});
test("extra charges validate currency precision and keep invalid/incomplete drafts from export",()=>{
 const q=sampleQuotation();q.commercial.additionalEntry={label:"Extra",value:"",treatment:"included"};
 for(const value of ["","abc","-1","NaN","Infinity","1.234","1e2","10,000"]) {q.commercial.additionalEntry.value=value;assert.equal(extraCharge(value),null);assert.ok(resolve(q).missing.some((issue)=>issue.path === "commercial.additionalEntry.value"));}
 assert.equal(priceWithExtra("0.1",{label:"Extra",value:"0.2",treatment:"included"}),"0.3");
 q.commercial.priceAmount="0";q.commercial.additionalEntry.value="0.25";assert.equal(resolve(q).pages.priceSchedule.price.words,"Rupees Zero and Twenty Five Paise Only");
 q.commercial.additionalEntry.treatment="invalid";assert.ok(resolve(q).missing.some((issue)=>issue.path === "commercial.additionalEntry.treatment"));
});
for(const variant of ["branded","printable"])for(const treatment of ["included","excluded"])test(variant+" PDF: "+treatment+" extra amount and tight price spacing",async()=>{
 const q=sampleQuotation();q.commercial.priceAmount="500000";q.commercial.additionalEntry={label:"Optional equipment",value:"10000",treatment};
 if(variant === "printable")q.document.type="agreement";
 const result=await renderQuotation(q,{variant});assert.equal(result.layout.children.length,6);const page=result.layout.children[2];const text=collect(page);
 assert.ok(text.includes(treatment === "included" ? "Rs. 5,10,000/-" : "Rs. 5,00,000/-"));assert.ok(text.includes(treatment === "included" ? "Rs. 10,000 (Included)" : "Rs. 10,000 (Excluded)"));
 function find(node){if(node.props?.id === "pdf-region:Price amount")return node;for(const child of node.children ?? []){const result=find(child);if(result)return result;}}
 const region=find(page);assert.equal(region.children.length,2);const [price,extra]=region.children;assert.ok(extra.box.top-price.box.top-price.box.height <= 4.1,"Extra line immediately follows price text");
});
