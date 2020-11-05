describe("validating calc functionality",function(){
it("Adding records in a table",function(){
browser.get("http://www.way2automation.com/angularjs-protractor/calc/");
element(by.model("first")).sendKeys("5");
element(by.model("second")).sendKeys("7");
element(by.buttonText("Go!")).click();
element(by.model("first")).sendKeys("5");
element(by.model("second")).sendKeys("5");
element(by.buttonText("Go!")).click();
});
browser.sleep(3000);


it("printing rows",function(){
    console.log("printing rows data")
    for(var i=0;i<=1;i++)
    {
    element(by.repeater("result in memory").row(i)).getText().then(function(text){
      console.log(text)
    });
}
browser.sleep(3000);
    });
   

    it("printing columns",function(){
        console.log("printing columns data")
        element(by.repeater("result in memory").column("result.timestamp")).getText().then(function(text){
          console.log(text)
        });
    
        browser.sleep(3000);
    });

        it("printing all data",function(){
            console.log("printing all data")
            
            element.all(by.repeater("result in memory")).getText().then(function(text){
              console.log(text)
            });
            browser.sleep(3000);
            });
            
            it("printing all data in new line",function(){
                console.log("printing all data")
                
                element.all(by.repeater("result in memory")).getText().then(function(rows){
                    var noofitems=rows.length;
                    for(var i=0;i<noofitems;i++)
                    {
                        var table=element(by.repeater("result in memory").row(i)).getText();
table.then(function(text){
console.log(text);
});
                    }
                 
                });
                browser.sleep(3000);
                });
                
    

});