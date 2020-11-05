describe("Test entering into an input box",function(){
    it("Executing input box test",function(){
     
         browser.get("https://angularjs.org/");
         element(by.model("yourName")).sendKeys("Sapan");
         element(by.binding("yourName")).getText().then(function(text){
             console.log(text);
     });
    });
     });
 