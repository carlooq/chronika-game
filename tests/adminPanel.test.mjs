import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminPanel } from '../src/adminPanel.js';

const record={id:'kurator-pl-grunwald',title:'Bitwa pod Grunwaldem',year:1410,
  categoryIds:['poland'],status:'draft',description:'Opis',tags:[]};
const mockApi={
  async listCategories(){return [{id:'poland',name:'Historia Polski',parentId:'',status:'draft'}];},
  async listEvents(){return {items:[record],cursor:null,hasMore:false};},
};
const target=(action,more={})=>({closest:()=>({dataset:{admin:action,...more},disabled:false})});

test('admin shows friendly event list without exposing technical IDs as subtitles',async()=>{
  const panel=createAdminPanel(mockApi);
  await panel.load();
  const html=panel.render();
  const tbody=html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0];
  assert.ok(tbody);
  assert.match(tbody,/>Bitwa pod Grunwaldem<\/strong>/);
  assert.doesNotMatch(tbody,/<small>kurator-pl-grunwald<\/small>/);
  // Internal IDs remain usable for editing and must NOT change in Firestore.
  assert.match(tbody,/data-id="kurator-pl-grunwald"/);
  const root={innerHTML:html};
  panel.bind(root);
  root.onclick({target:target('edit-event',{id:'kurator-pl-grunwald'})});
  assert.match(root.innerHTML,/<details class="admin-technical">/);
  assert.match(root.innerHTML,/<input type="hidden" name="id" value="kurator-pl-grunwald">/);
  assert.doesNotMatch(root.innerHTML,/ID \(stałe, unikalne\)/);
});

test('category technical identifiers are not a default table column',async()=>{
  const panel=createAdminPanel(mockApi);await panel.load();
  const root={innerHTML:panel.render()};
  panel.bind(root);
  root.onclick({target:target('tab',{tab:'categories'})});
  assert.match(root.innerHTML,/Katalog kategorii/);
  assert.doesNotMatch(root.innerHTML,/<th>ID<\/th>/);
  root.onclick({target:target('edit-category',{id:'poland'})});
  assert.match(root.innerHTML,/<input type="hidden" name="id" value="poland">/);
});
