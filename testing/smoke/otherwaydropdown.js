const SelectWrapper = require('../../select-wrapper.js');
var select=new SelectWrapper(by.id('searchLanguage'))

describe("Alternate dropdown handlind",function(){
beforeEach(function(){
browser.get("https://wikipedia.org/");

})
browser.ignoreSynchronization=true;

it("count dropdown values",function(){

// element.all(by.css('#userSelect option')).getText().then(function(items){
// console.log("Total values are :"+items.length)
// console.log(items);
// })
var dropdown=select.getOptions();
dropdown.getText().then(function(items){
console.log(items.length);
console.log(items);

})

})


it("dropdown selection",function(){

//element(by.css("#userSelect")).element(by.cssContainingText('option', 'Albus Dumbledore')).click();
//element(by.model('custId')).$("[value='3']").click();

select.selectByValue('be')
//select.selectByText('Harry Potter');
browser.sleep(2000);


})


})