const fs=require('fs'),path=require('path');const B=path.join(__dirname,'../../../..');
const {Client}=require(path.join(B,'node_modules/pg'));const url=fs.readFileSync(B+'/.env','utf8').match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)[1];
const st=JSON.parse(fs.readFileSync(path.join(__dirname,'state.json'),'utf8'));
(async()=>{const c=new Client({connectionString:url});await c.connect();
 const users=(await c.query(`select id from "User" where email like 'qa-sfui-%@example.test'`)).rows.map(r=>r.id);
 const customers=(await c.query(`select id from "Customer" where "userId"=any($1) or email like 'qa-sfui-%@example.test'`,[users])).rows.map(r=>r.id);
 const shops=(await c.query(`select s.id from "Shop" s join "Vendor" v on v.id=s."vendorId" where v."userId"=any($1)`,[users])).rows.map(r=>r.id);
 const products=(await c.query(`select id from "Product" where "shopId"=any($1)`,[shops])).rows.map(r=>r.id);
 const orders=(await c.query(`select id from "Order" where "customerId"=any($1) or id in (select "orderId" from "VendorOrder" where "shopId"=any($2))`,[customers,shops])).rows.map(r=>r.id);
 // Ids for the leftover scan.
 const vendors=(await c.query(`select id from "Vendor" where "userId"=any($1)`,[users])).rows.map(r=>r.id);
 const addresses=(await c.query(`select id from "Address" where "customerId"=any($1)`,[customers])).rows.map(r=>r.id);
 const payments=(await c.query(`select id from "Payment" where "orderId"=any($1)`,[orders])).rows.map(r=>r.id);
 const vos=(await c.query(`select id from "VendorOrder" where "orderId"=any($1)`,[orders])).rows.map(r=>r.id);
 const all=[...users,...customers,...shops,...products,...orders,...vendors,...addresses,...payments,...vos];
 console.log({users:users.length,customers:customers.length,shops:shops.length,products:products.length,orders:orders.length});
 await c.query('begin');
 try{
  await c.query(`delete from "Order" where id=any($1)`,[orders]);
  await c.query(`delete from "Report" where "productId"=any($1) or "shopId"=any($2) or "reporterId"=any($3)`,[products,shops,users]);
  await c.query(`delete from "Product" where id=any($1)`,[products]);
  await c.query(`delete from "Customer" where id=any($1)`,[customers]);
  await c.query(`delete from "User" where id=any($1)`,[users]);
  await c.query('commit');
 }catch(e){await c.query('rollback');throw e;}
 // Scan every text column of every table for any QA id or email/slug/barcode/name.
 const cols=(await c.query(`select table_name,column_name from information_schema.columns where table_schema='public' and data_type in ('text','character varying','jsonb','json')`)).rows;
 const left=[];
 for(const {table_name:t,column_name:col} of cols){
  const r=await c.query(`select count(*)::int n from "${t}" where "${col}"::text = any($1) or "${col}"::text like '%qa-sfui-%' or "${col}"::text like $2 or "${col}"::text like $3`,[all,`%${st.ts}%`,`%${st.barcode}%`]);
  if(r.rows[0].n) left.push(`${t}.${col}: ${r.rows[0].n}`);
 }
 console.log(left.length?'LEFTOVER:\n'+left.join('\n'):'Nothing remains.');
 await c.end();})().catch(e=>{console.error(e);process.exit(1)});
