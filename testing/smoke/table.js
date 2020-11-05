describe("table",()=>{

beforeAll(async ()=>{

await browser.get("https://play.letcode.in/table");

});


it("table functionality",async ()=>{

let table=$("table#table tbody");
let rows= table.$$("tr");
let count=await rows.count();
console.log(count);
for(let i=0;i<count;i++)
{
    let td=rows.get(i).$$("td");
    let firstdata=td.get(0);
    let text=await firstdata.getText();
    if(text=="Yashwanth")
    {
    let checkbox= td.last().$("input");
    await checkbox.click();
    }
}
browser.sleep(3000);

});


})