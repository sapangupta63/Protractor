var selectWrapper=require("./select-wrapper.js");
var mySelect=new selectWrapper(by.id("userSelect"));

describe("Using wrapper class handling dropdown",function(){
it("handling dropdown",function(){

    browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/customer");
    mySelect.selectByText("Harry Potter");
    browser.sleep(4000);
});

it("Counting values in dropdown list",function(){
     mySelect.getOptions().then(function(size){
     
        console.log(size.length);
        for(var i=0;i<size.length-1;i++)
     {
         element(by.repeater("cust in Customers").row(i)).getText().then(function(value){
          console.log(value);

         });
     }

     });
    

});



});