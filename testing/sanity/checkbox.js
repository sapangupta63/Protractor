describe('handling checkbox',function(){
it('checkobx', async function(){
    browser.ignoreSynchronization=true;

browser.get("http://www.tizag.com/htmlT/htmlcheckboxes.php");

// element.all(by.xpath('//div[4]/input')).then(function(items){
// console.log("Total Checkboxes are : "+items.length);
// Array.from(items).forEach((element)=>{
// element.getAttribute('value').then(function(text){

//     console.log(text)
    

// })
// element.click();
// browser.sleep(4000)
// })


// })

var value_index=function(index)
{
element(by.xpath('//div[4]/input['+index+']')).getAttribute('value').then(function(text){
console.log(text+" getting the value of checkbox no "+index)
})

}

for(var i=1;i<=4;i++)
{
    element(by.xpath('//div[4]/input['+i+']')).click();
    var text=await element(by.xpath('//div[4]/input['+i+']')).getAttribute('value');
    console.log(text);
    value_index(i);
}






})
})


